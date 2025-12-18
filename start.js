/**
 * Servidor Principal - Sin dotenv para producción
 * Las variables vienen directamente del sistema
 */

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

// Diagnóstico de variables
console.log('\n🔍 DIAGNÓSTICO DE INICIO\n');
console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('PORT:', process.env.PORT || 'not set');
console.log('HOST:', process.env.HOST || 'not set');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET ✓' : 'NOT SET ✗');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'SET ✓' : 'NOT SET ✗');
console.log('');

// Si en producción pero sin DATABASE_URL, error crítico
if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL no está configurado en producción');
  console.error('Configura las variables de entorno en Digital Ocean:');
  console.error('Settings → App-Level Environment Variables');
  process.exit(1);
}

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('❌ ERROR: JWT_SECRET no está configurado en producción');
  console.error('Genera uno con: npm run generate:jwt');
  console.error('Y configúralo en Digital Ocean App-Level Environment Variables');
  process.exit(1);
}

// Database y Auth
const { initDatabase, closeDatabase, getDB } = require('./database/db');
const { authMiddleware } = require('./middleware/auth');
const { checkPlanMiddleware, adminMiddleware } = require('./middleware/plan');
const authRoutes = require('./routes/auth');
const auctionRoutes = require('./routes/auctions');
const adminRoutes = require('./routes/admin');
const paymentRoutes = require('./routes/payments');
const newsRoutes = require('./routes/news');
const chatRoutes = require('./routes/chat');
const overlaysRoutes = require('./routes/overlays');

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
app.get('/api/auth/verify', authRoutes.verifyEmail);

// Endpoint TEMPORAL para resetear usuarios
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

// Endpoint de DIAGNÓSTICO DE CORREO (Para ver el error exacto)
app.get('/api/setup/debug-email', async (req, res) => {
  if (req.query.secret !== 'lolkjk12_RESET') return res.status(403).send('Forbidden');

  const targetEmail = req.query.email || 'resslow41@gmail.com';
  const { transporter } = require('./utils/mailer');

  try {
    const info = await transporter.sendMail({
      from: '"TikTool Debug" <resslow41@gmail.com>',
      to: targetEmail,
      subject: 'Prueba de Diagnóstico',
      text: 'Si ves esto, el correo funciona.',
      html: '<b>Si ves esto, el correo funciona.</b>'
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
app.post('/api/admin/users/:id/add-days', authMiddleware, adminMiddleware, adminRoutes.addDays);
app.post('/api/admin/users/:id/remove-days', authMiddleware, adminMiddleware, adminRoutes.removeDays);
app.post('/api/admin/users/:id/toggle-status', authMiddleware, adminMiddleware, adminRoutes.toggleStatus);
app.put('/api/admin/users/:id/role', authMiddleware, adminMiddleware, adminRoutes.changeRole);

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
    const db = getDB();
    if (process.env.DATABASE_URL) {
      await db.query('SELECT 1');
    }
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '2.0.0',
      database: process.env.DATABASE_URL ? 'postgresql' : 'sqlite',
      env: {
        nodeEnv: process.env.NODE_ENV,
        hasDatabase: !!process.env.DATABASE_URL,
        hasJWT: !!process.env.JWT_SECRET
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'Database not available',
      error: error.message
    });
  }
});

// ==================== STATIC FILES ====================

// Servir archivos subidos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
  console.error('Error:', err);
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
      return;
    }
    socket.isAlive = false;
    socket.ping();
  });
}, HEARTBEAT_INTERVAL);

function handleClientMessage(socket, rawData) {
  let msg;
  try {
    msg = JSON.parse(rawData);
  } catch {
    return;
  }

  if (msg.type === 'connect' && msg.uniqueId) {
    attachSocket(socket, msg.uniqueId);
  } else if (msg.type === 'disconnect') {
    detachSocket(socket);
  }
}

function attachSocket(socket, uniqueId) {
  detachSocket(socket);
  socket.currentUniqueId = uniqueId;

  if (!listenersByUniqueId.has(uniqueId)) {
    const connection = new TikTokLiveConnection(uniqueId, {
      sessionId: SESSION_ID,
      targetIdC: TT_TARGET_IDC,
      requestHeaders: EXTRA_HEADERS
    });

    listenersByUniqueId.set(uniqueId, new Set());
    streams.set(uniqueId, connection);

    connection.on(ControlEvent.CONNECTED, () => {
      broadcast(uniqueId, { type: 'connected', uniqueId });
    });

    connection.on(ControlEvent.DISCONNECTED, () => {
      broadcast(uniqueId, { type: 'disconnected', uniqueId });
    });

    connection.on(WebcastEvent.GIFT, (data) => {
      broadcast(uniqueId, { type: 'gift', data });
    });

    connection.on(WebcastEvent.CHAT, (data) => {
      broadcast(uniqueId, { type: 'chat', data });
    });

    connection.on(WebcastEvent.LIKE, (data) => {
      broadcast(uniqueId, { type: 'like', data });
    });

    connection.on(WebcastEvent.MEMBER, (data) => {
      broadcast(uniqueId, { type: 'member', data });
    });

    connection.on(WebcastEvent.SHARE, (data) => {
      broadcast(uniqueId, { type: 'share', data });
    });

    connection.on(WebcastEvent.FOLLOW, (data) => {
      broadcast(uniqueId, { type: 'follow', data });
    });

    connection.connect().catch((err) => {
      broadcast(uniqueId, { type: 'error', message: err.toString() });
    });
  }

  listenersByUniqueId.get(uniqueId).add(socket);
  socket.send(JSON.stringify({ type: 'attached', uniqueId }));
}

function detachSocket(socket) {
  if (!socket.currentUniqueId) return;

  const listeners = listenersByUniqueId.get(socket.currentUniqueId);
  if (listeners) {
    listeners.delete(socket);
    if (listeners.size === 0) {
      const connection = streams.get(socket.currentUniqueId);
      if (connection) {
        connection.disconnect();
      }
      listenersByUniqueId.delete(socket.currentUniqueId);
      streams.delete(socket.currentUniqueId);
    }
  }
  socket.currentUniqueId = null;
}

function broadcast(uniqueId, data) {
  const listeners = listenersByUniqueId.get(uniqueId);
  if (!listeners) return;

  for (const socket of listeners) {
    if (socket.readyState !== WebSocket.OPEN) continue;
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
    console.log('🚀 Iniciando servidor...\n');

    await initDatabase();

    server.listen(PORT, HOST, () => {
      console.log(`✓ Server listening on ${HOST}:${PORT}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`✓ Database: ${process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite'}`);
      console.log('');
    });

  } catch (error) {
    console.error(`✗ Server startup failed: ${error.message}`);
    if (error.stack && !IS_PRODUCTION) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('📥 Recibida señal SIGTERM, cerrando gracefully...');
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
