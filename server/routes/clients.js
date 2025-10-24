const express = require('express');
const router = express.Router();
const database = require('../database');
const { asyncHandler, NotFoundError } = require('../middleware/errorHandler');
const { clientValidators } = require('../middleware/validators');
const logger = require('../config/logger');

// GET tous les clients
router.get('/', asyncHandler(async (req, res) => {
  const { search, limit = 100, offset = 0 } = req.query;

  let sql = 'SELECT * FROM clients';
  const params = [];

  if (search) {
    sql += ' WHERE name LIKE ? OR email LIKE ? OR phone LIKE ?';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const clients = await database.all(sql, params);

  logger.info(`Récupération de ${clients.length} clients`);
  res.json(clients);
}));

// GET un client par ID
router.get('/:id', clientValidators.getById, asyncHandler(async (req, res) => {
  const client = await database.get(
    'SELECT * FROM clients WHERE id = ?',
    [req.params.id]
  );

  if (!client) {
    throw new NotFoundError('Client non trouvé');
  }

  res.json(client);
}));

// POST créer un nouveau client
router.post('/', clientValidators.create, asyncHandler(async (req, res) => {
  const { name, email, phone, address, city, postal_code, country } = req.body;

  const sql = `
    INSERT INTO clients (name, email, phone, address, city, postal_code, country)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const result = await database.run(
    sql,
    [name, email, phone, address, city, postal_code, country]
  );

  logger.info(`Client créé avec l'ID ${result.lastID}`);

  res.status(201).json({
    id: result.lastID,
    message: 'Client créé avec succès'
  });
}));

// PUT mettre à jour un client
router.put('/:id', clientValidators.update, asyncHandler(async (req, res) => {
  const { name, email, phone, address, city, postal_code, country } = req.body;

  const sql = `
    UPDATE clients
    SET name = COALESCE(?, name),
        email = COALESCE(?, email),
        phone = COALESCE(?, phone),
        address = COALESCE(?, address),
        city = COALESCE(?, city),
        postal_code = COALESCE(?, postal_code),
        country = COALESCE(?, country),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  const result = await database.run(
    sql,
    [name, email, phone, address, city, postal_code, country, req.params.id]
  );

  if (result.changes === 0) {
    throw new NotFoundError('Client non trouvé');
  }

  logger.info(`Client ${req.params.id} mis à jour`);

  res.json({ message: 'Client mis à jour avec succès' });
}));

// DELETE supprimer un client
router.delete('/:id', clientValidators.delete, asyncHandler(async (req, res) => {
  // Vérifier si le client a des factures
  const invoices = await database.all(
    'SELECT id FROM invoices WHERE client_id = ?',
    [req.params.id]
  );

  if (invoices.length > 0) {
    return res.status(400).json({
      error: 'Impossible de supprimer le client car il a des factures associées'
    });
  }

  const result = await database.run(
    'DELETE FROM clients WHERE id = ?',
    [req.params.id]
  );

  if (result.changes === 0) {
    throw new NotFoundError('Client non trouvé');
  }

  logger.info(`Client ${req.params.id} supprimé`);

  res.json({ message: 'Client supprimé avec succès' });
}));

// GET statistiques d'un client
router.get('/:id/stats', clientValidators.getById, asyncHandler(async (req, res) => {
  const client = await database.get(
    'SELECT * FROM clients WHERE id = ?',
    [req.params.id]
  );

  if (!client) {
    throw new NotFoundError('Client non trouvé');
  }

  const stats = await database.get(`
    SELECT
      COUNT(*) as total_invoices,
      SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END) as total_paid,
      SUM(CASE WHEN status = 'sent' THEN total ELSE 0 END) as total_pending,
      SUM(total) as total_amount
    FROM invoices
    WHERE client_id = ?
  `, [req.params.id]);

  res.json({
    client,
    statistics: stats
  });
}));

module.exports = router;
