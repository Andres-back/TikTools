/**
 * Módulo de Configuración
 * Gestiona las configuraciones del sistema de subastas
 * ✅ CON SINCRONIZACIÓN WEBSOCKET A OVERLAYS
 */

import {
  loadInitialTime,
  loadDelayTime,
  loadMinMessage,
  loadTieExtension,
  saveInitialTime,
  saveDelayTime,
  saveMinMessage,
  saveTieExtension
} from "./storage.js";

// ✅ NUEVO: Importar broadcast para sincronizar con overlays
import { broadcastConfig } from "./connection.js";

// Configuración por defecto
const DEFAULT_CONFIG = {
  INITIAL_TIME: 120,      // Tiempo inicial en segundos
  DELAY_TIME: 20,         // Tiempo de delay/snipe en segundos
  TIE_EXTENSION: 30,      // Extensión por empate en segundos
  MIN_MESSAGE: "MIN 10",  // Mensaje del contador
  MAX_TIES: 5,            // Máximo de extensiones por empate
  WARNING_TIME: 30,       // Segundos para mostrar advertencia
  DANGER_TIME: 10         // Segundos para modo peligro
};

// Estado actual de configuración
let currentConfig = {
  initialTime: DEFAULT_CONFIG.INITIAL_TIME,
  delayTime: DEFAULT_CONFIG.DELAY_TIME,
  tieExtension: DEFAULT_CONFIG.TIE_EXTENSION,
  minMessage: DEFAULT_CONFIG.MIN_MESSAGE,
  maxTies: DEFAULT_CONFIG.MAX_TIES
};

/**
 * Carga la configuración desde localStorage
 */
export function loadConfig() {
  currentConfig = {
    initialTime: loadInitialTime(DEFAULT_CONFIG.INITIAL_TIME),
    delayTime: loadDelayTime(DEFAULT_CONFIG.DELAY_TIME),
    tieExtension: loadTieExtension(DEFAULT_CONFIG.TIE_EXTENSION),
    minMessage: loadMinMessage(DEFAULT_CONFIG.MIN_MESSAGE),
    maxTies: DEFAULT_CONFIG.MAX_TIES
  };
  return currentConfig;
}

/**
 * Obtiene la configuración actual
 */
export function getConfig() {
  return { ...currentConfig };
}

/**
 * Actualiza el tiempo inicial Y SINCRONIZA CON OVERLAYS
 * @param {number} seconds - Segundos
 */
export function setInitialTime(seconds) {
  const value = Math.max(10, Math.min(600, Number(seconds) || DEFAULT_CONFIG.INITIAL_TIME));
  currentConfig.initialTime = value;
  saveInitialTime(value);

  // ✅ NUEVO: Sincronizar con overlays via WebSocket
  try {
    broadcastConfig(value, currentConfig.minMessage);
    console.log(`[Config] ✅ Tiempo inicial actualizado: ${value}s (sincronizado con overlays)`);
  } catch (err) {
    console.warn('[Config] Error sincronizando:', err);
  }

  return value;
}

/**
 * Actualiza el tiempo de delay Y SINCRONIZA CON OVERLAYS
 * @param {number} seconds - Segundos
 */
export function setDelayTime(seconds) {
  const value = Math.max(0, Math.min(120, Number(seconds) || DEFAULT_CONFIG.DELAY_TIME));
  currentConfig.delayTime = value;
  saveDelayTime(value);

  // ✅ NUEVO: Sincronizar con overlays
  try {
    broadcastConfig(currentConfig.initialTime, currentConfig.minMessage);
    console.log(`[Config] ✅ Tiempo de delay actualizado: ${value}s (sincronizado con overlays)`);
  } catch (err) {
    console.warn('[Config] Error sincronizando:', err);
  }

  return value;
}

/**
 * Actualiza el tiempo de extensión por empate Y SINCRONIZA CON OVERLAYS
 * @param {number} seconds - Segundos
 */
export function setTieExtension(seconds) {
  const value = Math.max(10, Math.min(120, Number(seconds) || DEFAULT_CONFIG.TIE_EXTENSION));
  currentConfig.tieExtension = value;
  saveTieExtension(value);

  // ✅ NUEVO: Sincronizar con overlays
  try {
    broadcastConfig(currentConfig.initialTime, currentConfig.minMessage);
    console.log(`[Config] ✅ Tiempo de extensión actualizado: ${value}s (sincronizado con overlays)`);
  } catch (err) {
    console.warn('[Config] Error sincronizando:', err);
  }

  return value;
}

/**
 * Actualiza el mensaje mínimo Y SINCRONIZA CON OVERLAYS
 * @param {string} message - Mensaje
 */
export function setMinMessage(message) {
  const value = (message || DEFAULT_CONFIG.MIN_MESSAGE).substring(0, 20);
  currentConfig.minMessage = value;
  saveMinMessage(value);

  // ✅ NUEVO: Sincronizar con overlays
  try {
    broadcastConfig(currentConfig.initialTime, value);
    console.log(`[Config] ✅ Mensaje actualizado: "${value}" (sincronizado con overlays)`);
  } catch (err) {
    console.warn('[Config] Error sincronizando:', err);
  }

  return value;
}

/**
 * Obtiene el tiempo inicial
 */
export function getInitialTime() {
  return currentConfig.initialTime;
}

/**
 * Obtiene el tiempo de delay
 */
export function getDelayTime() {
  return currentConfig.delayTime;
}

/**
 * Obtiene el tiempo de extensión por empate
 */
export function getTieExtension() {
  return currentConfig.tieExtension;
}

/**
 * Obtiene el mensaje mínimo
 */
export function getMinMessage() {
  return currentConfig.minMessage;
}

/**
 * Obtiene los tiempos de advertencia
 */
export function getWarningThresholds() {
  return {
    warning: DEFAULT_CONFIG.WARNING_TIME,
    danger: DEFAULT_CONFIG.DANGER_TIME
  };
}

export { DEFAULT_CONFIG };
