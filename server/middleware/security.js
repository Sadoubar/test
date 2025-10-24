const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('../config/config');
const logger = require('../config/logger');

// Configuration Helmet pour la sécurité des en-têtes HTTP
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// Rate limiting pour prévenir les abus
const createRateLimiter = (options = {}) => {
  return rateLimit({
    windowMs: options.windowMs || config.security.rateLimitWindowMs,
    max: options.max || config.security.rateLimitMaxRequests,
    message: {
      status: 'error',
      message: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting pour les tests
      if (config.isTest()) {
        return true;
      }
      return false;
    },
    handler: (req, res) => {
      logger.warn({
        message: 'Rate limit exceeded',
        ip: req.ip,
        url: req.originalUrl
      });
      res.status(429).json({
        status: 'error',
        message: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.'
      });
    }
  });
};

// Rate limiter général (100 requêtes par 15 minutes)
const generalLimiter = createRateLimiter();

// Rate limiter strict pour les opérations sensibles (10 requêtes par 15 minutes)
const strictLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10
});

// Rate limiter pour la création (30 requêtes par 15 minutes)
const createLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30
});

// Middleware pour sanitiser les entrées
const sanitizeInput = (req, res, next) => {
  // Nettoyer les chaînes de caractères pour éviter les injections
  const sanitize = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === 'string') {
        // Supprimer les caractères potentiellement dangereux
        obj[key] = obj[key].replace(/[<>]/g, '');
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitize(obj[key]);
      }
    }
  };

  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);

  next();
};

// Middleware pour logger les requêtes suspectes
const logSuspiciousActivity = (req, res, next) => {
  const suspiciousPatterns = [
    /(\%27)|(\')|(\-\-)|(\%23)|(#)/i, // SQL injection
    /(<|%3C)script(>|%3E)/i, // XSS
    /(\.\.\/|\.\.\\)/i // Path traversal
  ];

  const checkString = `${req.url}${JSON.stringify(req.body)}${JSON.stringify(req.query)}`;

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(checkString)) {
      logger.warn({
        message: 'Suspicious activity detected',
        ip: req.ip,
        url: req.originalUrl,
        method: req.method,
        userAgent: req.get('user-agent')
      });
      break;
    }
  }

  next();
};

module.exports = {
  helmetConfig,
  generalLimiter,
  strictLimiter,
  createLimiter,
  sanitizeInput,
  logSuspiciousActivity
};
