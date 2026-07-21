/**
 * Sistema de Logging Estructurado con Winston
 * Implementa logs rotatorios, niveles y formato JSON
 */

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

const logDir = path.join(__dirname, '../../../logs');

// Crear directorio de logs si no existe
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Formato para archivos (JSON estructurado)
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.metadata(),
  winston.format.json()
);

// Formato para consola (legible para humanos)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length && Object.keys(meta.metadata || {}).length
      ? JSON.stringify(meta.metadata)
      : '';
    return `${timestamp} ${level}: ${message} ${metaStr}`;
  })
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: logFormat,
  defaultMeta: { service: 'tiktok-auction' },
  transports: [
    // Logs de error separados (solo errores)
    new DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true
    }),

    // Logs combinados (todos los niveles)
    new DailyRotateFile({
      filename: path.join(logDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true
    }),

    // Salida a consola
    new winston.transports.Console({
      format: consoleFormat
    })
  ],

  // Manejar excepciones no capturadas
  exceptionHandlers: [
    new DailyRotateFile({
      filename: path.join(logDir, 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d'
    })
  ],

  // Manejar promesas rechazadas no capturadas
  rejectionHandlers: [
    new DailyRotateFile({
      filename: path.join(logDir, 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d'
    })
  ]
});

// Helper methods para logging contextual
logger.logRequest = (req, message, meta = {}) => {
  logger.info(message, {
    ...meta,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userId: req.user?.id,
    userAgent: req.get('user-agent')
  });
};

logger.logError = (error, req = null, additionalInfo = {}) => {
  const errorData = {
    error: error.message,
    stack: error.stack,
    ...additionalInfo
  };

  if (req) {
    errorData.method = req.method;
    errorData.path = req.path;
    errorData.ip = req.ip;
    errorData.userId = req.user?.id;
  }

  logger.error('Application error', errorData);
};

logger.logAudit = (userId, action, details = {}) => {
  logger.warn('AUDIT LOG', {
    userId,
    action,
    timestamp: new Date().toISOString(),
    ...details
  });
};

module.exports = logger;
