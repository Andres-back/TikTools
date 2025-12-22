/**
 * Módulo de Ruleta TikTok Live
 * Adaptado para TikToolStream
 */

import { getConnection, onTikTokEvent } from './connection.js';
import { getAccessToken } from './auth.js';

// ============================================
// ESTADO GLOBAL
// ============================================

const participants = new Map(); // uniqueId => { displayName, entries, color, profileImage }
let totalEntries = 0;
let eliminatedParticipants = [];
let pendingParticipants = [];
let isSpinning = false;
let isShuffling = false;
let autoSpinEnabled = false;
let gameStarted = false;

// Configuración
let minParticipantsRequired = 2;
let likesPerEntry = 1000;
let validGiftId = null;
let giftEntries = 1;
let heartMeEnabled = true;
let followEnabled = false;

// Canvas
let rouletteCanvas = null;
let giftsOverlayCanvas = null;
let ctx = null;

// Catálogo de regalos
let giftsData = [];

// WebSocket para overlays
let overlaySocket = null;

// Colores
const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#F8B739', '#A78BFA',
  '#FD79A8', '#FDCB6E', '#6C5CE7', '#00B894', '#E17055'
];
let colorIndex = 0;

// ============================================
// INICIALIZACIÓN
// ============================================

export async function init() {
  console.log('[ROULETTE] Inicializando módulo de ruleta...');

  // Obtener elementos del DOM
  rouletteCanvas = document.getElementById('rouletteCanvas');
  giftsOverlayCanvas = document.getElementById('giftsOverlayCanvas');

  if (!rouletteCanvas) {
    console.error('[ROULETTE] Canvas de ruleta no encontrado');
    return;
  }

  ctx = rouletteCanvas.getContext('2d');

  // Cargar catálogo de regalos
  await loadGiftsCatalog();

  // Configurar eventos de UI
  setupUIEvents();

  // Cargar configuración guardada
  loadConfiguration();

  // Conectar WebSocket para overlays
  connectOverlaySocket();

  // Dibujar ruleta inicial
  drawRoulette();

  console.log('[ROULETTE] Módulo inicializado');
}

// ============================================
// CATÁLOGO DE REGALOS
// ============================================

async function loadGiftsCatalog() {
  try {
    const response = await fetch('/assets/gifts.json');
    giftsData = await response.json();
    console.log(`[ROULETTE] ${giftsData.length} regalos cargados`);

    // Poblar selectores de regalos
    populateGiftSelectors();
  } catch (error) {
    console.error('[ROULETTE] Error cargando catálogo de regalos:', error);
    giftsData = [];
  }
}

function populateGiftSelectors() {
  const validGiftSelector = document.getElementById('validGiftSelector');
  const manualGiftSelect = document.getElementById('manualGiftSelect');

  if (validGiftSelector) {
    validGiftSelector.innerHTML = '<option value="">🚫 Solo Heart Me</option>';
    giftsData.forEach(gift => {
      const option = document.createElement('option');
      option.value = gift.id;
      option.textContent = `${gift.name} (${gift.diamond_count} 💎)`;
      validGiftSelector.appendChild(option);
    });
  }

  if (manualGiftSelect) {
    manualGiftSelect.innerHTML = '<option value="" disabled selected>Selecciona un regalo...</option>';
    giftsData.forEach(gift => {
      const option = document.createElement('option');
      option.value = gift.id;
      option.textContent = `${gift.name} (${gift.diamond_count} 💎)`;
      manualGiftSelect.appendChild(option);
    });
  }
}

// ============================================
// WEBSOCKET PARA OVERLAYS
// ============================================

function connectOverlaySocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/sync`;

  overlaySocket = new WebSocket(wsUrl);

  overlaySocket.onopen = () => {
    console.log('[ROULETTE-WS] Conectado al servidor de overlays');
  };

  overlaySocket.onerror = (error) => {
    console.error('[ROULETTE-WS] Error:', error);
  };

  overlaySocket.onclose = () => {
    console.log('[ROULETTE-WS] Desconectado');
    setTimeout(connectOverlaySocket, 3000);
  };
}

function syncStateWithOverlays() {
  if (!overlaySocket || overlaySocket.readyState !== WebSocket.OPEN) return;

  const state = {
    type: 'roulette-state',
    participants: Array.from(participants.entries()).map(([uniqueId, data]) => ({
      uniqueId,
      displayName: data.displayName,
      entries: data.entries,
      color: data.color,
      profileImage: data.profileImage
    })),
    totalEntries,
    isSpinning
  };

  overlaySocket.send(JSON.stringify(state));
}

// ============================================
// GESTIÓN DE PARTICIPANTES
// ============================================

function getRandomColor() {
  const color = COLORS[colorIndex % COLORS.length];
  colorIndex++;
  return color;
}

function addParticipant({ uniqueId, displayName, entries, profileImage }) {
  console.log(`[ROULETTE] Agregando participante: @${uniqueId} con ${entries} entradas`);

  if (isSpinning) {
    pendingParticipants.push({ uniqueId, displayName, entries, profileImage });
    return;
  }

  const existing = participants.get(uniqueId);

  if (existing) {
    existing.entries += entries;
    if (profileImage) existing.profileImage = profileImage;
    console.log(`[ROULETTE] @${uniqueId} ahora tiene ${existing.entries} entradas`);
  } else {
    participants.set(uniqueId, {
      displayName: displayName || uniqueId,
      entries,
      color: getRandomColor(),
      profileImage: profileImage || null
    });
    console.log(`[ROULETTE] Nuevo participante: @${uniqueId}`);
  }

  totalEntries = Array.from(participants.values()).reduce((sum, p) => sum + p.entries, 0);

  updateParticipantsDisplay();
  updateStats();
  drawRoulette();
  syncStateWithOverlays();
}

function updateParticipantsDisplay() {
  const participantsList = document.getElementById('participantsList');
  if (!participantsList) return;

  if (participants.size === 0) {
    participantsList.innerHTML = `
      <div class="empty-state" style="text-align: center; padding: 3rem 1rem; color: rgba(255,255,255,0.5);">
        <div class="empty-icon" style="font-size: 3rem; margin-bottom: 1rem;">🎯</div>
        <p>Esperando participantes...</p>
      </div>
    `;
    return;
  }

  const sortedParticipants = Array.from(participants.entries())
    .sort((a, b) => b[1].entries - a[1].entries);

  participantsList.innerHTML = sortedParticipants.map(([uniqueId, data]) => `
    <div class="participant-item" style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem; background: rgba(0,0,0,0.2); border-radius: 8px; margin-bottom: 0.5rem;">
      <div style="width: 40px; height: 40px; border-radius: 50%; background: ${data.color}; display: flex; align-items: center; justify-content: center; font-weight: 700; color: white;">
        ${data.displayName.charAt(0).toUpperCase()}
      </div>
      <div style="flex: 1;">
        <div style="font-weight: 600; color: #fff;">@${data.displayName}</div>
        <div style="font-size: 0.85rem; color: rgba(255,255,255,0.6);">${data.entries} entradas</div>
      </div>
    </div>
  `).join('');
}

function updateStats() {
  const participantCount = document.getElementById('participantCount');
  const totalEntriesEl = document.getElementById('totalEntriesEl');
  const minParticipantsStatus = document.getElementById('minParticipantsStatus');

  if (participantCount) participantCount.textContent = participants.size;
  if (totalEntriesEl) totalEntriesEl.textContent = totalEntries;
  if (minParticipantsStatus) minParticipantsStatus.textContent = `/ mín: ${minParticipantsRequired}`;

  // Habilitar/deshabilitar botón de spin
  const spinBtn = document.getElementById('spinBtn');
  if (spinBtn) {
    spinBtn.disabled = participants.size < minParticipantsRequired || isSpinning;
  }
}

// ============================================
// DIBUJADO DE RULETA
// ============================================

function drawRoulette() {
  if (!ctx || !rouletteCanvas) return;

  const width = rouletteCanvas.width;
  const height = rouletteCanvas.height;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 10;

  // Limpiar canvas
  ctx.clearRect(0, 0, width, height);

  if (participants.size === 0) {
    // Dibujar ruleta vacía
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = '#2d3748';
    ctx.fill();
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Texto
    ctx.fillStyle = '#a0aec0';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Esperando participantes...', centerX, centerY);
    return;
  }

  // Crear array de entradas individuales
  const entries = [];
  participants.forEach((data, uniqueId) => {
    for (let i = 0; i < data.entries; i++) {
      entries.push({ uniqueId, ...data });
    }
  });

  const anglePerEntry = (2 * Math.PI) / entries.length;

  // Dibujar segmentos
  entries.forEach((entry, index) => {
    const startAngle = index * anglePerEntry - Math.PI / 2;
    const endAngle = startAngle + anglePerEntry;

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = entry.color;
    ctx.fill();
    ctx.strokeStyle = '#1a202c';
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  // Borde exterior
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Centro
  ctx.beginPath();
  ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
  ctx.fillStyle = '#1a202c';
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.stroke();
}

// ============================================
// GIRO DE RULETA
// ============================================

function spinRoulette() {
  if (isSpinning || participants.size < 2) return;

  isSpinning = true;
  gameStarted = true;

  console.log('[ROULETTE] Girando ruleta...');

  // Seleccionar ganador ponderado
  const winner = selectWeightedWinner();
  if (!winner) {
    isSpinning = false;
    return;
  }

  // Animación de giro (5 segundos)
  const spinDuration = 5000;
  const spinRotations = 5 + Math.random() * 3;

  const entries = [];
  participants.forEach((data, uniqueId) => {
    for (let i = 0; i < data.entries; i++) {
      entries.push({ uniqueId, ...data });
    }
  });

  const winnerIndex = entries.findIndex(e => e.uniqueId === winner.uniqueId);
  const anglePerEntry = 360 / entries.length;
  const angleOffset = (winnerIndex * anglePerEntry) + (anglePerEntry / 2);
  const finalAngle = (spinRotations * 360) - angleOffset;

  animateRouletteRotation(finalAngle, spinDuration, () => {
    setTimeout(() => {
      showWinner(winner);
      isSpinning = false;
      updateStats();

      // Auto-spin si está habilitado
      if (autoSpinEnabled && participants.size >= 2) {
        setTimeout(() => spinRoulette(), 8000);
      }
    }, 500);
  });

  syncStateWithOverlays();
}

function selectWeightedWinner() {
  const entries = [];
  participants.forEach((data, uniqueId) => {
    for (let i = 0; i < data.entries; i++) {
      entries.push({ uniqueId, ...data });
    }
  });

  if (entries.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * entries.length);
  return entries[randomIndex];
}

function animateRouletteRotation(targetAngle, duration, callback) {
  if (!rouletteCanvas) return;

  const startTime = Date.now();

  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  const animate = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const currentRotation = targetAngle * easeOutCubic(progress);

    rouletteCanvas.style.transform = `rotate(${currentRotation}deg)`;

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      rouletteCanvas.style.transform = `rotate(${targetAngle}deg)`;
      if (callback) callback();
    }
  };

  animate();
}

function showWinner(winner) {
  console.log(`[ROULETTE] 🏆 Ganador: @${winner.displayName}`);

  // Eliminar al ganador
  const participant = participants.get(winner.uniqueId);
  if (participant) {
    participant.entries--;

    if (participant.entries <= 0) {
      participants.delete(winner.uniqueId);
      eliminatedParticipants.push({ ...participant, uniqueId: winner.uniqueId });
      console.log(`[ROULETTE] ❌ @${winner.displayName} eliminado`);
    } else {
      console.log(`[ROULETTE] @${winner.displayName} tiene ${participant.entries} entradas restantes`);
    }
  }

  totalEntries = Array.from(participants.values()).reduce((sum, p) => sum + p.entries, 0);

  updateParticipantsDisplay();
  updateStats();
  drawRoulette();

  // Mostrar notificación de ganador
  alert(`🏆 Ganador: @${winner.displayName}`);

  // Si solo queda 1, es el ganador final
  if (participants.size === 1) {
    const finalWinner = Array.from(participants.entries())[0];
    alert(`🎉 GANADOR FINAL: @${finalWinner[1].displayName}`);
  }

  syncStateWithOverlays();
}

// ============================================
// EVENTOS DE UI
// ============================================

function setupUIEvents() {
  // Botón de spin/auto-spin
  const spinBtn = document.getElementById('spinBtn');
  if (spinBtn) {
    spinBtn.addEventListener('click', () => {
      if (!autoSpinEnabled) {
        autoSpinEnabled = true;
        spinBtn.textContent = '⏸️ Detener Auto-Giro';
        spinRoulette();
      } else {
        autoSpinEnabled = false;
        spinBtn.textContent = '▶️ Activar Auto-Giro';
      }
    });
  }

  // Botón de reset
  const resetBtn = document.getElementById('resetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('¿Reiniciar el juego? Se borrarán todos los participantes.')) {
        resetGame();
      }
    });
  }

  // Configuración de likes por entrada
  const setLikesPerEntryBtn = document.getElementById('setLikesPerEntryBtn');
  if (setLikesPerEntryBtn) {
    setLikesPerEntryBtn.addEventListener('click', () => {
      const input = document.getElementById('likesPerEntry');
      likesPerEntry = parseInt(input.value) || 1000;
      saveConfiguration();
      console.log(`[ROULETTE] Likes por entrada: ${likesPerEntry}`);
    });
  }

  // Configuración de entradas por regalo
  const setGiftEntriesBtn = document.getElementById('setGiftEntriesBtn');
  if (setGiftEntriesBtn) {
    setGiftEntriesBtn.addEventListener('click', () => {
      const input = document.getElementById('giftEntries');
      giftEntries = parseInt(input.value) || 1;
      saveConfiguration();
      console.log(`[ROULETTE] Entradas por regalo: ${giftEntries}`);
    });
  }

  // Configuración de mínimo de participantes
  const setMinParticipantsBtn = document.getElementById('setMinParticipantsBtn');
  if (setMinParticipantsBtn) {
    setMinParticipantsBtn.addEventListener('click', () => {
      const input = document.getElementById('minParticipants');
      minParticipantsRequired = parseInt(input.value) || 2;
      updateStats();
      saveConfiguration();
      console.log(`[ROULETTE] Mínimo de participantes: ${minParticipantsRequired}`);
    });
  }

  // Heart Me toggle
  const heartMeEnabledCheckbox = document.getElementById('heartMeEnabled');
  if (heartMeEnabledCheckbox) {
    heartMeEnabledCheckbox.addEventListener('change', (e) => {
      heartMeEnabled = e.target.checked;
      document.getElementById('heartMeStatus').textContent = heartMeEnabled ? 'Activado' : 'Desactivado';
      saveConfiguration();
    });
  }

  // Follow toggle
  const followEnabledCheckbox = document.getElementById('followEnabled');
  if (followEnabledCheckbox) {
    followEnabledCheckbox.addEventListener('change', (e) => {
      followEnabled = e.target.checked;
      document.getElementById('followStatus').textContent = followEnabled ? 'Activado' : 'Desactivado';
      saveConfiguration();
    });
  }

  // Agregar participante manualmente
  const addManualBtn = document.getElementById('addManualBtn');
  if (addManualBtn) {
    addManualBtn.addEventListener('click', () => {
      const usernameInput = document.getElementById('manualUsername');
      const entriesInput = document.getElementById('manualEntriesCount');

      const username = usernameInput.value.trim().replace('@', '');
      const entries = parseInt(entriesInput.value) || 1;

      if (username) {
        addParticipant({
          uniqueId: username,
          displayName: username,
          entries,
          profileImage: null
        });

        usernameInput.value = '';
        entriesInput.value = '1';
      }
    });
  }
}

// ============================================
// CONFIGURACIÓN
// ============================================

function saveConfiguration() {
  const config = {
    likesPerEntry,
    giftEntries,
    minParticipantsRequired,
    heartMeEnabled,
    followEnabled,
    validGiftId
  };
  localStorage.setItem('roulette-config', JSON.stringify(config));
}

function loadConfiguration() {
  const saved = localStorage.getItem('roulette-config');
  if (saved) {
    try {
      const config = JSON.parse(saved);
      likesPerEntry = config.likesPerEntry || 1000;
      giftEntries = config.giftEntries || 1;
      minParticipantsRequired = config.minParticipantsRequired || 2;
      heartMeEnabled = config.heartMeEnabled !== undefined ? config.heartMeEnabled : true;
      followEnabled = config.followEnabled || false;
      validGiftId = config.validGiftId || null;

      // Actualizar UI
      const likesInput = document.getElementById('likesPerEntry');
      const giftEntriesInput = document.getElementById('giftEntries');
      const minParticipantsInput = document.getElementById('minParticipants');

      if (likesInput) likesInput.value = likesPerEntry;
      if (giftEntriesInput) giftEntriesInput.value = giftEntries;
      if (minParticipantsInput) minParticipantsInput.value = minParticipantsRequired;

      console.log('[ROULETTE] Configuración cargada:', config);
    } catch (error) {
      console.error('[ROULETTE] Error cargando configuración:', error);
    }
  }
}

function resetGame() {
  participants.clear();
  eliminatedParticipants = [];
  pendingParticipants = [];
  totalEntries = 0;
  isSpinning = false;
  gameStarted = false;
  autoSpinEnabled = false;
  colorIndex = 0;

  if (rouletteCanvas) {
    rouletteCanvas.style.transform = 'rotate(0deg)';
  }

  updateParticipantsDisplay();
  updateStats();
  drawRoulette();
  syncStateWithOverlays();

  const spinBtn = document.getElementById('spinBtn');
  if (spinBtn) {
    spinBtn.textContent = '▶️ Activar Auto-Giro';
  }

  console.log('[ROULETTE] Juego reiniciado');
}
