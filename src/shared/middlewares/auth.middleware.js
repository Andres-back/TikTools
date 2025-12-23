/**
 * Middleware de Autenticación JWT
 */

const jwt = require('jsonwebtoken');
const { query } = require('../database/db');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const JWT_EXPIRES_IN = '15m'; // Access token - 15 minutos
const REFRESH_EXPIRES_IN = '7d'; // Refresh token - 7 días

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
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  const refreshToken = jwt.sign(
    { 
      userId: user.id,
      type: 'refresh'
    },
    JWT_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN }
  );

  return { accessToken, refreshToken };
}

/**
 * Verifica un token JWT
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Middleware para proteger rutas
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  console.log(`[AUTH] Request to ${req.path} - Auth header present: ${!!authHeader}`);
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log(`[AUTH] Missing or invalid auth header for ${req.path}`);
    return res.status(401).json({ 
      error: 'No autorizado',
      message: 'Token de acceso requerido',
      code: 'MISSING_TOKEN'
    });
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);

  if (!decoded) {
    console.log(`[AUTH] Invalid or expired token for ${req.path}`);
    return res.status(401).json({ 
      error: 'Token inválido',
      message: 'El token ha expirado o es inválido',
      code: 'INVALID_TOKEN'
    });
  }

  console.log(`[AUTH] Valid token for user ${decoded.userId} accessing ${req.path}`);
  req.user = decoded;
  next();
}

/**
 * Middleware para rutas de admin
 */
function adminMiddleware(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Acceso denegado',
      message: 'Se requieren permisos de administrador' 
    });
  }
  next();
}

/**
 * Middleware opcional - no falla si no hay token
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = decoded;
    }
  }
  
  next();
}

module.exports = {
  generateTokens,
  verifyToken,
  authMiddleware,
  authenticateToken: authMiddleware, // Alias
  adminMiddleware,
  isAdmin: adminMiddleware, // Alias
  optionalAuth,
  JWT_SECRET
};
