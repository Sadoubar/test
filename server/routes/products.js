const express = require('express');
const router = express.Router();
const database = require('../database');
const { asyncHandler, NotFoundError } = require('../middleware/errorHandler');
const { productValidators } = require('../middleware/validators');
const logger = require('../config/logger');

// GET tous les produits
router.get('/', asyncHandler(async (req, res) => {
  const { search, limit = 100, offset = 0 } = req.query;

  let sql = 'SELECT * FROM products';
  const params = [];

  if (search) {
    sql += ' WHERE name LIKE ? OR description LIKE ?';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm);
  }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const products = await database.all(sql, params);

  logger.info(`Récupération de ${products.length} produits`);
  res.json(products);
}));

// GET un produit par ID
router.get('/:id', productValidators.getById, asyncHandler(async (req, res) => {
  const product = await database.get(
    'SELECT * FROM products WHERE id = ?',
    [req.params.id]
  );

  if (!product) {
    throw new NotFoundError('Produit non trouvé');
  }

  res.json(product);
}));

// POST créer un nouveau produit
router.post('/', productValidators.create, asyncHandler(async (req, res) => {
  const { name, description, price, unit } = req.body;

  const sql = `
    INSERT INTO products (name, description, price, unit)
    VALUES (?, ?, ?, ?)
  `;

  const result = await database.run(
    sql,
    [name, description, price, unit || 'unité']
  );

  logger.info(`Produit créé avec l'ID ${result.lastID}`);

  res.status(201).json({
    id: result.lastID,
    message: 'Produit créé avec succès'
  });
}));

// PUT mettre à jour un produit
router.put('/:id', productValidators.update, asyncHandler(async (req, res) => {
  const { name, description, price, unit } = req.body;

  const sql = `
    UPDATE products
    SET name = COALESCE(?, name),
        description = COALESCE(?, description),
        price = COALESCE(?, price),
        unit = COALESCE(?, unit),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  const result = await database.run(
    sql,
    [name, description, price, unit, req.params.id]
  );

  if (result.changes === 0) {
    throw new NotFoundError('Produit non trouvé');
  }

  logger.info(`Produit ${req.params.id} mis à jour`);

  res.json({ message: 'Produit mis à jour avec succès' });
}));

// DELETE supprimer un produit
router.delete('/:id', productValidators.delete, asyncHandler(async (req, res) => {
  const result = await database.run(
    'DELETE FROM products WHERE id = ?',
    [req.params.id]
  );

  if (result.changes === 0) {
    throw new NotFoundError('Produit non trouvé');
  }

  logger.info(`Produit ${req.params.id} supprimé`);

  res.json({ message: 'Produit supprimé avec succès' });
}));

module.exports = router;
