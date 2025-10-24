const express = require('express');
const router = express.Router();
const db = require('../database');

// GET tous les clients
router.get('/', (req, res) => {
  db.all('SELECT * FROM clients ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// GET un client par ID
router.get('/:id', (req, res) => {
  db.get('SELECT * FROM clients WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }
    res.json(row);
  });
});

// POST créer un nouveau client
router.post('/', (req, res) => {
  const { name, email, phone, address, city, postal_code, country } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Le nom du client est requis' });
  }

  const sql = `
    INSERT INTO clients (name, email, phone, address, city, postal_code, country)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(sql, [name, email, phone, address, city, postal_code, country], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({
      id: this.lastID,
      message: 'Client créé avec succès'
    });
  });
});

// PUT mettre à jour un client
router.put('/:id', (req, res) => {
  const { name, email, phone, address, city, postal_code, country } = req.body;

  const sql = `
    UPDATE clients
    SET name = ?, email = ?, phone = ?, address = ?, city = ?, postal_code = ?, country = ?
    WHERE id = ?
  `;

  db.run(sql, [name, email, phone, address, city, postal_code, country, req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }
    res.json({ message: 'Client mis à jour avec succès' });
  });
});

// DELETE supprimer un client
router.delete('/:id', (req, res) => {
  db.run('DELETE FROM clients WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }
    res.json({ message: 'Client supprimé avec succès' });
  });
});

module.exports = router;
