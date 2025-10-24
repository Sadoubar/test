const express = require('express');
const router = express.Router();
const database = require('../database');
const PDFDocument = require('pdfkit');
const { asyncHandler, NotFoundError, ValidationError } = require('../middleware/errorHandler');
const { invoiceValidators } = require('../middleware/validators');
const logger = require('../config/logger');
const config = require('../config/config');

// Fonction helper pour calculer les totaux
const calculateTotals = (items, taxRate, discount) => {
  let subtotal = 0;
  items.forEach(item => {
    item.total = item.quantity * item.unit_price;
    subtotal += item.total;
  });

  const discountAmount = discount || 0;
  const subtotalAfterDiscount = subtotal - discountAmount;
  const taxAmount = (subtotalAfterDiscount * (taxRate || 20)) / 100;
  const total = subtotalAfterDiscount + taxAmount;

  return { subtotal, taxAmount, total };
};

// GET toutes les factures
router.get('/', asyncHandler(async (req, res) => {
  const { status, client_id, limit = 100, offset = 0 } = req.query;

  let sql = `
    SELECT i.*, c.name as client_name, c.email as client_email
    FROM invoices i
    LEFT JOIN clients c ON i.client_id = c.id
  `;
  const params = [];
  const conditions = [];

  if (status) {
    conditions.push('i.status = ?');
    params.push(status);
  }

  if (client_id) {
    conditions.push('i.client_id = ?');
    params.push(client_id);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' ORDER BY i.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const invoices = await database.all(sql, params);

  logger.info(`Récupération de ${invoices.length} factures`);
  res.json(invoices);
}));

// GET une facture par ID avec ses lignes
router.get('/:id', invoiceValidators.getById, asyncHandler(async (req, res) => {
  const invoiceSql = `
    SELECT i.*, c.name as client_name, c.email as client_email,
           c.address as client_address, c.city as client_city,
           c.postal_code as client_postal_code, c.country as client_country,
           c.phone as client_phone
    FROM invoices i
    LEFT JOIN clients c ON i.client_id = c.id
    WHERE i.id = ?
  `;

  const invoice = await database.get(invoiceSql, [req.params.id]);

  if (!invoice) {
    throw new NotFoundError('Facture non trouvée');
  }

  const items = await database.all(
    'SELECT * FROM invoice_items WHERE invoice_id = ?',
    [req.params.id]
  );

  invoice.items = items;
  res.json(invoice);
}));

// POST créer une nouvelle facture
router.post('/', invoiceValidators.create, asyncHandler(async (req, res) => {
  const {
    invoice_number,
    client_id,
    issue_date,
    due_date,
    tax_rate,
    discount,
    status,
    notes,
    items
  } = req.body;

  // Vérifier que le client existe
  const client = await database.get('SELECT id FROM clients WHERE id = ?', [client_id]);
  if (!client) {
    throw new ValidationError('Client non trouvé');
  }

  // Vérifier que le numéro de facture n'existe pas
  const existingInvoice = await database.get(
    'SELECT id FROM invoices WHERE invoice_number = ?',
    [invoice_number]
  );
  if (existingInvoice) {
    throw new ValidationError('Ce numéro de facture existe déjà');
  }

  // Calculer les totaux
  const { subtotal, taxAmount, total } = calculateTotals(items, tax_rate, discount);

  // Utiliser une transaction pour garantir l'intégrité
  const result = await database.transaction(async (db) => {
    // Insérer la facture
    const invoiceSql = `
      INSERT INTO invoices (invoice_number, client_id, issue_date, due_date, subtotal, tax_rate, tax_amount, discount, total, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const invoiceResult = await db.run(
      invoiceSql,
      [invoice_number, client_id, issue_date, due_date, subtotal, tax_rate || 20, taxAmount, discount || 0, total, status || 'draft', notes]
    );

    const invoiceId = invoiceResult.lastID;

    // Insérer les lignes de facture
    const itemSql = `
      INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit_price, total)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    for (const item of items) {
      await db.run(itemSql, [
        invoiceId,
        item.product_id || null,
        item.description,
        item.quantity,
        item.unit_price,
        item.total
      ]);
    }

    return invoiceId;
  });

  logger.info(`Facture créée avec l'ID ${result}`);

  res.status(201).json({
    id: result,
    message: 'Facture créée avec succès'
  });
}));

// PUT mettre à jour une facture
router.put('/:id', invoiceValidators.update, asyncHandler(async (req, res) => {
  const {
    invoice_number,
    client_id,
    issue_date,
    due_date,
    tax_rate,
    discount,
    status,
    notes,
    items
  } = req.body;

  // Vérifier que la facture existe
  const existingInvoice = await database.get('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
  if (!existingInvoice) {
    throw new NotFoundError('Facture non trouvée');
  }

  // Vérifier que le client existe si fourni
  if (client_id) {
    const client = await database.get('SELECT id FROM clients WHERE id = ?', [client_id]);
    if (!client) {
      throw new ValidationError('Client non trouvé');
    }
  }

  // Calculer les totaux si items fournis
  let totals = null;
  if (items) {
    totals = calculateTotals(items, tax_rate || existingInvoice.tax_rate, discount !== undefined ? discount : existingInvoice.discount);
  }

  // Utiliser une transaction
  await database.transaction(async (db) => {
    // Mettre à jour la facture
    const invoiceSql = `
      UPDATE invoices
      SET invoice_number = COALESCE(?, invoice_number),
          client_id = COALESCE(?, client_id),
          issue_date = COALESCE(?, issue_date),
          due_date = COALESCE(?, due_date),
          subtotal = COALESCE(?, subtotal),
          tax_rate = COALESCE(?, tax_rate),
          tax_amount = COALESCE(?, tax_amount),
          discount = COALESCE(?, discount),
          total = COALESCE(?, total),
          status = COALESCE(?, status),
          notes = COALESCE(?, notes),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await db.run(
      invoiceSql,
      [
        invoice_number,
        client_id,
        issue_date,
        due_date,
        totals?.subtotal,
        tax_rate,
        totals?.taxAmount,
        discount,
        totals?.total,
        status,
        notes,
        req.params.id
      ]
    );

    // Mettre à jour les lignes si fournies
    if (items) {
      // Supprimer les anciennes lignes
      await db.run('DELETE FROM invoice_items WHERE invoice_id = ?', [req.params.id]);

      // Insérer les nouvelles lignes
      const itemSql = `
        INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit_price, total)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      for (const item of items) {
        await db.run(itemSql, [
          req.params.id,
          item.product_id || null,
          item.description,
          item.quantity,
          item.unit_price,
          item.total
        ]);
      }
    }
  });

  logger.info(`Facture ${req.params.id} mise à jour`);

  res.json({ message: 'Facture mise à jour avec succès' });
}));

// DELETE supprimer une facture
router.delete('/:id', invoiceValidators.delete, asyncHandler(async (req, res) => {
  await database.transaction(async (db) => {
    // Les items seront supprimés automatiquement via CASCADE
    const result = await db.run('DELETE FROM invoices WHERE id = ?', [req.params.id]);

    if (result.changes === 0) {
      throw new NotFoundError('Facture non trouvée');
    }
  });

  logger.info(`Facture ${req.params.id} supprimée`);

  res.json({ message: 'Facture supprimée avec succès' });
}));

// GET générer PDF d'une facture
router.get('/:id/pdf', invoiceValidators.getById, asyncHandler(async (req, res) => {
  const invoiceSql = `
    SELECT i.*, c.name as client_name, c.email as client_email,
           c.address as client_address, c.city as client_city,
           c.postal_code as client_postal_code, c.country as client_country,
           c.phone as client_phone
    FROM invoices i
    LEFT JOIN clients c ON i.client_id = c.id
    WHERE i.id = ?
  `;

  const invoice = await database.get(invoiceSql, [req.params.id]);

  if (!invoice) {
    throw new NotFoundError('Facture non trouvée');
  }

  const items = await database.all(
    'SELECT * FROM invoice_items WHERE invoice_id = ?',
    [req.params.id]
  );

  // Générer le PDF
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=facture-${invoice.invoice_number}.pdf`);

  doc.pipe(res);

  // En-tête de l'entreprise
  doc.fontSize(24).font('Helvetica-Bold').text(config.company.name, { align: 'left' });
  doc.fontSize(10).font('Helvetica');
  if (config.company.address) doc.text(config.company.address);
  if (config.company.city) doc.text(config.company.city);
  if (config.company.phone) doc.text(`Tél: ${config.company.phone}`);
  if (config.company.email) doc.text(`Email: ${config.company.email}`);
  if (config.company.siret) doc.text(`SIRET: ${config.company.siret}`);
  if (config.company.vat) doc.text(`TVA: ${config.company.vat}`);
  doc.moveDown();

  // Titre de la facture
  doc.fontSize(28).font('Helvetica-Bold').text('FACTURE', { align: 'center' });
  doc.moveDown();

  // Informations de facture (à droite)
  const infoX = 350;
  let infoY = 200;
  doc.fontSize(12).font('Helvetica-Bold');
  doc.text(`N° ${invoice.invoice_number}`, infoX, infoY);
  infoY += 20;
  doc.font('Helvetica');
  doc.text(`Date: ${invoice.issue_date}`, infoX, infoY);
  if (invoice.due_date) {
    infoY += 20;
    doc.text(`Échéance: ${invoice.due_date}`, infoX, infoY);
  }

  // Informations client (à gauche)
  doc.font('Helvetica-Bold').fontSize(14).text('Facturé à:', 50, 200);
  doc.font('Helvetica').fontSize(12);
  let clientY = 220;
  doc.text(invoice.client_name, 50, clientY);
  if (invoice.client_address) {
    clientY += 20;
    doc.text(invoice.client_address, 50, clientY);
  }
  if (invoice.client_city) {
    clientY += 20;
    doc.text(`${invoice.client_postal_code || ''} ${invoice.client_city}`, 50, clientY);
  }
  if (invoice.client_country) {
    clientY += 20;
    doc.text(invoice.client_country, 50, clientY);
  }
  if (invoice.client_email) {
    clientY += 20;
    doc.text(invoice.client_email, 50, clientY);
  }
  if (invoice.client_phone) {
    clientY += 20;
    doc.text(invoice.client_phone, 50, clientY);
  }

  doc.moveDown(3);

  // Tableau des articles
  const tableTop = Math.max(clientY + 40, infoY + 40);
  const descriptionX = 50;
  const quantityX = 300;
  const priceX = 380;
  const totalX = 480;

  // En-têtes du tableau
  doc.fontSize(11).font('Helvetica-Bold');
  doc.text('Description', descriptionX, tableTop);
  doc.text('Qté', quantityX, tableTop);
  doc.text('Prix Unit.', priceX, tableTop);
  doc.text('Total', totalX, tableTop);

  doc.moveTo(50, tableTop + 20).lineTo(550, tableTop + 20).stroke();

  // Lignes du tableau
  doc.font('Helvetica').fontSize(10);
  let yPosition = tableTop + 30;
  items.forEach(item => {
    const itemHeight = Math.max(20, Math.ceil(item.description.length / 40) * 15);

    doc.text(item.description, descriptionX, yPosition, { width: 230 });
    doc.text(item.quantity.toString(), quantityX, yPosition);
    doc.text(item.unit_price.toFixed(2) + ' €', priceX, yPosition);
    doc.text(item.total.toFixed(2) + ' €', totalX, yPosition);
    yPosition += itemHeight;
  });

  yPosition += 10;
  doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();

  // Totaux
  yPosition += 20;
  const totalsX = 380;
  doc.font('Helvetica');
  doc.text('Sous-total:', totalsX, yPosition);
  doc.text(invoice.subtotal.toFixed(2) + ' €', totalX, yPosition);

  if (invoice.discount > 0) {
    yPosition += 20;
    doc.text('Remise:', totalsX, yPosition);
    doc.text('-' + invoice.discount.toFixed(2) + ' €', totalX, yPosition);
  }

  yPosition += 20;
  doc.text(`TVA (${invoice.tax_rate}%):`, totalsX, yPosition);
  doc.text(invoice.tax_amount.toFixed(2) + ' €', totalX, yPosition);

  yPosition += 25;
  doc.font('Helvetica-Bold').fontSize(13);
  doc.text('TOTAL TTC:', totalsX, yPosition);
  doc.text(invoice.total.toFixed(2) + ' €', totalX, yPosition);

  // Notes
  if (invoice.notes) {
    yPosition += 50;
    doc.font('Helvetica').fontSize(10);
    doc.text('Notes:', 50, yPosition, { underline: true });
    yPosition += 15;
    doc.text(invoice.notes, 50, yPosition, { width: 500 });
  }

  // Pied de page
  doc.fontSize(9).font('Helvetica').text(
    'Merci pour votre confiance',
    50,
    doc.page.height - 50,
    { align: 'center' }
  );

  doc.end();

  logger.info(`PDF généré pour la facture ${req.params.id}`);
}));

// GET statistiques des factures
router.get('/stats/summary', asyncHandler(async (req, res) => {
  const stats = await database.get(`
    SELECT
      COUNT(*) as total_invoices,
      SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft_count,
      SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent_count,
      SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_count,
      SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count,
      SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END) as total_paid,
      SUM(CASE WHEN status = 'sent' THEN total ELSE 0 END) as total_pending,
      SUM(total) as total_amount
    FROM invoices
  `);

  res.json(stats);
}));

module.exports = router;
