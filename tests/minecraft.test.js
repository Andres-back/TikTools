'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');
const { minecraftEnvConfig, craftyConfigError } = require('../src/modules/minecraft/config');
const { isPortOpen } = require('../src/modules/minecraft/routes');

test('minecraftEnvConfig: defaults cuando no hay env', () => {
  const cfg = minecraftEnvConfig({});
  assert.equal(cfg.craftyUrl, 'https://localhost:8443');
  assert.equal(cfg.serverPort, '25565');
  assert.equal(cfg.rconPort, '25575');
  assert.equal(cfg.playitUrl, '');
  assert.equal(cfg.craftyUser, '');
});

test('minecraftEnvConfig: lee variables del entorno', () => {
  const cfg = minecraftEnvConfig({
    CRAFTY_URL: 'https://crafty.local:8443/',
    CRAFTY_USER: 'admin',
    CRAFTY_PASSWORD: 'secreto',
    CRAFTY_SERVER_ID: 'abc-123',
    MC_PLAYIT_URL: 'demo.playit.gg',
    MC_SERVER_PORT: '25566'
  });
  assert.equal(cfg.craftyUrl, 'https://crafty.local:8443'); // sin slash final
  assert.equal(cfg.craftyUser, 'admin');
  assert.equal(cfg.craftyPassword, 'secreto');
  assert.equal(cfg.craftyServerId, 'abc-123');
  assert.equal(cfg.playitUrl, 'demo.playit.gg');
  assert.equal(cfg.serverPort, '25566');
});

test('craftyConfigError: avisa cuando faltan credenciales o server id', () => {
  assert.ok(craftyConfigError(minecraftEnvConfig({}))); // sin user/pass
  assert.ok(craftyConfigError(minecraftEnvConfig({ CRAFTY_USER: 'a', CRAFTY_PASSWORD: 'b' }))); // sin server id
  assert.equal(
    craftyConfigError(minecraftEnvConfig({ CRAFTY_USER: 'a', CRAFTY_PASSWORD: 'b', CRAFTY_SERVER_ID: 'x' })),
    null
  );
});

test('isPortOpen: false con puerto cerrado', async () => {
  const open = await isPortOpen('127.0.0.1', 1, 300); // puerto 1 casi siempre cerrado
  assert.equal(open, false);
});

test('isPortOpen: true con un puerto que escucha', async () => {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  try {
    const open = await isPortOpen('127.0.0.1', port, 1000);
    assert.equal(open, true);
  } finally {
    server.close();
  }
});
