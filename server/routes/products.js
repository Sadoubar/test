const express = require('express');
const router = express.Router();
const db = require('../database');

// GET tous les produits
router.get('/', (req, res) => {
  db.all('SELECT * FROM products ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// GET un produit par ID
router.get('/:id', (req, res) => {
  db.get('SELECT * FROM products WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }
    res.json(row);
  });
});

// POST créer un nouveau produit
router.post('/', (req, res) => {
  const { name, description, price, unit } = req.body;

  if (!name || !price) {
    return res.status(400).json({ error: 'Le nom et le prix sont requis' });
  }

  const sql = `
    INSERT INTO products (name, description, price, unit)
    VALUES (?, ?, ?, ?)
  `;

  db.run(sql, [name, description, price, unit || 'unité'], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({
      id: this.lastID,
      message: 'Produit créé avec succès'
    });
  });
});

// PUT mettre à jour un produit
router.put('/:id', (req, res) => {
  const { name, description, price, unit } = req.body;

  const sql = `
    UPDATE products
    SET name = ?, description = ?, price = ?, unit = ?
    WHERE id = ?
  `;

  db.run(sql, [name, description, price, unit, req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }
    res.json({ message: 'Produit mis à jour avec succès' });
  });
});

// DELETE supprimer un produit
router.delete('/:id', (req, res) => {
  db.run('DELETE FROM products WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }
    res.json({ message: 'Produit supprimé avec succès' });
  });
});

module.exports = router;
