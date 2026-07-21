/**
 * Configuración centralizada de la aplicación
 * Todas las variables de entorno y constantes en un solo lugar
 */

const config = {
  // Servidor
  server: {
    host: process.env.HOST || '0.0.0.0',
    port: parseInt(process.env.PORT || '8080', 10),
    env: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production'
  },

  // Base de datos
  database: {
    url: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL !== 'false',
    pool: {
      max: 10,
      idleTimeoutMillis: 60000,
      connectionTimeoutMillis: 30000,
      query_timeout: 60000,
      statement_timeout: 60000
    }
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES || '7d'
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',')
      : ['http://localhost:8080'],
    credentials: true
  },

  // TikTok
  tiktok: {
    sessionId: process.env.TIKTOK_SESSION_ID || null,
    targetIdC: process.env.TIKTOK_TT_TARGET_IDC || null,
    extraHeaders: process.env.TIKTOK_EXTRA_HEADERS
      ? JSON.parse(process.env.TIKTOK_EXTRA_HEADERS)
      : null,
    signApiKey: process.env.TIKTOK_SIGN_API_KEY || null,
    signBasePath: process.env.TIKTOK_SIGN_BASE_PATH || null
  },

  // PayPal
  paypal: {
    clientId: process.env.PAYPAL_CLIENT_ID,
    secret: process.env.PAYPAL_SECRET,
    mode: process.env.PAYPAL_MODE || 'sandbox'
  },

  // Email
  email: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    from: process.env.EMAIL_FROM || 'noreply@tiktoolstream.com'
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug')
  },

  // Rate limiting
  rateLimiting: {
    general: {
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: 100
    },
    auth: {
      windowMs: 15 * 60 * 1000,
      max: 5
    },
    admin: {
      windowMs: 60 * 60 * 1000, // 1 hora
      max: 3
    },
    upload: {
      windowMs: 60 * 60 * 1000,
      max: 10
    }
  },

  // File uploads
  uploads: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedImageExtensions: ['.jpeg', '.jpg', '.png', '.gif', '.webp']
  },

  // WebSocket
  websocket: {
    path: '/live',
    syncPath: '/sync',
    maxPayload: 100 * 1024, // 100KB
    heartbeatInterval: 30000, // 30 segundos
    maxConnections: 1000,
    maxSyncConnections: 500
  },

  // Graceful shutdown
  shutdown: {
    timeout: 30000 // 30 segundos
  }
};

// Validar configuración crítica en producción
if (config.server.isProduction) {
  if (!config.database.url) {
    console.error('❌ ERROR: DATABASE_URL no está configurado en producción');
    process.exit(1);
  }

  if (!config.jwt.secret) {
    console.error('❌ ERROR: JWT_SECRET no está configurado en producción');
    process.exit(1);
  }
}

module.exports = config;
