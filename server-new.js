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
const compression = require('compression');
const helmet = require('helmet');
const WebSocket = require('ws');
const {
  TikTokLiveConnection,
  WebcastEvent,
  ControlEvent,
  SignConfig
} = require('tiktok-live-connector');
const {
  normalizeChannelId,
  normalizeUniqueId,
  registerLiveEventHandlers
} = require('./src/modules/tiktok/services/live-events');

// Database y Auth (rutas actualizadas a nueva estructura modular)
const database = require('./database/db');
const { initDatabase, closeDatabase, getDB } = database;
const { authMiddleware, adminMiddleware, verifyToken } = require('./src/shared/middlewares/auth');
const { checkPlanMiddleware } = require('./src/shared/middlewares/plan');
const { generalLimiter, authLimiter, wsRateLimiter } = require('./src/shared/middlewares/rate-limit');
const securityConfig = require('./src/shared/config/security');
const authRoutes = require('./src/modules/auth/routes');
const auctionRoutes = require('./src/modules/auctions/routes');
const adminRoutes = require('./src/modules/admin/routes');
const paymentRoutes = require('./src/modules/payments/routes');
const newsRoutes = require('./src/modules/news/routes');
const chatRoutes = require('./src/modules/chat/routes');
const overlaysRoutes = require('./src/modules/overlays/routes');
const rouletteRoutes = require('./src/modules/roulette/routes');
const goalsRoutes = require('./src/modules/goals/routes');
const soundRoutes = require('./src/modules/sounds/routes');
const timerRoutes = require('./src/modules/timers/routes');
const actionRoutes = require('./src/modules/actions/routes');
const chatbotRoutes = require('./src/modules/chatbot/routes');
const songRequestsRoutes = require('./src/modules/songrequests/routes');
const settingsRoutes = require('./src/modules/settings/routes');
const { ensureIntegrationSchema } = require('./src/modules/integrations/schema');
const { IntegrationEngine } = require('./src/modules/integrations/engine');
const { createIntegrationRouter } = require('./src/modules/integrations/routes');
const { ensureGameSchema } = require('./src/modules/game/schema');
const { createGameRouter } = require('./src/modules/game/routes');
const { createMinecraftRouter } = require('./src/modules/minecraft/routes');

// App shell directory
const APP_DIR = path.join(__dirname, 'frontend', 'app');

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
let EXTRA_HEADERS = null;
try { if (process.env.TIKTOK_EXTRA_HEADERS) EXTRA_HEADERS = JSON.parse(process.env.TIKTOK_EXTRA_HEADERS); } catch (e) { process.stderr.write(`⚠ Error parsing TIKTOK_EXTRA_HEADERS: ${e.message}\n`); }

// ==================== EXPRESS APP ====================

const integrationEngine = new IntegrationEngine({ db: database, broadcastToChannel });
const app = express();

// Validar variables de entorno críticas en producción
if (IS_PRODUCTION) {
  const requiredEnvVars = ['JWT_SECRET', 'DATABASE_URL'];
  const missing = requiredEnvVars.filter(v => !process.env[v]);
  if (missing.length > 0) {
    process.stderr.write(`ERROR: Missing required environment variables: ${missing.join(', ')}\n`);
    process.exit(1);
  }
}

// Seguridad: Helmet headers
app.use(securityConfig);

// Compresión gzip
app.use(compression());

// CORS con lista blanca
const corsOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : (IS_PRODUCTION ? ['*'] : ['http://localhost:8080']);
if (IS_PRODUCTION && !process.env.CORS_ORIGIN) process.stderr.write('⚠ CORS_ORIGIN no configurado. Usando * (permitir todos).\n');
app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting global (solo API)
app.use('/api/', generalLimiter);

// Parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Rate limit específico para auth
app.use('/api/auth', authLimiter);

// ==================== API ROUTES ====================

// Auth routes (públicas)
app.post('/api/auth/register', authRoutes.register);
app.post('/api/auth/login', authRoutes.login);
app.post('/api/auth/refresh', authRoutes.refreshToken);
app.get('/api/auth/verify', authRoutes.verifyEmail); // Ruta de verificación

// NOTA: Los endpoints /api/setup/* fueron eliminados por seguridad.
// La creación inicial de admin debe hacerse mediante un script CLI seguro
// o mediante el panel de administración con JWT.

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
app.get('/api/admin/payments', authMiddleware, adminMiddleware, adminRoutes.getAllPayments);
app.post('/api/admin/payments/:id/refund', authMiddleware, adminMiddleware, adminRoutes.refundPayment);

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

// News, Chat, Overlay y Roulette routes
app.use('/api/news', newsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/overlays', overlaysRoutes);
app.use('/api/roulette', rouletteRoutes);
app.use('/api/sounds', soundRoutes);
app.use('/api/timers', timerRoutes);
app.use('/api/actions', actionRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/integrations', createIntegrationRouter({ db: database, engine: integrationEngine }));
app.use('/api/game', createGameRouter());
app.use('/api/minecraft', createMinecraftRouter());
app.use('/api/songrequests', songRequestsRoutes);
app.use('/api/settings', settingsRoutes);
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

// NOTA: Los endpoints /api/debug/* fueron eliminados por seguridad.

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

// Servir archivos estáticos
app.use('/uploads', express.static(uploadsPath, {
  setHeaders: (res, filePath) => {
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
  process.stderr.write(`[STATIC] ✗ 404 Not Found: ${req.url}\n`);
  res.status(404).json({
    error: 'File not found',
    message: 'El archivo solicitado no existe en el servidor'
  });
});

app.get('/vendor/gsap/gsap.min.js', (_req, res) => {
  res.sendFile(path.join(__dirname, 'node_modules', 'gsap', 'dist', 'gsap.min.js'));
});

// ==================== ASSETS ESTÁTICOS ====================

// Assets generales (imágenes, fuentes)
app.use('/assets', express.static(path.join(PUBLIC_DIR, 'assets'), { maxAge: '1y' }));
// Archivos específicos del frontend (gifts.json, favicon)
app.use('/app', express.static(APP_DIR, {
  index: false,
  fallthrough: true,
  maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0
}));
// Catch-all para el resto de archivos del frontend (overlays, etc.)
app.use(express.static(PUBLIC_DIR, { maxAge: '1h' }));

// Root redirige a /app
app.get('/', (req, res) => {
  res.redirect('/app');
});

// App shell: redirect /app → /app/dashboard
app.get('/app', (req, res) => {
  res.redirect('/app/dashboard');
});

// App shell: sirve index.html para todas las rutas visuales bajo /app/*
app.get('/app/*splat', (req, res) => {
  const ext = path.extname(req.path);
  if (ext && ext !== '.html' && ['.js', '.css', '.png', '.jpg', '.svg', '.ico', '.woff', '.woff2', '.json'].includes(ext)) {
    return res.status(404).send('File not found');
  }
  res.sendFile('index.html', { root: APP_DIR });
});

// Overlays OBS heredados (se mantienen temporalmente)
app.use('/overlays', (req, res, next) => {
  res.removeHeader('X-Frame-Options');
  console.warn('[Legacy OBS]', req.path);
  next();
});
app.use('/overlays', express.static(path.join(PUBLIC_DIR, 'overlays')));
app.use('/overlays', (req, res) => res.status(404).send('Overlay no encontrado'));

// Redirects de páginas heredadas
app.get('/index.html', (req, res) => res.redirect(301, '/app'));
app.get('/login.html', (req, res) => res.redirect(301, '/app/login'));
app.get('/roulette.html', (req, res) => res.redirect(301, '/app/roulette'));
app.get('/admin.html', (req, res) => res.redirect(301, '/app/admin'));
app.get('/verify-email.html', (req, res) => res.redirect(301, '/app/verify-email'));

// 404 para API
app.use('/api/*splat', (req, res) => {
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  res.status(404).json({ error: 'Endpoint no encontrado' });
});

// 404 para assets no encontrados
app.use('/assets', (req, res) => res.status(404).sendFile(path.join(APP_DIR, 'index.html')));
app.use('/uploads', (req, res) => res.status(404).json({ error: 'File not found' }));

// 404 genérico para rutas visuales desconocidas
app.use((req, res) => {
  res.status(404).sendFile(path.join(APP_DIR, 'index.html'));
});

// Error handler centralizado
const { errorHandler, notFoundHandler, setupGlobalHandlers } = require('./src/shared/middlewares/error-handler');
app.use(notFoundHandler);
app.use(errorHandler);

// ==================== HTTP SERVER ====================

const server = http.createServer(app);

// ==================== WEBSOCKET SERVER ====================

const wss = new WebSocket.Server({ server, path: WEBSOCKET_PATH });

const listenersByUniqueId = new Map();
const listenersByChannelId = new Map();
const uniqueIdByChannelId = new Map();
const channelIdsByUniqueId = new Map();
const ownerSocketByChannelId = new Map();
const streams = new Map();

wss.on('connection', (socket) => {
  const clientIp = socket._socket?.remoteAddress || 'unknown';
  if (!wsRateLimiter.checkLimit(clientIp)) {
    socket.close(1013, 'Rate limit exceeded');
    return;
  }
  socket.msgCount = 0;
  socket.msgWindow = Date.now();
  socket.isAlive = true;
  socket.currentUniqueId = null;
  socket.ownerChannelId = null;
  socket.subscribedChannelId = null;
  socket.authenticatedUserId = null;

  socket.on('pong', () => {
    socket.isAlive = true;
  });

  socket.on('message', (message) => {
    /* per-socket message flood protection: max 60 msg per 10s */
    const now = Date.now();
    if (now - socket.msgWindow > 10000) { socket.msgCount = 0; socket.msgWindow = now; }
    socket.msgCount++;
    if (socket.msgCount > 60) return;
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
    case 'connect': {
      const uniqueId = normalizeUniqueId(payload.uniqueId);
      if (!uniqueId) {
        send(socket, { type: 'error', message: 'uniqueId requerido' });
        return;
      }
      const channelId = normalizeChannelId(payload.channelId);
      if (payload.channelId !== undefined && !channelId) {
        send(socket, { type: 'error', message: 'channelId invalido' });
        return;
      }
      if (channelId && !authorizeChannelConnect(socket, payload.accessToken, channelId)) return;
      const clientSessionId = payload.sessionId || null;
      const clientTtTargetIdc = payload.ttTargetIdc || null;
      attachSocketToUniqueId(socket, uniqueId, clientSessionId, clientTtTargetIdc, channelId);
      break;
    }

    case 'subscribe': {
      const channelId = normalizeChannelId(payload.channelId || payload.userId);
      if (!channelId) {
        send(socket, { type: 'error', message: 'channelId requerido' });
        return;
      }
      attachSocketToChannel(socket, channelId);
      break;
    }

    case 'disconnect':
      detachSocket(socket);
      send(socket, { type: 'disconnected' });
      break;

    default:
      send(socket, { type: 'error', message: 'Acción no soportada' });
  }
}

function authorizeChannelConnect(socket, token, channelId) {
  if (typeof token !== 'string' || !token.trim()) {
    send(socket, { type: 'error', code: 'WS_AUTH_REQUIRED', message: 'Token de acceso requerido para vincular el canal' });
    return false;
  }

  try {
    const decoded = verifyToken(token.trim());
    const tokenChannelId = normalizeChannelId(decoded.userId);
    if (decoded.type === 'refresh' || !tokenChannelId || tokenChannelId !== channelId) {
      send(socket, { type: 'error', code: 'WS_CHANNEL_FORBIDDEN', message: 'No autorizado para vincular este canal' });
      return false;
    }
    socket.authenticatedUserId = tokenChannelId;
    return true;
  } catch (_error) {
    send(socket, { type: 'error', code: 'WS_AUTH_INVALID', message: 'Token de acceso invalido o expirado' });
    return false;
  }
}

function attachSocketToUniqueId(socket, uniqueId, clientSessionId = null, clientTtTargetIdc = null, channelId = '') {
  if (socket.currentUniqueId === uniqueId) {
    if (channelId) bindChannelToUniqueId(socket, channelId, uniqueId);
    if (!streams.has(uniqueId)) {
      ensureStream(uniqueId, clientSessionId || SESSION_ID, clientTtTargetIdc || TT_TARGET_IDC)
        .catch((err) => sendConnectionError(socket, err));
    }
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
  if (channelId) bindChannelToUniqueId(socket, channelId, uniqueId);

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

function sendConnectionError(socket, err) {
  let errorMessage = err?.message || 'No se pudo conectar al live.';
  let needsAuth = false;

  if (errorMessage.includes('504') || errorMessage.includes('sign server') || errorMessage.includes('Sign Error')) {
    errorMessage = 'Error del servidor de firma. El usuario puede no estar en vivo.';
    needsAuth = true;
  } else if (errorMessage.includes('not found') || errorMessage.includes('Room ID')) {
    errorMessage = 'Usuario no encontrado o no esta en vivo.';
  } else if (errorMessage.toLowerCase().includes('captcha')) {
    errorMessage = 'TikTok requiere verificacion CAPTCHA.';
    needsAuth = true;
  }

  send(socket, { type: 'error', message: errorMessage, needsAuth });
}

function attachSocketToChannel(socket, channelId) {
  detachChannelSubscription(socket);

  let listeners = listenersByChannelId.get(channelId);
  if (!listeners) {
    listeners = new Set();
    listenersByChannelId.set(channelId, listeners);
  }
  listeners.add(socket);
  socket.subscribedChannelId = channelId;

  const uniqueId = uniqueIdByChannelId.get(channelId) || null;
  const live = Boolean(uniqueId && streams.get(uniqueId)?.connection?.isConnected);
  send(socket, {
    type: 'subscribed',
    data: { channelId, uniqueId, live }
  });
  if (live) {
    send(socket, { type: 'connected', data: { uniqueId, resumed: true } });
  }
}

function bindChannelToUniqueId(socket, channelId, uniqueId) {
  const previousUniqueId = uniqueIdByChannelId.get(channelId);
  if (previousUniqueId && previousUniqueId !== uniqueId) {
    const previousChannels = channelIdsByUniqueId.get(previousUniqueId);
    previousChannels?.delete(channelId);
    if (previousChannels?.size === 0) channelIdsByUniqueId.delete(previousUniqueId);
  }

  uniqueIdByChannelId.set(channelId, uniqueId);
  ownerSocketByChannelId.set(channelId, socket);
  socket.ownerChannelId = channelId;

  let channelIds = channelIdsByUniqueId.get(uniqueId);
  if (!channelIds) {
    channelIds = new Set();
    channelIdsByUniqueId.set(uniqueId, channelIds);
  }
  channelIds.add(channelId);
}

function detachChannelSubscription(socket) {
  const channelId = socket.subscribedChannelId;
  if (!channelId) return;

  socket.subscribedChannelId = null;
  const listeners = listenersByChannelId.get(channelId);
  listeners?.delete(socket);
  if (listeners?.size === 0) listenersByChannelId.delete(channelId);
}

function unbindOwnedChannel(socket) {
  const channelId = socket.ownerChannelId;
  if (!channelId || ownerSocketByChannelId.get(channelId) !== socket) {
    socket.ownerChannelId = null;
    return;
  }

  const uniqueId = uniqueIdByChannelId.get(channelId);
  uniqueIdByChannelId.delete(channelId);
  ownerSocketByChannelId.delete(channelId);
  socket.ownerChannelId = null;

  if (uniqueId) {
    const channelIds = channelIdsByUniqueId.get(uniqueId);
    channelIds?.delete(channelId);
    if (channelIds?.size === 0) channelIdsByUniqueId.delete(uniqueId);
  }
}

function unbindChannelsForUniqueId(uniqueId) {
  const channelIds = channelIdsByUniqueId.get(uniqueId);
  if (!channelIds) return;

  for (const channelId of channelIds) {
    uniqueIdByChannelId.delete(channelId);
    const ownerSocket = ownerSocketByChannelId.get(channelId);
    if (ownerSocket?.ownerChannelId === channelId) ownerSocket.ownerChannelId = null;
    ownerSocketByChannelId.delete(channelId);
  }
  channelIdsByUniqueId.delete(uniqueId);
}

function detachSocket(socket) {
  const uniqueId = socket.currentUniqueId;
  const ownedChannelId = socket.ownerChannelId;
  if (uniqueId && ownedChannelId && ownerSocketByChannelId.get(ownedChannelId) === socket) {
    broadcastToChannel(ownedChannelId, {
      type: 'disconnected',
      data: { uniqueId, reason: 'dashboard_disconnected' }
    });
  }

  if (uniqueId) {
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

  unbindOwnedChannel(socket);
  detachChannelSubscription(socket);
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
  if (entry) streams.delete(uniqueId);
  unbindChannelsForUniqueId(uniqueId);
  if (entry?.connection) {
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

  registerLiveEventHandlers(connection, WebcastEvent, (event) => handleLiveEvent(uniqueId, event));

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
  const recipients = new Set();
  const listeners = listenersByUniqueId.get(uniqueId);
  listeners?.forEach((socket) => recipients.add(socket));

  const channelIds = channelIdsByUniqueId.get(uniqueId);
  if (channelIds) {
    channelIds.forEach((channelId) => {
      listenersByChannelId.get(channelId)?.forEach((socket) => recipients.add(socket));
    });
  }

  recipients.forEach((socket) => send(socket, data));
}

function handleLiveEvent(uniqueId, event) {
  broadcast(uniqueId, event);
  const channelIds = channelIdsByUniqueId.get(uniqueId);
  if (!channelIds?.size) return;

  for (const channelId of [...channelIds]) {
    void integrationEngine.handleLiveEvent(channelId, event).catch((error) => {
      const message = String(error?.message || error).replace(/[\r\n]/g, ' ');
      process.stderr.write(`[INTEGRATIONS] Event ${event.type} failed for channel ${channelId}: ${message}\n`);
    });
  }
}

function broadcastToChannel(channelId, data) {
  listenersByChannelId.get(channelId)?.forEach((socket) => send(socket, data));
}

function send(socket, data) {
  if (socket.readyState === WebSocket.OPEN) {
    try {
      socket.send(JSON.stringify(data));
    } catch (err) {
      // ignore
    }
  }
}

// Goals routes (needs wss, set up after wss is created)
app.use('/api/goals', goalsRoutes(wss));

// ==================== STARTUP ====================

async function startServer() {
  setupGlobalHandlers();
  try {
    await initDatabase();
    await ensureIntegrationSchema(database);
    await ensureGameSchema(database);

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        process.stderr.write(`\n⚠️ Puerto ${PORT} ocupado. Intentando puerto alternativo...\n`);
        const altPort = PORT + 1;
        process.stderr.write(`   Puerto alternativo: ${altPort}\n`);
        server.listen(altPort, HOST, () => {
          process.env.PORT = String(altPort);
          process.stdout.write(`✓ Server listening on ${HOST}:${altPort}\n`);
          process.stdout.write(`✓ Environment: ${process.env.NODE_ENV || 'development'}\n`);
          process.stdout.write(`✓ Database: ${process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite'}\n`);
        }).on('error', (err2) => {
          process.stderr.write(`✗ Puerto alternativo ${altPort} también ocupado. Abortando.\n`);
          process.exit(1);
        });
      } else {
        throw err;
      }
    });

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
