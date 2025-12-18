/**
 * Módulo de Animaciones Premium - Sistema de Subastas
 * Gestiona animaciones espectaculares para el leaderboard
 */

// Estado de posiciones anteriores para detectar cambios
let previousPositions = new Map(); // uniqueId -> position
let streakTracker = new Map(); // uniqueId -> { count, lastPosition }

// Configuración de animaciones
const ANIMATION_CONFIG = {
  newLeaderDuration: 4000,
  streakAlertDuration: 3500,
  positionChangeDuration: 2000,
  confettiCount: 50,
  crownParticles: 15
};

// Referencia al contenedor de overlay
let overlayContainer = null;

/**
 * Inicializa el módulo de animaciones
 * @param {HTMLElement} container - Contenedor para overlays de animación
 */
export function initAnimations(container) {
  overlayContainer = container;
  if (!overlayContainer) {
    // Crear contenedor si no existe
    overlayContainer = document.createElement('div');
    overlayContainer.id = 'animation-overlay';
    overlayContainer.className = 'animation-overlay';
    document.body.appendChild(overlayContainer);
  }
}

/**
 * Analiza los cambios de posición y dispara animaciones apropiadas
 * @param {Array} currentTop - Array ordenado del top actual
 * @param {string} updatedUserId - ID del usuario que se actualizó
 * @returns {Object} - Info sobre las animaciones disparadas
 */
export function analyzePositionChanges(currentTop, updatedUserId) {
  const result = {
    newLeader: false,
    streakAlert: null,
    positionChange: null,
    leaderName: null
  };

  if (!currentTop || currentTop.length === 0) return result;

  const normalizedUpdatedId = updatedUserId?.toLowerCase();
  
  // Construir mapa de posiciones actuales
  const currentPositions = new Map();
  currentTop.forEach((entry, index) => {
    const id = entry.uniqueId.toLowerCase();
    currentPositions.set(id, {
      position: index + 1,
      name: entry.label || entry.uniqueId,
      uniqueId: entry.uniqueId,
      total: entry.total
    });
  });

  // Analizar cambios para el usuario actualizado
  if (normalizedUpdatedId && currentPositions.has(normalizedUpdatedId)) {
    const current = currentPositions.get(normalizedUpdatedId);
    const previous = previousPositions.get(normalizedUpdatedId);
    
    // Verificar si es nuevo líder
    if (current.position === 1) {
      const wasLeaderBefore = previous?.position === 1;
      if (!wasLeaderBefore && previousPositions.size > 0) {
        result.newLeader = true;
        result.leaderName = current.name;
        
        // Disparar animación de nuevo líder
        triggerNewLeaderAnimation(current.name, current.uniqueId);
      }
    }
    
    // Calcular cambio de posición
    if (previous) {
      const positionChange = previous.position - current.position;
      
      if (positionChange > 0) {
        result.positionChange = {
          name: current.name,
          from: previous.position,
          to: current.position,
          jumped: positionChange
        };
        
        // Actualizar racha
        updateStreak(normalizedUpdatedId, current.name, current.position, positionChange);
        
        // Verificar alerta de racha
        const streak = streakTracker.get(normalizedUpdatedId);
        if (streak && streak.count >= 2 && current.position <= 3) {
          result.streakAlert = {
            name: current.name,
            count: streak.count,
            position: current.position
          };
          
          // Disparar animación de racha
          triggerStreakAlert(current.name, streak.count, current.position);
        }
        
        // Animación de subida de posición
        if (positionChange >= 2 || current.position <= 2) {
          triggerPositionRiseAnimation(current.name, previous.position, current.position);
        }
      }
    }
  }
  
  // Actualizar posiciones anteriores
  previousPositions = currentPositions;
  
  return result;
}

/**
 * Actualiza el tracker de rachas
 */
function updateStreak(uniqueId, name, newPosition, jumped) {
  const streak = streakTracker.get(uniqueId) || { count: 0, lastPosition: 999 };
  
  // Si subió de posición, incrementar racha
  if (newPosition < streak.lastPosition) {
    streak.count += 1;
    streak.lastPosition = newPosition;
  } else {
    // Si bajó, resetear racha
    streak.count = 0;
    streak.lastPosition = newPosition;
  }
  
  streakTracker.set(uniqueId, streak);
}

/**
 * Animación épica de nuevo líder con corona y confetti
 */
function triggerNewLeaderAnimation(name, uniqueId) {
  if (!overlayContainer) return;
  
  // Crear overlay de celebración
  const celebration = document.createElement('div');
  celebration.className = 'new-leader-celebration';
  celebration.innerHTML = `
    <div class="crown-burst">
      <div class="crown-icon">👑</div>
      <div class="crown-particles"></div>
    </div>
    <div class="leader-announcement">
      <div class="announcement-badge">¡NUEVO LÍDER!</div>
      <div class="announcement-name">${escapeHtml(name)}</div>
      <div class="announcement-subtitle">@${escapeHtml(uniqueId)}</div>
      <div class="announcement-crown-row">
        <span class="mini-crown">👑</span>
        <span class="top-text">TOP 1</span>
        <span class="mini-crown">👑</span>
      </div>
    </div>
    <div class="confetti-container"></div>
    <div class="sparkle-ring"></div>
  `;
  
  overlayContainer.appendChild(celebration);
  
  // Generar confetti
  const confettiContainer = celebration.querySelector('.confetti-container');
  generateConfetti(confettiContainer, ANIMATION_CONFIG.confettiCount);
  
  // Generar partículas de corona
  const crownParticles = celebration.querySelector('.crown-particles');
  generateCrownParticles(crownParticles, ANIMATION_CONFIG.crownParticles);
  
  // Reproducir sonido (opcional)
  playSound('fanfare');
  
  // Remover después de la animación
  setTimeout(() => {
    celebration.classList.add('fade-out');
    setTimeout(() => celebration.remove(), 500);
  }, ANIMATION_CONFIG.newLeaderDuration);
}

/**
 * Alerta de racha de victorias
 */
function triggerStreakAlert(name, streakCount, currentPosition) {
  if (!overlayContainer) return;
  
  const messages = [
    '¡Está en racha!',
    '¡IMPARABLE!',
    '¡EN LLAMAS! 🔥',
    '¡DOMINANDO!',
    '¡UNSTOPPABLE!'
  ];
  
  const message = streakCount >= 4 ? messages[4] : messages[Math.min(streakCount - 1, messages.length - 1)];
  const emoji = streakCount >= 3 ? '🔥' : '⚡';
  
  const alert = document.createElement('div');
  alert.className = 'streak-alert';
  alert.innerHTML = `
    <div class="streak-content">
      <div class="streak-emoji">${emoji}</div>
      <div class="streak-message">${message}</div>
      <div class="streak-user">
        <span class="streak-name">${escapeHtml(name)}</span>
        <span class="streak-detail">${streakCount} subidas consecutivas</span>
      </div>
      <div class="streak-warning">
        <span class="warning-icon">⚠️</span>
        <span>¡Ten cuidado! Subiendo al TOP ${currentPosition}</span>
      </div>
    </div>
    <div class="streak-flames"></div>
  `;
  
  overlayContainer.appendChild(alert);
  
  // Generar llamas si es racha grande
  if (streakCount >= 3) {
    const flamesContainer = alert.querySelector('.streak-flames');
    generateFlames(flamesContainer);
  }
  
  // Remover después de la animación
  setTimeout(() => {
    alert.classList.add('fade-out');
    setTimeout(() => alert.remove(), 500);
  }, ANIMATION_CONFIG.streakAlertDuration);
}

/**
 * Animación de subida de posición
 */
function triggerPositionRiseAnimation(name, fromPosition, toPosition) {
  if (!overlayContainer) return;
  
  const positionEmoji = toPosition === 1 ? '👑' : toPosition === 2 ? '🥈' : '🥉';
  
  const rise = document.createElement('div');
  rise.className = 'position-rise';
  rise.innerHTML = `
    <div class="rise-content">
      <div class="rise-arrow">↑</div>
      <div class="rise-positions">
        <span class="from-position">#${fromPosition}</span>
        <span class="arrow-icon">→</span>
        <span class="to-position">${positionEmoji} #${toPosition}</span>
      </div>
      <div class="rise-name">${escapeHtml(name)}</div>
    </div>
  `;
  
  overlayContainer.appendChild(rise);
  
  setTimeout(() => {
    rise.classList.add('fade-out');
    setTimeout(() => rise.remove(), 300);
  }, ANIMATION_CONFIG.positionChangeDuration);
}

/**
 * Genera partículas de confetti
 */
function generateConfetti(container, count) {
  const colors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96f', '#ff9f43', '#fff'];
  const shapes = ['square', 'circle', 'triangle'];
  
  for (let i = 0; i < count; i++) {
    const confetti = document.createElement('div');
    confetti.className = `confetti confetti-${shapes[Math.floor(Math.random() * shapes.length)]}`;
    confetti.style.setProperty('--x', `${Math.random() * 100}%`);
    confetti.style.setProperty('--delay', `${Math.random() * 0.5}s`);
    confetti.style.setProperty('--duration', `${2 + Math.random() * 2}s`);
    confetti.style.setProperty('--rotation', `${Math.random() * 720 - 360}deg`);
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    container.appendChild(confetti);
  }
}

/**
 * Genera partículas doradas alrededor de la corona
 */
function generateCrownParticles(container, count) {
  for (let i = 0; i < count; i++) {
    const particle = document.createElement('div');
    particle.className = 'crown-particle';
    const angle = (360 / count) * i;
    particle.style.setProperty('--angle', `${angle}deg`);
    particle.style.setProperty('--delay', `${i * 0.05}s`);
    container.appendChild(particle);
  }
}

/**
 * Genera efecto de llamas
 */
function generateFlames(container) {
  for (let i = 0; i < 8; i++) {
    const flame = document.createElement('div');
    flame.className = 'flame';
    flame.style.setProperty('--delay', `${i * 0.1}s`);
    flame.style.setProperty('--x', `${10 + i * 10}%`);
    container.appendChild(flame);
  }
}

/**
 * Reproducir sonido (placeholder)
 */
function playSound(soundType) {
  // Placeholder para futura implementación de sonidos
  }

/**
 * Escapa HTML para prevenir XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Reinicia el estado de animaciones
 */
export function resetAnimations() {
  previousPositions.clear();
  streakTracker.clear();
  
  if (overlayContainer) {
    overlayContainer.innerHTML = '';
  }
}

/**
 * Dispara animación de victoria final
 */
export function triggerWinnerCelebration(winner) {
  if (!overlayContainer || !winner) return;
  
  const celebration = document.createElement('div');
  celebration.className = 'winner-celebration';
  celebration.innerHTML = `
    <div class="winner-spotlight"></div>
    <div class="winner-content">
      <div class="winner-crown-big">👑</div>
      <div class="winner-title">¡GANADOR!</div>
      <div class="winner-name-big">${escapeHtml(winner.label || winner.uniqueId)}</div>
      <div class="winner-coins-big">
        <span class="coin-icon">💎</span>
        <span>${winner.coins?.toLocaleString() || winner.total?.toLocaleString() || '0'}</span>
      </div>
      <div class="winner-message">¡Felicitaciones!</div>
    </div>
    <div class="winner-confetti"></div>
    <div class="winner-fireworks"></div>
  `;
  
  overlayContainer.appendChild(celebration);
  
  // Generar confetti masivo
  const confettiContainer = celebration.querySelector('.winner-confetti');
  generateConfetti(confettiContainer, 100);
  
  // Generar fuegos artificiales
  const fireworksContainer = celebration.querySelector('.winner-fireworks');
  generateFireworks(fireworksContainer);
  
  // Esta animación permanece más tiempo
  setTimeout(() => {
    celebration.classList.add('fade-out');
    setTimeout(() => celebration.remove(), 1000);
  }, 6000);
}

/**
 * Genera efecto de fuegos artificiales
 */
function generateFireworks(container) {
  const colors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96f'];
  
  for (let i = 0; i < 5; i++) {
    setTimeout(() => {
      const firework = document.createElement('div');
      firework.className = 'firework';
      firework.style.setProperty('--x', `${20 + Math.random() * 60}%`);
      firework.style.setProperty('--y', `${20 + Math.random() * 40}%`);
      firework.style.setProperty('--color', colors[Math.floor(Math.random() * colors.length)]);
      container.appendChild(firework);
      
      setTimeout(() => firework.remove(), 1500);
    }, i * 800);
  }
}

/**
 * Obtiene información de racha de un usuario
 */
export function getStreakInfo(uniqueId) {
  return streakTracker.get(uniqueId?.toLowerCase()) || { count: 0, lastPosition: 999 };
}
