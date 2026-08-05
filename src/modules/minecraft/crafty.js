'use strict';

/**
 * Crafty Controller — cliente API mínimo (login JWT + requests).
 * Usa https.request con rejectUnauthorized:false SOLO para Crafty
 * (certificado autofirmado local); el resto del proceso queda intacto.
 */

const https = require('node:https');
const { minecraftEnvConfig } = require('./config');

let cachedToken = null;
let tokenExpiresAt = 0;

function craftyRequest(baseUrl, method, path, { body, token } = {}) {
  return new Promise((resolve, reject) => {
    let target;
    try {
      target = new URL(baseUrl + path);
    } catch (error) {
      reject(new Error(`CRAFTY_URL inválida: ${error.message}`));
      return;
    }
    const payload = body === undefined ? null : JSON.stringify(body);

    const request = https.request(
      {
        hostname: target.hostname,
        port: target.port || (target.protocol === 'https:' ? 443 : 80),
        path: target.pathname + target.search,
        method,
        rejectUnauthorized: false,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
        }
      },
      (response) => {
        let data = '';
        response.on('data', (chunk) => { data += chunk; });
        response.on('end', () => {
          let json = null;
          try { json = JSON.parse(data); } catch { json = null; }
          resolve({ status: response.statusCode || 0, json, raw: data });
        });
      }
    );
    request.on('error', reject);
    request.setTimeout(8000, () => request.destroy(new Error('Tiempo de espera de Crafty agotado')));
    if (payload) request.write(payload);
    request.end();
  });
}

async function login(cfg) {
  const response = await craftyRequest(cfg.craftyUrl, 'POST', '/api/v2/auth/login/', {
    body: { username: cfg.craftyUser, password: cfg.craftyPassword }
  });
  const token = response.json?.data?.token;
  if (!token || response.status !== 200) {
    throw craftyError('CRAFTY_AUTH_FAILED', 'No se pudo autenticar contra Crafty (revisa CRAFTY_USER/CRAFTY_PASSWORD)');
  }
  cachedToken = token;
  // El JWT de Crafty expira; re-login preventivo cada 6 horas.
  tokenExpiresAt = Date.now() + 6 * 60 * 60 * 1000;
  return token;
}

async function getToken(cfg) {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;
  return login(cfg);
}

/** Llamada autenticada a la API de Crafty con re-login automático en 401. */
async function craftyApi(method, path, body) {
  const cfg = minecraftEnvConfig();
  let token = await getToken(cfg);
  let response = await craftyRequest(cfg.craftyUrl, method, path, { body, token });

  if (response.status === 401) {
    cachedToken = null;
    token = await login(cfg);
    response = await craftyRequest(cfg.craftyUrl, method, path, { body, token });
  }

  if (!response.json || response.status >= 400) {
    const message = response.json?.error || response.json?.error_data || `HTTP ${response.status}`;
    throw craftyError('CRAFTY_API_ERROR', `Crafty respondió: ${message}`);
  }
  return response.json.data ?? response.json;
}

function craftyError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

module.exports = { craftyApi, craftyRequest, login, craftyError };
