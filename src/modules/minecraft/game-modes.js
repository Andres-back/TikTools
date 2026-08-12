'use strict';

/**
 * Modos interactivos listos para convertir eventos de TikTok en comandos RCON.
 * Los comandos vanilla funcionan sin plugins. Los modos S2E-compatible solo se
 * habilitan cuando el usuario instala el plugin correspondiente en Paper.
 */
const GAME_MODES = Object.freeze([
  {
    id: 'survival-chaos',
    name: 'Survival Chaos',
    icon: '🔥',
    accent: '#ff7a45',
    status: 'ready',
    plugin: null,
    description: 'Ayudas y sabotajes progresivos para una partida survival. Funciona hoy mismo con Minecraft vanilla.',
    objective: 'Sobrevive mientras el chat controla ventajas, visión, velocidad y clima.',
    rules: [
      rule('Regalo común · comida', 1, 4, 'give {{player}} minecraft:cooked_beef 2', 2500),
      rule('Regalo pequeño · velocidad', 5, 19, 'effect give {{player}} minecraft:speed 8 1 true', 5000),
      rule('Regalo medio · lentitud', 20, 49, 'effect give {{player}} minecraft:slowness 10 2 true', 8000),
      rule('Regalo fuerte · ceguera', 50, 99, 'effect give {{player}} minecraft:blindness 7 1 true', 10000),
      rule('Regalo épico · tormenta', 100, 499, 'weather thunder', 20000),
      rule('Regalo legendario · manzana', 500, null, 'give {{player}} minecraft:enchanted_golden_apple 1', 30000)
    ]
  },
  {
    id: 'speedrun-pressure',
    name: 'Speedrun bajo presión',
    icon: '⏱️',
    accent: '#00d4ff',
    status: 'ready',
    plugin: null,
    description: 'Un modo rápido para retos con castigos claros y recompensas que mantienen la partida en movimiento.',
    objective: 'Completa tu objetivo antes de que los regalos caros conviertan el mundo en una pesadilla.',
    rules: [
      rule('Impulso del chat', 1, 9, 'effect give {{player}} minecraft:haste 8 1 true', 4000),
      rule('Salto sorpresa', 10, 29, 'effect give {{player}} minecraft:jump_boost 9 2 true', 7000),
      rule('Manos lentas', 30, 74, 'effect give {{player}} minecraft:mining_fatigue 12 1 true', 9000),
      rule('Pantalla oscura', 75, 199, 'effect give {{player}} minecraft:darkness 10 1 true', 12000),
      rule('Noche instantánea', 200, 499, 'time set night', 25000),
      rule('Segunda oportunidad', 500, null, 'give {{player}} minecraft:totem_of_undying 1', 45000)
    ]
  },
  {
    id: 'bedrock-siege',
    name: 'Bedrock Siege',
    icon: '🧨',
    accent: '#b790ff',
    status: 'plugin',
    plugin: 'S2E Bedrock Box',
    description: 'Preset compatible con Bedrock Box: el streamer llena la caja y la audiencia la destruye con TNT y eventos especiales.',
    objective: 'Llena la caja antes de que el chat rompa tu progreso.',
    setupCommand: 'bedrock create',
    rules: [
      rule('TNT con nombre', 1, 9, 'bedrock tnt 1 {{user.nickname}}', 1800),
      rule('TNT aleatoria', 10, 39, 'bedrock randomtnt 2 {{user.nickname}}', 3500),
      rule('Endermen ladrones', 40, 99, 'bedrock enderman 3 {{user.nickname}}', 7000),
      rule('Prisión de cristal', 100, 299, 'bedrock glass_prison 10', 14000),
      rule('Anillo de TNT', 300, 999, 'bedrock tntring', 25000),
      rule('Agujero negro', 1000, null, 'bedrock blackhole 10', 60000)
    ]
  },
  {
    id: 'sandstorm',
    name: 'Sandstorm Arena',
    icon: '🌪️',
    accent: '#ffd166',
    status: 'plugin',
    plugin: 'S2E SandBox 2',
    description: 'Preset compatible con SandBox 2: limpia la plataforma mientras el público agrega arena o provoca explosiones.',
    objective: 'Vacía la plataforma y aguanta la tormenta de arena creada por la audiencia.',
    setupCommand: 'sandbox create',
    rules: [
      rule('Más arena', 1, 9, 'sandbox sand random 1', 1800),
      rule('Lluvia de arena', 10, 39, 'sandbox sandrow random 1', 4000),
      rule('TNT de ayuda', 40, 99, 'sandbox tnt 1 {{user.nickname}}', 7000),
      rule('Golpe de rayo', 100, 299, 'sandbox lightning 2', 14000),
      rule('Borrar filas', 300, null, 'sandbox deleterow 3', 30000)
    ]
  }
]);

function rule(name, minCoins, maxCoins, commandTemplate, cooldownMs) {
  return Object.freeze({ name, minCoins, maxCoins, commandTemplate, cooldownMs });
}

function getGameMode(id) {
  return GAME_MODES.find((mode) => mode.id === String(id || '')) || null;
}

function renderGameModeRules(mode, playerName) {
  if (!mode || !Array.isArray(mode.rules)) return [];
  if (!/^[A-Za-z0-9_]{3,16}$/.test(String(playerName || ''))) {
    const error = new Error('El nombre de Minecraft debe tener entre 3 y 16 caracteres (letras, números o _)');
    error.code = 'MC_PLAYER_INVALID';
    throw error;
  }
  return mode.rules.map((item) => ({
    name: `[TikGame:${mode.id}] ${item.name}`,
    eventType: 'gift',
    conditions: {
      minCoins: item.minCoins,
      ...(item.maxCoins == null ? {} : { maxCoins: item.maxCoins })
    },
    action: { commandTemplate: item.commandTemplate.replaceAll('{{player}}', playerName) },
    globalCooldownMs: item.cooldownMs,
    userCooldownMs: Math.max(item.cooldownMs * 2, 5000)
  }));
}

module.exports = { GAME_MODES, getGameMode, renderGameModeRules };
