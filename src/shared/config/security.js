/**
 * Configuración de headers de seguridad con Helmet
 */

const helmet = require('helmet');

const securityConfig = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // unsafe-inline necesario para algunos scripts inline
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "wss:", "ws:", "https:"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },

  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 año
    includeSubDomains: true,
    preload: true
  },

  // Protección contra clickjacking
  frameguard: {
    action: 'deny'
  },

  // No sniffing de MIME types
  noSniff: true,

  // XSS filter (legacy pero útil)
  xssFilter: true,

  // Referrer policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },

  // Deshabilitar X-Powered-By header
  hidePoweredBy: true,

  // DNS prefetch control
  dnsPrefetchControl: {
    allow: false
  },

  // Download options para IE8+
  ieNoOpen: true,

  // Protección contra MIME type sniffing
  contentTypeOptions: true
});

module.exports = securityConfig;
