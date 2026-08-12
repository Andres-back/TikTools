'use strict';

/** Presets Minecraft listos para eventos TikTok mediante RCON. */
const GIFT_TIERS = Object.freeze({
  micro: Object.freeze(['Rose (1)', 'TikTok (1)', 'Heart (1)']),
  small: Object.freeze(['Finger Heart (5)', 'Heart (10)']),
  medium: Object.freeze(['Perfume (20)', 'Doughnut (30)']),
  large: Object.freeze(['Paper Crane (99)', 'Confetti (100)']),
  epic: Object.freeze(['Regalos de 101 a 499']),
  mega: Object.freeze(['Roses (500)', 'Regalos de 500 a 999']),
  galaxy: Object.freeze(['Galaxy (1000)', 'Cualquier regalo de 1000'])
});

const GAME_MODES = Object.freeze([
  {
    id: 'survival-chaos', name: 'Survival Chaos', icon: '🔥', accent: '#ff7a45', status: 'ready', plugin: null,
    description: 'Ayudas y sabotajes progresivos para una partida survival. Funciona con Minecraft vanilla.',
    objective: 'Sobrevive mientras el chat controla ventajas, visión, velocidad y clima.',
    rules: [
      rule('food', 'Comida del chat', 1, 4, 'give {{player}} minecraft:cooked_beef 2', 2500, GIFT_TIERS.micro, 'low'),
      rule('speed', 'Impulso veloz', 5, 10, 'effect give {{player}} minecraft:speed 8 1 true', 5000, GIFT_TIERS.small, 'low'),
      rule('slowness', 'Paso pesado', 11, 30, 'effect give {{player}} minecraft:slowness 10 2 true', 8000, GIFT_TIERS.medium, 'medium'),
      rule('blindness', 'Pantalla oscura', 31, 100, 'effect give {{player}} minecraft:blindness 7 1 true', 10000, GIFT_TIERS.large, 'medium'),
      rule('storm', 'Tormenta del chat', 101, 499, 'weather thunder', 20000, GIFT_TIERS.epic, 'medium'),
      rule('totem', 'Segunda oportunidad', 500, 999, 'give {{player}} minecraft:totem_of_undying 1', 30000, GIFT_TIERS.mega, 'low'),
      rule('galaxy', 'Galaxy: levitación extrema', 1000, 1000, 'effect give {{player}} minecraft:levitation 8 4 true', 60000, GIFT_TIERS.galaxy, 'high')
    ]
  },
  {
    id: 'speedrun-pressure', name: 'Speedrun bajo presión', icon: '⏱️', accent: '#00d4ff', status: 'ready', plugin: null,
    description: 'Un reto rápido con ayudas y castigos que mantienen la partida siempre en movimiento.',
    objective: 'Completa el objetivo antes de que los regalos caros conviertan el mundo en una pesadilla.',
    rules: [
      rule('haste', 'Pico acelerado', 1, 4, 'effect give {{player}} minecraft:haste 8 1 true', 3000, GIFT_TIERS.micro, 'low'),
      rule('jump', 'Salto sorpresa', 5, 10, 'effect give {{player}} minecraft:jump_boost 9 2 true', 6000, GIFT_TIERS.small, 'low'),
      rule('fatigue', 'Manos lentas', 11, 30, 'effect give {{player}} minecraft:mining_fatigue 12 1 true', 9000, GIFT_TIERS.medium, 'medium'),
      rule('darkness', 'Oscuridad total', 31, 100, 'effect give {{player}} minecraft:darkness 10 1 true', 12000, GIFT_TIERS.large, 'medium'),
      rule('night', 'Noche instantánea', 101, 499, 'time set night', 25000, GIFT_TIERS.epic, 'medium'),
      rule('apple', 'Manzana encantada', 500, 999, 'give {{player}} minecraft:enchanted_golden_apple 1', 45000, GIFT_TIERS.mega, 'low'),
      rule('galaxy', 'Galaxy: vuelo forzado', 1000, 1000, 'effect give {{player}} minecraft:levitation 10 5 true', 60000, GIFT_TIERS.galaxy, 'high')
    ]
  },
  {
    id: 'bedrock-siege', name: 'Bedrock Siege', icon: '🧨', accent: '#b790ff', status: 'plugin', plugin: 'S2E Bedrock Box',
    description: 'El streamer llena la caja y la audiencia destruye el progreso con TNT y eventos especiales.',
    objective: 'Llena la caja antes de que el chat rompa tu progreso.', setupCommand: 'bedrock create',
    rules: [
      rule('tnt', 'TNT con nombre', 1, 4, 'bedrock tnt 1 {{user.nickname}}', 1800, GIFT_TIERS.micro, 'medium'),
      rule('random-tnt', 'TNT aleatoria', 5, 10, 'bedrock randomtnt 1 {{user.nickname}}', 3500, GIFT_TIERS.small, 'medium'),
      rule('enderman', 'Endermen ladrones', 11, 30, 'bedrock enderman 2 {{user.nickname}}', 7000, GIFT_TIERS.medium, 'high'),
      rule('prison', 'Prisión de cristal', 31, 100, 'bedrock glass_prison 10', 14000, GIFT_TIERS.large, 'high'),
      rule('super-tnt', 'Super TNT', 101, 499, 'bedrock supertnt 2 2 {{user.nickname}}', 20000, GIFT_TIERS.epic, 'high'),
      rule('ring', 'Anillo de TNT', 500, 999, 'bedrock tntring', 30000, GIFT_TIERS.mega, 'high'),
      rule('galaxy', 'Galaxy: agujero negro', 1000, 1000, 'bedrock blackhole 10', 60000, GIFT_TIERS.galaxy, 'high')
    ]
  },
  {
    id: 'sandstorm', name: 'Sandstorm Arena', icon: '🌪️', accent: '#ffd166', status: 'plugin', plugin: 'S2E SandBox 2',
    description: 'Limpia la plataforma mientras el público agrega arena, filas completas o explosiones.',
    objective: 'Vacía la plataforma y resiste la tormenta de arena creada por la audiencia.', setupCommand: 'sandbox create',
    rules: [
      rule('sand', 'Bloque de arena', 1, 4, 'sandbox sand random 1', 1800, GIFT_TIERS.micro, 'low'),
      rule('sand-row', 'Fila de arena', 5, 10, 'sandbox sandrow random 1', 4000, GIFT_TIERS.small, 'medium'),
      rule('tnt', 'TNT de ayuda', 11, 30, 'sandbox tnt 1 {{user.nickname}}', 7000, GIFT_TIERS.medium, 'medium'),
      rule('lightning', 'Golpe de rayo', 31, 100, 'sandbox lightning 2', 14000, GIFT_TIERS.large, 'high'),
      rule('random-row', 'Tormenta multicolor', 101, 499, 'sandbox randomrow 2', 20000, GIFT_TIERS.epic, 'high'),
      rule('delete-row', 'Borrar tres filas', 500, 999, 'sandbox deleterow 3', 30000, GIFT_TIERS.mega, 'medium'),
      rule('galaxy', 'Galaxy: prisión aérea', 1000, 1000, 'sandbox prison 15', 60000, GIFT_TIERS.galaxy, 'high')
    ]
  }
]);

function rule(key, name, minCoins, maxCoins, commandTemplate, cooldownMs, gifts, risk) {
  return Object.freeze({ key, name, minCoins, maxCoins, commandTemplate, cooldownMs, gifts, risk });
}

function getGameMode(id) {
  return GAME_MODES.find((mode) => mode.id === String(id || '')) || null;
}

function presetPrefix(modeId) {
  return `[TikGame:${String(modeId || '')}]`;
}

function presetIdFromName(name) {
  return String(name || '').match(/^\[TikGame:([a-z0-9-]+)]\s/)?.[1] || null;
}

function renderGameModeRules(mode, playerName) {
  if (!mode || !Array.isArray(mode.rules)) return [];
  if (!/^[A-Za-z0-9_]{3,16}$/.test(String(playerName || ''))) {
    const error = new Error('El nombre de Minecraft debe tener entre 3 y 16 caracteres (letras, números o _)');
    error.code = 'MC_PLAYER_INVALID';
    throw error;
  }
  return mode.rules.map((item) => ({
    name: `${presetPrefix(mode.id)} ${item.key} · ${item.name}`,
    eventType: 'gift',
    conditions: { minCoins: item.minCoins, maxCoins: item.maxCoins },
    action: {
      commandTemplate: item.commandTemplate.replaceAll('{{player}}', playerName),
      presetId: mode.id,
      presetRuleKey: item.key,
      gifts: item.gifts,
      risk: item.risk
    },
    globalCooldownMs: item.cooldownMs,
    userCooldownMs: Math.max(item.cooldownMs * 2, 5000)
  }));
}

module.exports = { GAME_MODES, GIFT_TIERS, getGameMode, presetIdFromName, presetPrefix, renderGameModeRules };
