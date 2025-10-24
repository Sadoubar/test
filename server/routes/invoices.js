const express = require('express');
const router = express.Router();
const db = require('../database');
const PDFDocument = require('pdfkit');

// GET toutes les factures
router.get('/', (req, res) => {
  const sql = `
    SELECT i.*, c.name as client_name, c.email as client_email
    FROM invoices i
    LEFT JOIN clients c ON i.client_id = c.id
    ORDER BY i.created_at DESC
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// GET une facture par ID avec ses lignes
router.get('/:id', (req, res) => {
  const invoiceSql = `
    SELECT i.*, c.name as client_name, c.email as client_email,
           c.address as client_address, c.city as client_city,
           c.postal_code as client_postal_code, c.country as client_country
    FROM invoices i
    LEFT JOIN clients c ON i.client_id = c.id
    WHERE i.id = ?
  `;

  db.get(invoiceSql, [req.params.id], (err, invoice) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!invoice) {
      return res.status(404).json({ error: 'Facture non trouvée' });
    }

    const itemsSql = 'SELECT * FROM invoice_items WHERE invoice_id = ?';
    db.all(itemsSql, [req.params.id], (err, items) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      invoice.items = items;
      res.json(invoice);
    });
  });
});

// POST créer une nouvelle facture
router.post('/', (req, res) => {
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

  if (!invoice_number || !client_id || !issue_date || !items || items.length === 0) {
    return res.status(400).json({ error: 'Données manquantes' });
  }

  // Calculer les totaux
  let subtotal = 0;
  items.forEach(item => {
    item.total = item.quantity * item.unit_price;
    subtotal += item.total;
  });

  const discountAmount = discount || 0;
  const subtotalAfterDiscount = subtotal - discountAmount;
  const taxAmount = (subtotalAfterDiscount * (tax_rate || 20)) / 100;
  const total = subtotalAfterDiscount + taxAmount;

  const invoiceSql = `
    INSERT INTO invoices (invoice_number, client_id, issue_date, due_date, subtotal, tax_rate, tax_amount, discount, total, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(
    invoiceSql,
    [invoice_number, client_id, issue_date, due_date, subtotal, tax_rate || 20, taxAmount, discountAmount, total, status || 'draft', notes],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const invoiceId = this.lastID;

      // Insérer les lignes de facture
      const itemSql = `
        INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit_price, total)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      let completed = 0;
      items.forEach(item => {
        db.run(itemSql, [invoiceId, item.product_id, item.description, item.quantity, item.unit_price, item.total], (err) => {
          if (err) {
            console.error('Erreur lors de l\'insertion d\'une ligne:', err);
          }
          completed++;
          if (completed === items.length) {
            res.status(201).json({
              id: invoiceId,
              message: 'Facture créée avec succès'
            });
          }
        });
      });
    }
  );
});

// PUT mettre à jour une facture
router.put('/:id', (req, res) => {
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

  // Calculer les totaux
  let subtotal = 0;
  items.forEach(item => {
    item.total = item.quantity * item.unit_price;
    subtotal += item.total;
  });

  const discountAmount = discount || 0;
  const subtotalAfterDiscount = subtotal - discountAmount;
  const taxAmount = (subtotalAfterDiscount * (tax_rate || 20)) / 100;
  const total = subtotalAfterDiscount + taxAmount;

  const invoiceSql = `
    UPDATE invoices
    SET invoice_number = ?, client_id = ?, issue_date = ?, due_date = ?,
        subtotal = ?, tax_rate = ?, tax_amount = ?, discount = ?, total = ?,
        status = ?, notes = ?
    WHERE id = ?
  `;

  db.run(
    invoiceSql,
    [invoice_number, client_id, issue_date, due_date, subtotal, tax_rate || 20, taxAmount, discountAmount, total, status, notes, req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Facture non trouvée' });
      }

      // Supprimer les anciennes lignes
      db.run('DELETE FROM invoice_items WHERE invoice_id = ?', [req.params.id], (err) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        // Insérer les nouvelles lignes
        const itemSql = `
          INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit_price, total)
          VALUES (?, ?, ?, ?, ?, ?)
        `;

        let completed = 0;
        items.forEach(item => {
          db.run(itemSql, [req.params.id, item.product_id, item.description, item.quantity, item.unit_price, item.total], (err) => {
            if (err) {
              console.error('Erreur lors de l\'insertion d\'une ligne:', err);
            }
            completed++;
            if (completed === items.length) {
              res.json({ message: 'Facture mise à jour avec succès' });
            }
          });
        });
      });
    }
  );
});

// DELETE supprimer une facture
router.delete('/:id', (req, res) => {
  // Supprimer d'abord les lignes (CASCADE devrait le faire, mais on s'assure)
  db.run('DELETE FROM invoice_items WHERE invoice_id = ?', [req.params.id], (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    db.run('DELETE FROM invoices WHERE id = ?', [req.params.id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Facture non trouvée' });
      }
      res.json({ message: 'Facture supprimée avec succès' });
    });
  });
});

// GET générer PDF d'une facture
router.get('/:id/pdf', (req, res) => {
  const invoiceSql = `
    SELECT i.*, c.name as client_name, c.email as client_email,
           c.address as client_address, c.city as client_city,
           c.postal_code as client_postal_code, c.country as client_country,
           c.phone as client_phone
    FROM invoices i
    LEFT JOIN clients c ON i.client_id = c.id
    WHERE i.id = ?
  `;

  db.get(invoiceSql, [req.params.id], (err, invoice) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!invoice) {
      return res.status(404).json({ error: 'Facture non trouvée' });
    }

    const itemsSql = 'SELECT * FROM invoice_items WHERE invoice_id = ?';
    db.all(itemsSql, [req.params.id], (err, items) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Générer le PDF
      const doc = new PDFDocument({ margin: 50 });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=facture-${invoice.invoice_number}.pdf`);

      doc.pipe(res);

      // En-tête
      doc.fontSize(20).text('FACTURE', { align: 'center' });
      doc.moveDown();

      // Informations de facture
      doc.fontSize(12).text(`N° ${invoice.invoice_number}`, { align: 'right' });
      doc.text(`Date: ${invoice.issue_date}`, { align: 'right' });
      if (invoice.due_date) {
        doc.text(`Échéance: ${invoice.due_date}`, { align: 'right' });
      }
      doc.moveDown();

      // Informations client
      doc.fontSize(14).text('Client:', { underline: true });
      doc.fontSize(12).text(invoice.client_name);
      if (invoice.client_address) {
        doc.text(invoice.client_address);
      }
      if (invoice.client_city) {
        doc.text(`${invoice.client_postal_code || ''} ${invoice.client_city}`);
      }
      if (invoice.client_country) {
        doc.text(invoice.client_country);
      }
      if (invoice.client_email) {
        doc.text(invoice.client_email);
      }
      if (invoice.client_phone) {
        doc.text(invoice.client_phone);
      }
      doc.moveDown(2);

      // Tableau des articles
      const tableTop = doc.y;
      const itemCodeX = 50;
      const descriptionX = 150;
      const quantityX = 350;
      const priceX = 400;
      const totalX = 480;

      // En-têtes du tableau
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Description', descriptionX, tableTop);
      doc.text('Qté', quantityX, tableTop);
      doc.text('Prix', priceX, tableTop);
      doc.text('Total', totalX, tableTop);

      doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

      // Lignes du tableau
      doc.font('Helvetica');
      let yPosition = tableTop + 25;
      items.forEach(item => {
        doc.text(item.description, descriptionX, yPosition, { width: 180 });
        doc.text(item.quantity.toString(), quantityX, yPosition);
        doc.text(item.unit_price.toFixed(2) + ' €', priceX, yPosition);
        doc.text(item.total.toFixed(2) + ' €', totalX, yPosition);
        yPosition += 25;
      });

      doc.moveDown();
      yPosition += 20;
      doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();

      // Totaux
      yPosition += 15;
      const totalsX = 400;
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
      doc.font('Helvetica-Bold').fontSize(12);
      doc.text('TOTAL:', totalsX, yPosition);
      doc.text(invoice.total.toFixed(2) + ' €', totalX, yPosition);

      // Notes
      if (invoice.notes) {
        doc.moveDown(3);
        doc.font('Helvetica').fontSize(10);
        doc.text('Notes:', { underline: true });
        doc.text(invoice.notes);
      }

      // Pied de page
      doc.fontSize(8).text(
        'Merci pour votre confiance',
        50,
        doc.page.height - 50,
        { align: 'center' }
      );

      doc.end();
    });
  });
});

module.exports = router;
