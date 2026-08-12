'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { GAME_MODES, getGameMode, renderGameModeRules } = require('../src/modules/minecraft/game-modes');

test('catalogo Minecraft ofrece modos vanilla y compatibles con plugins', () => {
  assert.ok(GAME_MODES.length >= 4);
  assert.ok(GAME_MODES.some((mode) => mode.status === 'ready' && !mode.plugin));
  assert.ok(GAME_MODES.some((mode) => mode.id === 'bedrock-siege' && mode.plugin));
  assert.ok(GAME_MODES.every((mode) => mode.rules.length >= 5));
});

test('renderGameModeRules reemplaza solo el jugador y conserva variables TikTok', () => {
  const mode = getGameMode('bedrock-siege');
  const rules = renderGameModeRules(mode, 'Streamer_21');

  assert.equal(rules.length, mode.rules.length);
  assert.ok(rules.every((rule) => rule.name.startsWith('[TikGame:bedrock-siege]')));
  assert.match(rules[0].action.commandTemplate, /\{\{user\.nickname\}\}/);
  assert.doesNotMatch(rules[0].action.commandTemplate, /\{\{player\}\}/);
  assert.equal(rules[0].eventType, 'gift');
});

test('renderGameModeRules crea rangos sin solaparse', () => {
  const rules = renderGameModeRules(getGameMode('survival-chaos'), 'Steve');
  for (let index = 1; index < rules.length; index += 1) {
    assert.equal(rules[index - 1].conditions.maxCoins + 1, rules[index].conditions.minCoins);
  }
  assert.equal(rules.at(-1).conditions.maxCoins, undefined);
});

test('renderGameModeRules rechaza nombres Minecraft invalidos', () => {
  const mode = getGameMode('survival-chaos');
  assert.throws(() => renderGameModeRules(mode, 'a'), /3 y 16/);
  assert.throws(() => renderGameModeRules(mode, 'usuario;op'), /3 y 16/);
  assert.throws(() => renderGameModeRules(mode, 'nombre demasiado largo'), /3 y 16/);
});
