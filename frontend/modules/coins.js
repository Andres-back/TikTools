/**
 * Módulo de Monedas
 * Maneja el conteo, deduplicación y procesamiento de monedas/regalos
 */

// Sistema de deduplicación - evita contar el mismo regalo dos veces
const recentGiftIds = new Set();
const DEDUP_WINDOW_MS = 5000; // 5 segundos

// Callbacks para notificar cambios
let onCoinsRecorded = null;

/**
 * Registra un callback para cuando se registran monedas
 * @param {Function} callback - Función a llamar con (uniqueId, label, coins, profilePictureUrl)
 */
export function setOnCoinsRecorded(callback) {
  onCoinsRecorded = callback;
}

/**
 * Genera una clave única para deduplicación
 * @param {Object} gift - Objeto del regalo
 * @returns {string}
 */
function generateGiftKey(gift) {
  const uniqueId = gift.user?.uniqueId || gift.uniqueId || gift.userId || "unknown";
  const giftId = gift.giftId || "0";
  const repeatEnd = gift.repeatEnd ? 1 : 0;
  const repeatCount = gift.repeatCount || 1;

  // Usar groupId para agrupar eventos del mismo combo
  // logId es único por evento individual
  const groupId = gift.groupId || '';
  const logId = gift.logId || gift.orderId || '';

  // La clave incluye:
  // - uniqueId: usuario
  // - giftId: tipo de regalo
  // - repeatEnd: si es evento final o no
  // - repeatCount: cantidad actual
  // - groupId: agrupa eventos del mismo combo
  // Si no hay groupId, usar logId o timestamp
  const eventId = groupId || logId || Date.now();

  return `${uniqueId}_${giftId}_${repeatEnd}_${repeatCount}_${eventId}`;
}

/**
 * Verifica si un regalo ya fue procesado (deduplicación)
 * @param {string} key - Clave del regalo
 * @returns {boolean}
 */
function isDuplicate(key) {
  if (recentGiftIds.has(key)) {
    return true;
  }
  recentGiftIds.add(key);
  setTimeout(() => recentGiftIds.delete(key), DEDUP_WINDOW_MS);
  return false;
}

/**
 * Infiere las monedas de un regalo basándose en la estructura del evento
 * 
 * IMPORTANTE: TikTok envía DOS eventos por cada regalo:
 * 1. repeatEnd=0 (inicio del streak o regalo en proceso) - IGNORAR
 * 2. repeatEnd=1 (fin del streak o regalo completado) - CONTAR
 * 
 * Solo contamos cuando repeatEnd=1 para evitar duplicación
 * 
 * @param {Object} gift - Objeto del regalo de TikTok
 * @returns {number} - Cantidad de monedas (0 si debe ignorarse)
 */
export function inferGiftCoins(gift) {
  // Extraer valores del regalo y asegurar que sean números
  const repeatEnd = gift.repeatEnd ? 1 : 0;
  const repeatCount = parseInt(gift.repeatCount, 10) || 1;

  // Obtener diamantes del regalo - buscar en múltiples ubicaciones
  // IMPORTANTE: Convertir a número porque a veces llega como string
  let diamondCount = parseInt(
    gift.giftDetails?.diamondCount
    ?? gift.extendedGiftInfo?.diamond_count
    ?? gift.extendedGiftInfo?.diamondCount
    ?? gift.diamondCount
    ?? 0,
    10
  ) || 0;

  // DEBUG: Log detallado para diagnóstico
  const giftName = gift.giftDetails?.giftName || gift.giftName || gift.extendedGiftInfo?.name || 'Desconocido';
  const userId = gift.user?.uniqueId || gift.uniqueId;

  // LÓGICA DE CONTEO:
  // - Regalos normales (< 99 diamantes): Envían repeatEnd=0 y luego repeatEnd=1
  //   → Solo contar cuando repeatEnd=1
  // - Regalos premium (>= 99 diamantes): Solo envían repeatEnd=0 (instantáneos)
  //   → Contar con repeatEnd=0
  //
  // Ejemplos:
  // - Rose (1💎), Doughnut (30💎): envían ambos eventos → contar solo repeatEnd=1
  // - Hat and Mustache (99💎), Heart Signal (100💎): solo repeatEnd=0 → contar

  if (!repeatEnd) {
    // Solo contar regalos instantáneos de alto valor (>= 99 diamantes)
    const isInstantPremiumGift = diamondCount >= 99 && repeatCount === 1;

    if (isInstantPremiumGift) {
      console.log(`[Coins] Regalo premium instantáneo: ${giftName} (${diamondCount}💎) de @${userId}`);
    } else {
      // Regalos normales con repeatEnd=0 → esperar el repeatEnd=1
      console.log(`[Coins] Ignorando repeatEnd=0 para: ${giftName} de @${userId}`);
      return 0;
    }
  } else {
    console.log(`[Coins] Procesando regalo final: ${giftName} x${repeatCount} (${diamondCount}💎) de @${userId}`);
  }

  // Calcular monedas totales
  const totalCoins = diamondCount * repeatCount;

  return totalCoins;
}

/**
 * Procesa un evento de regalo completo
 * @param {Object} event - Evento completo del regalo
 * @returns {{ uniqueId: string, label: string, coins: number, profilePictureUrl: string } | null}
 */
export function processGiftEvent(event) {
  const gift = event.gift || event;

  // Generar clave única para deduplicación
  const giftKey = generateGiftKey(gift);

  // Verificar si ya procesamos este regalo
  if (isDuplicate(giftKey)) {
    return null;
  }

  // Calcular monedas
  const coins = inferGiftCoins(gift);

  // Si no hay monedas, no hay nada que registrar
  if (coins <= 0) {
    return null;
  }

  // Extraer información del usuario
  // TikTok envía datos del usuario en diferentes ubicaciones
  const user = gift.user || gift;
  const uniqueId = user.uniqueId || gift.uniqueId || gift.userId || "anon";
  const nickname = user.nickname || gift.nickname || uniqueId;

  // Extraer imagen de perfil - TikTok usa estructura Image { url: string[] }
  // avatarThumb.url[0] contiene la URL de la imagen
  let profilePictureUrl = null;

  // Prioridad 1: avatarThumb del usuario (más común en v2)
  if (user.avatarThumb?.url?.[0]) {
    profilePictureUrl = user.avatarThumb.url[0];
  }
  // Prioridad 2: avatar del usuario
  else if (user.avatar?.url?.[0]) {
    profilePictureUrl = user.avatar.url[0];
  }
  // Prioridad 3: profilePicture del usuario
  else if (user.profilePicture?.url?.[0]) {
    profilePictureUrl = user.profilePicture.url[0];
  }
  // Prioridad 4: AvatarThumb con mayúscula (legacy)
  else if (user.AvatarThumb?.url?.[0]) {
    profilePictureUrl = user.AvatarThumb.url[0];
  }
  // Prioridad 5: String directo (fallback)
  else if (typeof user.profilePictureUrl === 'string') {
    profilePictureUrl = user.profilePictureUrl;
  }
  else if (typeof gift.profilePictureUrl === 'string') {
    profilePictureUrl = gift.profilePictureUrl;
  }

  console.log(`[Coins] Imagen de perfil: ${profilePictureUrl ? profilePictureUrl.substring(0, 50) + '...' : 'No disponible'}`);
  if (!profilePictureUrl && user) {
    console.log('[Coins] DEBUG user object:', Object.keys(user));
  }

  // Notificar si hay callback registrado
  if (onCoinsRecorded) {
    onCoinsRecorded(uniqueId, nickname, coins, profilePictureUrl);
  }

  return { uniqueId, label: nickname, coins, profilePictureUrl };
}

/**
 * Limpia el sistema de deduplicación
 */
export function clearDeduplication() {
  recentGiftIds.clear();
}

/**
 * Obtiene estadísticas del sistema de monedas
 */
export function getCoinsStats() {
  return {
    pendingDedup: recentGiftIds.size
  };
}
