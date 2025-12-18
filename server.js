// Cargar variables de entorno desde .env
require('dotenv').config();

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const WebSocket = require('ws');
const {
  TikTokLiveConnection,
  WebcastEvent,
  ControlEvent,
  SignConfig
} = require('tiktok-live-connector');

const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || 8080);
const PUBLIC_DIR = path.join(__dirname, 'frontend'); // Servir desde carpeta frontend
const WEBSOCKET_PATH = '/live';

if (process.env.TIKTOK_SIGN_API_KEY) {
  SignConfig.apiKey = process.env.TIKTOK_SIGN_API_KEY;
}
if (process.env.TIKTOK_SIGN_BASE_PATH) {
  SignConfig.basePath = process.env.TIKTOK_SIGN_BASE_PATH;
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg'
};

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);
    let pathname = decodeURIComponent(requestUrl.pathname);

    if (pathname === WEBSOCKET_PATH) {
      res.writeHead(400).end('WebSocket endpoint');
      return;
    }

    // Servir favicon vacío para evitar 404
    if (pathname === '/favicon.ico') {
      res.writeHead(204).end();
      return;
    }

    if (pathname === '/' || pathname === '') {
      pathname = '/index.html';
    }

    const safePath = path.normalize(pathname).replace(/^\.\.(\\|\/|$)/, '');
    const filePath = path.join(PUBLIC_DIR, safePath);

    const stat = await fs.promises.stat(filePath).catch(() => null);
    if (!stat) {
      res.writeHead(404).end('Not found');
      return;
    }

    if (stat.isDirectory()) {
      const indexPath = path.join(filePath, 'index.html');
      const indexStat = await fs.promises.stat(indexPath).catch(() => null);
      if (!indexStat) {
        res.writeHead(403).end('Forbidden');
        return;
      }
      serveFile(indexPath, res);
      return;
    }

    serveFile(filePath, res);
  } catch (err) {
    console.error('Error serving request', err);
    res.writeHead(500).end('Internal server error');
  }
});

function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  const stream = fs.createReadStream(filePath);
  stream.on('open', () => {
    res.writeHead(200, { 'Content-Type': contentType });
  });
  stream.on('error', (err) => {
    console.error('File stream error', err);
    if (!res.headersSent) {
      res.writeHead(500);
    }
    res.end('Error reading file');
  });
  stream.pipe(res);
}

const wss = new WebSocket.Server({ server, path: WEBSOCKET_PATH });

const listenersByUniqueId = new Map(); // uniqueId -> Set<WebSocket>
const streams = new Map(); // uniqueId -> StreamEntry

const SESSION_ID = process.env.TIKTOK_SESSION_ID || null;
const TT_TARGET_IDC = process.env.TIKTOK_TT_TARGET_IDC || null;
const EXTRA_HEADERS = process.env.TIKTOK_EXTRA_HEADERS
  ? JSON.parse(process.env.TIKTOK_EXTRA_HEADERS)
  : null;

// Log de configuración al iniciar
console.log('\n' + '='.repeat(60));
console.log('📋 CONFIGURACIÓN DE TIKTOK');
console.log('='.repeat(60));
console.log('Session ID:', SESSION_ID ? `✅ Configurado (${SESSION_ID.substring(0, 8)}...)` : '❌ NO configurado');
console.log('Target IDC:', TT_TARGET_IDC || '(no configurado)');
console.log('Extra Headers:', EXTRA_HEADERS ? '✅ Configurado' : '(no configurado)');
console.log('='.repeat(60) + '\n');

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

  socket.on('error', (err) => {
    console.warn('WebSocket client error', err);
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
      console.warn('Error sending ping', err);
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
    send(socket, { type: 'error', message: 'Mensaje inválido (no es JSON)' });
    return;
  }

  if (!payload || typeof payload !== 'object' || !payload.type) {
    send(socket, { type: 'error', message: 'Mensaje inválido (formato incorrecto)' });
    return;
  }

  switch (payload.type) {
    case 'connect':
      const uniqueId = typeof payload.uniqueId === 'string' ? payload.uniqueId.trim().toLowerCase() : '';
      if (!uniqueId) {
        send(socket, { type: 'error', message: 'uniqueId requerido para conectar' });
        return;
      }
      // Permitir que el cliente envíe sessionId y ttTargetIdc opcionales
      const clientSessionId = payload.sessionId || null;
      const clientTtTargetIdc = payload.ttTargetIdc || null;
      attachSocketToUniqueId(socket, uniqueId, clientSessionId, clientTtTargetIdc);
      break;

    case 'disconnect':
      detachSocket(socket);
      send(socket, { type: 'disconnected' });
      break;

    case 'leaderboard-update':
      // Broadcast de actualizaciones del leaderboard a todos los clientes conectados (para overlays)
      broadcastToAll({ type: 'leaderboard-update', donors: payload.donors });
      break;

    default:
      send(socket, { type: 'error', message: `Acción '${payload.type}' no soportada` });
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

  // Usar sessionId del cliente si se proporciona, sino usar el del .env
  const effectiveSessionId = clientSessionId || SESSION_ID;
  const effectiveTtTargetIdc = clientTtTargetIdc || TT_TARGET_IDC;

  ensureStream(uniqueId, effectiveSessionId, effectiveTtTargetIdc)
    .catch((err) => {
      console.error(`[Error] Al asegurar stream para @${uniqueId}:`, err.message);
      
      // Mensaje de error más descriptivo según el tipo de error
      let errorMessage = err.message || 'No se pudo conectar al live.';
      let needsAuth = false;
      
      if (errorMessage.includes('504') || errorMessage.includes('sign server') || errorMessage.includes('Sign Error')) {
        errorMessage = 'Error del servidor de firma (504). El usuario puede no estar en vivo o necesitas configurar tu Session ID de TikTok.';
        needsAuth = true;
      } else if (errorMessage.includes('not found') || errorMessage.includes('Room ID')) {
        errorMessage = 'Usuario no encontrado o no está en vivo actualmente.';
      } else if (errorMessage.includes('CAPTCHA') || errorMessage.includes('captcha')) {
        errorMessage = 'TikTok requiere verificación CAPTCHA. Configura tu Session ID para evitar esto.';
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
  // Crear una clave única que incluya sessionId para permitir reconexiones con diferentes credenciales
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
      entry.connection.disconnect().catch(() => {});
    } catch (err) {
      console.warn('Error al desconectar stream', err);
    }
  }
}

function createTikTokConnection(uniqueId, sessionId = null, ttTargetIdc = null) {
  // Usar sessionId proporcionado o el del .env
  const effectiveSessionId = sessionId || SESSION_ID;
  const effectiveTtTargetIdc = ttTargetIdc || TT_TARGET_IDC;
  
  // Opciones base - funcionan sin autenticación
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
  
  // Solo agregar sessionId si está disponible, pero NO activar authenticateWs
  // authenticateWs requiere WHITELIST_AUTHENTICATED_SESSION_ID_HOST configurado
  if (effectiveSessionId) {
    options.sessionId = effectiveSessionId;
    if (effectiveTtTargetIdc) {
      options.ttTargetIdc = effectiveTtTargetIdc;
    }
    // NO usar authenticateWs a menos que tengamos whitelist configurado
    // options.authenticateWs = false; // por defecto ya es false
  }
  
  console.log(`🔄 Intentando conectar a @${uniqueId}...`);
  if (options.sessionId) {
    console.log(`   └─ Usando Session ID: ${options.sessionId.substring(0, 8)}...`);
    console.log(`   └─ Target IDC: ${options.ttTargetIdc}`);
  } else {
    console.log(`   └─ Sin Session ID (modo público)`);
  }
  
  const connection = new TikTokLiveConnection(uniqueId, options);

  connection.on(ControlEvent.CONNECTED, (state) => {
    console.log(`✅ Conectado al stream de @${uniqueId}, Room ID: ${state.roomId}`);
    broadcast(uniqueId, { type: 'connected', data: { uniqueId, state } });
  });

  connection.on(ControlEvent.DISCONNECTED, (data) => {
    const reason = data?.reason || data?.code || 'desconocida';
    console.log(`🔌 Desconectado del stream de @${uniqueId}. Código: ${data?.code}, Razón: ${reason}`);
    broadcast(uniqueId, { type: 'disconnected', data: { uniqueId, code: data?.code, reason } });
    cleanupStream(uniqueId);
  });
  
  // STREAM_END es parte de WebcastEvent, no ControlEvent
  connection.on(WebcastEvent.STREAM_END, (data) => {
    console.log(`🔴 Stream de @${uniqueId} finalizado. Acción: ${data?.action || 'desconocida'}`);
    broadcast(uniqueId, { type: 'streamEnd', data: { uniqueId, action: data?.action } });
    cleanupStream(uniqueId);
  });

  connection.on(WebcastEvent.GIFT, (event) => {
    // Log para debug - solo los campos importantes
    const user = event.user?.uniqueId || 'unknown';
    const giftName = event.giftDetails?.giftName || event.giftId;
    const count = event.repeatCount || 1;
    const repeatEnd = event.repeatEnd ? 1 : 0;
    const diamonds = event.giftDetails?.diamondCount || '?';
    
    console.log(`[Gift] @${user}: ${giftName} x${count} (repeatEnd=${repeatEnd}, diamonds=${diamonds})`);
    
    // Enviar TODOS los regalos al cliente - el cliente decide qué contar
    broadcast(uniqueId, { type: 'gift', data: event });
  });
  
  connection.on(ControlEvent.ERROR, (err) => {
    // Manejar diferentes tipos de error
    let errorMsg = 'Error desconocido';
    if (typeof err === 'string') {
      errorMsg = err;
    } else if (err?.message) {
      errorMsg = err.message;
    } else if (err) {
      try {
        errorMsg = JSON.stringify(err);
      } catch (e) {
        errorMsg = String(err);
      }
    }
    console.error(`[Error] Conexión a @${uniqueId}:`, errorMsg);
    broadcast(uniqueId, { type: 'error', message: errorMsg });
    // NO hacer cleanup en cada error - solo desconectar si es fatal
  });

  const connectPromise = connection.connect().catch(err => {
      console.error(`[Error] Falló al conectar con @${uniqueId}:`, err.message);
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
      console.warn('Error al enviar mensaje a cliente', err);
    }
  }
}

server.listen(PORT, HOST, () => {
  console.log(`Servidor listo en http://${HOST}:${PORT}`);
  console.log(`WebSocket disponible en ws://${HOST}:${PORT}${WEBSOCKET_PATH}`);
});
