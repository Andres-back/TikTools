/**
 * Módulo de Storage
 * Maneja la persistencia de datos en localStorage
 */

const STORAGE_KEYS = {
  USER: "tiktok_live_user",
  INITIAL_TIME: "auction_initial_time",
  DELAY_TIME: "auction_delay_time",
  MIN_MESSAGE: "auction_min_message",
  TIE_EXTENSION: "auction_tie_extension"
};

/**
 * Guarda un valor en localStorage
 * @param {string} key - Clave del storage
 * @param {any} value - Valor a guardar
 */
export function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    }
}

/**
 * Obtiene un valor de localStorage
 * @param {string} key - Clave del storage
 * @param {any} defaultValue - Valor por defecto si no existe
 * @returns {any}
 */
export function loadFromStorage(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

/**
 * Elimina un valor de localStorage
 * @param {string} key - Clave a eliminar
 */
export function removeFromStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    }
}

/**
 * Limpia todo el storage de la aplicación
 */
export function clearAppStorage() {
  Object.values(STORAGE_KEYS).forEach(key => {
    removeFromStorage(key);
  });
}

// Usuario de TikTok
export function saveUser(username) {
  saveToStorage(STORAGE_KEYS.USER, username);
}

export function loadUser() {
  return loadFromStorage(STORAGE_KEYS.USER, "");
}

// Tiempos de subasta
export function saveInitialTime(seconds) {
  saveToStorage(STORAGE_KEYS.INITIAL_TIME, seconds);
}

export function loadInitialTime(defaultValue = 120) {
  return loadFromStorage(STORAGE_KEYS.INITIAL_TIME, defaultValue);
}

export function saveDelayTime(seconds) {
  saveToStorage(STORAGE_KEYS.DELAY_TIME, seconds);
}

export function loadDelayTime(defaultValue = 20) {
  return loadFromStorage(STORAGE_KEYS.DELAY_TIME, defaultValue);
}

// Mensaje mínimo
export function saveMinMessage(message) {
  saveToStorage(STORAGE_KEYS.MIN_MESSAGE, message);
}

export function loadMinMessage(defaultValue = "MIN 10") {
  return loadFromStorage(STORAGE_KEYS.MIN_MESSAGE, defaultValue);
}

// Tiempo de extensión por empate
export function saveTieExtension(seconds) {
  saveToStorage(STORAGE_KEYS.TIE_EXTENSION, seconds);
}

export function loadTieExtension(defaultValue = 30) {
  return loadFromStorage(STORAGE_KEYS.TIE_EXTENSION, defaultValue);
}

// Session ID de TikTok (credenciales opcionales)
export function saveSessionId(sessionId) {
  saveToStorage("tiktok_session_id", sessionId);
}

export function loadSessionId() {
  return loadFromStorage("tiktok_session_id", "");
}

export function saveTtTargetIdc(idc) {
  saveToStorage("tiktok_tt_target_idc", idc);
}

export function loadTtTargetIdc() {
  return loadFromStorage("tiktok_tt_target_idc", "");
}

export { STORAGE_KEYS };
