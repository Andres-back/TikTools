'use strict';

const crypto = require('crypto');
const dns = require('dns').promises;
const http = require('http');
const https = require('https');
const net = require('net');

const METHODS = Object.freeze(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
const FORBIDDEN_HEADERS = new Set([
  'host', 'connection', 'content-length', 'transfer-encoding', 'upgrade', 'forwarded',
  'cookie', 'set-cookie', 'proxy-authorization', 'proxy-authenticate', 'x-forwarded-for',
  'x-forwarded-host', 'x-forwarded-proto', 'x-real-ip'
]);

async function executeHttpWebhook(options = {}) {
  const config = validateHttpConfig(options.config || {});
  const target = new URL(config.url);
  const addresses = await resolveTarget(target.hostname, { allowPrivate: config.allowPrivate });
  const address = addresses[0];
  const deliveryId = String(options.deliveryId || crypto.randomUUID());
  const timestamp = String(Math.floor(Date.now() / 1000));
  const payload = options.payload ?? {};
  const body = config.method === 'GET' ? '' : JSON.stringify(payload);
  if (Buffer.byteLength(body, 'utf8') > 32768) throw httpError('HTTP_REQUEST_TOO_LARGE', 'El body supera 32 KiB');

  const secret = options.secret && typeof options.secret === 'object' ? options.secret : {};
  const headers = sanitizeHeaders(secret.headers || {});
  headers.Accept = 'application/json, text/plain;q=0.8, */*;q=0.2';
  headers['User-Agent'] = 'TikToolStream-Interactions/1.0';
  headers['X-TikToolStream-Delivery'] = deliveryId;
  headers['X-TikToolStream-Timestamp'] = timestamp;
  if (body) {
    headers['Content-Type'] = 'application/json; charset=utf-8';
    headers['Content-Length'] = Buffer.byteLength(body, 'utf8');
  }

  if (secret.signingSecret) {
    const signature = crypto.createHmac('sha256', String(secret.signingSecret))
      .update(`${timestamp}.${deliveryId}.${body}`)
      .digest('hex');
    headers['X-TikToolStream-Signature'] = `v1=${signature}`;
  }

  const transport = target.protocol === 'https:' ? https : http;
  const timeoutMs = config.timeoutMs;
  return new Promise((resolve, reject) => {
    let settled = false;
    const request = transport.request({
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || undefined,
      path: `${target.pathname}${target.search}`,
      method: config.method,
      headers,
      servername: target.hostname,
      lookup: (_hostname, lookupOptions, callback) => {
        const wantsAll = typeof lookupOptions === 'object' && lookupOptions.all;
        if (wantsAll) callback(null, [{ address: address.address, family: address.family }]);
        else callback(null, address.address, address.family);
      },
      agent: false
    }, (response) => {
      const chunks = [];
      let total = 0;
      response.on('data', (chunk) => {
        total += chunk.length;
        if (total > 65536) {
          request.destroy(httpError('HTTP_RESPONSE_TOO_LARGE', 'La respuesta supera 64 KiB'));
          return;
        }
        chunks.push(chunk);
      });
      response.on('end', () => {
        if (settled) return;
        settled = true;
        clearTimeout(overallTimer);
        const responseBody = Buffer.concat(chunks).toString('utf8').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').slice(0, 4096);
        resolve({
          status: Number(response.statusCode) || 0,
          ok: Number(response.statusCode) >= 200 && Number(response.statusCode) < 300,
          response: responseBody,
          bytes: total,
          deliveryId
        });
      });
    });

    const overallTimer = setTimeout(() => request.destroy(httpError('HTTP_TIMEOUT', 'La petición HTTP agotó su tiempo')), timeoutMs);
    request.setTimeout(Math.min(timeoutMs, 1800), () => request.destroy(httpError('HTTP_SOCKET_TIMEOUT', 'El servidor HTTP no respondió')));
    request.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(overallTimer);
      reject(error.code?.startsWith('HTTP_') ? error : httpError('HTTP_REQUEST_FAILED', 'Falló la petición HTTP', error));
    });
    if (body) request.write(body);
    request.end();
  });
}

function validateHttpConfig(input = {}) {
  const rawUrl = String(input.url || '').trim();
  if (!rawUrl || rawUrl.length > 2048) throw httpError('HTTP_URL_INVALID', 'URL requerida o demasiado larga');
  let url;
  try { url = new URL(rawUrl); } catch { throw httpError('HTTP_URL_INVALID', 'URL HTTP inválida'); }

  const allowHttp = process.env.INTEGRATIONS_ALLOW_HTTP === 'true';
  if (url.protocol !== 'https:' && !(allowHttp && url.protocol === 'http:')) {
    throw httpError('HTTP_PROTOCOL_DENIED', 'Solo se permite HTTPS; habilita INTEGRATIONS_ALLOW_HTTP explícitamente para HTTP');
  }
  if (url.username || url.password || url.hash) throw httpError('HTTP_URL_CREDENTIALS_DENIED', 'La URL no puede incluir credenciales ni fragmentos');
  if (!url.hostname || isLocalHostname(url.hostname)) throw httpError('HTTP_HOST_DENIED', 'Hostname local o inválido');
  if (!hostAllowed(url.hostname)) throw httpError('HTTP_HOST_NOT_ALLOWED', 'El host no está en INTEGRATIONS_HTTP_ALLOWED_HOSTS');

  const method = String(input.method || 'POST').toUpperCase();
  if (!METHODS.includes(method)) throw httpError('HTTP_METHOD_DENIED', `Método permitido: ${METHODS.join(', ')}`);
  return {
    url: url.toString(),
    method,
    timeoutMs: bounded(input.timeoutMs, 500, 10000, 3500),
    allowPrivate: process.env.INTEGRATIONS_ALLOW_PRIVATE_HTTP === 'true'
  };
}

async function resolveTarget(hostname, options = {}) {
  let addresses;
  try { addresses = await dns.lookup(hostname, { all: true, verbatim: true }); }
  catch (error) { throw httpError('HTTP_DNS_FAILED', 'No se pudo resolver el host HTTP', error); }
  if (!addresses.length) throw httpError('HTTP_DNS_FAILED', 'El host HTTP no resolvió direcciones');
  if (!options.allowPrivate && addresses.some(({ address }) => isBlockedAddress(address))) {
    throw httpError('HTTP_PRIVATE_ADDRESS_DENIED', 'La URL resuelve a una red privada, local o reservada');
  }
  return addresses;
}

function sanitizeHeaders(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const output = {};
  for (const [rawName, rawValue] of Object.entries(input).slice(0, 12)) {
    const name = String(rawName).trim();
    const lower = name.toLowerCase();
    if (!/^[a-z0-9!#$%&'*+.^_`|~-]{1,64}$/i.test(name)) throw httpError('HTTP_HEADER_INVALID', `Header inválido: ${name}`);
    if (FORBIDDEN_HEADERS.has(lower) || lower.startsWith('proxy-') || lower.startsWith('x-forwarded-')) {
      throw httpError('HTTP_HEADER_DENIED', `Header no permitido: ${name}`);
    }
    const value = String(rawValue ?? '');
    if (value.length > 2048 || /[\r\n\u0000]/.test(value)) throw httpError('HTTP_HEADER_INVALID', `Valor inválido para ${name}`);
    output[name] = value;
  }
  return output;
}

function isBlockedAddress(address) {
  const version = net.isIP(address);
  if (version === 4) {
    const parts = address.split('.').map(Number);
    const [a, b] = parts;
    return a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 0 || b === 168)) ||
      (a === 192 && b === 0 && parts[2] === 2) ||
      (a === 198 && (b === 18 || b === 19 || b === 51)) ||
      (a === 203 && b === 0 && parts[2] === 113) ||
      a >= 224;
  }
  if (version === 6) {
    const value = address.toLowerCase();
    if (value.startsWith('::ffff:')) return isBlockedAddress(value.slice(7));
    return value === '::' || value === '::1' || value.startsWith('fc') || value.startsWith('fd') ||
      /^fe[89ab]/.test(value) || value.startsWith('ff') || value.startsWith('2001:db8:');
  }
  return true;
}

function isLocalHostname(hostname) {
  const value = String(hostname || '').replace(/^\[|\]$/g, '').toLowerCase();
  return value === 'localhost' || value.endsWith('.localhost') || value.endsWith('.local') || value.endsWith('.internal');
}

function hostAllowed(hostname) {
  const configured = String(process.env.INTEGRATIONS_HTTP_ALLOWED_HOSTS || '').split(',').map((item) => item.trim().toLowerCase()).filter(Boolean);
  if (!configured.length || configured.includes('*')) return true;
  const host = String(hostname).toLowerCase();
  return configured.some((entry) => entry.startsWith('*.') ? host.endsWith(entry.slice(1)) && host !== entry.slice(2) : host === entry);
}

function bounded(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

function httpError(code, message, cause) {
  const error = new Error(message);
  error.code = code;
  if (cause) error.cause = cause;
  return error;
}

module.exports = {
  FORBIDDEN_HEADERS,
  METHODS,
  executeHttpWebhook,
  isBlockedAddress,
  resolveTarget,
  sanitizeHeaders,
  validateHttpConfig
};
