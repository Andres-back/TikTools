/**
 * Servidor Principal - TikTok Live Auction System
 * Con autenticación, planes de suscripción y API REST
 */

// Cargar dotenv solo en desarrollo, en producción usar variables del sistema
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const http = require('http');
const express = require('express');
const cors = require('cors');
const path = require('path');
const WebSocket = require('ws');
const {
  TikTokLiveConnection,
  WebcastEvent,
  ControlEvent,
  SignConfig
} = require('tiktok-live-connector');

// Database y Auth (rutas actualizadas a nueva estructura modular)
const { initDatabase, closeDatabase, getDB } = require('./database/db');
const { authMiddleware, adminMiddleware } = require('./src/shared/middlewares/auth');
const { checkPlanMiddleware } = require('./src/shared/middlewares/plan');
const authRoutes = require('./src/modules/auth/routes');
const auctionRoutes = require('./src/modules/auctions/routes');
const adminRoutes = require('./src/modules/admin/routes');
const paymentRoutes = require('./src/modules/payments/routes');
const newsRoutes = require('./src/modules/news/routes');
const chatRoutes = require('./src/modules/chat/routes');
const overlaysRoutes = require('./src/modules/overlays/routes');

// Configuración
const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || 8080);
const PUBLIC_DIR = path.join(__dirname, 'frontend');
const WEBSOCKET_PATH = '/live';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// TikTok Sign Config
if (process.env.TIKTOK_SIGN_API_KEY) {
  SignConfig.apiKey = process.env.TIKTOK_SIGN_API_KEY;
}
if (process.env.TIKTOK_SIGN_BASE_PATH) {
  SignConfig.basePath = process.env.TIKTOK_SIGN_BASE_PATH;
}

const SESSION_ID = process.env.TIKTOK_SESSION_ID || null;
const TT_TARGET_IDC = process.env.TIKTOK_TT_TARGET_IDC || null;
const EXTRA_HEADERS = process.env.TIKTOK_EXTRA_HEADERS
  ? JSON.parse(process.env.TIKTOK_EXTRA_HEADERS)
  : null;

// ==================== EXPRESS APP ====================

const app = express();

// Validar variables de entorno críticas en producción
if (IS_PRODUCTION) {
  const requiredEnvVars = ['JWT_SECRET'];
  const missing = requiredEnvVars.filter(v => !process.env[v]);
  if (missing.length > 0) {
    process.stderr.write(`ERROR: Missing required environment variables: ${missing.join(', ')}\n`);
    process.exit(1);
  }
}

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== API ROUTES ====================

// Auth routes (públicas)
app.post('/api/auth/register', authRoutes.register);
app.post('/api/auth/login', authRoutes.login);
app.post('/api/auth/refresh', authRoutes.refreshToken);
app.get('/api/auth/verify', authRoutes.verifyEmail); // Ruta de verificación

// Endpoint TEMPORAL para resetear usuarios (solicitado por usuario)
app.get('/api/setup/reset-users-force', async (req, res) => {
  if (req.query.secret === 'lolkjk12_RESET') {
    const { resetUsers } = require('./database/db');
    await resetUsers();
    res.send('Usuarios borrados y base de datos reiniciada.');
  } else {
    res.status(403).send('Forbidden');
  }
});

// Endpoint TEMPORAL para verificar manualmente
app.get('/api/setup/manually-verify', async (req, res) => {
  if (req.query.secret === 'lolkjk12_RESET' && req.query.email) {
    const { query } = require('./database/db');
    await query('UPDATE users SET is_verified = true WHERE email = $1', [req.query.email]);
    res.send(`Usuario ${req.query.email} verificado manualmente.`);
  } else {
    res.status(403).send('Forbidden');
  }
});

// Endpoint de DIAGNÓSTICO DE CORREO
app.get('/api/setup/debug-email', async (req, res) => {
  if (req.query.secret !== 'lolkjk12_RESET') return res.status(403).send('Forbidden');

  const targetEmail = req.query.email || 'tiktoolstreamstudio@gmail.com';
  const { transporter } = require('./utils/mailer');

  try {
    const info = await transporter.sendMail({
      from: '"TikToolStream Debug" <tiktoolstreamstudio@gmail.com>',
      to: targetEmail,
      subject: 'Prueba de Diagnóstico - TikToolStream',
      text: 'Si ves esto, el correo funciona correctamente.',
      html: '<b>Si ves esto, el correo funciona correctamente. ✅</b>'
    });
    res.json({ success: true, messageId: info.messageId, response: info.response });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      stack: error.stack
    });
  }
});

// Endpoint para crear administrador inicial
app.post('/api/setup/create-admin', async (req, res) => {
  if (req.query.secret !== 'lolkjk12_RESET') return res.status(403).send('Forbidden');

  const { username, email, password } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email y password son requeridos' });
  }

  try {
    const { query } = require('./database/db');
    const bcrypt = require('bcryptjs');
    
    // Verificar si ya existe
    const existing = await query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username.toLowerCase(), email.toLowerCase()]
    );
    
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Usuario o email ya existe' });
    }
    
    // Crear admin
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await query(
      `INSERT INTO users (username, email, password_hash, role, is_verified, is_active, plan_type)
       VALUES ($1, $2, $3, 'admin', true, true, 'premium')
       RETURNING id, username, email, role`,
      [username.toLowerCase(), email.toLowerCase(), passwordHash]
    );
    
    res.json({
      success: true,
      message: 'Administrador creado exitosamente',
      admin: result.rows[0]
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Auth routes (protegidas)
app.post('/api/auth/logout', authMiddleware, authRoutes.logout);
app.get('/api/auth/profile', authMiddleware, authRoutes.getProfile);
app.put('/api/auth/profile', authMiddleware, authRoutes.updateProfile);
app.put('/api/auth/password', authMiddleware, authRoutes.changePassword);

// Payment routes (protegidas)
app.get('/api/payments/plans', paymentRoutes.getPlans);
app.get('/api/payments/plan-status', authMiddleware, paymentRoutes.getPlanStatus);
app.post('/api/payments/create-order', authMiddleware, paymentRoutes.createOrder);
app.post('/api/payments/capture-order', authMiddleware, paymentRoutes.captureOrder);
app.get('/api/payments/history', authMiddleware, paymentRoutes.getPaymentHistory);

// Admin routes (solo administradores)
app.get('/api/admin/dashboard', authMiddleware, adminMiddleware, adminRoutes.getDashboard);
app.get('/api/admin/users', authMiddleware, adminMiddleware, adminRoutes.getUsers);
app.get('/api/admin/users/:id', authMiddleware, adminMiddleware, adminRoutes.getUser);
app.post('/api/admin/users', authMiddleware, adminMiddleware, adminRoutes.createUser);
app.put('/api/admin/users/:id', authMiddleware, adminMiddleware, adminRoutes.updateUser);
app.delete('/api/admin/users/:id', authMiddleware, adminMiddleware, adminRoutes.deleteUser);
app.post('/api/admin/users/:id/add-days', authMiddleware, adminMiddleware, adminRoutes.addDays);
app.post('/api/admin/users/:id/remove-days', authMiddleware, adminMiddleware, adminRoutes.removeDays);
app.post('/api/admin/users/:id/toggle-status', authMiddleware, adminMiddleware, adminRoutes.toggleStatus);
app.post('/api/admin/users/:id/reset-password', authMiddleware, adminMiddleware, adminRoutes.resetPassword);
app.put('/api/admin/users/:id/role', authMiddleware, adminMiddleware, adminRoutes.changeRole);

// Admin chat routes
app.get('/api/admin/chats', authMiddleware, adminMiddleware, adminRoutes.getChats);
app.post('/api/admin/chats/:userId/read', authMiddleware, adminMiddleware, adminRoutes.markChatAsRead);
app.delete('/api/admin/chats/:userId', authMiddleware, adminMiddleware, adminRoutes.deleteChat);

// Auction routes (protegidas + verificación de plan)
app.get('/api/auctions', authMiddleware, auctionRoutes.getAuctions);
app.get('/api/auctions/:id', authMiddleware, auctionRoutes.getAuction);
app.post('/api/auctions', authMiddleware, checkPlanMiddleware, auctionRoutes.createAuction);
app.put('/api/auctions/:id', authMiddleware, auctionRoutes.updateAuction);
app.delete('/api/auctions/:id', authMiddleware, auctionRoutes.deleteAuction);
app.post('/api/auctions/:id/gifts', authMiddleware, auctionRoutes.recordGift);
app.post('/api/auctions/:id/finish', authMiddleware, auctionRoutes.finishAuction);

// Stats routes
app.get('/api/stats', authMiddleware, auctionRoutes.getStats);

// News, Chat y Overlay routes
app.use('/api/news', newsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/overlays', overlaysRoutes);

// Health check
app.get('/api/health', async (req, res) => {
  try {
    // Verificar DB
    const db = getDB();
    if (process.env.DATABASE_URL) {
      await db.query('SELECT 1');
    }
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '2.0.0',
      database: process.env.DATABASE_URL ? 'postgresql' : 'sqlite'
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'Database not available'
    });
  }
});

// Endpoint de diagnóstico para uploads
app.get('/api/debug/uploads', async (req, res) => {
  try {
    const fs = require('fs');
    const overlaysDir = path.join(process.cwd(), 'uploads', 'overlays');

    // Verificar que el directorio existe
    if (!fs.existsSync(overlaysDir)) {
      return res.status(404).json({
        error: 'Directory not found',
        directory: overlaysDir,
        exists: false
      });
    }

    // Listar archivos
    const files = fs.readdirSync(overlaysDir);

    const fileDetails = files.map(file => {
      const filePath = path.join(overlaysDir, file);
      const stats = fs.statSync(filePath);
      return {
        name: file,
        size: stats.size,
        sizeFormatted: `${(stats.size / 1024).toFixed(2)} KB`,
        created: stats.birthtime,
        modified: stats.mtime,
        url: `/uploads/overlays/${file}`,
        fullPath: filePath
      };
    });

    res.json({
      directory: overlaysDir,
      totalFiles: files.length,
      totalSize: fileDetails.reduce((sum, f) => sum + f.size, 0),
      files: fileDetails
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      stack: IS_PRODUCTION ? undefined : error.stack
    });
  }
});

// Endpoint para verificar un archivo específico
app.get('/api/debug/file-exists/:filename', async (req, res) => {
  try {
    const fs = require('fs');
    const { filename } = req.params;
    const filePath = path.join(process.cwd(), 'uploads', 'overlays', filename);

    const exists = fs.existsSync(filePath);

    if (exists) {
      const stats = fs.statSync(filePath);
      res.json({
        exists: true,
        filename,
        url: `/uploads/overlays/${filename}`,
        fullPath: filePath,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime
      });
    } else {
      res.json({
        exists: false,
        filename,
        expectedPath: filePath
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== STATIC FILES ====================

// Servir archivos subidos (uploads) con logging mejorado
const uploadsPath = path.join(process.cwd(), 'uploads');
process.stdout.write(`✓ Serving uploads from: ${uploadsPath}\n`);

// Verificar que el directorio uploads existe
const overlaysDir = path.join(uploadsPath, 'overlays');
if (!require('fs').existsSync(overlaysDir)) {
  require('fs').mkdirSync(overlaysDir, { recursive: true, mode: 0o755 });
  process.stdout.write(`✓ Created directory: ${overlaysDir}\n`);
}

// Middleware de logging para requests de uploads
app.use('/uploads', (req, res, next) => {
  const fullPath = path.join(uploadsPath, req.url);
  process.stdout.write(`[STATIC] Request: ${req.url} -> ${fullPath}\n`);
  next();
});

// Servir archivos estáticos con configuración mejorada
app.use('/uploads', express.static(uploadsPath, {
  // Configuración para mejor debugging
  setHeaders: (res, filePath) => {
    process.stdout.write(`[STATIC] Serving file: ${filePath}\n`);
    // Agregar headers para evitar cache en desarrollo
    if (!IS_PRODUCTION) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  },
  fallthrough: true, // Continuar al siguiente handler si no encuentra el archivo
  dotfiles: 'ignore',
  index: false
}));

// Handler 404 para archivos no encontrados en uploads
app.use('/uploads', (req, res) => {
  const requestedPath = path.join(uploadsPath, req.url);
  process.stderr.write(`[STATIC] ✗ 404 Not Found: ${req.url}\n`);
  process.stderr.write(`[STATIC] Full path: ${requestedPath}\n`);

  res.status(404).json({
    error: 'File not found',
    path: req.url,
    fullPath: requestedPath,
    exists: require('fs').existsSync(requestedPath),
    message: 'El archivo solicitado no existe en el servidor'
  });
});

app.use(express.static(PUBLIC_DIR));

// Ruta especial para overlay personalizado
app.get('/overlay/:userId', async (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'overlay.html'));
});

// SPA fallback - Express 5 compatible
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint no encontrado' });
  }

  const ext = path.extname(req.path);
  if (ext && ext !== '.html') {
    return res.sendFile(path.join(PUBLIC_DIR, req.path), (err) => {
      if (err) {
        res.status(404).send('Archivo no encontrado');
      }
    });
  }

  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    error: IS_PRODUCTION ? 'Error interno del servidor' : err.message
  });
});

// ==================== HTTP SERVER ====================

const server = http.createServer(app);

// ==================== WEBSOCKET SERVER ====================

const wss = new WebSocket.Server({ server, path: WEBSOCKET_PATH });

const listenersByUniqueId = new Map();
const streams = new Map();

wss.on('connection', (socket) => {
  socket.isAlive = true;
  socket.currentUniqueId = null;

  socket.on('pong', () => {
    socket.isAlive = true;
  });

  socket.on('message', (message) => {
    handleClientMessage(socket, message);
  });

  socket.on('close', () => {
    detachSocket(socket);
  });

  socket.on('error', () => {
    detachSocket(socket);
  });
});

const HEARTBEAT_INTERVAL = 30000;
const heartbeatTimer = setInterval(() => {
  wss.clients.forEach((socket) => {
    if (!socket.isAlive) {
      socket.terminate();
      detachSocket(socket);
      return;
    }
    socket.isAlive = false;
    try {
      socket.ping();
    } catch (err) {
      // Silent
    }
  });
}, HEARTBEAT_INTERVAL);

wss.on('close', () => {
  clearInterval(heartbeatTimer);
  streams.forEach((entry) => cleanupStream(entry.uniqueId));
});

function handleClientMessage(socket, raw) {
  let payload;
  try {
    payload = JSON.parse(raw.toString());
  } catch (err) {
    send(socket, { type: 'error', message: 'Mensaje inválido' });
    return;
  }

  if (!payload || typeof payload !== 'object' || !payload.type) {
    send(socket, { type: 'error', message: 'Formato incorrecto' });
    return;
  }

  switch (payload.type) {
    case 'connect':
      const uniqueId = typeof payload.uniqueId === 'string' ? payload.uniqueId.trim().toLowerCase() : '';
      if (!uniqueId) {
        send(socket, { type: 'error', message: 'uniqueId requerido' });
        return;
      }
      const clientSessionId = payload.sessionId || null;
      const clientTtTargetIdc = payload.ttTargetIdc || null;
      attachSocketToUniqueId(socket, uniqueId, clientSessionId, clientTtTargetIdc);
      break;

    case 'disconnect':
      detachSocket(socket);
      send(socket, { type: 'disconnected' });
      break;

    case 'leaderboard-update':
      broadcastToAll({ type: 'leaderboard-update', donors: payload.donors });
      break;

    default:
      send(socket, { type: 'error', message: 'Acción no soportada' });
  }
}

function attachSocketToUniqueId(socket, uniqueId, clientSessionId = null, clientTtTargetIdc = null) {
  if (socket.currentUniqueId === uniqueId) {
    return;
  }

  detachSocket(socket);

  let listeners = listenersByUniqueId.get(uniqueId);
  if (!listeners) {
    listeners = new Set();
    listenersByUniqueId.set(uniqueId, listeners);
  }
  listeners.add(socket);
  socket.currentUniqueId = uniqueId;

  const effectiveSessionId = clientSessionId || SESSION_ID;
  const effectiveTtTargetIdc = clientTtTargetIdc || TT_TARGET_IDC;

  ensureStream(uniqueId, effectiveSessionId, effectiveTtTargetIdc)
    .catch((err) => {
      let errorMessage = err.message || 'No se pudo conectar al live.';
      let needsAuth = false;

      if (errorMessage.includes('504') || errorMessage.includes('sign server') || errorMessage.includes('Sign Error')) {
        errorMessage = 'Error del servidor de firma. El usuario puede no estar en vivo.';
        needsAuth = true;
      } else if (errorMessage.includes('not found') || errorMessage.includes('Room ID')) {
        errorMessage = 'Usuario no encontrado o no está en vivo.';
      } else if (errorMessage.includes('CAPTCHA') || errorMessage.includes('captcha')) {
        errorMessage = 'TikTok requiere verificación CAPTCHA.';
        needsAuth = true;
      }

      send(socket, {
        type: 'error',
        message: errorMessage,
        needsAuth: needsAuth
      });
      detachSocket(socket);
    });
}

function detachSocket(socket) {
  const uniqueId = socket.currentUniqueId;
  if (!uniqueId) return;

  socket.currentUniqueId = null;
  const listeners = listenersByUniqueId.get(uniqueId);
  if (listeners) {
    listeners.delete(socket);
    if (listeners.size === 0) {
      listenersByUniqueId.delete(uniqueId);
      cleanupStream(uniqueId);
    }
  }
}

function ensureStream(uniqueId, sessionId = null, ttTargetIdc = null) {
  const streamKey = uniqueId;
  let streamEntry = streams.get(streamKey);

  if (streamEntry && streamEntry.connection && streamEntry.connection.isConnected) {
    return Promise.resolve(streamEntry);
  }

  if (streamEntry && streamEntry.connectPromise) {
    return streamEntry.connectPromise;
  }

  streamEntry = {
    uniqueId,
    connection: null,
    connectPromise: null
  };
  streams.set(streamKey, streamEntry);

  const { connection, connectPromise } = createTikTokConnection(uniqueId, sessionId, ttTargetIdc);
  streamEntry.connection = connection;
  streamEntry.connectPromise = connectPromise
    .then(() => {
      streamEntry.connectPromise = null;
      return streamEntry;
    })
    .catch((err) => {
      cleanupStream(uniqueId);
      throw err;
    });

  return streamEntry.connectPromise;
}

function cleanupStream(uniqueId) {
  const entry = streams.get(uniqueId);
  if (!entry) return;
  streams.delete(uniqueId);
  if (entry.connection) {
    try {
      entry.connection.removeAllListeners();
      entry.connection.disconnect().catch(() => { });
    } catch (err) {
      // Silent
    }
  }
}

function createTikTokConnection(uniqueId, sessionId = null, ttTargetIdc = null) {
  const effectiveSessionId = sessionId || SESSION_ID;
  const effectiveTtTargetIdc = ttTargetIdc || TT_TARGET_IDC;

  const options = {
    processInitialData: false,
    enableExtendedGiftInfo: true,
    fetchRoomInfoOnConnect: true,
    enableRequestPolling: true,
    requestPollingIntervalMs: 1000,
    connectWithUniqueId: false,
    webClientHeaders: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ...(EXTRA_HEADERS || {})
    },
    webClientOptions: {
      timeout: 15000
    },
    webClientParams: {},
    wsClientHeaders: {},
    wsClientParams: {},
    wsClientOptions: {}
  };

  if (effectiveSessionId) {
    options.sessionId = effectiveSessionId;
    if (effectiveTtTargetIdc) {
      options.ttTargetIdc = effectiveTtTargetIdc;
    }
  }

  const connection = new TikTokLiveConnection(uniqueId, options);

  connection.on(ControlEvent.CONNECTED, (state) => {
    broadcast(uniqueId, { type: 'connected', data: { uniqueId, state } });
  });

  connection.on(ControlEvent.DISCONNECTED, (data) => {
    broadcast(uniqueId, { type: 'disconnected', data: { uniqueId, code: data?.code, reason: data?.reason } });
    cleanupStream(uniqueId);
  });

  connection.on(WebcastEvent.STREAM_END, (data) => {
    broadcast(uniqueId, { type: 'streamEnd', data: { uniqueId, action: data?.action } });
    cleanupStream(uniqueId);
  });

  connection.on(WebcastEvent.GIFT, (event) => {
    broadcast(uniqueId, { type: 'gift', data: event });
  });

  connection.on(ControlEvent.ERROR, (err) => {
    let errorMsg = 'Error desconocido';
    if (typeof err === 'string') {
      errorMsg = err;
    } else if (err?.message) {
      errorMsg = err.message;
    }
    broadcast(uniqueId, { type: 'error', message: errorMsg });
  });

  const connectPromise = connection.connect().catch(err => {
    cleanupStream(uniqueId);
    throw err;
  });

  return { connection, connectPromise };
}

function broadcast(uniqueId, data) {
  const listeners = listenersByUniqueId.get(uniqueId);
  if (listeners) {
    listeners.forEach((socket) => send(socket, data));
  }
}

function broadcastToAll(data) {
  wss.clients.forEach((socket) => {
    if (socket.readyState === WebSocket.OPEN) {
      send(socket, data);
    }
  });
}

function send(socket, data) {
  if (socket.readyState === WebSocket.OPEN) {
    try {
      socket.send(JSON.stringify(data));
    } catch (err) {
      // Silent
    }
  }
}

// ==================== STARTUP ====================

async function startServer() {
  try {
    await initDatabase();

    server.listen(PORT, HOST, () => {
      process.stdout.write(`✓ Server listening on ${HOST}:${PORT}\n`);
      process.stdout.write(`✓ Environment: ${process.env.NODE_ENV || 'development'}\n`);
      process.stdout.write(`✓ Database: ${process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite'}\n`);
    });

  } catch (error) {
    process.stderr.write(`✗ Server startup failed: ${error.message}\n`);
    if (error.stack && !IS_PRODUCTION) {
      process.stderr.write(error.stack + '\n');
    }
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  clearInterval(heartbeatTimer);

  wss.clients.forEach((socket) => {
    socket.close();
  });

  server.close(async () => {
    await closeDatabase();
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  process.emit('SIGTERM');
});

// Iniciar
startServer();
