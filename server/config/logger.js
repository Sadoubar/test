const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
require('dotenv').config();

const logDir = process.env.LOG_DIR || './logs';
const logLevel = process.env.LOG_LEVEL || 'info';

// Configuration du format des logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Format pour la console en mode développement
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Transports
const transports = [];

// Console transport (toujours actif en développement)
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: logLevel
    })
  );
}

// File transport pour les erreurs
transports.push(
  new DailyRotateFile({
    filename: path.join(logDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    format: logFormat,
    maxSize: '20m',
    maxFiles: '14d',
    zippedArchive: true
  })
);

// File transport pour tous les logs
transports.push(
  new DailyRotateFile({
    filename: path.join(logDir, 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    format: logFormat,
    maxSize: '20m',
    maxFiles: '30d',
    zippedArchive: true
  })
);

// Création du logger
const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  transports,
  exitOnError: false
});

// Stream pour Morgan (HTTP logging)
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  }
};

module.exports = logger;
