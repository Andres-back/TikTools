'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {
  DEFAULT_GAME_CONFIG,
  clampGameConfig,
  parseAccessToken,
  signTikToolStreamBody
} = require('../src/modules/game/config');

test('clampGameConfig devuelve los defaults sin entrada', () => {
  assert.deepEqual(clampGameConfig(), DEFAULT_GAME_CONFIG);
  assert.deepEqual(clampGameConfig({}), DEFAULT_GAME_CONFIG);
});

test('clampGameConfig acota los umbrales a rangos válidos', () => {
  const config = clampGameConfig({ waveMin: -5, eliteMin: 9999, bossMin: 0, maxMobs: 99 });
  assert.equal(config.waveMin, 1);
  assert.equal(config.eliteMin, 499);
  assert.equal(config.bossMin, 500);
  assert.equal(config.maxMobs, 10);
});

test('clampGameConfig ordena los umbrales (wave < elite < boss) con cualquier entrada', () => {
  const cases = [
    { waveMin: 50, eliteMin: 40, bossMin: 30 },
    { waveMin: 300, eliteMin: 9999, bossMin: 0 },
    { waveMin: 99, eliteMin: 100, bossMin: 500 },
    { waveMin: 1, eliteMin: 1, bossMin: 1 },
    {}
  ];
  for (const input of cases) {
    const c = clampGameConfig(input);
    assert.ok(c.waveMin < c.eliteMin, `wave<elite para ${JSON.stringify(input)}`);
    assert.ok(c.eliteMin < c.bossMin, `elite<boss para ${JSON.stringify(input)}`);
  }
});

test('clampGameConfig normaliza booleanos', () => {
  assert.equal(clampGameConfig({ enabled: 'false' }).enabled, false);
  assert.equal(clampGameConfig({ enabled: 0 }).enabled, false);
  assert.equal(clampGameConfig({ enabled: 'true' }).enabled, true);
  assert.equal(clampGameConfig({ supportMode: true }).supportMode, true);
  assert.equal(clampGameConfig({ supportMode: undefined }).supportMode, false);
});

test('parseAccessToken soporta comillas simples, dobles y sin comillas', () => {
  assert.equal(parseAccessToken("ACCESS_TOKEN='abc123'"), 'abc123');
  assert.equal(parseAccessToken('ACCESS_TOKEN="abc123"'), 'abc123');
  assert.equal(parseAccessToken('ACCESS_TOKEN=abc123'), 'abc123');
  assert.equal(parseAccessToken('HOST=localhost\nACCESS_TOKEN=xyz\nPORT=9001'), 'xyz');
});

test('parseAccessToken devuelve null si no existe', () => {
  assert.equal(parseAccessToken(''), null);
  assert.equal(parseAccessToken('HOST=localhost'), null);
  assert.equal(parseAccessToken('ACCESS_TOKEN='), null);
  assert.equal(parseAccessToken(null), null);
});

test('signTikToolStreamBody produce una firma HMAC verificable', () => {
  const secret = 'clave-secreta';
  const body = { action: 'announce', user: 'Ana', coins: 10 };
  const signed = signTikToolStreamBody(secret, body);

  assert.equal(typeof signed.timestamp, 'string');
  assert.equal(typeof signed.deliveryId, 'string');
  assert.equal(signed.rawBody, JSON.stringify(body));

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${signed.timestamp}.${signed.deliveryId}.${signed.rawBody}`)
    .digest('hex');
  assert.equal(signed.signature, expected);

  // Una clave distinta produce otra firma.
  const other = signTikToolStreamBody('otra-clave', body);
  assert.notEqual(other.signature, signed.signature);
});
