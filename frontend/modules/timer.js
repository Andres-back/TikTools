/**
 * Módulo de Timer
 * Controla el temporizador de la subasta con soporte para empates
 */

import { getConfig, getWarningThresholds } from "./config.js";
import { checkForTie, freezeLeaderboard, unfreezeLeaderboard } from "./leaderboard.js";

// Estados del timer
export const TIMER_PHASES = {
  IDLE: "idle",
  INITIAL: "initial",
  DELAY: "delay",
  TIE_BREAK: "tie_break",
  FINISHED: "finished"
};

// Estado interno
let phase = TIMER_PHASES.IDLE;
let timeRemaining = 0;
let intervalId = null;
let timerActive = false;
let tieExtensionCount = 0;
const MAX_TIE_EXTENSIONS = 5;

// Referencias DOM
let timerDisplayEl = null;
let timerDisplayShadowEl = null;
let timerCardEl = null;
let timerMessageEl = null;
let timerHeadingEl = null;
let timerProgressFillEl = null;
let mascotSpeechLeftEl = null;
let mascotSpeechRightEl = null;

// Tiempo inicial para calcular progreso
let initialTimeForProgress = 0;

// Callbacks
let onTimerFinished = null;
let onPhaseChanged = null;
let onTieExtension = null;
let onTimerTick = null;

/**
 * Inicializa el módulo con referencias DOM
 * @param {Object} elements - { timerDisplay, timerCard, timerMessage, timerHeading }
 */
export function initTimer(elements) {
  timerDisplayEl = elements.timerDisplay;
  timerCardEl = elements.timerCard;
  timerMessageEl = elements.timerMessage;
  timerHeadingEl = elements.timerHeading;

  // Elementos de animación
  timerProgressFillEl = document.getElementById('timerProgressFill');
  mascotSpeechLeftEl = document.getElementById('mascotSpeechLeft');
  mascotSpeechRightEl = document.getElementById('mascotSpeechRight');

  // Shadow del display (para efecto de profundidad)
  const shadowEl = document.querySelector('.timer-display-shadow');
  if (shadowEl) {
    timerDisplayShadowEl = shadowEl;
  }
}

/**
 * Registra callbacks para eventos del timer
 */
export function setTimerCallbacks({ onFinished, onPhaseChange, onTieExt, onTick }) {
  onTimerFinished = onFinished || null;
  onPhaseChanged = onPhaseChange || null;
  onTieExtension = onTieExt || null;
  onTimerTick = onTick || null;
}

/**
 * Formatea segundos a MM:SS
 * @param {number} seconds
 * @returns {string}
 */
export function formatTime(seconds) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

/**
 * Muestra un mensaje en el timer
 * @param {string} message
 * @param {Object} options - { flash, snipe, final, tieBreak, delay }
 */
function setMessage(message, { flash = false, snipe = false, final = false, tieBreak = false, delay = false } = {}) {
  if (!timerMessageEl || !timerCardEl) return;

  timerMessageEl.textContent = message;
  timerMessageEl.className = "timer-message";

  if (flash) timerMessageEl.classList.add("flash-message");
  if (snipe) timerMessageEl.classList.add("snipe-alert");
  if (final) timerMessageEl.classList.add("final-alert");
  if (tieBreak) timerMessageEl.classList.add("tie-break-alert");
  if (delay) timerMessageEl.classList.add("delay-alert");

  timerCardEl.classList.toggle("snipe-phase", Boolean(snipe));
  timerCardEl.classList.toggle("final-phase", Boolean(final));
  timerCardEl.classList.toggle("tie-break-phase", Boolean(tieBreak));
  timerCardEl.classList.toggle("delay-alert-phase", Boolean(delay));

  if (message) {
    timerCardEl.classList.add("show-message");
  } else {
    timerCardEl.classList.remove("show-message");
  }
}

/**
 * Actualiza el estado visual de la tarjeta
 */
function updateCardState() {
  if (!timerCardEl) return;

  const thresholds = getWarningThresholds();

  timerCardEl.classList.remove("warning", "danger");
  timerCardEl.classList.toggle("delay-phase", phase === TIMER_PHASES.DELAY);
  timerCardEl.classList.toggle("tie-break-phase", phase === TIMER_PHASES.TIE_BREAK);
  timerCardEl.classList.toggle("finished-phase", phase === TIMER_PHASES.FINISHED);

  // Advertencias de tiempo
  if (timeRemaining <= thresholds.warning && timeRemaining > thresholds.danger) {
    if (phase === TIMER_PHASES.INITIAL || phase === TIMER_PHASES.TIE_BREAK) {
      timerCardEl.classList.add("warning");
    }
  }

  if (timeRemaining <= thresholds.danger) {
    timerCardEl.classList.add("danger");
  }
}

/**
 * Verifica empates y extiende el tiempo si es necesario
 * @returns {boolean} - true si se extendió el tiempo
 */
function handleTieBreaker() {
  const config = getConfig();
  const tieResult = checkForTie();

  if (!tieResult.isTie) {
    return false;
  }

  if (tieExtensionCount >= MAX_TIE_EXTENSIONS) {
    return false;
  }

  // ¡Hay empate! Extender tiempo
  tieExtensionCount++;
  const extensionTime = config.tieExtension || 30;

  console.log(`[TieBreaker] Extensión #${tieExtensionCount}: +${extensionTime}s`);

  // Descongelar leaderboard para permitir más donaciones
  unfreezeLeaderboard();

  // Configurar fase de tie-break
  phase = TIMER_PHASES.TIE_BREAK;
  timeRemaining = extensionTime;
  initialTimeForProgress = extensionTime; // Actualizar para las barras de progreso

  // Mostrar mensaje
  const tiedNames = tieResult.tiedUsers.map(u => `@${u.uniqueId}`).slice(0, 2).join(" vs ");
  setMessage(`¡EMPATE! ${tiedNames} - +${extensionTime}s`, { tieBreak: true });

  // Notificar callback
  if (onTieExtension) {
    onTieExtension(tieResult.tiedUsers, extensionTime, tieExtensionCount);
  }

  if (onPhaseChanged) {
    onPhaseChanged(phase);
  }

  return true;
}

/**
 * Tick del timer - se ejecuta cada segundo
 */
function tick() {
  updateCardState();

  // Actualizar animaciones
  updateProgressBar();
  updateMascotSpeech();

  const timeText = formatTime(Math.max(timeRemaining, 0));

  if (timerDisplayEl) {
    timerDisplayEl.textContent = timeText;
  }

  // Sincronizar el shadow
  if (timerDisplayShadowEl) {
    timerDisplayShadowEl.textContent = timeText;
  }

  // Callback de tick para sincronizar overlays
  if (onTimerTick) {
    onTimerTick(timeRemaining, timerMessageEl ? timerMessageEl.textContent : '');
  }

  const config = getConfig();
  const thresholds = getWarningThresholds();

  // Mensajes según fase y tiempo
  if (phase === TIMER_PHASES.INITIAL) {
    if (timeRemaining === config.initialTime) {
      setMessage("Fase inicial", { flash: true });
    } else if (timeRemaining <= thresholds.warning && timeRemaining > thresholds.danger) {
      setMessage("¡Queda poco tiempo!", { flash: true });
    } else if (timeRemaining <= thresholds.danger && timeRemaining > 0) {
      setMessage("¡Últimos segundos!", { flash: true });
    }
  }

  if (phase === TIMER_PHASES.DELAY) {
    if (timeRemaining === config.delayTime) {
      setMessage(`⚠️ ¡¡TIEMPO EXTRA!! +${config.delayTime}s ⚠️`, { flash: true, delay: true });
    } else if (timeRemaining <= thresholds.danger && timeRemaining > 0) {
      setMessage("🚨 ¡¡ÚLTIMA OPORTUNIDAD!! 🚨", { snipe: true, delay: true });
    } else if (timeRemaining <= thresholds.warning && timeRemaining > thresholds.danger) {
      setMessage("⏰ ¡DONA AHORA O PIERDE! ⏰", { flash: true, delay: true });
    }
  }

  if (phase === TIMER_PHASES.TIE_BREAK) {
    if (timeRemaining <= thresholds.danger && timeRemaining > 0) {
      setMessage("¡Desempate final!", { tieBreak: true });
    }
  }

  // Cuando el tiempo llega a 0
  if (timeRemaining <= 0) {
    if (phase === TIMER_PHASES.INITIAL) {
      // Pasar a fase delay
      phase = TIMER_PHASES.DELAY;
      timeRemaining = config.delayTime;
      initialTimeForProgress = config.delayTime; // Actualizar para la barra

      if (config.delayTime > 0) {
        setMessage(`🔥 ¡¡SNIPE TIME!! +${config.delayTime}s 🔥`, { flash: true, delay: true });
        updateCardState();
        if (onPhaseChanged) onPhaseChanged(phase);
        return;
      }
      // Si delay es 0, continuar a verificar empate
    }

    if (phase === TIMER_PHASES.DELAY || phase === TIMER_PHASES.TIE_BREAK) {
      // Verificar empate antes de finalizar
      if (handleTieBreaker()) {
        return; // Se extendió el tiempo
      }

      // Finalizar subasta
      finishTimer();
      return;
    }
  }

  timeRemaining -= 1;
}

/**
 * Finaliza el timer
 */
function finishTimer() {
  phase = TIMER_PHASES.FINISHED;
  setMessage("Tiempo agotado", { final: true });

  clearInterval(intervalId);
  intervalId = null;
  timerActive = false;

  if (timerDisplayEl) {
    timerDisplayEl.textContent = "00:00";
  }

  updateCardState();

  // Congelar leaderboard y obtener ganador
  const winner = freezeLeaderboard();

  if (onTimerFinished) {
    onTimerFinished(winner);
  }

  if (onPhaseChanged) {
    onPhaseChanged(phase);
  }
}

/**
 * Inicia el timer
 */
export function startTimer() {
  console.log('[Timer] startTimer llamado');
  if (timerActive) {
    return false;
  }

  const config = getConfig();
  phase = TIMER_PHASES.INITIAL;
  timeRemaining = config.initialTime;
  initialTimeForProgress = config.initialTime; // Para las barras de progreso
  tieExtensionCount = 0;
  timerActive = true;

  updateCardState();
  updateProgressBar();

  if (timerDisplayEl) {
    const timeText = formatTime(timeRemaining);
    timerDisplayEl.textContent = timeText;

    // También actualizar el shadow
    if (timerDisplayShadowEl) {
      timerDisplayShadowEl.textContent = timeText;
    }
  } else {
    console.warn('[Timer] timerDisplayEl no encontrado');
  }

  setMessage("Fase inicial", { flash: true });

  // Descongelar leaderboard
  unfreezeLeaderboard();

  intervalId = setInterval(tick, 1000);
  if (onPhaseChanged) {
    onPhaseChanged(phase);
  }

  return true;
}

/**
 * Pausa el timer
 */
export function pauseTimer() {
  if (!timerActive || !intervalId) {
    return false;
  }

  clearInterval(intervalId);
  intervalId = null;
  timerActive = false;

  console.log('[Timer] Timer pausado');
  return true;
}

/**
 * Reanuda el timer
 */
export function resumeTimer() {
  if (timerActive || phase === TIMER_PHASES.FINISHED || phase === TIMER_PHASES.IDLE) {
    return false;
  }

  timerActive = true;
  intervalId = setInterval(tick, 1000);

  return true;
}

/**
 * Reinicia el timer
 */
export function resetTimer() {
  clearInterval(intervalId);
  intervalId = null;
  timerActive = false;
  tieExtensionCount = 0;

  const config = getConfig();
  phase = TIMER_PHASES.IDLE;
  timeRemaining = config.initialTime;

  if (timerDisplayEl) {
    timerDisplayEl.textContent = formatTime(timeRemaining);
  }

  if (timerCardEl) {
    timerCardEl.classList.remove("warning", "danger", "delay-phase", "tie-break-phase", "finished-phase");
  }

  setMessage("", {});

  if (onPhaseChanged) {
    onPhaseChanged(phase);
  }

  return true;
}

/**
 * Actualiza el encabezado del timer (mensaje mínimo)
 * @param {string} message
 */
export function updateTimerHeading(message) {
  if (timerHeadingEl) {
    timerHeadingEl.textContent = message;
  }
}

/**
 * Refresca la UI del timer con la configuración actual
 */
export function refreshTimerUI() {
  const config = getConfig();

  if (phase === TIMER_PHASES.IDLE && timerDisplayEl) {
    timerDisplayEl.textContent = formatTime(config.initialTime);
  }

  if (timerHeadingEl) {
    timerHeadingEl.textContent = config.minMessage;
  }
}

/**
 * Obtiene el estado actual del timer
 */
export function getTimerState() {
  return {
    phase,
    timeRemaining,
    active: timerActive,
    tieExtensions: tieExtensionCount
  };
}

/**
 * Verifica si el timer está activo
 */
export function isTimerActive() {
  return timerActive;
}

/**
 * Obtiene la fase actual
 */
export function getCurrentPhase() {
  return phase;
}

// ========================================
// FUNCIONES DE ANIMACIÓN DEL TIMER
// ========================================

/**
 * Actualiza la barra de progreso inferior
 */
function updateProgressBar() {
  if (!timerProgressFillEl || initialTimeForProgress <= 0) return;

  const progress = (timeRemaining / initialTimeForProgress) * 100;
  timerProgressFillEl.style.width = `${progress}%`;
}

/**
 * Actualiza los mensajes de las mascotas
 */
function updateMascotSpeech() {
  if (!mascotSpeechLeftEl || !mascotSpeechRightEl) return;

  const thresholds = getWarningThresholds();

  if (timeRemaining <= thresholds.danger) {
    // Modo pánico - mensajes más intensos
    const panicMessages = [
      ['¡RÁPIDO!', '¡YA!'],
      ['¡AHORA!', '¡CORRE!'],
      ['¡VAMOS!', '¡DONA!'],
      ['¡¡ÚLTIMOS!!', '¡¡SEGUNDOS!!']
    ];
    const idx = Math.floor(Math.random() * panicMessages.length);
    mascotSpeechLeftEl.textContent = panicMessages[idx][0];
    mascotSpeechRightEl.textContent = panicMessages[idx][1];
  } else if (timeRemaining <= thresholds.warning) {
    // Modo advertencia
    mascotSpeechLeftEl.textContent = '¡Apúrate!';
    mascotSpeechRightEl.textContent = '¡Queda poco!';
  } else {
    mascotSpeechLeftEl.textContent = '¡VAMOS!';
    mascotSpeechRightEl.textContent = '¡DONA!';
  }
}

/**
 * Establece el tiempo inicial para calcular el progreso
 */
export function setInitialTimeForProgress(time) {
  initialTimeForProgress = time;
}
