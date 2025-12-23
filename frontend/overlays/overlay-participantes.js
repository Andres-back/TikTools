console.log('🎯 Overlay Participantes - Script cargado');

// ============================================
// VARIABLES GLOBALES
// ============================================

let participants = new Map();
let totalEntries = 0;
let socket = null;

// Elementos DOM
let participantsListEl;
let participantCountEl;
let totalEntriesEl;

const WS_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/live?overlay=true`;

// ============================================
// ACTUALIZACIÓN DE PARTICIPANTES
// ============================================

const updateParticipantsDisplay = () => {
  if (!participantsListEl) return;
  
  participantsListEl.innerHTML = '';
  
  if (participants.size === 0) {
    participantsListEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🎯</div>
        <p>Esperando participantes...</p>
        <small>Los participantes aparecerán aquí cuando se unan al juego</small>
      </div>
    `;
    return;
  }
  
  // Ordenar por entradas (descendente)
  const sorted = Array.from(participants.entries())
    .sort((a, b) => b[1].entries - a[1].entries);
  
  sorted.forEach(([uniqueId, data], index) => {
    const item = document.createElement('div');
    item.className = 'participant-item';
    item.style.animationDelay = `${index * 0.05}s`;
    
    const displayLabel = data.displayName || uniqueId;
    const initial = displayLabel ? displayLabel.charAt(0).toUpperCase() : '?';
    
    // Avatar con imagen o inicial
    const avatarHtml = data.profileImage
      ? `<div class="participant-avatar"><img src="${data.profileImage}" alt="@${displayLabel}" /></div>`
      : `<div class="participant-avatar fallback" style="border-color:${data.color}">${initial}</div>`;
    
    // Badges de ranking para top 3
    let rankingBadge = '';
    if (index === 0) {
      rankingBadge = '<div class="ranking-badge gold">🥇</div>';
    } else if (index === 1) {
      rankingBadge = '<div class="ranking-badge silver">🥈</div>';
    } else if (index === 2) {
      rankingBadge = '<div class="ranking-badge bronze">🥉</div>';
    }
    
    // Calcular porcentaje para barra de progreso
    const percentage = ((data.entries / totalEntries) * 100).toFixed(1);
    const progressWidth = Math.min(100, percentage);
    
    item.innerHTML = `
      ${rankingBadge}
      ${avatarHtml}
      <div class="participant-info">
        <div class="participant-name">@${displayLabel}</div>
        <div class="participant-entries">${data.entries} entrada${data.entries > 1 ? 's' : ''}</div>
      </div>
      <div class="participant-percentage">${percentage}%</div>
      <div class="entry-progress" style="width: ${progressWidth}%"></div>
    `;
    
    participantsListEl.appendChild(item);
  });
};

const updateStats = () => {
  if (participantCountEl) {
    participantCountEl.textContent = participants.size;
  }
  if (totalEntriesEl) {
    totalEntriesEl.textContent = totalEntries;
  }
};

// ============================================
// WEBSOCKET - COMUNICACIÓN CON SERVIDOR
// ============================================

const connectToMainServer = () => {
  try {
    socket = new WebSocket(WS_URL);
    
    socket.addEventListener('open', () => {
      console.log('✅ Overlay de participantes conectado al servidor');
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
            color: p.color,
            profileImage: p.profileImage || null
          });
        });
      }
      totalEntries = data.totalEntries || 0;
      updateParticipantsDisplay();
      updateStats();
      break;
      
    case 'participantUpdate':
      // Actualización individual de participante
      const { uniqueId, displayName, entries, color, profileImage } = data;
      
      if (entries > 0) {
        // Actualizar o agregar participante
        participants.set(uniqueId, {
          displayName,
          entries,
          color: color || '#8a78e4',
          profileImage: profileImage || null
        });
      } else {
        // Eliminar participante si entries = 0
        participants.delete(uniqueId);
      }
      
      // Recalcular total
      totalEntries = Array.from(participants.values()).reduce((sum, p) => sum + p.entries, 0);
      
      updateParticipantsDisplay();
      updateStats();
      
      // Animar el item actualizado
      setTimeout(() => {
        const items = participantsListEl.querySelectorAll('.participant-item');
        items.forEach((item, index) => {
          if (item.textContent.includes(`@${displayName}`)) {
            item.classList.add('updating');
            setTimeout(() => item.classList.remove('updating'), 500);
          }
        });
      }, 100);
      break;
  }
};

// ============================================
// INICIALIZACIÓN
// ============================================

const initializeOverlay = () => {
  participantsListEl = document.getElementById('participantsList');
  participantCountEl = document.getElementById('participantCount');
  totalEntriesEl = document.getElementById('totalEntries');
  
  updateParticipantsDisplay();
  updateStats();
  
  // Conectar al servidor
  connectToMainServer();
  
  console.log('✅ Overlay de participantes inicializado');
};

window.addEventListener('DOMContentLoaded', initializeOverlay);
