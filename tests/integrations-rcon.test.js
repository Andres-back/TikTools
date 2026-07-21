'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');
const {
  PACKET,
  RconClient,
  decodePackets,
  encodePacket,
  validateRconCommand,
  validateRconConfig
} = require('../src/modules/integrations/rcon-client');

test('codifica y decodifica paquetes RCON incluso cuando llegan fragmentados', () => {
  const first = encodePacket(10, PACKET.AUTH, 'clave');
  const second = encodePacket(11, PACKET.COMMAND, 'say hola');
  const incomplete = decodePackets(Buffer.concat([first, second.subarray(0, 7)]));

  assert.deepEqual(incomplete.packets, [{ id: 10, type: PACKET.AUTH, body: 'clave' }]);
  assert.deepEqual(incomplete.remaining, second.subarray(0, 7));

  const complete = decodePackets(Buffer.concat([incomplete.remaining, second.subarray(7)]));
  assert.deepEqual(complete.packets, [{ id: 11, type: PACKET.COMMAND, body: 'say hola' }]);
  assert.equal(complete.remaining.length, 0);

  const malformed = Buffer.from(first);
  malformed.writeInt32LE(9, 0);
  assert.throws(() => decodePackets(malformed), (error) => error.code === 'RCON_PROTOCOL_ERROR');
});

test('autentica, envia un comando y concatena respuestas del servidor RCON', async () => {
  await withFakeRcon({ password: 'correcta' }, async ({ port, commands }) => {
    const client = new RconClient({
      host: '127.0.0.1',
      port,
      password: 'correcta',
      connectTimeoutMs: 500,
      commandTimeoutMs: 800
    });

    const result = await client.execute('say Hola TikTok');
    assert.deepEqual(commands, ['say Hola TikTok']);
    assert.equal(result.response, 'Ejecutado: say Hola TikTok | OK');
    assert.equal(result.bytes, Buffer.byteLength(result.response));
  });
});

test('rechaza password invalida sin enviar ningun comando', async () => {
  await withFakeRcon({ password: 'correcta' }, async ({ port, commands }) => {
    const client = new RconClient({
      host: '127.0.0.1',
      port,
      password: 'incorrecta',
      connectTimeoutMs: 500,
      commandTimeoutMs: 500
    });

    await assert.rejects(
      client.execute('say no-debe-ejecutarse'),
      (error) => error.code === 'RCON_AUTH_FAILED'
    );
    assert.deepEqual(commands, []);
  });
});

test('bloquea inyeccion, comandos administrativos y escapes de allowlist', () => {
  assert.equal(validateRconCommand('say hola', ['say']), 'say hola');
  assert.equal(validateRconCommand('/title @a title Bienvenidos', ['title']), 'title @a title Bienvenidos');

  assert.throws(
    () => validateRconCommand('say hola; op attacker', ['say']),
    (error) => error.code === 'RCON_COMMAND_UNSAFE'
  );
  assert.throws(
    () => validateRconCommand('say hola\nstop', ['say']),
    (error) => error.code === 'RCON_COMMAND_UNSAFE'
  );
  assert.throws(
    () => validateRconCommand('op attacker', ['op']),
    (error) => error.code === 'RCON_COMMAND_DENIED'
  );
  assert.throws(
    () => validateRconCommand('/op attacker', ['op']),
    (error) => error.code === 'RCON_COMMAND_DENIED'
  );
  assert.throws(
    () => validateRconCommand('sayhello attacker', ['say']),
    (error) => error.code === 'RCON_COMMAND_NOT_ALLOWED'
  );
  assert.throws(
    () => validateRconCommand('execute as @a run op attacker', ['say']),
    (error) => error.code === 'RCON_COMMAND_NOT_ALLOWED'
  );
});

test('valida host, puerto y comandos configurados contra allowlists explicitas', () => {
  assert.deepEqual(
    validateRconConfig(
      { host: 'GAME.local', port: 25575, engine: 'minecraft', allowedCommands: ['say', '/particle'] },
      { allowedHosts: ['game.local'] }
    ),
    { host: 'game.local', port: 25575, engine: 'minecraft', allowedCommands: ['say', 'particle'] }
  );

  assert.throws(
    () => validateRconConfig({ host: '10.0.0.25', port: 25575 }, { allowedHosts: ['127.0.0.1'] }),
    (error) => error.code === 'RCON_HOST_NOT_ALLOWED'
  );
  assert.throws(
    () => validateRconConfig({ host: 'game.local', port: 70000 }, { allowedHosts: ['game.local'] }),
    (error) => error.code === 'RCON_PORT_INVALID'
  );
  assert.throws(
    () => validateRconConfig({ host: 'game.local', allowedCommands: ['say; op'] }, { allowedHosts: ['game.local'] }),
    (error) => error.code === 'RCON_ALLOWLIST_REQUIRED'
  );
});

async function withFakeRcon(options, callback) {
  const commands = [];
  const sockets = new Set();
  const server = net.createServer((socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    let buffer = Buffer.alloc(0);

    socket.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      const decoded = decodePackets(buffer);
      buffer = decoded.remaining;

      for (const packet of decoded.packets) {
        if (packet.type === PACKET.AUTH) {
          const response = encodePacket(
            packet.body === options.password ? packet.id : -1,
            PACKET.AUTH_RESPONSE,
            ''
          );
          socket.write(response.subarray(0, 5));
          setImmediate(() => {
            if (!socket.destroyed) socket.write(response.subarray(5));
          });
          continue;
        }

        if (packet.type === PACKET.COMMAND) {
          commands.push(packet.body);
          const first = encodePacket(packet.id, PACKET.RESPONSE, `Ejecutado: ${packet.body}`);
          const second = encodePacket(packet.id, PACKET.RESPONSE, ' | OK');
          socket.write(Buffer.concat([first, second]));
        }
      }
    });
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  try {
    const address = server.address();
    return await callback({ port: address.port, commands });
  } finally {
    for (const socket of sockets) socket.destroy();
    await new Promise((resolve) => server.close(resolve));
  }
}
