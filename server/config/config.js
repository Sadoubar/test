require('dotenv').config();

module.exports = {
  // Serveur
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  host: process.env.HOST || '0.0.0.0',

  // Base de données
  database: {
    path: process.env.DB_PATH || './billing.db'
  },

  // Sécurité
  security: {
    jwtSecret: process.env.JWT_SECRET || 'change-this-secret-in-production',
    corsOrigin: process.env.CORS_ORIGIN || '*',
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    dir: process.env.LOG_DIR || './logs'
  },

  // Informations de l'entreprise pour les factures
  company: {
    name: process.env.COMPANY_NAME || 'Votre Entreprise',
    address: process.env.COMPANY_ADDRESS || '',
    city: process.env.COMPANY_CITY || '',
    country: process.env.COMPANY_COUNTRY || '',
    email: process.env.COMPANY_EMAIL || '',
    phone: process.env.COMPANY_PHONE || '',
    website: process.env.COMPANY_WEBSITE || '',
    siret: process.env.COMPANY_SIRET || '',
    vat: process.env.COMPANY_VAT || ''
  },

  // Helper pour vérifier l'environnement
  isDevelopment: () => process.env.NODE_ENV === 'development',
  isProduction: () => process.env.NODE_ENV === 'production',
  isTest: () => process.env.NODE_ENV === 'test'
};
