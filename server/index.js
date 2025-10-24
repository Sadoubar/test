require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const morgan = require('morgan');
const compression = require('compression');

// Configuration
const config = require('./config/config');
const logger = require('./config/logger');

// Middleware
const { helmetConfig, generalLimiter, sanitizeInput, logSuspiciousActivity } = require('./middleware/security');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Database
const database = require('./database');

// Routes
const clientsRouter = require('./routes/clients');
const productsRouter = require('./routes/products');
const invoicesRouter = require('./routes/invoices');

const app = express();

// Configuration CORS
const corsOptions = {
  origin: config.security.corsOrigin,
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware de sécurité
app.use(helmetConfig);
app.use(cors(corsOptions));

// Logging HTTP avec Morgan
if (!config.isTest()) {
  app.use(morgan('combined', { stream: logger.stream }));
}

// Middleware de parsing
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Compression des réponses
app.use(compression());

// Middleware de sécurité personnalisés
app.use(sanitizeInput);
app.use(logSuspiciousActivity);

// Rate limiting général
app.use('/api/', generalLimiter);

// Serve static files from React build
app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Serveur de facturation en ligne',
    version: '1.0.0',
    environment: config.nodeEnv,
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/clients', clientsRouter);
app.use('/api/products', productsRouter);
app.use('/api/invoices', invoicesRouter);

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
});

// Gestion des erreurs 404
app.use(notFoundHandler);

// Gestionnaire d'erreurs global
app.use(errorHandler);

// Initialisation du serveur
const startServer = async () => {
  try {
    // Initialiser la base de données
    await database.init();
    logger.info('Base de données initialisée');

    // Démarrer le serveur
    const server = app.listen(config.port, config.host, () => {
      logger.info(`Serveur démarré sur ${config.host}:${config.port}`);
      logger.info(`Environnement: ${config.nodeEnv}`);
      logger.info(`API disponible sur http://${config.host}:${config.port}/api`);
    });

    // Gestion de l'arrêt gracieux
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} reçu, arrêt du serveur...`);

      server.close(async () => {
        logger.info('Serveur HTTP fermé');

        try {
          await database.close();
          logger.info('Connexion à la base de données fermée');
          process.exit(0);
        } catch (err) {
          logger.error('Erreur lors de la fermeture de la base de données:', err);
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Impossible de fermer proprement, arrêt forcé');
        process.exit(1);
      }, 10000);
    };

    // Écouter les signaux d'arrêt
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Gestion des erreurs non capturées
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection:', { reason, promise });
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

  } catch (error) {
    logger.error('Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
};

// Démarrer le serveur uniquement si ce n'est pas un import
if (require.main === module) {
  startServer();
}

module.exports = app;
