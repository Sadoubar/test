const express = require('express');
const router = express.Router();
const db = require('../database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuration multer pour l'upload du logo
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads');
    // Créer le dossier s'il n'existe pas
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Seules les images (JPEG, PNG, GIF, SVG) sont autorisées'));
    }
  }
});

// GET /api/settings - Récupérer les paramètres
router.get('/', (req, res) => {
  db.get('SELECT * FROM settings WHERE id = 1', (err, row) => {
    if (err) {
      console.error('Erreur lors de la récupération des paramètres:', err);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    // Si aucune ligne n'existe, créer des paramètres par défaut
    if (!row) {
      db.run(`
        INSERT INTO settings (id, company_name, invoice_footer)
        VALUES (1, 'Mon Entreprise', 'Merci pour votre confiance')
      `, function(err) {
        if (err) {
          console.error('Erreur création paramètres par défaut:', err);
          return res.status(500).json({ error: 'Erreur serveur' });
        }

        db.get('SELECT * FROM settings WHERE id = 1', (err, newRow) => {
          if (err) {
            return res.status(500).json({ error: 'Erreur serveur' });
          }
          res.json(newRow || {});
        });
      });
    } else {
      res.json(row);
    }
  });
});

// PUT /api/settings - Mettre à jour les paramètres
router.put('/', (req, res) => {
  const {
    company_name,
    company_address,
    company_city,
    company_postal_code,
    company_country,
    company_phone,
    company_email,
    company_website,
    company_siret,
    company_tax_id,
    company_capital,
    company_legal_form,
    company_rcs,
    bank_name,
    bank_iban,
    bank_bic,
    terms_and_conditions,
    invoice_footer,
    invoice_prefix,
    default_tax_rate,
    default_payment_terms,
    late_penalty_rate,
    recovery_fee,
    early_payment_discount,
    legal_mentions
  } = req.body;

  const sql = `
    UPDATE settings
    SET company_name = ?,
        company_address = ?,
        company_city = ?,
        company_postal_code = ?,
        company_country = ?,
        company_phone = ?,
        company_email = ?,
        company_website = ?,
        company_siret = ?,
        company_tax_id = ?,
        company_capital = ?,
        company_legal_form = ?,
        company_rcs = ?,
        bank_name = ?,
        bank_iban = ?,
        bank_bic = ?,
        terms_and_conditions = ?,
        invoice_footer = ?,
        invoice_prefix = ?,
        default_tax_rate = ?,
        default_payment_terms = ?,
        late_penalty_rate = ?,
        recovery_fee = ?,
        early_payment_discount = ?,
        legal_mentions = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `;

  const params = [
    company_name,
    company_address,
    company_city,
    company_postal_code,
    company_country,
    company_phone,
    company_email,
    company_website,
    company_siret,
    company_tax_id,
    company_capital,
    company_legal_form,
    company_rcs,
    bank_name,
    bank_iban,
    bank_bic,
    terms_and_conditions,
    invoice_footer,
    invoice_prefix,
    default_tax_rate,
    default_payment_terms,
    late_penalty_rate,
    recovery_fee,
    early_payment_discount,
    legal_mentions
  ];

  db.run(sql, params, function(err) {
    if (err) {
      console.error('Erreur lors de la mise à jour des paramètres:', err);
      return res.status(500).json({ error: 'Erreur lors de la mise à jour' });
    }

    // Récupérer les paramètres mis à jour
    db.get('SELECT * FROM settings WHERE id = 1', (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Erreur serveur' });
      }
      res.json(row);
    });
  });
});

// POST /api/settings/logo - Upload du logo
router.post('/logo', upload.single('logo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Aucun fichier fourni' });
  }

  const logoPath = `/uploads/${req.file.filename}`;

  // Récupérer l'ancien logo pour le supprimer
  db.get('SELECT logo_path FROM settings WHERE id = 1', (err, row) => {
    if (!err && row && row.logo_path) {
      const oldLogoPath = path.join(__dirname, '../..', row.logo_path);
      if (fs.existsSync(oldLogoPath)) {
        fs.unlinkSync(oldLogoPath);
      }
    }

    // Mettre à jour le chemin du logo
    db.run(
      'UPDATE settings SET logo_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
      [logoPath],
      function(err) {
        if (err) {
          console.error('Erreur lors de la mise à jour du logo:', err);
          return res.status(500).json({ error: 'Erreur lors de la mise à jour' });
        }

        res.json({
          message: 'Logo uploadé avec succès',
          logo_path: logoPath
        });
      }
    );
  });
});

// DELETE /api/settings/logo - Supprimer le logo
router.delete('/logo', (req, res) => {
  db.get('SELECT logo_path FROM settings WHERE id = 1', (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    if (!row || !row.logo_path) {
      return res.status(404).json({ error: 'Aucun logo à supprimer' });
    }

    const logoPath = path.join(__dirname, '../..', row.logo_path);
    if (fs.existsSync(logoPath)) {
      fs.unlinkSync(logoPath);
    }

    db.run(
      'UPDATE settings SET logo_path = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
      function(err) {
        if (err) {
          console.error('Erreur lors de la suppression du logo:', err);
          return res.status(500).json({ error: 'Erreur lors de la suppression' });
        }

        res.json({ message: 'Logo supprimé avec succès' });
      }
    );
  });
});

// POST /api/settings/signature - Upload de la signature/cachet
router.post('/signature', upload.single('signature'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Aucun fichier fourni' });
  }

  const signaturePath = `/uploads/${req.file.filename}`;

  // Récupérer l'ancienne signature pour la supprimer
  db.get('SELECT signature_path FROM settings WHERE id = 1', (err, row) => {
    if (!err && row && row.signature_path) {
      const oldSignaturePath = path.join(__dirname, '../..', row.signature_path);
      if (fs.existsSync(oldSignaturePath)) {
        fs.unlinkSync(oldSignaturePath);
      }
    }

    // Mettre à jour le chemin de la signature
    db.run(
      'UPDATE settings SET signature_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
      [signaturePath],
      function(err) {
        if (err) {
          console.error('Erreur lors de la mise à jour de la signature:', err);
          return res.status(500).json({ error: 'Erreur lors de la mise à jour' });
        }

        res.json({
          message: 'Signature uploadée avec succès',
          signature_path: signaturePath
        });
      }
    );
  });
});

// DELETE /api/settings/signature - Supprimer la signature
router.delete('/signature', (req, res) => {
  db.get('SELECT signature_path FROM settings WHERE id = 1', (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    if (!row || !row.signature_path) {
      return res.status(404).json({ error: 'Aucune signature à supprimer' });
    }

    const signaturePath = path.join(__dirname, '../..', row.signature_path);
    if (fs.existsSync(signaturePath)) {
      fs.unlinkSync(signaturePath);
    }

    db.run(
      'UPDATE settings SET signature_path = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
      function(err) {
        if (err) {
          console.error('Erreur lors de la suppression de la signature:', err);
          return res.status(500).json({ error: 'Erreur lors de la suppression' });
        }

        res.json({ message: 'Signature supprimée avec succès' });
      }
    );
  });
});

module.exports = router;
