/**
 * Middleware de Autenticación JWT Mejorado
 * Con auditoría, manejo de errores y seguridad reforzada
 */

const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');
const { UnauthorizedError, ForbiddenError } = require('./error-handler');
const { query } = require('../database/db');

/**
 * Genera un par de tokens (access + refresh)
 */
function generateTokens(user) {
  const accessToken = jwt.sign(
    {
      userId: user.id,
      username: user.username,
      role: user.role
    },
    config.jwt.secret,
    {
      expiresIn: config.jwt.accessExpiresIn,
      issuer: 'tiktoolstream',
      subject: String(user.id)
    }
  );

  const refreshToken = jwt.sign(
    {
      userId: user.id,
      type: 'refresh'
    },
    config.jwt.secret,
    {
      expiresIn: config.jwt.refreshExpiresIn,
      issuer: 'tiktoolstream',
      subject: String(user.id)
    }
  );

  return { accessToken, refreshToken };
}

/**
 * Verifica un token JWT
 */
function verifyToken(token, options = {}) {
  try {
    return jwt.verify(token, config.jwt.secret, {
      issuer: 'tiktoolstream',
      ...options
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new UnauthorizedError('Token expirado');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new UnauthorizedError('Token inválido');
    }
    throw error;
  }
}

/**
 * Middleware para proteger rutas - requiere autenticación
 */
function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Token de acceso requerido');
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    // Verificar que no sea un refresh token
    if (decoded.type === 'refresh') {
      throw new UnauthorizedError('Token de refresh no permitido para esta operación');
    }

    req.user = decoded;

    // Log de acceso (solo en debug mode)
    if (config.logging.level === 'debug') {
      logger.debug('Authenticated request', {
        userId: decoded.userId,
        path: req.path,
        method: req.method
      });
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware para rutas de admin - requiere rol admin
 */
function adminMiddleware(req, res, next) {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Autenticación requerida');
    }

    if (req.user.role !== 'admin') {
      logger.warn('Unauthorized admin access attempt', {
        userId: req.user.userId,
        username: req.user.username,
        path: req.path,
        ip: req.ip
      });

      throw new ForbiddenError('Se requieren permisos de administrador');
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware para moderadores - requiere rol moderator o admin
 */
function moderatorMiddleware(req, res, next) {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Autenticación requerida');
    }

    if (!['admin', 'moderator'].includes(req.user.role)) {
      throw new ForbiddenError('Se requieren permisos de moderador o administrador');
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware opcional - no falla si no hay token
 * Útil para rutas que tienen contenido público y privado
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      req.user = decoded;
    } catch (error) {
      // Ignorar errores en auth opcional
      logger.debug('Optional auth failed', { error: error.message });
    }
  }

  next();
}

/**
 * Middleware para verificar que el usuario solo acceda a sus propios recursos
 * Admins pueden acceder a cualquier recurso
 */
function ownershipMiddleware(resourceIdParam = 'userId') {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Autenticación requerida');
      }

      const resourceId = parseInt(req.params[resourceIdParam] || req.body[resourceIdParam]);
      const userId = req.user.userId;

      // Admin puede acceder a cualquier recurso
      if (req.user.role === 'admin') {
        return next();
      }

      // Verificar que el usuario sea dueño del recurso
      if (resourceId !== userId) {
        logger.warn('Ownership violation attempt', {
          userId,
          attemptedResourceId: resourceId,
          path: req.path
        });

        throw new ForbiddenError('No tienes permiso para acceder a este recurso');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Verifica que el email del usuario esté verificado
 */
async function requireVerifiedEmail(req, res, next) {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Autenticación requerida');
    }

    const result = await query(
      'SELECT is_verified FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedError('Usuario no encontrado');
    }

    if (!result.rows[0].is_verified) {
      throw new ForbiddenError('Por favor verifica tu email antes de continuar');
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware para auditar acciones administrativas
 */
function auditAdminAction(action) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = function (data) {
      // Solo auditar si la operación fue exitosa
      if (res.statusCode < 400) {
        logger.logAudit(req.user.userId, action, {
          username: req.user.username,
          path: req.path,
          method: req.method,
          ip: req.ip,
          body: req.body,
          params: req.params
        });
      }

      return originalJson(data);
    };

    next();
  };
}

module.exports = {
  generateTokens,
  verifyToken,
  authMiddleware,
  authenticateToken: authMiddleware, // Alias
  adminMiddleware,
  isAdmin: adminMiddleware, // Alias
  moderatorMiddleware,
  optionalAuth,
  ownershipMiddleware,
  requireVerifiedEmail,
  auditAdminAction
};
