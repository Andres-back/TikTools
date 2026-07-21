/**
 * Middleware centralizado de manejo de errores
 * Captura todos los errores y los formatea consistentemente
 */

const logger = require('../utils/logger');
const config = require('../config');

// Errores personalizados
class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400);
    this.details = details;
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'No autorizado') {
    super(message, 401);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Acceso denegado') {
    super(message, 403);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Recurso no encontrado') {
    super(message, 404);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Conflicto con el estado actual') {
    super(message, 409);
  }
}

// Middleware de manejo de errores
function errorHandler(err, req, res, next) {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  // Log del error
  logger.logError(err, req, {
    statusCode: error.statusCode,
    isOperational: err.isOperational
  });

  // Errores de Mongoose (si se usa)
  if (err.name === 'CastError') {
    error = new ValidationError('Formato de ID inválido');
  }

  // Errores de validación de Mongoose
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    error = new ValidationError('Error de validación', messages);
  }

  // Errores de duplicado (PostgreSQL)
  if (err.code === '23505') {
    error = new ConflictError('Ya existe un registro con esos datos');
  }

  // Errores de clave foránea (PostgreSQL)
  if (err.code === '23503') {
    error = new ValidationError('Referencia inválida a otro recurso');
  }

  // Errores de NOT NULL (PostgreSQL)
  if (err.code === '23502') {
    error = new ValidationError('Faltan campos requeridos');
  }

  // Errores de JWT
  if (err.name === 'JsonWebTokenError') {
    error = new UnauthorizedError('Token inválido');
  }

  if (err.name === 'TokenExpiredError') {
    error = new UnauthorizedError('Token expirado');
  }

  // Errores de Multer (file upload)
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      error = new ValidationError('Archivo demasiado grande');
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      error = new ValidationError('Demasiados archivos');
    } else {
      error = new ValidationError('Error al subir archivo');
    }
  }

  // Respuesta al cliente
  const response = {
    error: error.message || 'Error interno del servidor',
    statusCode: error.statusCode
  };

  // En desarrollo, incluir más detalles
  if (!config.server.isProduction) {
    response.stack = err.stack;
    response.details = error.details;
  }

  res.status(error.statusCode).json(response);
}

// Middleware para rutas no encontradas
function notFoundHandler(req, res, next) {
  const error = new NotFoundError(`Ruta no encontrada: ${req.method} ${req.path}`);
  next(error);
}

// Manejadores globales de proceso
function setupGlobalHandlers() {
  process.on('uncaughtException', (error) => {
    logger.error('💥 UNCAUGHT EXCEPTION', {
      error: error.message,
      stack: error.stack
    });

    // Dar tiempo para que el logger escriba antes de salir
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('💥 UNHANDLED REJECTION', {
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
      promise: String(promise)
    });
  });

  process.on('warning', (warning) => {
    logger.warn('⚠️ Node.js Warning', {
      name: warning.name,
      message: warning.message,
      stack: warning.stack
    });
  });
}

module.exports = {
  errorHandler,
  notFoundHandler,
  setupGlobalHandlers,
  // Errores personalizados exportados
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError
};
