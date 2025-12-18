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

let ws = null;
let syncWs = null; // WebSocket permanente para sincronización
let connectionState = CONNECTION_STATES.DISCONNECTED;
let currentUser = "";
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY_MS = 2000;

// Referencias DOM
let statusBadgeEl = null;
let feedbackEl = null;

// Callbacks
let onConnectionStateChange = null;
let onGiftReceived = null;

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
  initSyncWebSocket();
}

/**
 * Inicializa WebSocket de sincronización (siempre activo)
 */
function initSyncWebSocket() {
  const wsUrl = `ws://${window.location.host}/live`;
  
  syncWs = new WebSocket(wsUrl);
  
  syncWs.addEventListener('open', () => {
    });
  
  syncWs.addEventListener('close', () => {
    setTimeout(initSyncWebSocket, 3000);
  });
  
  syncWs.addEventListener('error', (err) => {
    });
}

/**
 * Registra callbacks para eventos de conexión
 */
export function setConnectionCallbacks({ onStateChange, onGift }) {
  onConnectionStateChange = onStateChange || null;
  onGiftReceived = onGift || null;
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
        processGiftEvent(data.data);
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
        }
  } catch (e) {
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
 * Envía actualización del leaderboard al servidor para broadcast a overlays
 * @param {Array} donors - Array de donadores con {uniqueId, totalCoins, profilePictureUrl}
 */
export function broadcastLeaderboard(donors) {
  // Usar syncWs (siempre activo) o ws (si está conectado)
  const wsToUse = (syncWs && syncWs.readyState === WebSocket.OPEN) ? syncWs : ws;
  
  if (wsToUse && wsToUse.readyState === WebSocket.OPEN) {
    try {
      wsToUse.send(JSON.stringify({
        type: 'leaderboard-update',
        donors: donors
      }));
    } catch (err) {
      }
  } else {
    }
}

export { CONNECTION_STATES };
