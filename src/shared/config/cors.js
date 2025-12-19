/**
 * Configuración de CORS mejorada y segura
 */

const config = require('./index');
const logger = require('../utils/logger');

const corsOptions = {
  origin: (origin, callback) => {
    // Permitir requests sin origin (mobile apps, Postman, curl)
    if (!origin) {
      return callback(null, true);
    }

    // En desarrollo, permitir localhost
    if (!config.server.isProduction) {
      return callback(null, true);
    }

    // Verificar contra lista blanca
    if (config.cors.origin.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked request', { origin, allowed: config.cors.origin });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: config.cors.credentials,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count'],
  maxAge: 86400 // 24 horas
};

module.exports = corsOptions;
