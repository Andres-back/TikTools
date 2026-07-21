'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');
const {
  executeHttpWebhook,
  isBlockedAddress,
  sanitizeHeaders,
  validateHttpConfig
} = require('../src/modules/integrations/http-client');

test('HTTP seguro rechaza protocolos, credenciales y hosts locales por defecto', () => {
  const previousHttp = process.env.INTEGRATIONS_ALLOW_HTTP;
  delete process.env.INTEGRATIONS_ALLOW_HTTP;
  assert.throws(() => validateHttpConfig({ url: 'http://example.com/hook' }), { code: 'HTTP_PROTOCOL_DENIED' });
  assert.throws(() => validateHttpConfig({ url: 'https://user:pass@example.com/hook' }), { code: 'HTTP_URL_CREDENTIALS_DENIED' });
  assert.throws(() => validateHttpConfig({ url: 'https://localhost/hook' }), { code: 'HTTP_HOST_DENIED' });
  if (previousHttp === undefined) delete process.env.INTEGRATIONS_ALLOW_HTTP;
  else process.env.INTEGRATIONS_ALLOW_HTTP = previousHttp;
});

test('matriz SSRF bloquea IPv4, IPv6, metadata y rangos reservados', () => {
  const blocked = [
    '0.0.0.0', '10.1.2.3', '100.64.0.1', '127.0.0.1', '169.254.169.254',
    '172.16.0.1', '192.168.1.2', '192.0.2.1', '198.51.100.9', '203.0.113.5',
    '224.0.0.1', '::', '::1', 'fc00::1', 'fd12::1', 'fe80::1', 'ff02::1', '2001:db8::1',
    '::ffff:127.0.0.1'
  ];
  blocked.forEach((address) => assert.equal(isBlockedAddress(address), true, address));
  assert.equal(isBlockedAddress('8.8.8.8'), false);
  assert.equal(isBlockedAddress('2606:4700:4700::1111'), false);
});

test('headers impiden request smuggling y saltos de linea', () => {
  assert.deepEqual(sanitizeHeaders({ Authorization: 'Bearer token', 'X-Game': 'arena' }), {
    Authorization: 'Bearer token',
    'X-Game': 'arena'
  });
  assert.throws(() => sanitizeHeaders({ Host: 'evil.test' }), { code: 'HTTP_HEADER_DENIED' });
  assert.throws(() => sanitizeHeaders({ 'X-Test': 'ok\r\nX-Evil: yes' }), { code: 'HTTP_HEADER_INVALID' });
});

test('envia JSON firmado a una IP privada solo con opt-in explicito', async (t) => {
  const previous = {
    allowHttp: process.env.INTEGRATIONS_ALLOW_HTTP,
    allowPrivate: process.env.INTEGRATIONS_ALLOW_PRIVATE_HTTP
  };
  process.env.INTEGRATIONS_ALLOW_HTTP = 'true';
  process.env.INTEGRATIONS_ALLOW_PRIVATE_HTTP = 'true';
  t.after(() => {
    if (previous.allowHttp === undefined) delete process.env.INTEGRATIONS_ALLOW_HTTP;
    else process.env.INTEGRATIONS_ALLOW_HTTP = previous.allowHttp;
    if (previous.allowPrivate === undefined) delete process.env.INTEGRATIONS_ALLOW_PRIVATE_HTTP;
    else process.env.INTEGRATIONS_ALLOW_PRIVATE_HTTP = previous.allowPrivate;
  });

  let received;
  const server = http.createServer((request, response) => {
    const chunks = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => {
      received = { headers: request.headers, body: Buffer.concat(chunks).toString('utf8') };
      response.writeHead(202, { 'Content-Type': 'application/json' });
      response.end('{"accepted":true}');
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const port = server.address().port;
  const signingSecret = 'canary-signing-secret';
  const deliveryId = 'delivery-test-1';
  const result = await executeHttpWebhook({
    config: { url: `http://127.0.0.1:${port}/event`, method: 'POST', timeoutMs: 2000 },
    secret: { headers: { 'X-Game': 'arena' }, signingSecret },
    payload: { type: 'gift', coins: 99 },
    deliveryId
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, 202);
  assert.equal(received.headers['x-tiktoolstream-delivery'], deliveryId);
  assert.equal(received.headers['x-game'], 'arena');
  const timestamp = received.headers['x-tiktoolstream-timestamp'];
  const expected = crypto.createHmac('sha256', signingSecret)
    .update(`${timestamp}.${deliveryId}.${received.body}`)
    .digest('hex');
  assert.equal(received.headers['x-tiktoolstream-signature'], `v1=${expected}`);
  assert.deepEqual(JSON.parse(received.body), { type: 'gift', coins: 99 });
});
