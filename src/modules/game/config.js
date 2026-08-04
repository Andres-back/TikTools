'use strict';

/**
 * Game (Kaetram) — lógica pura: defaults, clamping y firma TikToolStream.
 * Mantenida libre de dependencias de red/DB para poder testearla en aislamiento.
 */

const DEFAULT_GAME_CONFIG = {
  enabled: true, // ¿las donaciones disparan acciones en el juego?
  waveMin: 1, // monedas mínimas para spawn_wave
  eliteMin: 100, // monedas mínimas para spawn_elite
  bossMin: 500, // monedas mínimas para spawn_boss
  supportMode: false, // modo apoyo: los regalos curan en vez de atacar
  maxMobs: 3 // límite de enemigos simultáneos (refleja DONATION_MAX_MOBS del juego)
};

function toInt(value, fallback, min, max) {
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function toBool(value, fallback) {
  if (typeof value === 'boolean') return value;
  if (value === undefined || value === null) return fallback;
  return value !== false && value !== 'false' && value !== 0 && value !== '0';
}

/**
 * Normaliza y acota una configuración del juego. Garantiza que los umbrales
 * queden ordenados (waveMin < eliteMin < bossMin).
 * @param {object} input Configuración entrante (parcial).
 * @returns {object} Configuración completa y válida.
 */
function clampGameConfig(input = {}) {
  const waveMin = toInt(input.waveMin, DEFAULT_GAME_CONFIG.waveMin, 1, 99);
  const eliteMin = toInt(input.eliteMin, DEFAULT_GAME_CONFIG.eliteMin, 100, 499);
  const bossMin = toInt(input.bossMin, DEFAULT_GAME_CONFIG.bossMin, 500, 1000);

  return {
    enabled: toBool(input.enabled, DEFAULT_GAME_CONFIG.enabled),
    supportMode: toBool(input.supportMode, DEFAULT_GAME_CONFIG.supportMode),
    waveMin,
    eliteMin: Math.max(eliteMin, waveMin + 1),
    bossMin: Math.max(bossMin, eliteMin + 1),
    maxMobs: toInt(input.maxMobs, DEFAULT_GAME_CONFIG.maxMobs, 1, 10)
  };
}

/**
 * Extrae el ACCESS_TOKEN de un archivo .env (Kaetram).
 * Soporta: ACCESS_TOKEN=valor, ACCESS_TOKEN='valor', ACCESS_TOKEN="valor".
 * @param {string} envContent Contenido del archivo .env.
 * @returns {string|null} El token o null si no se encontró.
 */
function parseAccessToken(envContent) {
  if (typeof envContent !== 'string') return null;
  const match = envContent.match(/^\s*ACCESS_TOKEN\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s#]*))/m);
  if (!match) return null;
  const token = match[1] || match[2] || match[3] || '';
  return token || null;
}

/**
 * Firma un body al estilo TikToolStream (HMAC-SHA256 sobre
 * `timestamp.deliveryId.body` con la clave compartida).
 * @param {string} secret Clave compartida (ACCESS_TOKEN del juego).
 * @param {object} body Objeto a firmar (se serializa con JSON.stringify).
 * @returns {{timestamp: string, deliveryId: string, signature: string}}
 */
function signTikToolStreamBody(secret, body) {
  const crypto = require('node:crypto');
  const timestamp = String(Math.floor(Date.now() / 1000));
  const deliveryId = crypto.randomUUID();
  const rawBody = JSON.stringify(body);
  const signature = crypto
    .createHmac('sha256', String(secret))
    .update(`${timestamp}.${deliveryId}.${rawBody}`)
    .digest('hex');
  return { timestamp, deliveryId, signature, rawBody };
}

module.exports = {
  DEFAULT_GAME_CONFIG,
  clampGameConfig,
  parseAccessToken,
  signTikToolStreamBody
};
