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

  // Charger les paramètres de l'entreprise
  db.get('SELECT * FROM settings WHERE id = 1', (err, settings) => {
    if (err) {
      console.error('Erreur chargement settings:', err);
    }

    // Utiliser des valeurs par défaut si pas de settings
    if (!settings) {
      settings = {
        company_name: 'Mon Entreprise',
        invoice_footer: 'Merci pour votre confiance'
      };
    }

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

        let yPosition = 50;

        // Logo de l'entreprise (si disponible)
        if (settings.logo_path) {
          try {
            const path = require('path');
            const logoPath = path.join(__dirname, '../..', settings.logo_path);
            const fs = require('fs');
            if (fs.existsSync(logoPath)) {
              doc.image(logoPath, 50, yPosition, { width: 120, height: 60, fit: [120, 60] });
            }
          } catch (error) {
            console.error('Erreur chargement logo:', error);
          }
        }

        // Informations de l'entreprise (en haut à droite)
        yPosition = 50;
        doc.fontSize(12).font('Helvetica-Bold');
        if (settings.company_name) {
          doc.text(settings.company_name, 300, yPosition, { align: 'right' });
          yPosition += 15;
        }
        doc.fontSize(9).font('Helvetica');
        if (settings.company_address) {
          doc.text(settings.company_address, 300, yPosition, { align: 'right' });
          yPosition += 12;
        }
        if (settings.company_city) {
          doc.text(`${settings.company_postal_code || ''} ${settings.company_city}`, 300, yPosition, { align: 'right' });
          yPosition += 12;
        }
        if (settings.company_country) {
          doc.text(settings.company_country, 300, yPosition, { align: 'right' });
          yPosition += 12;
        }
        if (settings.company_phone) {
          doc.text(`Tél: ${settings.company_phone}`, 300, yPosition, { align: 'right' });
          yPosition += 12;
        }
        if (settings.company_email) {
          doc.text(`Email: ${settings.company_email}`, 300, yPosition, { align: 'right' });
          yPosition += 12;
        }
        if (settings.company_siret) {
          doc.text(`SIRET: ${settings.company_siret}`, 300, yPosition, { align: 'right' });
          yPosition += 12;
        }
        if (settings.company_tax_id) {
          doc.text(`TVA: ${settings.company_tax_id}`, 300, yPosition, { align: 'right' });
          yPosition += 12;
        }
        if (settings.company_rcs) {
          doc.text(settings.company_rcs, 300, yPosition, { align: 'right' });
          yPosition += 12;
        }
        if (settings.company_capital) {
          doc.text(`Capital: ${settings.company_capital}`, 300, yPosition, { align: 'right' });
        }

        // Titre FACTURE
        yPosition = 140;
        doc.fontSize(24).font('Helvetica-Bold').text('FACTURE', 50, yPosition, { align: 'center' });

        // Informations de facture
        yPosition = 180;
        doc.fontSize(11).font('Helvetica');
        doc.text(`N° ${invoice.invoice_number}`, 350, yPosition, { align: 'right' });
        yPosition += 15;
        doc.text(`Date: ${invoice.issue_date}`, 350, yPosition, { align: 'right' });
        if (invoice.due_date) {
          yPosition += 15;
          doc.text(`Échéance: ${invoice.due_date}`, 350, yPosition, { align: 'right' });
        }

        // Informations client
        yPosition = 180;
        doc.fontSize(12).font('Helvetica-Bold').text('Facturé à:', 50, yPosition);
        yPosition += 15;
        doc.fontSize(10).font('Helvetica');
        doc.text(invoice.client_name, 50, yPosition);
        yPosition += 12;
        if (invoice.client_address) {
          doc.text(invoice.client_address, 50, yPosition);
          yPosition += 12;
        }
        if (invoice.client_city) {
          doc.text(`${invoice.client_postal_code || ''} ${invoice.client_city}`, 50, yPosition);
          yPosition += 12;
        }
        if (invoice.client_country) {
          doc.text(invoice.client_country, 50, yPosition);
          yPosition += 12;
        }
        if (invoice.client_email) {
          doc.text(`Email: ${invoice.client_email}`, 50, yPosition);
          yPosition += 12;
        }
        if (invoice.client_phone) {
          doc.text(`Tél: ${invoice.client_phone}`, 50, yPosition);
        }

        // Tableau des articles
        yPosition = 300;
        const descriptionX = 50;
        const quantityX = 350;
        const priceX = 420;
        const totalX = 490;

        // En-têtes du tableau
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Description', descriptionX, yPosition);
        doc.text('Qté', quantityX, yPosition);
        doc.text('Prix unit.', priceX, yPosition);
        doc.text('Total', totalX, yPosition);

        yPosition += 5;
        doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();
        yPosition += 10;

        // Lignes du tableau
        doc.font('Helvetica').fontSize(9);
        items.forEach(item => {
          doc.text(item.description, descriptionX, yPosition, { width: 290 });
          doc.text(item.quantity.toString(), quantityX, yPosition);
          doc.text(item.unit_price.toFixed(2) + ' €', priceX, yPosition);
          doc.text(item.total.toFixed(2) + ' €', totalX, yPosition);
          yPosition += 25;
        });

        yPosition += 5;
        doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();

        // Totaux
        yPosition += 15;
        const totalsX = 420;
        doc.font('Helvetica').fontSize(10);
        doc.text('Sous-total:', totalsX, yPosition);
        doc.text(invoice.subtotal.toFixed(2) + ' €', totalX, yPosition);

        if (invoice.discount > 0) {
          yPosition += 15;
          doc.text('Remise:', totalsX, yPosition);
          doc.text('-' + invoice.discount.toFixed(2) + ' €', totalX, yPosition);
        }

        yPosition += 15;
        doc.text(`TVA (${invoice.tax_rate}%):`, totalsX, yPosition);
        doc.text(invoice.tax_amount.toFixed(2) + ' €', totalX, yPosition);

        yPosition += 20;
        doc.font('Helvetica-Bold').fontSize(12);
        doc.text('TOTAL:', totalsX, yPosition);
        doc.text(invoice.total.toFixed(2) + ' €', totalX, yPosition);

        // Escompte pour paiement anticipé
        if (settings.early_payment_discount && settings.early_payment_discount > 0) {
          yPosition += 18;
          doc.font('Helvetica').fontSize(9);
          doc.text(`Escompte pour paiement anticipé: ${settings.early_payment_discount}%`, 50, yPosition);
        }

        // Coordonnées bancaires et modalités de paiement
        yPosition += 35;
        doc.font('Helvetica-Bold').fontSize(10);
        doc.text('Modalités de paiement', 50, yPosition);
        yPosition += 15;
        doc.font('Helvetica').fontSize(9);

        const paymentTerms = settings.default_payment_terms || 30;
        doc.text(`Date d'échéance: ${invoice.due_date || 'À réception'}`, 50, yPosition);
        yPosition += 12;
        doc.text(`Conditions de règlement: Paiement à ${paymentTerms} jours`, 50, yPosition);
        yPosition += 12;

        if (settings.bank_iban || settings.bank_bic) {
          yPosition += 5;
          doc.font('Helvetica-Bold').fontSize(9);
          doc.text('Coordonnées bancaires:', 50, yPosition);
          yPosition += 12;
          doc.font('Helvetica').fontSize(9);
          if (settings.bank_name) {
            doc.text(`Banque: ${settings.bank_name}`, 50, yPosition);
            yPosition += 12;
          }
          if (settings.bank_iban) {
            doc.text(`IBAN: ${settings.bank_iban}`, 50, yPosition);
            yPosition += 12;
          }
          if (settings.bank_bic) {
            doc.text(`BIC: ${settings.bank_bic}`, 50, yPosition);
          }
        }

        // Notes
        if (invoice.notes) {
          yPosition += 30;
          doc.font('Helvetica-Bold').fontSize(10);
          doc.text('Notes:', 50, yPosition);
          yPosition += 15;
          doc.font('Helvetica').fontSize(9);
          doc.text(invoice.notes, 50, yPosition, { width: 500 });
        }

        // Signature / Cachet
        if (settings.signature_path) {
          try {
            const path = require('path');
            const signaturePath = path.join(__dirname, '../..', settings.signature_path);
            const fs = require('fs');
            if (fs.existsSync(signaturePath)) {
              yPosition += 40;
              doc.fontSize(9).font('Helvetica');
              doc.text('Signature / Cachet de l\'entreprise', 350, yPosition);
              yPosition += 10;
              doc.image(signaturePath, 350, yPosition, { width: 150, height: 75, fit: [150, 75] });
            }
          } catch (error) {
            console.error('Erreur chargement signature:', error);
          }
        }

        // Mentions légales obligatoires
        let footerYPosition = doc.page.height - 200;

        if (settings.legal_mentions) {
          doc.font('Helvetica-Bold').fontSize(7);
          doc.text('Mentions légales:', 50, footerYPosition);
          footerYPosition += 10;
          doc.font('Helvetica').fontSize(6.5);
          doc.text(settings.legal_mentions, 50, footerYPosition, { width: 500, lineGap: 1.5 });
          footerYPosition += 35;
        }

        // Conditions de vente
        if (settings.terms_and_conditions) {
          doc.font('Helvetica-Bold').fontSize(7);
          doc.text('Conditions générales de vente:', 50, footerYPosition);
          footerYPosition += 10;
          doc.font('Helvetica').fontSize(6.5);
          doc.text(settings.terms_and_conditions, 50, footerYPosition, { width: 500, lineGap: 1.5 });
        }

        // Pied de page
        const footerText = settings.invoice_footer || 'Merci pour votre confiance';
        doc.fontSize(9).font('Helvetica-Bold').text(
          footerText,
          50,
          doc.page.height - 40,
          { align: 'center' }
        );

        doc.end();
      });
    });
  });
});

module.exports = router;
