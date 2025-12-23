/**
 * Módulo de Conexión
 * Maneja la conexión WebSocket con el servidor de TikTok Live
 */

import { processGiftEvent, setOnCoinsRecorded } from "./coins.js";
import { recordDonorCoins } from "./leaderboard.js";

// Estado de conexión
const CONNECTION_STATES = {
  DISCONNECTED: "disconnected",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  ERROR: "error"
};

// Modos de operación
const MODES = {
  AUCTION: "auction",
  ROULETTE: "roulette"
};

let ws = null;
let syncWs = null; // WebSocket permanente para sincronización
let connectionState = CONNECTION_STATES.DISCONNECTED;
let currentUser = "";
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY_MS = 2000;

// ✅ NUEVO: Variables para reconexión de syncWs
let syncWsReconnectTimeout = null;
let syncWsReconnectAttempts = 0;
const SYNC_WS_MAX_RECONNECT = 5;

// Modo actual (auction o roulette)
let currentMode = MODES.AUCTION;

// BroadcastChannel para comunicación con overlays
const overlayChannel = new BroadcastChannel('tiktoolstream_overlay');

// Referencias DOM
let statusBadgeEl = null;
let feedbackEl = null;

// Callbacks
let onConnectionStateChange = null;
let onGiftReceived = null;
let onSyncRequest = null;
let onLikeReceived = null; // Callback para eventos de like
let onFollowReceived = null; // Callback para eventos de follow

/**
 * Inicializa WebSocket de sincronización para overlays
 * ✅ CON RECONEXIÓN AUTOMÁTICA
 */
function initSyncWebSocket() {
  try {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/sync`;

    console.log(`[SyncWS] Conectando... (intento ${syncWsReconnectAttempts + 1}/${SYNC_WS_MAX_RECONNECT})`);
    syncWs = new WebSocket(wsUrl);

    if (!syncWs) return;

    syncWs.onopen = () => {
      console.log('[SyncWS] ✅ Conectado');
      syncWsReconnectAttempts = 0; // Reset contador de intentos
    };

    syncWs.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Responder a solicitudes de sincronización desde overlays
        if (data.type === 'request_sync' && onSyncRequest) {
          onSyncRequest();
        }
      } catch (e) {
        console.warn('[SyncWS] Error parsing message:', e);
      }
    };

    syncWs.onerror = (err) => {
      console.warn('[SyncWS] ⚠️ Error de conexión:', err);
    };

    syncWs.onclose = (event) => {
      console.log('[SyncWS] Desconectado:', event.code, event.reason);

      // ✅ NUEVO: Reconectar automáticamente
      if (event.code !== 1000 && syncWsReconnectAttempts < SYNC_WS_MAX_RECONNECT) {
        syncWsReconnectAttempts++;
        // Backoff exponencial: 1s, 2s, 4s, 8s, 16s (max 30s)
        const delay = Math.min(1000 * Math.pow(2, syncWsReconnectAttempts - 1), 30000);

        console.log(`[SyncWS] 🔄 Reconectando en ${delay/1000}s... (intento ${syncWsReconnectAttempts}/${SYNC_WS_MAX_RECONNECT})`);

        clearTimeout(syncWsReconnectTimeout);
        syncWsReconnectTimeout = setTimeout(() => {
          initSyncWebSocket();
        }, delay);
      } else if (syncWsReconnectAttempts >= SYNC_WS_MAX_RECONNECT) {
        console.error('[SyncWS] ❌ Máximo de reintentos alcanzado. Recarga la página para reconectar.');
      } else {
        console.log('[SyncWS] WebSocket cerrado normalmente (código 1000)');
      }
    };
  } catch (e) {
    console.warn('[SyncWS] Error inicializando WebSocket de sincronización:', e);
    console.log('[SyncWS] La aplicación funcionará sin sincronización en tiempo real');
  }
}

/**
 * Registra callback para solicitudes de sincronización
 * @param {Function} callback - Función a llamar cuando se reciba request_sync
 */
export function setOnSyncRequest(callback) {
  onSyncRequest = callback;
}

/**
 * Inicializa el módulo con referencias DOM
 * @param {Object} elements - { statusBadge, feedback }
 */
export function initConnection(elements) {
  statusBadgeEl = elements.statusBadge;
  feedbackEl = elements.feedback;

  // Conectar módulo de monedas con leaderboard
  setOnCoinsRecorded((uniqueId, label, coins, profilePictureUrl) => {
    recordDonorCoins(uniqueId, label, coins, profilePictureUrl);
    if (onGiftReceived) {
      onGiftReceived({ uniqueId, label, coins, profilePictureUrl });
    }
  });

  // Inicializar WebSocket de sincronización permanente
  try {
    initSyncWebSocket();
  } catch (e) {
    console.warn('[SyncWS] Error al inicializar:', e);
  }
}

/**
 * Establece el modo de operación (auction o roulette)
 * @param {string} mode - 'auction' o 'roulette'
 */
export function setMode(mode) {
  currentMode = mode;
  console.log(`[Connection] Modo configurado: ${mode}`);
}

/**
 * Registra callbacks para eventos de conexión
 */
export function setConnectionCallbacks({ onStateChange, onGift, onLike, onFollow }) {
  onConnectionStateChange = onStateChange || null;
  onGiftReceived = onGift || null;
  onLikeReceived = onLike || null;
  onFollowReceived = onFollow || null;
}

/**
 * Actualiza la UI de estado de conexión
 */
function updateStatusUI() {
  if (!statusBadgeEl) return;

  statusBadgeEl.className = "status-badge";

  switch (connectionState) {
    case CONNECTION_STATES.DISCONNECTED:
      statusBadgeEl.textContent = "Sin conexión";
      statusBadgeEl.classList.add("status-badge--idle");
      break;
    case CONNECTION_STATES.CONNECTING:
      statusBadgeEl.textContent = "Conectando...";
      statusBadgeEl.classList.add("status-badge--connecting");
      break;
    case CONNECTION_STATES.CONNECTED:
      statusBadgeEl.textContent = "Conectado";
      statusBadgeEl.classList.add("status-badge--live");
      break;
    case CONNECTION_STATES.ERROR:
      statusBadgeEl.textContent = "Error";
      statusBadgeEl.classList.add("status-badge--error");
      break;
  }
}

/**
 * Muestra un mensaje de feedback
 * @param {string} message
 * @param {string} type - "info", "success", "warning", "error"
 * @param {boolean} needsAuth - Si es true, agrega clase especial
 */
function showFeedback(message, type = "info", needsAuth = false) {
  if (!feedbackEl) return;

  feedbackEl.textContent = message;
  feedbackEl.className = `panel-feedback panel-feedback--${type}`;
  if (needsAuth) {
    feedbackEl.classList.add("panel-feedback--needs-auth");
  }

  // Auto-limpiar después de 8 segundos (más tiempo para mensajes de error)
  const timeout = type === "error" ? 10000 : 5000;
  setTimeout(() => {
    if (feedbackEl.textContent === message) {
      feedbackEl.textContent = "";
      feedbackEl.className = "panel-feedback";
    }
  }, timeout);
}

/**
 * Cambia el estado de conexión
 * @param {string} newState
 */
function setConnectionState(newState) {
  connectionState = newState;
  updateStatusUI();

  if (onConnectionStateChange) {
    onConnectionStateChange(newState);
  }
}

/**
 * Maneja los mensajes del WebSocket
 * @param {MessageEvent} event
 */
function handleWebSocketMessage(event) {
  try {
    const data = JSON.parse(event.data);

    switch (data.type) {
      case "connected":
        setConnectionState(CONNECTION_STATES.CONNECTED);
        const connectedUser = data.data?.uniqueId || data.uniqueId || currentUser;
        showFeedback(`Conectado al live de @${connectedUser}`, "success");
        reconnectAttempts = 0;
        break;

      case "disconnected":
        setConnectionState(CONNECTION_STATES.DISCONNECTED);
        showFeedback("Desconectado del live", "warning");
        break;

      case "gift":
        // Rutear evento según modo
        if (currentMode === MODES.AUCTION) {
          // Modo subasta: procesar monedas
          processGiftEvent(data.data);
        } else if (currentMode === MODES.ROULETTE) {
          // Modo ruleta: notificar callback
          if (onGiftReceived) {
            console.log('[WS] Regalo recibido (ruleta):', data.data);
            onGiftReceived(data.data);
          }
        }
        break;

      case "like":
        // Evento de like
        if (onLikeReceived) {
          console.log('[WS] Like recibido:', data.data);
          onLikeReceived(data.data);
        }
        break;

      case "follow":
        // Evento de follow
        if (onFollowReceived) {
          console.log('[WS] Follow recibido:', data.data);
          onFollowReceived(data.data);
        }
        break;

      case "chat":
        // Se puede agregar manejo de chat si es necesario
        break;

      case "error":
        // El mensaje puede venir en data.message o data.data.message
        const errorMessage = data.message || data.data?.message || "Error de conexión desconocido";
        setConnectionState(CONNECTION_STATES.ERROR);

        // Si el error indica que necesita autenticación, expandir la sección de auth
        if (data.needsAuth) {
          showFeedback(errorMessage, "error", true);
          // Expandir la sección de autenticación automáticamente
          const authDetails = document.getElementById("authDetails");
          if (authDetails) authDetails.open = true;
        } else {
          showFeedback(errorMessage, "error");
        }
        break;

      case "streamEnd":
        setConnectionState(CONNECTION_STATES.DISCONNECTED);
        showFeedback("El stream ha terminado", "warning");
        break;

      default:
        console.log('[WS] Mensaje no manejado:', data.type);
    }
  } catch (e) {
    console.error('[WS] Error al procesar mensaje:', e);
  }
}

/**
 * Intenta reconectar al servidor
 */
function attemptReconnect() {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    showFeedback("No se pudo reconectar. Intenta manualmente.", "error");
    return;
  }

  reconnectAttempts++;
  showFeedback(`Reconectando... (intento ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`, "warning");

  setTimeout(() => {
    if (currentUser && connectionState !== CONNECTION_STATES.CONNECTED) {
      connect(currentUser);
    }
  }, RECONNECT_DELAY_MS);
}

/**
 * Conecta al live de un usuario
 * @param {string} username - Usuario de TikTok (sin @)
 * @param {string} sessionId - Session ID opcional
 * @param {string} ttTargetIdc - tt-target-idc opcional
 * @returns {boolean}
 */
export function connect(username, sessionId = null, ttTargetIdc = null) {
  if (!username || username.trim() === "") {
    showFeedback("Por favor ingresa un usuario de TikTok", "warning");
    return false;
  }

  // Limpiar @ si lo tiene
  const cleanUsername = username.replace(/^@/, "").trim();

  // Desconectar si ya hay una conexión
  if (ws && ws.readyState === WebSocket.OPEN) {
    disconnect();
  }

  currentUser = cleanUsername;
  setConnectionState(CONNECTION_STATES.CONNECTING);
  showFeedback(`Conectando a @${cleanUsername}...`, "info");

  try {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/live`;

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      // Construir mensaje de conexión con credenciales opcionales
      const connectMessage = {
        type: "connect",
        uniqueId: cleanUsername
      };

      // Agregar sessionId si está disponible
      if (sessionId) {
        connectMessage.sessionId = sessionId;
      }

      // Agregar ttTargetIdc si está disponible
      if (ttTargetIdc) {
        connectMessage.ttTargetIdc = ttTargetIdc;
      }

      ws.send(JSON.stringify(connectMessage));
    };

    ws.onmessage = handleWebSocketMessage;

    ws.onerror = (error) => {
      setConnectionState(CONNECTION_STATES.ERROR);
      showFeedback("Error de conexión WebSocket", "error");
    };

    ws.onclose = (event) => {
      if (connectionState === CONNECTION_STATES.CONNECTED) {
        setConnectionState(CONNECTION_STATES.DISCONNECTED);
        showFeedback("Conexión cerrada", "warning");
        attemptReconnect();
      } else {
        setConnectionState(CONNECTION_STATES.DISCONNECTED);
      }
    };

    return true;
  } catch (e) {
    setConnectionState(CONNECTION_STATES.ERROR);
    showFeedback("Error al conectar: " + e.message, "error");
    return false;
  }
}

/**
 * Desconecta del live actual
 */
export function disconnect() {
  if (ws) {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "disconnect" }));
      }
      ws.close();
    } catch (e) {
      console.error('[WS] Error al cerrar:', e);
    }
    ws = null;
  }

  setConnectionState(CONNECTION_STATES.DISCONNECTED);
  reconnectAttempts = 0;
  showFeedback("Desconectado", "info");
}

/**
 * Obtiene el estado actual de la conexión
 */
export function getConnectionState() {
  return connectionState;
}

/**
 * Verifica si está conectado
 */
export function isConnected() {
  return connectionState === CONNECTION_STATES.CONNECTED;
}

/**
 * Obtiene el usuario actual
 */
export function getCurrentUser() {
  return currentUser;
}

/**
 * Establece el usuario actual (sin conectar)
 * @param {string} username
 */
export function setCurrentUser(username) {
  currentUser = username.replace(/^@/, "").trim();
}

/**
 * Envía actualización del leaderboard a overlays via BroadcastChannel
 * @param {Array} donors - Array de donadores con {uniqueId, totalCoins, profilePictureUrl}
 */
export function broadcastLeaderboard(donors) {
  // Usar BroadcastChannel para comunicación directa con overlays
  try {
    overlayChannel.postMessage({
      type: 'leaderboard_update',
      donors: donors,
      timestamp: Date.now()
    });
  } catch (err) {
    console.warn('[Connection] Error al broadcast leaderboard:', err);
  }

  // También enviar por WebSocket si está disponible (para otros propósitos)
  const wsToUse = (syncWs && syncWs.readyState === WebSocket.OPEN) ? syncWs : ws;
  if (wsToUse && wsToUse.readyState === WebSocket.OPEN) {
    try {
      wsToUse.send(JSON.stringify({
        type: 'leaderboard-update',
        donors: donors
      }));
    } catch (err) {
      console.warn('[WS] Error broadcast WS:', err);
    }
  }
}

/**
 * Envía actualización del timer a overlays via WebSocket
 * @param {number} seconds - Segundos restantes
 * @param {string} message - Mensaje del timer
 * @param {string} phase - Fase actual del timer
 * @param {boolean} active - Si el timer está activo
 */
export function broadcastTimerUpdate(seconds, message = '', phase = 'idle', active = false) {
  // Enviar por WebSocket (prioridad para overlays en OBS)
  const wsToUse = (syncWs && syncWs.readyState === WebSocket.OPEN) ? syncWs : ws;
  if (wsToUse && wsToUse.readyState === WebSocket.OPEN) {
    try {
      wsToUse.send(JSON.stringify({
        type: 'timer_update',
        seconds: seconds,
        message: message,
        phase: phase,
        active: active,
        timestamp: Date.now()
      }));
    } catch (err) {
      console.warn('[WS] Error al enviar timer update:', err);
    }
  }

  // También enviar por BroadcastChannel (para compatibilidad)
  try {
    overlayChannel.postMessage({
      type: 'timer_update',
      seconds: seconds,
      message: message,
      phase: phase,
      active: active,
      timestamp: Date.now()
    });
  } catch (err) {
    console.warn('[Connection] Error al broadcast timer via BroadcastChannel:', err);
  }
}

/**
 * Envía configuración del timer a overlays via WebSocket
 * @param {number} initialTime - Tiempo inicial en segundos
 * @param {string} label - Etiqueta/mensaje del timer
 */
export function broadcastConfig(initialTime, label) {
  // Enviar por WebSocket (prioridad para overlays en OBS)
  const wsToUse = (syncWs && syncWs.readyState === WebSocket.OPEN) ? syncWs : ws;
  if (wsToUse && wsToUse.readyState === WebSocket.OPEN) {
    try {
      wsToUse.send(JSON.stringify({
        type: 'timer_config',
        initialTime: initialTime,
        label: label,
        timestamp: Date.now()
      }));
      console.log(`[WS] Config enviada: ${label}, ${initialTime}s`);
    } catch (err) {
      console.warn('[WS] Error al enviar config:', err);
    }
  }

  // También enviar por BroadcastChannel (para compatibilidad)
  try {
    overlayChannel.postMessage({
      type: 'timer_config',
      initialTime: initialTime,
      label: label,
      timestamp: Date.now()
    });
  } catch (err) {
    console.warn('[Connection] Error al broadcast config via BroadcastChannel:', err);
  }
}

/**
 * Envía sincronización completa a overlays via WebSocket
 * @param {Object} syncData - Datos de sincronización completos
 */
export function broadcastSync(syncData) {
  // Enviar por WebSocket (prioridad para overlays en OBS)
  const wsToUse = (syncWs && syncWs.readyState === WebSocket.OPEN) ? syncWs : ws;
  if (wsToUse && wsToUse.readyState === WebSocket.OPEN) {
    try {
      wsToUse.send(JSON.stringify({
        type: 'sync',
        ...syncData,
        timestamp: Date.now()
      }));
      console.log('[WS] Sync enviado a overlays');
    } catch (err) {
      console.warn('[WS] Error al enviar sync:', err);
    }
  }

  // También enviar por BroadcastChannel (para compatibilidad)
  try {
    overlayChannel.postMessage({
      type: 'sync',
      ...syncData,
      timestamp: Date.now()
    });
  } catch (err) {
    console.warn('[Connection] Error al broadcast sync via BroadcastChannel:', err);
  }
}

export { CONNECTION_STATES, MODES };
