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

// Caché de imágenes cargadas
const imageCache = new Map();

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

  // Configurar eventos de conexión TikTok
  setupConnectionEvents();

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
    const response = await fetch('/gifts.json');
    giftsData = await response.json();
    console.log(`[ROULETTE] ${giftsData.length} regalos cargados`);

    // Poblar selectores de regalos
    populateGiftSelectors();
  } catch (error) {
    console.error('[ROULETTE] Error cargando catálogo de regalos:', error);
    giftsData = [];
  }
}

function populateGiftSelectors(filterText = '') {
  const validGiftSelector = document.getElementById('validGiftSelector');
  const manualGiftSelect = document.getElementById('manualGiftSelect');

  const filteredGifts = filterText
    ? giftsData.filter(gift =>
        gift.name.toLowerCase().includes(filterText.toLowerCase()) ||
        gift.id.includes(filterText)
      )
    : giftsData;

  if (validGiftSelector) {
    validGiftSelector.innerHTML = '<option value="">🚫 Solo Heart Me</option>';
    filteredGifts.forEach(gift => {
      const option = document.createElement('option');
      option.value = gift.id;
      option.textContent = `${gift.name} (${gift.cost} 💎)`;
      validGiftSelector.appendChild(option);
    });
  }

  if (manualGiftSelect) {
    manualGiftSelect.innerHTML = '<option value="" disabled selected>Selecciona un regalo...</option>';
    filteredGifts.forEach(gift => {
      const option = document.createElement('option');
      option.value = gift.id;
      option.textContent = `${gift.name} (${gift.cost} 💎)`;
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
  const participantsListCount = document.getElementById('participantsListCount');

  if (!participantsList) return;

  // Actualizar contador en el header
  if (participantsListCount) {
    participantsListCount.textContent = participants.size;
  }

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

  participantsList.innerHTML = sortedParticipants.map(([uniqueId, data]) => {
    const hasImage = data.profileImage && data.profileImage.trim();
    const avatarContent = hasImage
      ? `<img src="${data.profileImage}" alt="${data.displayName}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'; this.parentElement.innerHTML='${data.displayName.charAt(0).toUpperCase()}'; this.parentElement.style.display='flex'; this.parentElement.style.alignItems='center'; this.parentElement.style.justifyContent='center'; this.parentElement.style.fontWeight='700'; this.parentElement.style.color='white';">`
      : `<div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; font-weight: 700; color: white;">${data.displayName.charAt(0).toUpperCase()}</div>`;

    return `
      <div class="participant-item" style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem; background: rgba(0,0,0,0.2); border: 2px solid ${data.color}; border-radius: 12px; margin-bottom: 0.5rem; transition: all 0.3s;">
        <div style="width: 48px; height: 48px; min-width: 48px; border-radius: 50%; background: ${data.color}; overflow: hidden; border: 2px solid rgba(255,255,255,0.2); box-shadow: 0 4px 8px rgba(0,0,0,0.3);">
          ${avatarContent}
        </div>
        <div style="flex: 1; min-width: 0;">
          <div style="font-weight: 600; color: #fff; font-size: 0.95rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">@${data.displayName}</div>
          <div style="font-size: 0.85rem; color: rgba(255,255,255,0.6); display: flex; align-items: center; gap: 0.5rem;">
            <span style="background: ${data.color}; padding: 0.15rem 0.5rem; border-radius: 4px; font-weight: 600; color: white;">${data.entries}</span>
            <span>entradas</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
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
// CARGA DE IMÁGENES
// ============================================

function loadImage(url) {
  if (!url) return Promise.resolve(null);

  if (imageCache.has(url)) {
    return Promise.resolve(imageCache.get(url));
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageCache.set(url, img);
      resolve(img);
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// ============================================
// DIBUJADO DE RULETA
// ============================================

async function drawRoulette() {
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

  // Cargar todas las imágenes primero
  const imagePromises = entries.map(entry => loadImage(entry.profileImage));
  const images = await Promise.all(imagePromises);

  // Dibujar segmentos
  entries.forEach((entry, index) => {
    const startAngle = index * anglePerEntry - Math.PI / 2;
    const endAngle = startAngle + anglePerEntry;
    const midAngle = startAngle + anglePerEntry / 2;

    // Dibujar segmento de color
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = entry.color;
    ctx.fill();
    ctx.strokeStyle = '#1a202c';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Dibujar imagen de perfil si existe
    const img = images[index];
    if (img && anglePerEntry > 0.2) { // Solo si el segmento es suficientemente grande
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(midAngle);

      const imgSize = Math.min(radius * 0.3, 60);
      const imgDistance = radius * 0.65;

      // Dibujar círculo blanco de fondo
      ctx.beginPath();
      ctx.arc(imgDistance, 0, imgSize / 2 + 3, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Clip circular para la imagen
      ctx.beginPath();
      ctx.arc(imgDistance, 0, imgSize / 2, 0, 2 * Math.PI);
      ctx.clip();

      // Dibujar imagen
      ctx.drawImage(
        img,
        imgDistance - imgSize / 2,
        -imgSize / 2,
        imgSize,
        imgSize
      );

      ctx.restore();
    } else if (anglePerEntry > 0.15) {
      // Si no hay imagen pero el segmento es visible, dibujar inicial
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(midAngle);

      const textDistance = radius * 0.65;
      ctx.font = 'bold 20px Arial';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(entry.displayName.charAt(0).toUpperCase(), textDistance, 0);

      ctx.restore();
    }
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

  // Búsqueda de regalo válido
  const validGiftSearchInput = document.getElementById('validGiftSearchInput');
  if (validGiftSearchInput) {
    validGiftSearchInput.addEventListener('input', (e) => {
      const searchText = e.target.value;
      populateGiftSelectors(searchText);
    });
  }

  // Búsqueda de regalo manual
  const giftSearchInput = document.getElementById('giftSearchInput');
  if (giftSearchInput) {
    giftSearchInput.addEventListener('input', (e) => {
      const searchText = e.target.value;
      const manualGiftSelect = document.getElementById('manualGiftSelect');
      if (manualGiftSelect) {
        const filteredGifts = searchText
          ? giftsData.filter(gift =>
              gift.name.toLowerCase().includes(searchText.toLowerCase()) ||
              gift.id.includes(searchText)
            )
          : giftsData;

        manualGiftSelect.innerHTML = '<option value="" disabled selected>Selecciona un regalo...</option>';
        filteredGifts.forEach(gift => {
          const option = document.createElement('option');
          option.value = gift.id;
          option.textContent = `${gift.name} (${gift.cost} 💎)`;
          manualGiftSelect.appendChild(option);
        });
      }
    });
  }

  // Selector de regalo válido
  const validGiftSelector = document.getElementById('validGiftSelector');
  if (validGiftSelector) {
    validGiftSelector.addEventListener('change', (e) => {
      validGiftId = e.target.value || null;
      saveConfiguration();
      console.log(`[ROULETTE] Regalo válido configurado: ${validGiftId || 'Solo Heart Me'}`);

      // Mostrar info del regalo seleccionado
      const validGiftInfo = document.getElementById('validGiftInfo');
      const validGiftInfoImage = document.getElementById('validGiftInfoImage');
      const validGiftInfoName = document.getElementById('validGiftInfoName');

      if (validGiftId && validGiftInfo && validGiftInfoImage && validGiftInfoName) {
        const selectedGift = giftsData.find(g => g.id === validGiftId);
        if (selectedGift) {
          validGiftInfoImage.innerHTML = `<img src="${selectedGift.image}" alt="${selectedGift.name}" style="width: 50px; height: 50px; border-radius: 8px;" crossorigin="anonymous">`;
          validGiftInfoName.textContent = `${selectedGift.name} (${selectedGift.cost} 💎)`;
          validGiftInfo.style.display = 'block';
        }
      } else if (validGiftInfo) {
        validGiftInfo.style.display = 'none';
      }
    });
  }
}

// ============================================
// EVENTOS DE CONEXIÓN TIKTOK
// ============================================

function setupConnectionEvents() {
  const tiktokConnectBtn = document.getElementById('tiktokConnect');
  const tiktokUserInput = document.getElementById('tiktokUserInput');
  const connectionStatus = document.getElementById('connectionStatus');
  const connectionFeedback = document.getElementById('connectionFeedback');
  const tiktokUserDisplay = document.getElementById('tiktokUserDisplay');
  const statusDot = document.getElementById('statusDot');
  const saveSessionIdBtn = document.getElementById('saveSessionId');

  // Importar módulo de conexión dinámicamente
  import('./connection.js').then(connectionModule => {
    const { connect, disconnect, initConnection, setConnectionCallbacks, getConnectionState, CONNECTION_STATES } = connectionModule;

    // Inicializar módulo de conexión
    initConnection({
      statusBadge: connectionStatus,
      feedback: connectionFeedback
    });

    // Configurar callbacks
    setConnectionCallbacks({
      onStateChange: (state) => {
        console.log('[ROULETTE] Estado de conexión:', state);

        // Actualizar dot indicator
        if (statusDot) {
          statusDot.className = 'status-dot';
          if (state === CONNECTION_STATES.CONNECTED) {
            statusDot.classList.add('status-dot--connected');
          } else if (state === CONNECTION_STATES.CONNECTING) {
            statusDot.classList.add('status-dot--connecting');
          } else if (state === CONNECTION_STATES.ERROR) {
            statusDot.classList.add('status-dot--error');
          }
        }
      },
      onGift: (giftData) => {
        console.log('[ROULETTE] Regalo recibido:', giftData);
        // Aquí se puede procesar el regalo para la ruleta si es necesario
      }
    });

    // Botón de conectar
    if (tiktokConnectBtn) {
      tiktokConnectBtn.addEventListener('click', () => {
        const username = tiktokUserInput?.value.trim() || '';

        if (!username) {
          if (connectionFeedback) {
            connectionFeedback.textContent = 'Por favor ingresa un usuario';
            connectionFeedback.style.color = '#ff6b6b';
          }
          return;
        }

        // Obtener sessionId si está disponible
        const sessionIdInput = document.getElementById('sessionIdInput');
        const ttTargetIdcInput = document.getElementById('ttTargetIdcInput');
        const sessionId = sessionIdInput?.value.trim() || null;
        const ttTargetIdc = ttTargetIdcInput?.value.trim() || null;

        // Conectar
        const connected = connect(username, sessionId, ttTargetIdc);

        if (connected && tiktokUserDisplay) {
          tiktokUserDisplay.textContent = `@${username}`;
        }
      });
    }

    // Enter en input de usuario
    if (tiktokUserInput) {
      tiktokUserInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          tiktokConnectBtn?.click();
        }
      });
    }

    // Guardar Session ID
    if (saveSessionIdBtn) {
      saveSessionIdBtn.addEventListener('click', () => {
        const sessionIdInput = document.getElementById('sessionIdInput');
        const ttTargetIdcInput = document.getElementById('ttTargetIdcInput');

        const sessionId = sessionIdInput?.value.trim();
        const ttTargetIdc = ttTargetIdcInput?.value.trim();

        if (sessionId) {
          localStorage.setItem('tiktok_sessionid', sessionId);
          console.log('[ROULETTE] Session ID guardado');
        }

        if (ttTargetIdc) {
          localStorage.setItem('tiktok_tt_target_idc', ttTargetIdc);
          console.log('[ROULETTE] tt-target-idc guardado');
        }

        if (connectionFeedback) {
          connectionFeedback.textContent = '✓ Credenciales guardadas';
          connectionFeedback.style.color = '#4ecdc4';
          setTimeout(() => {
            connectionFeedback.textContent = '';
          }, 3000);
        }
      });
    }

    // Cargar credenciales guardadas
    const savedSessionId = localStorage.getItem('tiktok_sessionid');
    const savedTtTargetIdc = localStorage.getItem('tiktok_tt_target_idc');

    if (savedSessionId) {
      const sessionIdInput = document.getElementById('sessionIdInput');
      if (sessionIdInput) sessionIdInput.value = savedSessionId;
    }

    if (savedTtTargetIdc) {
      const ttTargetIdcInput = document.getElementById('ttTargetIdcInput');
      if (ttTargetIdcInput) ttTargetIdcInput.value = savedTtTargetIdc;
    }
  }).catch(err => {
    console.error('[ROULETTE] Error cargando módulo de conexión:', err);
  });
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
