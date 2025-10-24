const { body, param, validationResult } = require('express-validator');
const { ValidationError } = require('./errorHandler');

// Middleware pour vérifier les résultats de validation
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => `${err.path}: ${err.msg}`).join(', ');
    return next(new ValidationError(errorMessages));
  }
  next();
};

// Validateurs pour les clients
const clientValidators = {
  create: [
    body('name')
      .trim()
      .notEmpty().withMessage('Le nom est requis')
      .isLength({ min: 2, max: 100 }).withMessage('Le nom doit contenir entre 2 et 100 caractères'),
    body('email')
      .optional()
      .trim()
      .isEmail().withMessage('Email invalide')
      .normalizeEmail(),
    body('phone')
      .optional()
      .trim()
      .matches(/^[\d\s\+\-\(\)]+$/).withMessage('Numéro de téléphone invalide'),
    body('address')
      .optional()
      .trim()
      .isLength({ max: 200 }).withMessage('L\'adresse ne peut pas dépasser 200 caractères'),
    body('city')
      .optional()
      .trim()
      .isLength({ max: 100 }).withMessage('La ville ne peut pas dépasser 100 caractères'),
    body('postal_code')
      .optional()
      .trim()
      .isLength({ max: 20 }).withMessage('Le code postal ne peut pas dépasser 20 caractères'),
    body('country')
      .optional()
      .trim()
      .isLength({ max: 100 }).withMessage('Le pays ne peut pas dépasser 100 caractères'),
    validate
  ],
  update: [
    param('id').isInt({ min: 1 }).withMessage('ID invalide'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 }).withMessage('Le nom doit contenir entre 2 et 100 caractères'),
    body('email')
      .optional()
      .trim()
      .isEmail().withMessage('Email invalide')
      .normalizeEmail(),
    body('phone')
      .optional()
      .trim()
      .matches(/^[\d\s\+\-\(\)]+$/).withMessage('Numéro de téléphone invalide'),
    validate
  ],
  delete: [
    param('id').isInt({ min: 1 }).withMessage('ID invalide'),
    validate
  ],
  getById: [
    param('id').isInt({ min: 1 }).withMessage('ID invalide'),
    validate
  ]
};

// Validateurs pour les produits
const productValidators = {
  create: [
    body('name')
      .trim()
      .notEmpty().withMessage('Le nom est requis')
      .isLength({ min: 2, max: 100 }).withMessage('Le nom doit contenir entre 2 et 100 caractères'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('La description ne peut pas dépasser 500 caractères'),
    body('price')
      .isFloat({ min: 0 }).withMessage('Le prix doit être un nombre positif')
      .toFloat(),
    body('unit')
      .optional()
      .trim()
      .isLength({ max: 50 }).withMessage('L\'unité ne peut pas dépasser 50 caractères'),
    validate
  ],
  update: [
    param('id').isInt({ min: 1 }).withMessage('ID invalide'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 }).withMessage('Le nom doit contenir entre 2 et 100 caractères'),
    body('price')
      .optional()
      .isFloat({ min: 0 }).withMessage('Le prix doit être un nombre positif')
      .toFloat(),
    validate
  ],
  delete: [
    param('id').isInt({ min: 1 }).withMessage('ID invalide'),
    validate
  ],
  getById: [
    param('id').isInt({ min: 1 }).withMessage('ID invalide'),
    validate
  ]
};

// Validateurs pour les factures
const invoiceValidators = {
  create: [
    body('invoice_number')
      .trim()
      .notEmpty().withMessage('Le numéro de facture est requis')
      .isLength({ max: 50 }).withMessage('Le numéro de facture ne peut pas dépasser 50 caractères'),
    body('client_id')
      .isInt({ min: 1 }).withMessage('ID client invalide')
      .toInt(),
    body('issue_date')
      .notEmpty().withMessage('La date d\'émission est requise')
      .isISO8601().withMessage('Date invalide')
      .toDate(),
    body('due_date')
      .optional()
      .isISO8601().withMessage('Date d\'échéance invalide')
      .toDate(),
    body('tax_rate')
      .optional()
      .isFloat({ min: 0, max: 100 }).withMessage('Le taux de TVA doit être entre 0 et 100')
      .toFloat(),
    body('discount')
      .optional()
      .isFloat({ min: 0 }).withMessage('La remise doit être un nombre positif')
      .toFloat(),
    body('status')
      .optional()
      .isIn(['draft', 'sent', 'paid', 'cancelled']).withMessage('Statut invalide'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 1000 }).withMessage('Les notes ne peuvent pas dépasser 1000 caractères'),
    body('items')
      .isArray({ min: 1 }).withMessage('Au moins un article est requis'),
    body('items.*.description')
      .trim()
      .notEmpty().withMessage('La description de l\'article est requise'),
    body('items.*.quantity')
      .isFloat({ min: 0.01 }).withMessage('La quantité doit être supérieure à 0')
      .toFloat(),
    body('items.*.unit_price')
      .isFloat({ min: 0 }).withMessage('Le prix unitaire doit être un nombre positif')
      .toFloat(),
    validate
  ],
  update: [
    param('id').isInt({ min: 1 }).withMessage('ID invalide'),
    body('invoice_number')
      .optional()
      .trim()
      .isLength({ max: 50 }).withMessage('Le numéro de facture ne peut pas dépasser 50 caractères'),
    body('client_id')
      .optional()
      .isInt({ min: 1 }).withMessage('ID client invalide')
      .toInt(),
    body('issue_date')
      .optional()
      .isISO8601().withMessage('Date invalide')
      .toDate(),
    body('items')
      .optional()
      .isArray({ min: 1 }).withMessage('Au moins un article est requis'),
    validate
  ],
  delete: [
    param('id').isInt({ min: 1 }).withMessage('ID invalide'),
    validate
  ],
  getById: [
    param('id').isInt({ min: 1 }).withMessage('ID invalide'),
    validate
  ]
};

module.exports = {
  validate,
  clientValidators,
  productValidators,
  invoiceValidators
};
