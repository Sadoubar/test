const logger = require('../config/logger');
const config = require('../config/config');

// Classes d'erreurs personnalisées
class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Ressource non trouvée') {
    super(message, 404);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Non autorisé') {
    super(message, 401);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Accès interdit') {
    super(message, 403);
  }
}

class DatabaseError extends AppError {
  constructor(message = 'Erreur de base de données') {
    super(message, 500, false);
  }
}

// Middleware de gestion d'erreurs
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Logger l'erreur
  if (err.statusCode >= 500) {
    logger.error({
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userId: req.user?.id
    });
  } else {
    logger.warn({
      message: err.message,
      url: req.originalUrl,
      method: req.method,
      statusCode: err.statusCode
    });
  }

  // Réponse en mode développement (détails complets)
  if (config.isDevelopment()) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  }

  // Réponse en mode production (sécurisée)
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  }

  // Erreur non opérationnelle (bug de programmation)
  return res.status(500).json({
    status: 'error',
    message: 'Une erreur est survenue sur le serveur'
  });
};

// Middleware pour les routes non trouvées
const notFoundHandler = (req, res, next) => {
  next(new NotFoundError(`Route ${req.originalUrl} non trouvée`));
};

// Wrapper pour les fonctions async (évite les try-catch répétitifs)
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  DatabaseError,
  errorHandler,
  notFoundHandler,
  asyncHandler
};
