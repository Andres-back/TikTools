'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  GAME_MODES,
  GIFT_TIERS,
  getGameMode,
  renderGameModeRules
} = require('../src/modules/minecraft/game-modes');
const { looksLikeCommandError, publicMode, rootCommand } = require('../src/modules/minecraft/routes');

test('catalogo Minecraft separa cuatro presets completos', () => {
  assert.deepEqual(GAME_MODES.map((mode) => mode.id), [
    'survival-chaos',
    'speedrun-pressure',
    'bedrock-siege',
    'sandstorm'
  ]);
  assert.ok(GAME_MODES.some((mode) => mode.status === 'ready' && !mode.plugin));
  assert.ok(GAME_MODES.some((mode) => mode.id === 'bedrock-siege' && mode.plugin));
  assert.ok(GAME_MODES.every((mode) => mode.rules.length === 7));
});

test('catalogo calibra regalos comunes hasta Galaxy de 1000 monedas', () => {
  assert.ok(GIFT_TIERS.micro.includes('Rose (1)'));
  assert.ok(GIFT_TIERS.micro.includes('TikTok (1)'));
  assert.ok(GIFT_TIERS.medium.includes('Doughnut (30)'));
  assert.ok(GIFT_TIERS.large.includes('Confetti (100)'));
  assert.ok(GIFT_TIERS.large.includes('Paper Crane (99)'));
  assert.ok(GIFT_TIERS.galaxy.includes('Galaxy (1000)'));
  assert.equal(GAME_MODES.every((mode) => mode.rules.at(-1).maxCoins === 1000), true);
});

test('renderGameModeRules reemplaza solo el jugador y conserva variables TikTok', () => {
  const mode = getGameMode('bedrock-siege');
  const rules = renderGameModeRules(mode, 'Streamer_21');

  assert.equal(rules.length, mode.rules.length);
  assert.ok(rules.every((rule) => rule.name.startsWith('[TikGame:bedrock-siege]')));
  assert.match(rules[0].action.commandTemplate, /\{\{user\.nickname\}\}/);
  assert.doesNotMatch(rules[0].action.commandTemplate, /\{\{player\}\}/);
  assert.equal(rules[0].eventType, 'gift');
  assert.equal(rules[0].action.presetId, 'bedrock-siege');
  assert.equal(rules[0].action.presetRuleKey, 'tnt');
});

test('cada preset cubre 1 a 1000 monedas sin huecos ni solapamientos', () => {
  for (const mode of GAME_MODES) {
    const rules = renderGameModeRules(mode, 'Steve');
    assert.equal(rules[0].conditions.minCoins, 1);
    for (let index = 1; index < rules.length; index += 1) {
      assert.equal(rules[index - 1].conditions.maxCoins + 1, rules[index].conditions.minCoins);
    }
    assert.equal(rules.at(-1).conditions.maxCoins, 1000);
  }
});

test('estado publico identifica preset instalado y equipado', () => {
  const mode = getGameMode('survival-chaos');
  const rows = mode.rules.map((rule, index) => ({
    id: index + 1,
    name: `[TikGame:${mode.id}] ${rule.key} · ${rule.name}`,
    enabled: 1,
    connection_id: 4,
    action_json: JSON.stringify({ presetRuleKey: rule.key, commandTemplate: rule.commandTemplate })
  }));
  const result = publicMode(mode, rows);
  assert.equal(result.installed, true);
  assert.equal(result.equipped, true);
  assert.equal(result.connectionId, 4);
  assert.equal(result.rules.every((rule) => rule.ruleId), true);
});

test('pruebas RCON detectan comandos rechazados y sus raices', () => {
  assert.equal(rootCommand('  effect give Steve speed 2'), 'effect');
  assert.equal(rootCommand('/sandbox sand random 1'), 'sandbox');
  assert.equal(looksLikeCommandError('Unknown or incomplete command'), true);
  assert.equal(looksLikeCommandError('No player was found'), true);
  assert.equal(looksLikeCommandError('Gave 2 [Steak] to Steve'), false);
});

test('renderGameModeRules rechaza nombres Minecraft invalidos', () => {
  const mode = getGameMode('survival-chaos');
  assert.throws(() => renderGameModeRules(mode, 'a'), /3 y 16/);
  assert.throws(() => renderGameModeRules(mode, 'usuario;op'), /3 y 16/);
  assert.throws(() => renderGameModeRules(mode, 'nombre demasiado largo'), /3 y 16/);
});
