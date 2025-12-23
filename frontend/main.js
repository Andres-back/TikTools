/**
 * Main.js - Punto de entrada de la aplicación
 * Sistema de Subastas TikTok Live
 * 
 * Arquitectura modular:
 * - storage.js   → Persistencia en localStorage
 * - config.js    → Configuración del sistema
 * - coins.js     → Procesamiento de monedas/regalos
 * - leaderboard.js → Ranking de donadores
 * - timer.js     → Temporizador con tie-breaker
 * - connection.js → WebSocket al servidor TikTok
 * - auth.js      → Autenticación y gestión de sesión
 * - ui.js        → Gestión de interfaz (modales, menús, etc.)
 */

import { apiCall, getUser, clearTokens } from "./modules/auth.js";
import { initUI } from "./modules/ui.js";
import {
  loadUser,
  saveUser,
  saveSessionId,
  loadSessionId,
  saveTtTargetIdc,
  loadTtTargetIdc
} from "./modules/storage.js";
import {
  loadConfig,
  getConfig,
  setInitialTime,
  setDelayTime,
  setMinMessage,
  setTieExtension,
  getMinMessage
} from "./modules/config.js";
import {
  initLeaderboard,
  recordDonorCoins,
  resetLeaderboard,
  getWinner,
  getTop3,
  isLeaderboardFrozen,
  getSortedDonors
} from "./modules/leaderboard.js";
import {
  initTimer,
  startTimer,
  pauseTimer,
  resumeTimer,
  resetTimer,
  refreshTimerUI,
  updateTimerHeading,
  setTimerCallbacks,
  isTimerActive,
  getTimerState,
  TIMER_PHASES
} from "./modules/timer.js";
import {
  initConnection,
  connect,
  disconnect,
  setConnectionCallbacks,
  isConnected,
  setCurrentUser,
  getCurrentUser,
  CONNECTION_STATES,
  setOnSyncRequest,
  broadcastTimerUpdate
} from "./modules/connection.js";
import { processGiftEvent } from "./modules/coins.js";

// ============================================
// BroadcastChannel para comunicación con overlays
// ============================================

const overlayChannel = new BroadcastChannel('tiktoolstream_overlay');

// Escuchar peticiones de sincronización de overlays
overlayChannel.onmessage = (event) => {
  if (event.data.type === 'request_sync' || event.data.type === 'ping') {
    sendOverlaySync();
  }

  if (event.data.type === 'request_leaderboard_sync') {
    sendLeaderboardSync();
  }
};

function sendOverlaySync() {
  const config = getConfig();
  const state = getTimerState();
  const winner = getWinner();
  const sorted = getSortedDonors();

  overlayChannel.postMessage({
    type: 'sync',
    timer: {
      seconds: state.timeRemaining,
      phase: state.phase,
      active: state.active
    },
    config: {
      initialTime: config.initialTime,
      label: config.minMessage
    },
    winner: winner ? winner.user : null,
    // Agregar datos de donadores para overlay.html
    donors: sorted.map(entry => ({
      uniqueId: entry.uniqueId,
      label: entry.label,
      totalCoins: entry.total,
      profilePictureUrl: entry.profilePictureUrl
    }))
  });
}

function sendLeaderboardSync() {
  const sorted = getSortedDonors();

  overlayChannel.postMessage({
    type: 'leaderboard_update',
    donors: sorted.map(entry => ({
      uniqueId: entry.uniqueId,
      label: entry.label,
      totalCoins: entry.total,
      profilePictureUrl: entry.profilePictureUrl
    }))
  });
}

// NOTA: broadcastTimerUpdate ahora se importa desde connection.js
// Envía updates por WebSocket Y BroadcastChannel para máxima compatibilidad

// Función para enviar el ganador a los overlays
function broadcastWinner(winner) {
  overlayChannel.postMessage({
    type: 'winner',
    winner: winner
  });
}

// Función para enviar la configuración a los overlays
function broadcastConfig() {
  const config = getConfig();
  overlayChannel.postMessage({
    type: 'timer_config',
    initialTime: config.initialTime,
    label: config.minMessage
  });
}

// ============================================
// Referencias DOM
// ============================================

const elements = {
  // Panel de control
  tiktokUserInput: document.getElementById("tiktokUserInput"),
  tiktokConnect: document.getElementById("tiktokConnect"),
  tiktokUserDisplay: document.getElementById("tiktokUserDisplay"),
  connectionStatus: document.getElementById("connectionStatus"),
  connectionFeedback: document.getElementById("connectionFeedback"),

  // Autenticación TikTok
  sessionIdInput: document.getElementById("sessionIdInput"),
  ttTargetIdcInput: document.getElementById("ttTargetIdcInput"),
  saveSessionId: document.getElementById("saveSessionId"),
  authDetails: document.getElementById("authDetails"),

  // Tiempos
  initialTimeInput: document.getElementById("initialTimeInput"),
  delayTimeInput: document.getElementById("delayTimeInput"),
  tieExtensionInput: document.getElementById("tieExtensionInput"),
  updateTimes: document.getElementById("updateTimes"),

  // Mensaje mínimo
  minMessageInput: document.getElementById("minMessageInput"),
  updateMinMessage: document.getElementById("updateMinMessage"),

  // Suma manual de monedas
  manualUserInput: document.getElementById("manualUserInput"),
  manualCoinsInput: document.getElementById("manualCoinsInput"),
  addManualCoins: document.getElementById("addManualCoins"),

  // Timer - Solo controles (el overlay está en iframe)
  timerPlay: document.getElementById("timerPlay"),
  timerReset: document.getElementById("timerReset"),

  // Leaderboard
  donorList: document.getElementById("donorList"),
  winnerDisplay: document.getElementById("winnerDisplay"),
  leaderboardFooter: document.getElementById("leaderboardFooter"),

  // Animaciones
  animationOverlay: document.getElementById("animationOverlay")
};

// Elementos DOM cargados

// ============================================
// Inicialización de módulos
// ============================================

function initializeModules() {
  // Cargar configuración
  loadConfig();

  // Inicializar leaderboard con overlay de animaciones
  initLeaderboard({
    donorList: elements.donorList,
    winnerDisplay: elements.winnerDisplay,
    leaderboardFooter: elements.leaderboardFooter,
    animationOverlay: elements.animationOverlay
  });

  // Inicializar timer (sin elementos DOM, solo lógica)
  initTimer();

  // Configurar callbacks del timer
  setTimerCallbacks({
    onFinished: (winner) => {
      updateTimerControls();
      // Enviar ganador a overlays
      if (winner) {
        broadcastWinner(winner.user);
      }
    },
    onPhaseChange: (phase) => {
      updateTimerControls();
      // Enviar update completo cuando cambia la fase
      const state = getTimerState();
      broadcastTimerUpdate(state.timeRemaining, '', state.phase, state.active);
    },
    onTick: (seconds, message) => {
      // Enviar actualización completa a overlays cada segundo
      const state = getTimerState();
      broadcastTimerUpdate(seconds, message, state.phase, state.active);
    },
    onTieExt: (tiedUsers, extensionTime, count) => {
      // Aquí se podría agregar una notificación visual adicional
    }
  });

  // Inicializar conexión
  initConnection({
    statusBadge: elements.connectionStatus,
    feedback: elements.connectionFeedback
  });

  // Registrar callback para sincronización con overlays
  setOnSyncRequest(() => {
    sendOverlaySync();
  });

  // Configurar callbacks de conexión
  setConnectionCallbacks({
    onStateChange: (state) => {
      updateConnectionUI();
    },
    onGift: (data) => {
    }
  });
}

// ============================================
// Controladores de UI
// ============================================

function updateTimerControls() {
  if (!elements.timerPlay || !elements.timerReset) return;

  const state = getTimerState();

  if (state.phase === TIMER_PHASES.FINISHED) {
    elements.timerPlay.textContent = "✓ Finalizado";
    elements.timerPlay.disabled = true;
    elements.timerReset.disabled = false;
  } else if (state.active) {
    elements.timerPlay.textContent = "⏸ Pausar";
    elements.timerPlay.disabled = false;
    elements.timerReset.disabled = true;
  } else {
    elements.timerPlay.textContent = state.phase === TIMER_PHASES.IDLE ? "▶ Iniciar" : "▶ Reanudar";
    elements.timerPlay.disabled = false;
    elements.timerReset.disabled = false;
  }
}

function updateConnectionUI() {
  if (!elements.tiktokConnect) return;

  const statusDot = document.getElementById("statusDot");

  if (isConnected()) {
    elements.tiktokConnect.textContent = "Desconectar";
    elements.tiktokConnect.classList.remove("btn-primary");
    elements.tiktokConnect.classList.add("btn-secondary");
    if (statusDot) statusDot.classList.add("connected");
  } else {
    elements.tiktokConnect.textContent = "Conectar";
    elements.tiktokConnect.classList.remove("btn-secondary");
    elements.tiktokConnect.classList.add("btn-primary");
    if (statusDot) statusDot.classList.remove("connected");
  }
}

function loadUIFromStorage() {
  // Usuario guardado
  const savedUser = loadUser();
  if (savedUser && elements.tiktokUserInput) {
    elements.tiktokUserInput.value = savedUser;
    setCurrentUser(savedUser);
  }
  if (elements.tiktokUserDisplay) {
    elements.tiktokUserDisplay.textContent = savedUser || "—";
  }

  // Credenciales de TikTok
  const savedSessionId = loadSessionId();
  const savedTtTargetIdc = loadTtTargetIdc();
  if (savedSessionId && elements.sessionIdInput) {
    elements.sessionIdInput.value = savedSessionId;
  }
  if (savedTtTargetIdc && elements.ttTargetIdcInput) {
    elements.ttTargetIdcInput.value = savedTtTargetIdc;
  }

  // Tiempos
  const config = getConfig();
  if (elements.initialTimeInput) {
    elements.initialTimeInput.value = config.initialTime;
  }
  if (elements.delayTimeInput) {
    elements.delayTimeInput.value = config.delayTime;
  }
  if (elements.tieExtensionInput) {
    elements.tieExtensionInput.value = config.tieExtension;
  }

  // Mensaje mínimo
  if (elements.minMessageInput) {
    elements.minMessageInput.value = config.minMessage;
  }

  // Actualizar UI del timer
  refreshTimerUI();
}

// ============================================
// Event Listeners
// ============================================

function setupEventListeners() {
  // Conectar/Desconectar (ahora también guarda el usuario)
  elements.tiktokConnect?.addEventListener("click", () => {
    if (isConnected()) {
      disconnect();
    } else {
      const username = elements.tiktokUserInput?.value?.trim() || getCurrentUser();
      if (username) {
        // Guardar el usuario automáticamente al conectar
        saveUser(username);
        setCurrentUser(username);
        if (elements.tiktokUserDisplay) {
          elements.tiktokUserDisplay.textContent = username;
        }

        // Obtener credenciales opcionales del localStorage
        const sessionId = loadSessionId() || null;
        const ttTargetIdc = loadTtTargetIdc() || null;
        connect(username, sessionId, ttTargetIdc);
      }
    }
    updateConnectionUI();
  });

  // Guardar Session ID
  elements.saveSessionId?.addEventListener("click", () => {
    const sessionId = elements.sessionIdInput?.value?.trim() || "";
    const ttTargetIdc = elements.ttTargetIdcInput?.value?.trim() || "";

    saveSessionId(sessionId);
    saveTtTargetIdc(ttTargetIdc);

    console.log("Credenciales guardadas:", {
      sessionId: sessionId ? sessionId.substring(0, 10) + "..." : "(vacío)",
      ttTargetIdc: ttTargetIdc || "(vacío)"
    });

    // Mostrar feedback
    if (elements.connectionFeedback) {
      elements.connectionFeedback.textContent = "Credenciales guardadas. Intenta conectar de nuevo.";
      elements.connectionFeedback.className = "panel-feedback panel-feedback--success";
      setTimeout(() => {
        elements.connectionFeedback.textContent = "";
        elements.connectionFeedback.className = "panel-feedback";
      }, 3000);
    }
  });

  // Play/Pause timer
  elements.timerPlay?.addEventListener("click", () => {
    const state = getTimerState();
    if (state.phase === TIMER_PHASES.FINISHED) {
      return;
    }

    if (state.active) {
      pauseTimer();
    } else if (state.phase === TIMER_PHASES.IDLE) {
      startTimer();
    } else {
      resumeTimer();
    }

    updateTimerControls();
  });

  // Reset timer
  elements.timerReset?.addEventListener("click", () => {
    resetTimer();
    resetLeaderboard();
    updateTimerControls();
  });

  // Actualizar tiempos
  elements.updateTimes?.addEventListener("click", () => {
    const initialTime = parseInt(elements.initialTimeInput?.value, 10);
    const delayTime = parseInt(elements.delayTimeInput?.value, 10);
    const tieExtension = parseInt(elements.tieExtensionInput?.value, 10);

    let updated = false;
    if (!isNaN(initialTime)) {
      const finalValue = setInitialTime(initialTime);
      elements.initialTimeInput.value = finalValue;
      updated = true;
      console.log(`[Config] Tiempo inicial: ${finalValue}s`);
    }
    if (!isNaN(delayTime)) {
      const finalValue = setDelayTime(delayTime);
      elements.delayTimeInput.value = finalValue;
      updated = true;
      console.log(`[Config] Tiempo de delay: ${finalValue}s`);
    }
    if (!isNaN(tieExtension)) {
      const finalValue = setTieExtension(tieExtension);
      elements.tieExtensionInput.value = finalValue;
      updated = true;
      console.log(`[Config] Extensión de empate: ${finalValue}s`);
    }

    if (updated) {
      // Enviar configuración actualizada a overlays
      broadcastConfig();
      // Mostrar confirmación
      if (elements.updateTimes) {
        const originalText = elements.updateTimes.textContent;
        elements.updateTimes.textContent = "✓ Guardado!";
        elements.updateTimes.style.background = "linear-gradient(135deg, #10b981, #059669)";
        setTimeout(() => {
          elements.updateTimes.textContent = originalText;
          elements.updateTimes.style.background = "";
        }, 2000);
      }
    }

    refreshTimerUI();
  });

  // Actualizar mensaje mínimo
  elements.updateMinMessage?.addEventListener("click", () => {
    const message = elements.minMessageInput?.value?.trim();
    if (message) {
      setMinMessage(message);
      updateTimerHeading(message);
      // Enviar configuración actualizada a overlays
      broadcastConfig();
      // Mostrar confirmación visual
      if (elements.updateMinMessage) {
        const originalText = elements.updateMinMessage.textContent;
        elements.updateMinMessage.textContent = "✓ Actualizado!";
        elements.updateMinMessage.style.background = "linear-gradient(135deg, #10b981, #059669)";
        setTimeout(() => {
          elements.updateMinMessage.textContent = originalText;
          elements.updateMinMessage.style.background = "";
        }, 2000);
      }
      console.log(`[Config] Mensaje actualizado a: "${message}"`);
    }
  });

  // Enter en input de mensaje
  elements.minMessageInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      elements.updateMinMessage?.click();
    }
  });

  // Suma manual de monedas
  elements.addManualCoins?.addEventListener("click", () => {
    const username = elements.manualUserInput?.value?.trim();
    const coins = parseInt(elements.manualCoinsInput?.value, 10);

    if (!username) {
      alert("Por favor ingresa un usuario");
      return;
    }

    if (isNaN(coins) || coins <= 0) {
      alert("Por favor ingresa una cantidad válida de monedas");
      return;
    }

    if (isLeaderboardFrozen()) {
      alert("No se pueden agregar monedas después de que terminó el tiempo");
      return;
    }

    const success = recordDonorCoins(username, username, coins);

    if (success) {
      // Limpiar inputs
      elements.manualCoinsInput.value = "";
    } else {
      alert("No se pudieron agregar las monedas");
    }
  });

  // Enter en input de usuario TikTok (conecta automáticamente)
  elements.tiktokUserInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      elements.tiktokConnect?.click();
    }
  });

  // Enter en input de monedas manuales
  elements.manualCoinsInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      elements.addManualCoins?.click();
    }
  });
}

// ============================================
// API Global (para compatibilidad)
// ============================================

window.tiktokLiveUi = {
  // Leaderboard
  recordDonorCoins,
  resetLeaderboard,
  getWinner,
  getLeaderboard: getTop3,

  // Timer
  startTimer,
  pauseTimer,
  resetTimer,
  getTimerState,

  // Connection
  connect,
  disconnect,
  isConnected,
  setCurrentUser,

  // Coins
  processGiftEvent,

  // Utility
  getConfig,
  refreshTimerUI
};

// ============================================
// Verificación de Plan
// ============================================

async function checkPlanStatus() {
  try {
    const response = await apiCall('/payments/plan-status');

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error checking plan status:', error);
    return null;
  }
}

function showPlanBanner(planData) {
  const banner = document.getElementById('planBanner');
  const planText = document.getElementById('planText');
  const upgradeBtn = document.getElementById('upgradePlan');

  if (!banner || !planData) return;

  const daysRemaining = planData.daysRemaining || 0;
  const planType = planData.planType || 'free';
  const isActive = planData.isActive;

  banner.classList.remove('warning', 'expired');
  banner.style.display = 'flex';

  if (!isActive || daysRemaining <= 0) {
    // Plan expirado
    banner.classList.add('expired');
    planText.textContent = '⚠️ Tu plan ha expirado. Actualiza para continuar usando la plataforma.';
    upgradeBtn.style.display = 'block';
  } else if (daysRemaining <= 3 && planType === 'free') {
    // Trial por expirar
    banner.classList.add('warning');
    planText.textContent = `⏰ Te quedan ${daysRemaining} día${daysRemaining !== 1 ? 's' : ''} de prueba gratis`;
    upgradeBtn.style.display = 'block';
  } else if (planType === 'free') {
    // Trial activo
    planText.textContent = `🎁 Período de prueba: ${daysRemaining} día${daysRemaining !== 1 ? 's' : ''} restantes`;
    upgradeBtn.style.display = 'block';
  } else {
    // Plan Pro activo
    planText.textContent = `💎 Plan Pro - ${daysRemaining} día${daysRemaining !== 1 ? 's' : ''} restantes`;
    upgradeBtn.style.display = 'none';
  }

  // Configurar botón de upgrade
  upgradeBtn.onclick = () => {
    if (confirm('Para obtener el Plan Pro, contacta con el administrador vía PayPal. ¿Deseas continuar?')) {
      window.open('https://www.paypal.me/xDangerous', '_blank');
    }
  };
}

// ============================================
// Inicialización
// ============================================

document.addEventListener("DOMContentLoaded", async () => {

  try {
    initUI();
  } catch (e) {
    console.error('Error inicializando UI:', e);
  }

  try {
    initializeModules();
  } catch (e) {
    console.error('Error inicializando módulos:', e);
  }

  try {
    loadUIFromStorage();
  } catch (e) {
    console.error('Error cargando UI desde storage:', e);
  }

  try {
    setupEventListeners();
  } catch (e) {
    console.error('Error configurando event listeners:', e);
  }

  try {
    updateTimerControls();
    updateConnectionUI();
  } catch (e) {
    console.error('Error actualizando controles:', e);
  }

  // Verificar estado del plan
  try {
    const planStatus = await checkPlanStatus();
    if (planStatus) {
      showPlanBanner(planStatus);
    }
  } catch (e) {
    console.error('Error verificando plan:', e);
  }

  console.log("✓ TikToolStream iniciado");
});
