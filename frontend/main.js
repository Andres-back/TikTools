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
 */

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
  isLeaderboardFrozen
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
  CONNECTION_STATES
} from "./modules/connection.js";
import { processGiftEvent } from "./modules/coins.js";

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
  
  // Timer
  timerCard: document.getElementById("timerCard"),
  timerDisplay: document.getElementById("timerDisplay"),
  timerMessage: document.getElementById("timerMessage"),
  timerHeading: document.getElementById("timerHeading"),
  timerPlay: document.getElementById("timerPlay"),
  timerReset: document.getElementById("timerReset"),
  
  // Leaderboard
  donorList: document.getElementById("donorList"),
  winnerDisplay: document.getElementById("winnerDisplay"),
  leaderboardFooter: document.getElementById("leaderboardFooter"),
  
  // Animaciones
  animationOverlay: document.getElementById("animationOverlay")
};

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
  
  // Inicializar timer
  initTimer({
    timerDisplay: elements.timerDisplay,
    timerCard: elements.timerCard,
    timerMessage: elements.timerMessage,
    timerHeading: elements.timerHeading
  });
  
  // Configurar callbacks del timer
  setTimerCallbacks({
    onFinished: (winner) => {
      updateTimerControls();
    },
    onPhaseChange: (phase) => {
      updateTimerControls();
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
    
    }...` : "(vacío)",
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
      const result = startTimer();
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
    
    if (!isNaN(initialTime)) {
      setInitialTime(initialTime);
    }
    if (!isNaN(delayTime)) {
      setDelayTime(delayTime);
    }
    if (!isNaN(tieExtension)) {
      setTieExtension(tieExtension);
    }
    
    refreshTimerUI();
    });
  
  // Actualizar mensaje mínimo
  elements.updateMinMessage?.addEventListener("click", () => {
    const message = elements.minMessageInput?.value?.trim();
    if (message) {
      setMinMessage(message);
      updateTimerHeading(message);
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
// Inicialización
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  initializeModules();
  loadUIFromStorage();
  setupEventListeners();
  updateTimerControls();
  updateConnectionUI();
  
  });
