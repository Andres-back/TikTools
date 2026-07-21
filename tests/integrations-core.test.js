'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildTemplateContext,
  matchesConditions,
  renderJsonTemplate,
  renderTemplate,
  sanitizeRconSubstitution
} = require('../src/modules/integrations/template');
const {
  decryptSecret,
  encryptSecret,
  encryptionKey
} = require('../src/modules/integrations/secret-box');

const TEST_KEY = Buffer.alloc(32, 0x42).toString('base64');
const ORIGINAL_KEY = process.env.INTEGRATIONS_ENCRYPTION_KEY;

test.afterEach(() => {
  if (ORIGINAL_KEY === undefined) delete process.env.INTEGRATIONS_ENCRYPTION_KEY;
  else process.env.INTEGRATIONS_ENCRYPTION_KEY = ORIGINAL_KEY;
});

test('construye contexto estable y resuelve placeholders modernos y heredados', () => {
  const context = buildTemplateContext({
    type: 'gift',
    streamUniqueId: 'creador_live',
    data: {
      userId: 'user-42',
      uniqueId: 'ana_live',
      nickname: 'Ana',
      giftId: 5655,
      giftName: 'Rose',
      diamondCount: 2,
      repeatCount: 4,
      comment: '!spawn zombie rapido',
      totalLikeCount: 900
    }
  }, 'channel-7');

  assert.equal(context.gift.coins, 8);
  assert.equal(context.chat.command, '!spawn');
  assert.equal(context.chat.commandParams, 'zombie rapido');
  assert.equal(
    renderTemplate('say {{user.nickname}} envio {{gift.repeatCount}} %giftName% en {{stream.channelId}}', context),
    'say Ana envio 4 Rose en channel-7'
  );
  assert.equal(renderTemplate('%username%:%coins%:%commandParams%', context), 'ana_live:8:zombie rapido');
});

test('conserva tipos en plantillas JSON exactas y limita profundidad', () => {
  const context = buildTemplateContext({
    type: 'gift',
    data: { uniqueId: 'dani', diamondCount: 25, repeatCount: 2 }
  }, 'canal');

  const rendered = renderJsonTemplate({
    amount: '{{gift.coins}}',
    actor: '{{user.uniqueId}}',
    label: 'coins={{gift.coins}}',
    missing: '{{user.notAllowed}}'
  }, context);

  assert.deepEqual(rendered, {
    amount: 50,
    actor: 'dani',
    label: 'coins=50',
    missing: ''
  });

  let tooDeep = 'leaf';
  for (let index = 0; index < 10; index += 1) tooDeep = { child: tooDeep };
  assert.throws(() => renderJsonTemplate(tooDeep, context), /profundidad/i);
});

test('evalua condiciones de regalos, comandos y roles sin ejecutar texto del usuario', () => {
  const event = {
    type: 'gift',
    data: {
      giftId: '5655',
      giftName: 'Rose',
      coins: 100,
      comment: '!boss dragon',
      isSubscriber: true,
      isModerator: false
    }
  };

  assert.equal(matchesConditions({ minCoins: 50, maxCoins: 150, giftName: ' rose ', subscriberOnly: true }, event), true);
  assert.equal(matchesConditions({ minCoins: 101 }, event), false);
  assert.equal(matchesConditions({ giftId: 999 }, event), false);
  assert.equal(matchesConditions({ chatCommand: '!boss' }, event), true);
  assert.equal(matchesConditions({ chatCommand: '!spawn' }, event), false);
  assert.equal(matchesConditions({ moderatorOnly: true }, event), false);
});

test('neutraliza inyeccion de comandos al sustituir datos en RCON', () => {
  const malicious = 'Alex; op attacker\nstop\r\n"quoted" `whoami` \\ path';
  const sanitized = sanitizeRconSubstitution(malicious);

  assert.doesNotMatch(sanitized, /[;\n\r"'`\\]/);
  assert.equal(sanitized, 'Alex op attacker stop quoted whoami path');

  const context = buildTemplateContext({ type: 'chat', data: { nickname: malicious } }, 'canal');
  const command = renderTemplate('say {{user.nickname}}', context, { mode: 'rcon' });
  assert.equal(command, `say ${sanitized}`);
  assert.doesNotMatch(command, /[;\n\r]/);
});

test('solo permite rutas propias y respeta el largo maximo de plantillas', () => {
  const context = Object.create({ inherited: 'secret' });
  context.user = { nickname: 'abcdefghijklmnop' };

  assert.equal(renderTemplate('{{inherited}}/{{constructor.name}}', context), '/');
  assert.equal(renderTemplate('{{user.nickname}}', context, { maxLength: 5 }), 'abcde');
});

test('cifra y descifra secretos autenticados sin producir ciphertext determinista', () => {
  process.env.INTEGRATIONS_ENCRYPTION_KEY = TEST_KEY;
  const secret = { password: 'super-secreto', headers: { Authorization: 'Bearer token' } };
  const context = { userId: '7', kind: 'rcon' };

  const first = encryptSecret(secret, context);
  const second = encryptSecret(secret, context);

  assert.match(first, /^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  assert.notEqual(first, second);
  assert.deepEqual(decryptSecret(first, context), secret);
  assert.deepEqual(decryptSecret(second, context), secret);
});

test('rechaza contexto equivocado y ciphertext manipulado', () => {
  process.env.INTEGRATIONS_ENCRYPTION_KEY = TEST_KEY;
  const encrypted = encryptSecret({ password: 'clave' }, { userId: '7', kind: 'rcon' });

  assert.throws(
    () => decryptSecret(encrypted, { userId: '8', kind: 'rcon' }),
    (error) => error.code === 'INTEGRATIONS_SECRET_ERROR'
  );

  const last = encrypted.at(-1);
  const tampered = `${encrypted.slice(0, -1)}${last === 'A' ? 'B' : 'A'}`;
  assert.throws(
    () => decryptSecret(tampered, { userId: '7', kind: 'rcon' }),
    (error) => error.code === 'INTEGRATIONS_SECRET_ERROR'
  );
});

test('exige una llave AES-256 valida', () => {
  delete process.env.INTEGRATIONS_ENCRYPTION_KEY;
  assert.throws(() => encryptionKey(), (error) => error.code === 'INTEGRATIONS_KEY_MISSING');

  process.env.INTEGRATIONS_ENCRYPTION_KEY = Buffer.alloc(31, 1).toString('base64');
  assert.throws(() => encryptionKey(), (error) => error.code === 'INTEGRATIONS_KEY_INVALID');

  process.env.INTEGRATIONS_ENCRYPTION_KEY = 'ab'.repeat(32);
  assert.equal(encryptionKey().length, 32);
});
