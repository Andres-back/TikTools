# 🚀 Guía de Migración a Arquitectura Modular

## ✅ Progreso Actual

### Completado
- ✅ Estructura de carpetas modular creada
- ✅ Dependencias instaladas (express-rate-limit, helmet, compression, winston, uuid)
- ✅ Sistema de logging con Winston (`src/shared/utils/logger.js`)
- ✅ Configuración centralizada (`src/shared/config/`)
- ✅ Middlewares de seguridad:
  - Rate limiting
  - Error handling
  - Validadores
  - Sanitización
- ✅ Utilidades:
  - File upload seguro
  - Sanitizer para XSS
- ✅ Constantes (roles, plans, errors)
- ✅ Middlewares mejorados de auth y plan

### Por Hacer
- ⏳ Migrar rutas a módulos
- ⏳ Crear server.js y app.js principales
- ⏳ Actualizar frontend para usar sanitización
- ⏳ Probar aplicación completa
- ⏳ Actualizar Dockerfile y docker-compose

---

## 📁 Nueva Estructura del Proyecto

```
TikTools/
├── src/
│   ├── modules/                    # Módulos de funcionalidad
│   │   ├── auth/
│   │   ├── auctions/
│   │   ├── admin/
│   │   ├── payments/
│   │   ├── news/
│   │   ├── chat/
│   │   ├── overlays/
│   │   └── tiktok/
│   │
│   ├── shared/                     # Código compartido
│   │   ├── config/                 # ✅ Configuración
│   │   │   ├── index.js
│   │   │   ├── cors.js
│   │   │   └── security.js
│   │   │
│   │   ├── middlewares/            # ✅ Middlewares
│   │   │   ├── auth.js
│   │   │   ├── plan.js
│   │   │   ├── rate-limit.js
│   │   │   ├── error-handler.js
│   │   │   ├── async-handler.js
│   │   │   └── validators.js
│   │   │
│   │   ├── utils/                  # ✅ Utilidades
│   │   │   ├── logger.js
│   │   │   ├── file-upload.js
│   │   │   ├── sanitizer.js
│   │   │   └── mailer.js
│   │   │
│   │   ├── constants/              # ✅ Constantes
│   │   │   ├── roles.js
│   │   │   ├── plans.js
│   │   │   └── errors.js
│   │   │
│   │   └── database/               # ✅ Base de datos
│   │       ├── db.js
│   │       └── schema.sql
│   │
│   ├── server.js                   # ⏳ Servidor principal
│   └── app.js                      # ⏳ Configuración Express
│
├── frontend/                       # Cliente (sin cambios por ahora)
├── uploads/                        # Archivos subidos
├── logs/                           # ✅ Logs (Winston)
└── tests/                          # Tests (futuro)
```

---

## 🔧 Paso 1: Migrar Módulo de Autenticación

### 1.1 Crear Controllers

Crea `src/modules/auth/controllers/auth.controller.js`:

```javascript
const asyncHandler = require('../../../shared/middlewares/async-handler');
const { generateTokens } = require('../../../shared/middlewares/auth');
const authService = require('../services/auth.service');
const { ValidationError } = require('../../../shared/middlewares/error-handler');
const logger = require('../../../shared/utils/logger');

exports.register = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  const user = await authService.register(username, email, password);
  const tokens = generateTokens(user);

  logger.info('User registered', { userId: user.id, username, email });

  res.status(201).json({
    success: true,
    message: 'Usuario registrado exitosamente. Revisa tu email para verificar tu cuenta.',
    user: {
      id: user.id,
      username: user.username,
      email: user.email
    },
    tokens
  });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await authService.login(email, password);
  const tokens = generateTokens(user);

  logger.info('User logged in', { userId: user.id, email });

  res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      planType: user.plan_type
    },
    tokens
  });
});

exports.refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  const tokens = await authService.refreshAccessToken(refreshToken);

  res.json({
    success: true,
    tokens
  });
});

exports.logout = asyncHandler(async (req, res) => {
  // Opcional: invalidar refresh token
  logger.info('User logged out', { userId: req.user.userId });

  res.json({
    success: true,
    message: 'Sesión cerrada exitosamente'
  });
});

exports.getProfile = asyncHandler(async (req, res) => {
  const profile = await authService.getProfile(req.user.userId);

  res.json({
    success: true,
    user: profile
  });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const updates = req.body;
  const updatedUser = await authService.updateProfile(req.user.userId, updates);

  res.json({
    success: true,
    message: 'Perfil actualizado exitosamente',
    user: updatedUser
  });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  await authService.changePassword(req.user.userId, currentPassword, newPassword);

  logger.logAudit(req.user.userId, 'PASSWORD_CHANGED');

  res.json({
    success: true,
    message: 'Contraseña actualizada exitosamente'
  });
});

exports.verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.query;

  await authService.verifyEmail(token);

  res.json({
    success: true,
    message: 'Email verificado exitosamente'
  });
});
```

### 1.2 Crear Services

Crea `src/modules/auth/services/auth.service.js`:

```javascript
const bcrypt = require('bcryptjs');
const { query } = require('../../../shared/database/db');
const { generateTokens, verifyToken } = require('../../../shared/middlewares/auth');
const { ValidationError, UnauthorizedError, ConflictError, NotFoundError } = require('../../../shared/middlewares/error-handler');
const { validatePassword, validateEmail, validateUsername, sanitizeString } = require('../../../shared/middlewares/validators');
const { activateTrialDays } = require('../../../shared/middlewares/plan');
const logger = require('../../../shared/utils/logger');
const crypto = require('crypto');

exports.register = async (username, email, password) => {
  // Validar inputs
  if (!validateEmail(email)) {
    throw new ValidationError('Email inválido');
  }

  if (!email.toLowerCase().endsWith('@gmail.com')) {
    throw new ValidationError('Solo se permiten cuentas de Gmail (@gmail.com)');
  }

  if (!validateUsername(username)) {
    throw new ValidationError('Nombre de usuario inválido (3-20 caracteres alfanuméricos, guiones)');
  }

  const passwordCheck = validatePassword(password);
  if (!passwordCheck.valid) {
    throw new ValidationError(
      `Contraseña débil. Debe contener: ${passwordCheck.errors.join(', ')}`
    );
  }

  // Sanitizar inputs
  const cleanUsername = sanitizeString(username.toLowerCase());
  const cleanEmail = sanitizeString(email.toLowerCase());

  // Verificar duplicados
  const existing = await query(
    'SELECT id FROM users WHERE username = $1 OR email = $2',
    [cleanUsername, cleanEmail]
  );

  if (existing.rows.length > 0) {
    throw new ConflictError('El usuario o email ya existe');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);

  // Generar token de verificación
  const verificationToken = crypto.randomBytes(32).toString('hex');

  // Crear usuario
  const result = await query(
    `INSERT INTO users (username, email, password_hash, verification_token, is_verified, role)
     VALUES ($1, $2, $3, $4, false, 'user')
     RETURNING id, username, email, role, created_at`,
    [cleanUsername, cleanEmail, passwordHash, verificationToken]
  );

  const user = result.rows[0];

  // Activar días de prueba
  await activateTrialDays(user.id, 2);

  // Enviar email de verificación (implementar después)
  // await sendVerificationEmail(user.email, verificationToken);

  return user;
};

exports.login = async (email, password) => {
  const cleanEmail = sanitizeString(email.toLowerCase());

  const result = await query(
    `SELECT id, username, email, password_hash, role, is_active, is_verified, plan_type
     FROM users WHERE email = $1`,
    [cleanEmail]
  );

  if (result.rows.length === 0) {
    throw new UnauthorizedError('Email o contraseña incorrectos');
  }

  const user = result.rows[0];

  // Verificar contraseña
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw new UnauthorizedError('Email o contraseña incorrectos');
  }

  // Verificar cuenta activa
  if (!user.is_active) {
    throw new UnauthorizedError('Cuenta desactivada. Contacta al administrador.');
  }

  // Actualizar last_login
  await query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

  return user;
};

exports.refreshAccessToken = async (refreshToken) => {
  if (!refreshToken) {
    throw new ValidationError('Refresh token requerido');
  }

  const decoded = verifyToken(refreshToken);

  if (decoded.type !== 'refresh') {
    throw new UnauthorizedError('Token inválido');
  }

  // Obtener usuario
  const result = await query(
    'SELECT id, username, role FROM users WHERE id = $1 AND is_active = true',
    [decoded.userId]
  );

  if (result.rows.length === 0) {
    throw new UnauthorizedError('Usuario no encontrado o inactivo');
  }

  const user = result.rows[0];
  return generateTokens(user);
};

exports.getProfile = async (userId) => {
  const result = await query(
    `SELECT id, username, email, display_name, avatar_url, role, plan_type,
            plan_expires_at, plan_days_remaining, created_at, last_login
     FROM users WHERE id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Usuario no encontrado');
  }

  return result.rows[0];
};

exports.updateProfile = async (userId, updates) => {
  const allowedFields = ['display_name', 'avatar_url'];
  const fields = [];
  const values = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      fields.push(`${key} = $${paramIndex}`);
      values.push(sanitizeString(value));
      paramIndex++;
    }
  }

  if (fields.length === 0) {
    throw new ValidationError('No hay campos válidos para actualizar');
  }

  values.push(userId);

  const result = await query(
    `UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $${paramIndex}
     RETURNING id, username, email, display_name, avatar_url`,
    values
  );

  return result.rows[0];
};

exports.changePassword = async (userId, currentPassword, newPassword) => {
  // Obtener password actual
  const result = await query(
    'SELECT password_hash FROM users WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    throw new NotFoundError('Usuario no encontrado');
  }

  // Verificar password actual
  const isValid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
  if (!isValid) {
    throw new UnauthorizedError('Contraseña actual incorrecta');
  }

  // Validar nueva contraseña
  const passwordCheck = validatePassword(newPassword);
  if (!passwordCheck.valid) {
    throw new ValidationError(
      `Contraseña débil. Debe contener: ${passwordCheck.errors.join(', ')}`
    );
  }

  // Hash y actualizar
  const newPasswordHash = await bcrypt.hash(newPassword, 12);

  await query(
    'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [newPasswordHash, userId]
  );
};

exports.verifyEmail = async (token) => {
  const result = await query(
    'SELECT id FROM users WHERE verification_token = $1',
    [token]
  );

  if (result.rows.length === 0) {
    throw new ValidationError('Token de verificación inválido o expirado');
  }

  await query(
    'UPDATE users SET is_verified = true, verification_token = NULL WHERE id = $1',
    [result.rows[0].id]
  );

  logger.info('Email verified', { userId: result.rows[0].id });
};
```

### 1.3 Crear Routes

Crea `src/modules/auth/routes.js`:

```javascript
const express = require('express');
const router = express.Router();
const authController = require('./controllers/auth.controller');
const { authMiddleware } = require('../../shared/middlewares/auth');
const { authLimiter } = require('../../shared/middlewares/rate-limit');
const { passwordValidationMiddleware } = require('../../shared/middlewares/validators');

// Rutas públicas
router.post('/register', authLimiter, passwordValidationMiddleware, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/refresh', authController.refreshToken);
router.get('/verify', authController.verifyEmail);

// Rutas protegidas
router.post('/logout', authMiddleware, authController.logout);
router.get('/profile', authMiddleware, authController.getProfile);
router.put('/profile', authMiddleware, authController.updateProfile);
router.put('/password', authMiddleware, passwordValidationMiddleware, authController.changePassword);

module.exports = router;
```

---

## 🔧 Paso 2: Crear Server Principal

### 2.1 Crear `src/app.js`

```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');

// Configuración
const config = require('./shared/config');
const corsOptions = require('./shared/config/cors');
const securityConfig = require('./shared/config/security');

// Middlewares
const { generalLimiter } = require('./shared/middlewares/rate-limit');
const { errorHandler, notFoundHandler } = require('./shared/middlewares/error-handler');
const { sanitizeRequestBody } = require('./shared/utils/sanitizer');
const logger = require('./shared/utils/logger');

// Rutas de módulos
const authRoutes = require('./modules/auth/routes');
// TODO: importar otras rutas cuando se migren

const app = express();

// ==================== SECURITY ====================
app.use(securityConfig); // Helmet headers
app.use(cors(corsOptions)); // CORS

// ==================== PARSING ====================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==================== COMPRESSION ====================
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6
}));

// ==================== SANITIZATION ====================
app.use(sanitizeRequestBody({ allowHtml: false }));

// ==================== RATE LIMITING ====================
app.use('/api', generalLimiter);

// ==================== REQUEST LOGGING ====================
if (config.logging.level === 'debug') {
  app.use((req, res, next) => {
    logger.debug('Incoming request', {
      method: req.method,
      path: req.path,
      ip: req.ip
    });
    next();
  });
}

// ==================== HEALTH CHECKS ====================
app.get('/api/health', async (req, res) => {
  const { getDB } = require('./shared/database/db');
  const startTime = Date.now();

  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '2.0.0',
    uptime: process.uptime(),
    environment: config.server.env
  };

  try {
    const db = getDB();
    if (config.database.url) {
      const dbStart = Date.now();
      await db.query('SELECT 1');
      health.database = {
        connected: true,
        responseTime: `${Date.now() - dbStart}ms`
      };
    }

    health.responseTime = `${Date.now() - startTime}ms`;
    res.json(health);
  } catch (error) {
    health.status = 'error';
    health.database = {
      connected: false,
      error: error.message
    };
    res.status(503).json(health);
  }
});

app.get('/api/ready', (req, res) => {
  res.json({ ready: true });
});

app.get('/api/live', (req, res) => {
  res.json({ alive: true });
});

// ==================== API ROUTES ====================
app.use('/api/auth', authRoutes);
// TODO: agregar otras rutas cuando se migren
// app.use('/api/auctions', auctionRoutes);
// app.use('/api/admin', adminMiddleware, adminRoutes);
// etc.

// ==================== STATIC FILES ====================
const PUBLIC_DIR = path.join(__dirname, '../frontend');

// Uploads con headers seguros
app.use('/uploads', (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  next();
}, express.static(path.join(__dirname, '../uploads')));

// Archivos estáticos del frontend
app.use(express.static(PUBLIC_DIR, {
  maxAge: config.server.isProduction ? '1d' : 0,
  etag: true,
  lastModified: true
}));

// SPA fallback
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }

  const ext = path.extname(req.path);
  if (ext && ext !== '.html') {
    return res.status(404).send('Archivo no encontrado');
  }

  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// ==================== ERROR HANDLING ====================
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
```

### 2.2 Crear `src/server.js`

```javascript
const http = require('http');
const app = require('./app');
const config = require('./shared/config');
const logger = require('./shared/utils/logger');
const { initDatabase, closeDatabase } = require('./shared/database/db');
const { setupGlobalHandlers } = require('./shared/middlewares/error-handler');

// Setup global error handlers
setupGlobalHandlers();

// Create HTTP server
const server = http.createServer(app);

// Server timeouts
server.timeout = 120000; // 2 minutos
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

// Graceful shutdown
let isShuttingDown = false;

async function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`Received ${signal}, starting graceful shutdown...`);

  const SHUTDOWN_TIMEOUT = config.shutdown.timeout;
  const forceExitTimer = setTimeout(() => {
    logger.error('Graceful shutdown timeout, forcing exit');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT);

  try {
    // Cerrar servidor HTTP
    server.close(() => {
      logger.info('HTTP server closed');
    });

    // Cerrar base de datos
    await closeDatabase();
    logger.info('Database connection closed');

    clearTimeout(forceExitTimer);
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', { error: error.message });
    clearTimeout(forceExitTimer);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
async function startServer() {
  try {
    logger.info('Starting server...');

    // Initialize database
    await initDatabase();

    // Start HTTP server
    server.listen(config.server.port, config.server.host, () => {
      logger.info('Server started successfully', {
        host: config.server.host,
        port: config.server.port,
        environment: config.server.env,
        database: config.database.url ? 'PostgreSQL' : 'SQLite'
      });
    });
  } catch (error) {
    logger.error('Server startup failed', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

startServer();
```

---

## 🔧 Paso 3: Actualizar package.json

Actualiza los scripts en `package.json`:

```json
{
  "scripts": {
    "start": "node src/server.js",
    "dev": "NODE_ENV=development node src/server.js",
    "prod": "NODE_ENV=production node src/server.js",
    "test": "echo \"Tests pending\" && exit 0"
  }
}
```

---

## 🔧 Paso 4: Probar la Migración

### 4.1 Iniciar el servidor

```bash
npm start
```

### 4.2 Probar endpoints

```bash
# Health check
curl http://localhost:8080/api/health

# Register
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@gmail.com","password":"Test123!@#"}'

# Login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@gmail.com","password":"Test123!@#"}'
```

---

## 🔧 Paso 5: Migrar Otros Módulos

Sigue el mismo patrón para migrar los demás módulos:

1. **Auctions**: `src/modules/auctions/`
2. **Admin**: `src/modules/admin/`
3. **Payments**: `src/modules/payments/`
4. **News**: `src/modules/news/`
5. **Chat**: `src/modules/chat/`
6. **Overlays**: `src/modules/overlays/`
7. **TikTok WebSocket**: `src/modules/tiktok/`

Cada módulo debe tener:
- `controllers/` - Manejo de requests
- `services/` - Lógica de negocio
- `validators/` - Validación específica (opcional)
- `routes.js` - Definición de rutas

---

## 📋 Checklist de Seguridad Aplicada

- ✅ **Logging estructurado** con Winston
- ✅ **Rate limiting** en todas las rutas API
- ✅ **CORS** configurado con lista blanca
- ✅ **Helmet** para headers de seguridad
- ✅ **Sanitización** de inputs
- ✅ **Validación de contraseñas** (8+ caracteres, mayúsculas, números, especiales)
- ✅ **File uploads** con validación y UUID
- ✅ **Error handling** centralizado
- ✅ **Graceful shutdown**
- ✅ **Health checks** mejorados
- ⏳ **Endpoints de debug** (migrar y asegurar con JWT admin)

---

## 🚀 Próximos Pasos

1. **Completar migración de módulos** (auctions, admin, etc.)
2. **Asegurar endpoints de debug** con JWT admin
3. **Actualizar frontend** para sanitización XSS
4. **Testing** completo de todas las rutas
5. **Actualizar Dockerfile** para nueva estructura
6. **Deploy a Digital Ocean**

---

## 💡 Consejos

- **No borres** los archivos antiguos hasta confirmar que todo funciona
- **Prueba cada módulo** después de migrarlo
- **Commit frecuentemente** a Git
- **Lee los logs** en `logs/` para debugging
- **Usa Postman** o similar para probar APIs

---

¿Preguntas? Revisa los archivos en `src/shared/` para ver ejemplos de implementación.
