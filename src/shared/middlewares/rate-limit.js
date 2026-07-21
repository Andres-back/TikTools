/**
 * Middlewares de Rate Limiting
 * Protección contra brute force, DDoS y spam
 */

const rateLimit = require('express-rate-limit');
const config = require('../config');
const logger = require('../utils/logger');

// Handler personalizado para cuando se excede el límite
const rateLimitHandler = (req, res) => {
  logger.warn('Rate limit exceeded', {
    ip: req.ip,
    path: req.path,
    method: req.method
  });

  res.status(429).json({
    error: 'Too Many Requests',
    message: 'Demasiadas peticiones, intenta más tarde',
    retryAfter: req.rateLimit.resetTime
  });
};

// Rate limiting general para todas las rutas API
const generalLimiter = rateLimit({
  windowMs: config.rateLimiting.general.windowMs,
  max: config.rateLimiting.general.max,
  message: 'Demasiadas peticiones desde esta IP, intenta más tarde',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  validate: { xForwardedForHeader: false },
  skip: (req) => {
    return req.path === '/api/health' || req.path === '/api/ready' || req.path === '/api/live';
  }
});

// Rate limiting estricto para autenticación
const authLimiter = rateLimit({
  windowMs: config.rateLimiting.auth.windowMs,
  max: config.rateLimiting.auth.max,
  message: 'Demasiados intentos de inicio de sesión, intenta en 15 minutos',
  skipSuccessfulRequests: true,
  handler: rateLimitHandler,
  validate: { xForwardedForHeader: false }
});

// Rate limiting para operaciones administrativas sensibles
const adminLimiter = rateLimit({
  windowMs: config.rateLimiting.admin.windowMs,
  max: config.rateLimiting.admin.max,
  message: 'Operación administrativa bloqueada temporalmente',
  handler: rateLimitHandler,
  validate: { xForwardedForHeader: false }
});

// Rate limiting para uploads
const uploadLimiter = rateLimit({
  windowMs: config.rateLimiting.upload.windowMs,
  max: config.rateLimiting.upload.max,
  message: 'Límite de uploads alcanzado, intenta en 1 hora',
  handler: rateLimitHandler,
  validate: { xForwardedForHeader: false }
});

// Rate limiting para WebSocket connections (manual)
class WebSocketRateLimiter {
  constructor(maxConnections = 10, windowMs = 60000) {
    this.connections = new Map();
    this.maxConnections = maxConnections;
    this.windowMs = windowMs;
  }

  checkLimit(identifier) {
    const now = Date.now();
    const userConnections = this.connections.get(identifier) || [];

    // Limpiar conexiones antiguas
    const recentConnections = userConnections.filter(
      timestamp => now - timestamp < this.windowMs
    );

    if (recentConnections.length >= this.maxConnections) {
      return false;
    }

    recentConnections.push(now);
    this.connections.set(identifier, recentConnections);
    return true;
  }

  reset(identifier) {
    this.connections.delete(identifier);
  }

  cleanup() {
    const now = Date.now();
    for (const [identifier, connections] of this.connections.entries()) {
      const recentConnections = connections.filter(
        timestamp => now - timestamp < this.windowMs
      );

      if (recentConnections.length === 0) {
        this.connections.delete(identifier);
      } else {
        this.connections.set(identifier, recentConnections);
      }
    }
  }
}

// Instancia para WebSocket
const wsRateLimiter = new WebSocketRateLimiter(10, 60000);

// Limpieza periódica
setInterval(() => wsRateLimiter.cleanup(), 60000);

module.exports = {
  generalLimiter,
  authLimiter,
  adminLimiter,
  uploadLimiter,
  wsRateLimiter
};
