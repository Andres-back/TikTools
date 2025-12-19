/**
 * Módulo de Leaderboard - Sistema de Subastas
 * Gestiona el ranking de donadores con animaciones premium
 */

import { 
  initAnimations, 
  analyzePositionChanges, 
  resetAnimations,
  triggerWinnerCelebration,
  triggerTop1FireEffect
} from './animations.js';

import { broadcastLeaderboard } from './connection.js';

// Mapa de donadores: uniqueId -> { total, label, uniqueId, profilePictureUrl }
const donors = new Map();

// Estado del leaderboard
let leaderboardFrozen = false;
let previousLeader = null;

// Referencias a elementos DOM (se inicializan después)
let donorListEl = null;
let winnerDisplayEl = null;
let leaderboardFooterEl = null;
let animationOverlayEl = null;

/**
 * Inicializa el módulo con referencias DOM
 * @param {Object} elements - { donorList, winnerDisplay, leaderboardFooter, animationOverlay }
 */
export function initLeaderboard(elements) {
  donorListEl = elements.donorList;
  winnerDisplayEl = elements.winnerDisplay;
  leaderboardFooterEl = elements.leaderboardFooter;
  animationOverlayEl = elements.animationOverlay;
  
  // Inicializar módulo de animaciones
  initAnimations(animationOverlayEl);
}

/**
 * Formatea la etiqueta del donador
 * @param {string} label - Nickname o label
 * @param {string} uniqueId - ID único
 * @returns {string}
 */
function formatDonorLabel(label, uniqueId) {
  if (!label) return uniqueId;
  const trimmedLabel = label.trim();
  const trimmedId = uniqueId?.trim() || "";
  if (trimmedLabel.toLowerCase() === trimmedId.toLowerCase()) {
    return trimmedId;
  }
  return trimmedLabel;
}

/**
 * Obtiene los donadores ordenados por total
 * @returns {Array}
 */
export function getSortedDonors() {
  return Array.from(donors.values()).sort((a, b) => b.total - a.total);
}

/**
 * Verifica si hay empate en el top
 * @returns {{ isTie: boolean, tiedUsers: Array, topCoins: number }}
 */
export function checkForTie() {
  const sorted = getSortedDonors();
  
  if (sorted.length < 2) {
    return { isTie: false, tiedUsers: [], topCoins: sorted[0]?.total || 0 };
  }
  
  const topCoins = sorted[0].total;
  const tiedUsers = sorted.filter(d => d.total === topCoins);
  
  return {
    isTie: tiedUsers.length >= 2,
    tiedUsers,
    topCoins
  };
}

/**
 * Registra monedas para un usuario
 * @param {string} uniqueId - ID único del usuario
 * @param {string} label - Etiqueta/nickname
 * @param {number} coins - Cantidad de monedas
 * @param {string} profilePictureUrl - URL de la imagen de perfil (opcional)
 * @returns {boolean} - true si se registró, false si está congelado
 */
export function recordDonorCoins(uniqueId, label, coins, profilePictureUrl = null) {
  if (leaderboardFrozen) {
    return false;
  }
  
  if (!uniqueId || coins <= 0) {
    return false;
  }
  
  const normalizedId = uniqueId.toLowerCase();
  const existing = donors.get(normalizedId);
  
  if (existing) {
    existing.total += coins;
    existing.label = label || existing.label;
    // Actualizar imagen si se proporciona una nueva
    if (profilePictureUrl) {
      existing.profilePictureUrl = profilePictureUrl;
    }
    } else {
    donors.set(normalizedId, {
      uniqueId,
      label: label || uniqueId,
      total: coins,
      profilePictureUrl: profilePictureUrl || null
    });
    }
  
  renderLeaderboard(normalizedId);
  return true;
}

/**
 * Renderiza el leaderboard con animaciones espectaculares
 * @param {string} updatedUserId - ID del usuario que se actualizó (para animación)
 */
export function renderLeaderboard(updatedUserId = null) {
  if (!donorListEl) return;
  
  const sorted = getSortedDonors();
  const top3 = sorted.slice(0, 3);
  
  if (top3.length === 0) {
    donorListEl.innerHTML = `
      <li class="leaderboard-empty">
        <div class="leaderboard-empty-icon">💎</div>
        <p>Esperando donaciones...</p>
      </li>
    `;
    return;
  }
  
  // Analizar cambios de posición y disparar animaciones
  const animationResult = analyzePositionChanges(sorted, updatedUserId);
  
  // Verificar si hay nuevo líder (usando el sistema de animaciones)
  const currentLeader = top3[0]?.uniqueId?.toLowerCase();
  const isNewLeader = animationResult.newLeader;
  
  // Verificar si el top 1 está sumando puntos (disparar efecto de fuego)
  const isTop1Update = updatedUserId && top3[0] && 
    top3[0].uniqueId.toLowerCase() === updatedUserId.toLowerCase();
  
  if (isTop1Update && !isNewLeader) {
    // El líder actual suma puntos - disparar efecto de fuego
    setTimeout(() => triggerTop1FireEffect(), 100);
  }
  
  previousLeader = currentLeader;
  
  const rankIcons = ["👑", "🥈", "🥉"];
  const rankClasses = ["first", "second", "third"];
  
  donorListEl.innerHTML = top3.map((entry, i) => {
    const name = formatDonorLabel(entry.label, entry.uniqueId);
    const isUpdated = updatedUserId && entry.uniqueId.toLowerCase() === updatedUserId;
    const isLeaderUpdate = i === 0 && isNewLeader;
    
    let extraClasses = rankClasses[i] || "";
    if (isUpdated) extraClasses += " coin-update";
    if (isLeaderUpdate) extraClasses += " new-leader epic-entrance";
    
    // Indicador de racha si está subiendo
    const streakIndicator = animationResult.streakAlert && 
      animationResult.streakAlert.name === name && 
      animationResult.streakAlert.count >= 2 
        ? `<span class="streak-badge">🔥 ${animationResult.streakAlert.count}x</span>` 
        : '';
    
    // Generar avatar - usar imagen de perfil si existe, sino usar iniciales
    const avatarHtml = entry.profilePictureUrl 
      ? `<img src="${entry.profilePictureUrl}" alt="${name}" class="leaderboard-avatar" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="leaderboard-avatar-fallback" style="display:none">${name.charAt(0).toUpperCase()}</span>`
      : `<span class="leaderboard-avatar-fallback">${name.charAt(0).toUpperCase()}</span>`;
    
    // Corona animada para el top 1
    const crownDecoration = i === 0 ? '<div class="floating-crown">👑</div>' : '';
    
    return `
      <li class="leaderboard-item ${extraClasses}" data-user-id="${entry.uniqueId}">
        ${crownDecoration}
        <div class="leaderboard-rank">
          <span>${rankIcons[i] || (i + 1)}</span>
        </div>
        <div class="leaderboard-avatar-container">
          ${avatarHtml}
        </div>
        <div class="leaderboard-user">
          <span class="leaderboard-name">${name}${streakIndicator}</span>
          <span class="leaderboard-id">@${entry.uniqueId}</span>
        </div>
        <div class="leaderboard-coins">
          <span class="coin-icon">💎</span>
          <span>${entry.total.toLocaleString()}</span>
        </div>
      </li>
    `;
  }).join("");
  
  // Broadcast del leaderboard actualizado a overlays
  broadcastLeaderboard(sorted.map(entry => ({
    uniqueId: entry.uniqueId,
    label: entry.label,
    totalCoins: entry.total,
    profilePictureUrl: entry.profilePictureUrl
  })));
}

/**
 * Congela el leaderboard y muestra el ganador de la subasta
 */
export function freezeLeaderboard() {
  leaderboardFrozen = true;
  
  const sorted = getSortedDonors();
  const winner = sorted[0];
  
  if (winnerDisplayEl) {
    if (winner) {
      const name = formatDonorLabel(winner.label, winner.uniqueId);
      winnerDisplayEl.textContent = `${name} - ${winner.total.toLocaleString()} 💎`;
      
      // Disparar celebración de ganador
      triggerWinnerCelebration({
        uniqueId: winner.uniqueId,
        label: name,
        coins: winner.total
      });
    } else {
      winnerDisplayEl.textContent = "Sin ganador";
    }
  }
  
  if (leaderboardFooterEl) {
    leaderboardFooterEl.classList.add("show-winner");
  }
  
  return winner;
}

/**
 * Descongela el leaderboard
 */
export function unfreezeLeaderboard() {
  leaderboardFrozen = false;
  }

/**
 * Reinicia el leaderboard
 */
export function resetLeaderboard() {
  donors.clear();
  leaderboardFrozen = false;
  previousLeader = null;
  
  // Reiniciar animaciones
  resetAnimations();
  
  if (donorListEl) {
    donorListEl.innerHTML = `
      <li class="leaderboard-empty">
        <div class="leaderboard-empty-icon">💎</div>
        <p>Esperando donaciones...</p>
      </li>
    `;
  }
  
  if (winnerDisplayEl) {
    winnerDisplayEl.textContent = "—";
  }
  
  if (leaderboardFooterEl) {
    leaderboardFooterEl.classList.remove("show-winner");
  }
  
  // Broadcast del leaderboard vacío a los overlays
  broadcastLeaderboard([]);
  
  }

/**
 * Verifica si el leaderboard está congelado
 * @returns {boolean}
 */
export function isLeaderboardFrozen() {
  return leaderboardFrozen;
}

/**
 * Obtiene el ganador actual
 * @returns {Object|null}
 */
export function getWinner() {
  if (!leaderboardFrozen) return null;
  const sorted = getSortedDonors();
  const winner = sorted[0];
  if (!winner) return null;
  return {
    uniqueId: winner.uniqueId,
    label: formatDonorLabel(winner.label, winner.uniqueId),
    coins: winner.total
  };
}

/**
 * Obtiene el top 3 del leaderboard
 * @returns {Array}
 */
export function getTop3() {
  return getSortedDonors().slice(0, 3).map(entry => ({
    uniqueId: entry.uniqueId,
    label: formatDonorLabel(entry.label, entry.uniqueId),
    coins: entry.total
  }));
}

/**
 * Obtiene estadísticas del leaderboard
 */
export function getLeaderboardStats() {
  const sorted = getSortedDonors();
  const totalCoins = sorted.reduce((sum, d) => sum + d.total, 0);
  
  return {
    totalDonors: donors.size,
    totalCoins,
    frozen: leaderboardFrozen,
    topDonor: sorted[0] || null
  };
}
