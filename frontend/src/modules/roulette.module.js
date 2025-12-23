console.log('🎰 Overlay Ruleta - Script cargado');

// ============================================
// CONFIGURACIÓN Y VARIABLES GLOBALES
// ============================================

const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788',
  '#F06292', '#7986CB', '#4DB6AC', '#FFB74D', '#A1887F'
];

// Estado global
let participants = new Map();
let totalEntries = 0;
let isSpinning = false;
let soloCountdownActive = false;
let soloCountdownTimer = null;
let soloCountdownSeconds = 30;
let soloCountdownStartedAt = null;
let giftCatalog = [];
let selectedValidGiftId = null;
let heartMeEnabled = true;
let minParticipantsRequired = 2;

const SOLO_COUNTDOWN_FAST_SECONDS = 27;
const SOLO_COUNTDOWN_SLOW_STEPS = 3;
const SOLO_COUNTDOWN_SLOW_STEP_MS = 1800;
const SOLO_COUNTDOWN_DURATIONS = [
  ...new Array(SOLO_COUNTDOWN_FAST_SECONDS).fill(1000),
  ...new Array(SOLO_COUNTDOWN_SLOW_STEPS).fill(SOLO_COUNTDOWN_SLOW_STEP_MS)
];
const SOLO_COUNTDOWN_TOTAL_STEPS = SOLO_COUNTDOWN_DURATIONS.length;
const SOLO_COUNTDOWN_TOTAL_MS = SOLO_COUNTDOWN_DURATIONS.reduce((sum, value) => sum + value, 0);

// Elementos DOM
let rouletteCanvas, rouletteCtx;
let giftsOverlayCanvas, giftsOverlayCtx;
let rouletteMessageEl;
let soloCountdownEl, countdownTimerEl;
let eliminationWindowEl, eliminationNameEl, eliminationAvatarEl;
let quickEliminationToastEl, quickEliminationAvatarEl, quickEliminationNameEl;

// WebSocket
let socket = null;
const WS_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/live?overlay=true`;

// ============================================
// UTILIDADES
// ============================================

const getRandomColor = () => {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
};

const calculateEntriesForGift = (gift) => {
  if (!gift) return 1;
  
  // Heart Me siempre 1 entrada
  if (String(gift.id) === '7934' || gift.name.toLowerCase().includes('heart me')) {
    return 1;
  }
  
  // Usar el valor cost del regalo
  const cost = Number(gift.cost) || 0;
  return cost > 0 ? cost : 1;
};

const createIndividualEntriesArray = () => {
  const individualEntries = [];
  const sortedParticipants = Array.from(participants.entries()).sort((a, b) => {
    return a[0].localeCompare(b[0]);
  });
  
  sortedParticipants.forEach(([uniqueId, data]) => {
    for (let i = 0; i < data.entries; i++) {
      individualEntries.push({
        uniqueId,
        displayName: data.displayName,
        color: data.color,
        profileImage: data.profileImage || null,
        entryIndex: i,
        totalForUser: data.entries
      });
    }
  });
  
  return individualEntries;
};

// ============================================
// DIBUJO DE RULETA
// ============================================

const drawRoulette = () => {
  if (!rouletteCanvas || !rouletteCtx) return;
  
  const width = rouletteCanvas.width;
  const height = rouletteCanvas.height;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 20;
  
  rouletteCtx.clearRect(0, 0, width, height);
  
  if (participants.size === 0) {
    // Ruleta vacía - Mostrar mensaje de espera grande
    rouletteCtx.fillStyle = '#2a2a3e';
    rouletteCtx.beginPath();
    rouletteCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    rouletteCtx.fill();
    
    // MENSAJE GRANDE DE INFORMACIÓN
    rouletteCtx.fillStyle = '#ffd700';
    rouletteCtx.font = 'bold 28px Poppins';
    rouletteCtx.textAlign = 'center';
    rouletteCtx.textBaseline = 'middle';
    rouletteCtx.shadowColor = 'rgba(255, 215, 0, 0.5)';
    rouletteCtx.shadowBlur = 10;
    rouletteCtx.fillText('⏳ ESPERANDO JUGADORES', centerX, centerY - 180);
    rouletteCtx.shadowBlur = 0;
    
    // Info de participantes necesarios
    rouletteCtx.fillStyle = '#ffffff';
    rouletteCtx.font = 'bold 20px Poppins';
    rouletteCtx.fillText(`Mínimo: ${minParticipantsRequired} jugador${minParticipantsRequired === 1 ? '' : 'es'}`, centerX, centerY - 140);
    
    rouletteCtx.fillStyle = '#94a3b8';
    rouletteCtx.font = '18px Poppins';
    rouletteCtx.fillText(`Inscritos: ${participants.size} | Faltan: ${Math.max(0, minParticipantsRequired - participants.size)}`, centerX, centerY - 110);
    
    // Línea separadora
    rouletteCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    rouletteCtx.lineWidth = 2;
    rouletteCtx.beginPath();
    rouletteCtx.moveTo(centerX - 150, centerY - 85);
    rouletteCtx.lineTo(centerX + 150, centerY - 85);
    rouletteCtx.stroke();
    
    // Texto de regalos
    rouletteCtx.fillStyle = '#6366f1';
    rouletteCtx.font = 'bold 22px Poppins';
    rouletteCtx.fillText('🎁 Envía uno de estos regalos:', centerX, centerY - 55);
    
    // Tamaño de las imágenes MÁS GRANDES: 50% del radio cada una
    const imageSize = radius * 0.5;
    const spacing = 90; // Más espaciado entre los dos regalos
    
    // 1. HEART ME (Izquierda) - IMAGEN GRANDE (solo si está habilitado)
    if (heartMeEnabled) {
      const heartMeGift = giftCatalog.find(g => g.name === 'Heart Me' || g.id === '7934');
      const heartMeImg = new Image();
      heartMeImg.crossOrigin = 'anonymous';
      heartMeImg.src = heartMeGift ? heartMeGift.image : 'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/d56945782445b0b8c8658ed44f894c7b~tplv-obj.webp';
    
    heartMeImg.onload = () => {
      rouletteCtx.save();
      // Fondo circular detrás de la imagen
      rouletteCtx.fillStyle = 'rgba(255, 105, 180, 0.15)';
      rouletteCtx.beginPath();
      rouletteCtx.arc(centerX - spacing/2 - imageSize/2, centerY + 15, imageSize * 0.6, 0, Math.PI * 2);
      rouletteCtx.fill();
      
      rouletteCtx.shadowColor = 'rgba(255, 0, 255, 0.8)';
      rouletteCtx.shadowBlur = 25;
      rouletteCtx.drawImage(heartMeImg, centerX - imageSize - spacing/2, centerY - imageSize/2 + 15, imageSize, imageSize);
      rouletteCtx.restore();
      
      // Texto Heart Me
      rouletteCtx.save();
      rouletteCtx.fillStyle = '#ff69b4';
      rouletteCtx.font = 'bold 20px Poppins';
      rouletteCtx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      rouletteCtx.shadowBlur = 6;
      rouletteCtx.fillText('💜 Heart Me', centerX - spacing/2 - imageSize/2, centerY + imageSize/2 + 45);
      
      rouletteCtx.fillStyle = '#10b981';
      rouletteCtx.font = 'bold 16px Poppins';
      rouletteCtx.fillText('1 entrada', centerX - spacing/2 - imageSize/2, centerY + imageSize/2 + 70);
      rouletteCtx.restore();
    };
    }
    
    // 2. REGALO SELECCIONADO (Derecha o Centro si Heart Me deshabilitado) - IMAGEN GRANDE
    const giftXPos = heartMeEnabled ? (centerX + spacing/2) : centerX - imageSize/2;
    const giftXCenter = heartMeEnabled ? (centerX + spacing/2 + imageSize/2) : centerX;
    
    if (selectedValidGiftId && giftCatalog.length > 0) {
      const selectedGift = giftCatalog.find(g => String(g.id) === String(selectedValidGiftId));
      if (selectedGift) {
        const entries = selectedGift.cost || 1;
        
        const giftImg = new Image();
        giftImg.crossOrigin = 'anonymous';
        giftImg.src = selectedGift.image;
        
        giftImg.onload = () => {
          rouletteCtx.save();
          // Fondo circular detrás de la imagen
          rouletteCtx.fillStyle = 'rgba(99, 102, 241, 0.15)';
          rouletteCtx.beginPath();
          rouletteCtx.arc(giftXCenter, centerY + 15, imageSize * 0.6, 0, Math.PI * 2);
          rouletteCtx.fill();
          
          rouletteCtx.shadowColor = 'rgba(99, 102, 241, 0.8)';
          rouletteCtx.shadowBlur = 25;
          rouletteCtx.drawImage(giftImg, giftXPos, centerY - imageSize/2 + 15, imageSize, imageSize);
          rouletteCtx.restore();
          
          // Texto del regalo
          rouletteCtx.save();
          rouletteCtx.fillStyle = '#ffffff';
          rouletteCtx.font = 'bold 20px Poppins';
          rouletteCtx.shadowColor = 'rgba(0, 0, 0, 0.8)';
          rouletteCtx.shadowBlur = 6;
          const giftName = selectedGift.name.length > 12 ? selectedGift.name.substring(0, 10) + '...' : selectedGift.name;
          rouletteCtx.fillText(`🎁 ${giftName}`, giftXCenter, centerY + imageSize/2 + 45);
          
          rouletteCtx.fillStyle = '#10b981';
          rouletteCtx.font = 'bold 16px Poppins';
          rouletteCtx.fillText(`${entries} entrada${entries === 1 ? '' : 's'}`, giftXCenter, centerY + imageSize/2 + 70);
          rouletteCtx.restore();
        };
      }
    } else {
      // Si no hay regalo seleccionado, mostrar placeholder MÁS GRANDE
      rouletteCtx.save();
      // Fondo del placeholder
      rouletteCtx.fillStyle = 'rgba(74, 74, 106, 0.3)';
      rouletteCtx.beginPath();
      rouletteCtx.arc(giftXCenter, centerY + 15, imageSize * 0.6, 0, Math.PI * 2);
      rouletteCtx.fill();
      
      rouletteCtx.fillStyle = '#4a4a6a';
      rouletteCtx.fillRect(giftXPos, centerY - imageSize/2 + 15, imageSize, imageSize);
      rouletteCtx.strokeStyle = '#6b6b8a';
      rouletteCtx.lineWidth = 4;
      rouletteCtx.setLineDash([15, 8]);
      rouletteCtx.strokeRect(giftXPos, centerY - imageSize/2 + 15, imageSize, imageSize);
      rouletteCtx.setLineDash([]);
      
      // Icono de interrogación más grande
      rouletteCtx.fillStyle = '#94a3b8';
      rouletteCtx.font = 'bold 80px Poppins';
      rouletteCtx.fillText('?', giftXCenter, centerY + 25);
      
      // Texto
      rouletteCtx.fillStyle = '#94a3b8';
      rouletteCtx.font = 'italic 18px Poppins';
      rouletteCtx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      rouletteCtx.shadowBlur = 4;
      rouletteCtx.fillText('Configura un', giftXCenter, centerY + imageSize/2 + 45);
      rouletteCtx.fillText('regalo arriba ↖', giftXCenter, centerY + imageSize/2 + 70);
      rouletteCtx.restore();
    }
    
    return;
  }
  
  const individualEntries = createIndividualEntriesArray();
  
  let currentAngle = -Math.PI / 2;
  const anglePerEntry = (Math.PI * 2) / individualEntries.length;
  
  individualEntries.forEach((entry, index) => {
    rouletteCtx.fillStyle = entry.color;
    rouletteCtx.beginPath();
    rouletteCtx.moveTo(centerX, centerY);
    rouletteCtx.arc(centerX, centerY, radius, currentAngle, currentAngle + anglePerEntry);
    rouletteCtx.closePath();
    rouletteCtx.fill();
    
    rouletteCtx.strokeStyle = '#1a1a2e';
    rouletteCtx.lineWidth = 2;
    rouletteCtx.stroke();
    
    const shouldShowName = entry.entryIndex === 0 || entry.totalForUser <= 5 || individualEntries.length <= 20;
    
    if (shouldShowName && anglePerEntry > 0.1) {
      const textAngle = currentAngle + anglePerEntry / 2;
      const textRadius = radius * 0.65;
      const textX = centerX + Math.cos(textAngle) * textRadius;
      const textY = centerY + Math.sin(textAngle) * textRadius;
      
      rouletteCtx.fillStyle = '#ffffff';
      const fontSize = individualEntries.length > 50 ? 14 : individualEntries.length > 30 ? 18 : 22;
      rouletteCtx.font = `bold ${fontSize}px Poppins`;
      rouletteCtx.textAlign = 'center';
      rouletteCtx.textBaseline = 'middle';
      rouletteCtx.shadowColor = 'rgba(0, 0, 0, 1)';
      rouletteCtx.shadowBlur = 8;
      rouletteCtx.lineWidth = 3;
      rouletteCtx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
      
      const displayName = entry.displayName.length > 10 
        ? entry.displayName.substring(0, 8) + '...' 
        : entry.displayName;
      
      rouletteCtx.strokeText(displayName, textX, textY);
      rouletteCtx.fillText(displayName, textX, textY);
    }
    
    currentAngle += anglePerEntry;
  });
  
  rouletteCtx.strokeStyle = '#ffd700';
  rouletteCtx.lineWidth = 6;
  rouletteCtx.beginPath();
  rouletteCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  rouletteCtx.stroke();
  
  requestAnimationFrame(() => drawStaticGiftCorners());
};

const drawStaticGiftCorners = () => {
  if (!giftsOverlayCanvas || !giftsOverlayCtx) return;
  if (participants.size === 0) {
    giftsOverlayCtx.clearRect(0, 0, giftsOverlayCanvas.width, giftsOverlayCanvas.height);
    return;
  }
  
  giftsOverlayCtx.clearRect(0, 0, giftsOverlayCanvas.width, giftsOverlayCanvas.height);
  
  const width = giftsOverlayCanvas.width;
  const height = giftsOverlayCanvas.height;
  
  const cornerGiftSize = 120;
  const cornerPadding = 15;
  
  // Heart Me - Esquina superior izquierda
  const heartMeGift = giftCatalog.find(g => g.name === 'Heart Me' || g.id === '7934');
  if (heartMeGift) {
    const heartMeImg = new Image();
    heartMeImg.crossOrigin = 'anonymous';
    heartMeImg.src = heartMeGift.image;
    
    heartMeImg.onload = () => {
      giftsOverlayCtx.save();
      
      giftsOverlayCtx.fillStyle = 'rgba(26, 26, 46, 0.98)';
      giftsOverlayCtx.strokeStyle = '#ff69b4';
      giftsOverlayCtx.lineWidth = 5;
      giftsOverlayCtx.shadowColor = 'rgba(255, 105, 180, 0.8)';
      giftsOverlayCtx.shadowBlur = 25;
      giftsOverlayCtx.beginPath();
      giftsOverlayCtx.roundRect(cornerPadding, cornerPadding, cornerGiftSize + 25, cornerGiftSize + 55, 18);
      giftsOverlayCtx.fill();
      giftsOverlayCtx.stroke();
      giftsOverlayCtx.shadowBlur = 0;
      
      giftsOverlayCtx.shadowColor = 'rgba(255, 0, 255, 1)';
      giftsOverlayCtx.shadowBlur = 25;
      giftsOverlayCtx.drawImage(heartMeImg, cornerPadding + 12, cornerPadding + 12, cornerGiftSize, cornerGiftSize);
      giftsOverlayCtx.restore();
      
      giftsOverlayCtx.save();
      giftsOverlayCtx.fillStyle = '#ff69b4';
      giftsOverlayCtx.font = 'bold 18px Poppins';
      giftsOverlayCtx.textAlign = 'center';
      giftsOverlayCtx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      giftsOverlayCtx.shadowBlur = 6;
      giftsOverlayCtx.fillText('💜 +1', cornerPadding + 12 + cornerGiftSize/2, cornerPadding + cornerGiftSize + 38);
      giftsOverlayCtx.restore();
    };
  }
  
  // Regalo seleccionado - Esquina superior derecha
  if (selectedValidGiftId && giftCatalog.length > 0) {
    const selectedGift = giftCatalog.find(g => String(g.id) === String(selectedValidGiftId));
    if (selectedGift) {
      const entries = selectedGift.cost || 1;
      const giftImg = new Image();
      giftImg.crossOrigin = 'anonymous';
      giftImg.src = selectedGift.image;
      
      giftImg.onload = () => {
        giftsOverlayCtx.save();
        
        const rightX = width - cornerPadding - cornerGiftSize - 40;
        
        giftsOverlayCtx.fillStyle = 'rgba(26, 26, 46, 0.98)';
        giftsOverlayCtx.strokeStyle = '#6366f1';
        giftsOverlayCtx.lineWidth = 5;
        giftsOverlayCtx.shadowColor = 'rgba(99, 102, 241, 0.8)';
        giftsOverlayCtx.shadowBlur = 25;
        giftsOverlayCtx.beginPath();
        giftsOverlayCtx.roundRect(rightX, cornerPadding, cornerGiftSize + 25, cornerGiftSize + 55, 18);
        giftsOverlayCtx.fill();
        giftsOverlayCtx.stroke();
        giftsOverlayCtx.shadowBlur = 0;
        
        giftsOverlayCtx.shadowColor = 'rgba(99, 102, 241, 1)';
        giftsOverlayCtx.shadowBlur = 25;
        giftsOverlayCtx.drawImage(giftImg, rightX + 12, cornerPadding + 12, cornerGiftSize, cornerGiftSize);
        giftsOverlayCtx.restore();
        
        giftsOverlayCtx.save();
        giftsOverlayCtx.fillStyle = '#6366f1';
        giftsOverlayCtx.font = 'bold 18px Poppins';
        giftsOverlayCtx.textAlign = 'center';
        giftsOverlayCtx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        giftsOverlayCtx.shadowBlur = 6;
        giftsOverlayCtx.fillText(`🎁 +${entries}`, rightX + 12 + cornerGiftSize/2, cornerPadding + cornerGiftSize + 38);
        giftsOverlayCtx.restore();
      };
    }
  }
};

// ============================================
// ANIMACIÓN DE GIRO
// ============================================

const animateRouletteRotation = (targetAngle, duration, callback) => {
  if (!rouletteCanvas) {
    if (callback) callback();
    return;
  }
  
  const startTime = Date.now();
  
  const easeOutCubic = (t) => {
    return 1 - Math.pow(1 - t, 3);
  };
  
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
};

// ============================================
// MENSAJES Y NOTIFICACIONES
// ============================================

const setRouletteMessage = (message) => {
  if (rouletteMessageEl) {
    rouletteMessageEl.textContent = message;
    
    if (message) {
      rouletteMessageEl.classList.add('show');
    } else {
      rouletteMessageEl.classList.remove('show');
    }
  }
};

const openEliminationWindow = (eliminatedPlayer, isCompleteElimination = true) => {
  if (eliminationWindowEl && eliminationNameEl) {
    eliminationNameEl.textContent = `@${eliminatedPlayer.displayName}`;
    if (eliminationAvatarEl) {
      if (eliminatedPlayer.profileImage) {
        eliminationAvatarEl.style.backgroundImage = `url('${eliminatedPlayer.profileImage}')`;
        eliminationAvatarEl.classList.add('has-image');
        eliminationAvatarEl.textContent = '';
      } else {
        eliminationAvatarEl.style.backgroundImage = '';
        eliminationAvatarEl.classList.remove('has-image');
        const initial = eliminatedPlayer.displayName ? eliminatedPlayer.displayName.charAt(0).toUpperCase() : '?';
        eliminationAvatarEl.textContent = initial;
      }
    }
    
    const titleEl = document.querySelector('.elimination-title');
    const subtitleEl = document.querySelector('.elimination-subtitle');
    
    if (isCompleteElimination) {
      if (titleEl) titleEl.textContent = 'YOU LOSE!';
      if (subtitleEl) subtitleEl.textContent = 'Has sido eliminado';
      eliminationWindowEl.classList.remove('partial-elimination');
      eliminationWindowEl.classList.add('complete-elimination');
    } else {
      if (titleEl) titleEl.textContent = '-1 ENTRADA!';
      if (subtitleEl) subtitleEl.textContent = `Te quedan ${eliminatedPlayer.entries} entradas`;
      eliminationWindowEl.classList.remove('complete-elimination');
      eliminationWindowEl.classList.add('partial-elimination');
    }
    
    eliminationWindowEl.style.display = 'flex';
    setTimeout(() => {
      eliminationWindowEl.classList.add('show');
    }, 10);
    
    createEliminationParticles();
    
    setTimeout(() => {
      closeEliminationWindow();
    }, 3000);
  }
};

const closeEliminationWindow = () => {
  if (eliminationWindowEl) {
    eliminationWindowEl.classList.remove('show');
    setTimeout(() => {
      eliminationWindowEl.style.display = 'none';
    }, 300);
  }
};

const createEliminationParticles = () => {
  const particlesContainer = document.querySelector('.elimination-particles');
  if (!particlesContainer) return;
  
  particlesContainer.innerHTML = '';
  
  for (let i = 0; i < 50; i++) {
    const particle = document.createElement('div');
    particle.className = 'elimination-particle';
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.animationDelay = `${Math.random() * 2}s`;
    particle.style.background = '#ff4444';
    particlesContainer.appendChild(particle);
  }
};

const showQuickEliminationToast = ({ displayName, profileImage }) => {
  if (!quickEliminationToastEl) return;
  const label = displayName ? `@${displayName}` : 'Usuario';
  quickEliminationNameEl.textContent = label;

  if (profileImage) {
    quickEliminationAvatarEl.style.backgroundImage = `url('${profileImage}')`;
    quickEliminationAvatarEl.classList.add('has-image');
    quickEliminationAvatarEl.textContent = '';
  } else {
    quickEliminationAvatarEl.style.backgroundImage = '';
    quickEliminationAvatarEl.classList.remove('has-image');
    quickEliminationAvatarEl.textContent = label.charAt(1) ? label.charAt(1).toUpperCase() : '🎯';
  }

  quickEliminationToastEl.classList.add('show');

  setTimeout(() => {
    quickEliminationToastEl.classList.remove('show');
  }, 1600);
};

// ============================================
// COUNTDOWN SOLO PARTICIPANTE
// ============================================

const getSoloCountdownState = (elapsedMs) => {
  let accumulated = 0;
  for (let i = 0; i < SOLO_COUNTDOWN_DURATIONS.length; i++) {
    const step = SOLO_COUNTDOWN_DURATIONS[i];
    accumulated += step;
    if (elapsedMs < accumulated) {
      return {
        secondsRemaining: SOLO_COUNTDOWN_DURATIONS.length - i,
        timeToNext: accumulated - elapsedMs
      };
    }
  }
  return { secondsRemaining: 0, timeToNext: 0 };
};

const scheduleSoloCountdownTick = () => {
  if (!soloCountdownActive) return;

  const now = performance.now();
  const elapsed = now - soloCountdownStartedAt;
  const remainingMs = Math.max(0, SOLO_COUNTDOWN_TOTAL_MS - elapsed);

  const { secondsRemaining, timeToNext } = getSoloCountdownState(elapsed);
  
  if (secondsRemaining !== soloCountdownSeconds) {
    soloCountdownSeconds = secondsRemaining;
    updateCountdownDisplay();
  }

  if (secondsRemaining === 0) {
    setTimeout(() => {
      stopSoloCountdown();
    }, 500);
    return;
  }

  const delay = Math.max(50, Math.min(timeToNext, remainingMs));
  soloCountdownTimer = setTimeout(scheduleSoloCountdownTick, delay);
};

const startSoloCountdown = () => {
  soloCountdownActive = true;
  soloCountdownSeconds = SOLO_COUNTDOWN_TOTAL_STEPS;
  soloCountdownStartedAt = performance.now();
  
  if (soloCountdownEl) {
    soloCountdownEl.style.display = 'flex';
    soloCountdownEl.classList.add('show');
  }
  
  updateCountdownDisplay();
  scheduleSoloCountdownTick();
  
  console.log('⏰ Countdown iniciado: Sin oponente (30s)');
};

const stopSoloCountdown = () => {
  soloCountdownActive = false;
  soloCountdownStartedAt = null;
  
  if (soloCountdownTimer) {
    clearTimeout(soloCountdownTimer);
    soloCountdownTimer = null;
  }
  
  if (soloCountdownEl) {
    soloCountdownEl.classList.remove('show');
    setTimeout(() => {
      soloCountdownEl.style.display = 'none';
    }, 300);
  }
};

const updateCountdownDisplay = () => {
  if (countdownTimerEl) {
    countdownTimerEl.textContent = soloCountdownSeconds;
    
    countdownTimerEl.classList.remove('warning', 'critical');
    
    if (soloCountdownSeconds <= 5) {
      countdownTimerEl.classList.add('critical');
    } else if (soloCountdownSeconds <= 10) {
      countdownTimerEl.classList.add('warning');
    }
  }
};

// ============================================
// WEBSOCKET - COMUNICACIÓN CON SERVIDOR PRINCIPAL
// ============================================

const connectToMainServer = () => {
  try {
    socket = new WebSocket(WS_URL);
    
    socket.addEventListener('open', () => {
      console.log('✅ Overlay conectado al servidor principal');
    });
    
    socket.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        handleServerMessage(data);
      } catch (err) {
        console.error('❌ Error al procesar mensaje:', err);
      }
    });
    
    socket.addEventListener('close', () => {
      console.log('❌ Conexión perdida, reconectando en 3s...');
      setTimeout(connectToMainServer, 3000);
    });
    
    socket.addEventListener('error', (err) => {
      console.error('❌ Error de WebSocket:', err);
    });
    
  } catch (err) {
    console.error('❌ Error al conectar:', err);
    setTimeout(connectToMainServer, 3000);
  }
};

const handleServerMessage = (data) => {
  console.log('📨 Mensaje recibido:', data.type);
  
  switch (data.type) {
    case 'state':
      // Actualización completa del estado
      if (data.participants) {
        participants.clear();
        data.participants.forEach(p => {
          participants.set(p.uniqueId, {
            displayName: p.displayName,
            entries: p.entries,
            color: p.color || getRandomColor(),
            profileImage: p.profileImage || null
          });
        });
      }
      totalEntries = data.totalEntries || 0;
      selectedValidGiftId = data.selectedValidGiftId || null;
      heartMeEnabled = data.heartMeEnabled !== undefined ? data.heartMeEnabled : true;
      minParticipantsRequired = data.minParticipantsRequired || 2;
      drawRoulette();
      break;
      
    case 'spin':
      // Animación de giro
      isSpinning = true;
      setRouletteMessage(data.quickMode ? '⚡ Eliminación rápida...' : '🎰 Girando...');
      animateRouletteRotation(data.angle, data.duration, () => {
        setTimeout(() => {
          isSpinning = false;
          setRouletteMessage('');
        }, 500);
      });
      break;
      
    case 'eliminated':
      // Mostrar eliminación
      if (data.quickMode) {
        showQuickEliminationToast({
          displayName: data.displayName,
          profileImage: data.profileImage
        });
      } else {
        openEliminationWindow({
          displayName: data.displayName,
          profileImage: data.profileImage,
          entries: data.remainingEntries || 0
        }, data.completeElimination);
      }
      
      if (data.message) {
        setRouletteMessage(data.message);
        setTimeout(() => setRouletteMessage(''), 3000);
      }
      break;
      
    case 'soloCountdown':
      // Iniciar o detener countdown
      if (data.active) {
        startSoloCountdown();
      } else {
        stopSoloCountdown();
      }
      break;
      
    case 'message':
      // Mostrar mensaje
      setRouletteMessage(data.text);
      if (data.duration) {
        setTimeout(() => setRouletteMessage(''), data.duration);
      }
      break;
      
    case 'config':
      // Actualización de configuración (desde backend)
      selectedValidGiftId = data.selectedValidGiftId || null;
      heartMeEnabled = data.heartMeEnabled !== undefined ? data.heartMeEnabled : true;
      minParticipantsRequired = data.minParticipantsRequired || 2;
      drawRoulette();
      break;
      
    case 'giftCatalog':
      // Actualizar catálogo de regalos
      giftCatalog = data.gifts || [];
      drawRoulette();
      break;
  }
};

// ============================================
// INICIALIZACIÓN
// ============================================

const initializeOverlay = () => {
  rouletteCanvas = document.getElementById('rouletteCanvas');
  if (rouletteCanvas) {
    rouletteCtx = rouletteCanvas.getContext('2d');
  }
  
  giftsOverlayCanvas = document.getElementById('giftsOverlayCanvas');
  if (giftsOverlayCanvas) {
    giftsOverlayCtx = giftsOverlayCanvas.getContext('2d');
  }
  
  rouletteMessageEl = document.getElementById('rouletteMessage');
  soloCountdownEl = document.getElementById('soloCountdown');
  countdownTimerEl = document.getElementById('countdownTimer');
  eliminationWindowEl = document.getElementById('eliminationWindow');
  eliminationNameEl = document.getElementById('eliminationName');
  eliminationAvatarEl = document.getElementById('eliminationAvatar');
  quickEliminationToastEl = document.getElementById('quickEliminationToast');
  quickEliminationAvatarEl = document.getElementById('quickEliminationAvatar');
  quickEliminationNameEl = document.getElementById('quickEliminationName');
  
  drawRoulette();
  
  // Conectar al servidor principal
  connectToMainServer();
  
  console.log('✅ Overlay de ruleta inicializado');
};

window.addEventListener('DOMContentLoaded', initializeOverlay);
