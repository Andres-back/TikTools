'use strict';

/**
 * Game (Kaetram) — API de integración con el juego de donaciones.
 * Endpoints:
 *   GET  /api/game/status   → estado del juego (online, playerCount, versión)
 *   POST /api/game/start    → arranca el juego (scripts/start.sh) y espera a que responda
 *   POST /api/game/stop     → detiene el juego (scripts/stop.sh)
 *   GET  /api/game/config   → configuración del usuario (umbrales, modo apoyo)
 *   PUT  /api/game/config   → guarda la configuración (con clamps)
 *   POST /api/game/test     → envía una donación de prueba firmada al juego
 */

const express = require('express');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const db = require('../../../database/db');
const { authenticateToken } = require('../../shared/middlewares/auth');
const {
  DEFAULT_GAME_CONFIG,
  clampGameConfig,
  parseAccessToken,
  signTikToolStreamBody
} = require('./config');
const { ensureGameSchema } = require('./schema');

const GAME_DIR = process.env.GAME_DIR || '/mnt/Kaetram';
const GAME_API_URL = process.env.GAME_API_URL || 'http://127.0.0.1:9002';
const GAME_STATUS_TIMEOUT = 1500;
const START_POLL_MS = 20000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Ejecuta un script bash desacoplado (fire-and-forget). */
function runScript(script) {
  return new Promise((resolve) => {
    const child = spawn('bash', [script], { detached: true, stdio: 'ignore' });
    child.on('error', () => resolve(false));
    child.unref();
    resolve(true);
  });
}

/** Consulta el estado del juego contra su API local. */
async function getGameStatus() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GAME_STATUS_TIMEOUT);
  try {
    const response = await fetch(`${GAME_API_URL}/`, { signal: controller.signal });
    if (!response.ok) return { online: false, info: null };
    return { online: true, info: await response.json() };
  } catch {
    return { online: false, info: null };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Sincroniza la configuración (modo apoyo, límite de mobs) con el juego.
 * Fire-and-forget: si el juego está apagado no falla el guardado local.
 */
async function syncGameConfig(config) {
  let token = null;
  try {
    token = parseAccessToken(fs.readFileSync(path.join(GAME_DIR, '.env'), 'utf8'));
  } catch {
    token = null;
  }
  if (!token) return false;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1500);
  try {
    const response = await fetch(`${GAME_API_URL}/config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Access-Token': token
      },
      body: JSON.stringify({ supportMode: !!config.supportMode, maxMobs: config.maxMobs }),
      signal: controller.signal
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function createGameRouter() {
  const router = express.Router();

  router.get('/status', authenticateToken, async (_req, res) => {
    try {
      res.json(await getGameStatus());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/start', authenticateToken, async (_req, res) => {
    try {
      await runScript(path.join(GAME_DIR, 'scripts/start.sh'));
      const deadline = Date.now() + START_POLL_MS;
      while (Date.now() < deadline) {
        await sleep(1000);
        const status = await getGameStatus();
        if (status.online) return res.json({ ok: true, ...status });
      }
      return res.status(504).json({ ok: false, error: 'El juego no respondió a tiempo' });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/stop', authenticateToken, async (_req, res) => {
    try {
      await runScript(path.join(GAME_DIR, 'scripts/stop.sh'));
      await sleep(1200);
      res.json({ ok: true, ...(await getGameStatus()) });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.get('/config', authenticateToken, async (req, res) => {
    try {
      const r = await db.query(`SELECT config_json FROM game_settings WHERE user_id = $1`, [
        req.user.userId
      ]);
      const row = r.rows?.[0] || r?.[0];
      if (!row?.config_json) return res.json(DEFAULT_GAME_CONFIG);
      try {
        const config = { ...DEFAULT_GAME_CONFIG, ...JSON.parse(row.config_json) };
        // El toggle "Donaciones activas" gobierna la conexión HTTP del juego en Acciones:
        // si existe, su estado enabled es la fuente de verdad para la vista.
        const conn = await db.query(
          `SELECT enabled FROM integration_connections
           WHERE user_id = $1 AND kind = 'http' AND name LIKE 'Kaetram%' LIMIT 1`,
          [req.user.userId]
        );
        const connRow = conn.rows?.[0] || conn?.[0];
        if (connRow) config.enabled = Boolean(Number(connRow.enabled));
        // Kaetram pierde su config runtime al reiniciar: re-sincroniza al abrir la vista.
        syncGameConfig(config).catch(() => {});
        return res.json(config);
      } catch {
        return res.json(DEFAULT_GAME_CONFIG);
      }
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.put('/config', authenticateToken, async (req, res) => {
    try {
      const config = clampGameConfig(req.body || {});
      await db.query(
        `INSERT INTO game_settings (user_id, config_json) VALUES ($1, $2)
         ON CONFLICT(user_id) DO UPDATE SET config_json = $2, updated_at = CURRENT_TIMESTAMP`,
        [req.user.userId, JSON.stringify(config)]
      );
      // Sincroniza modo apoyo / límite de mobs con el juego (si está encendido).
      await syncGameConfig(config);
      // Aplica el toggle "Donaciones activas": habilita/deshabilita la conexión
      // HTTP del juego en Acciones (el engine solo dispara si conexión y regla están enabled).
      await db.query(
        `UPDATE integration_connections SET enabled = $1, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $2 AND kind = 'http' AND name LIKE 'Kaetram%'`,
        [config.enabled ? 1 : 0, req.user.userId]
      );
      res.json(config);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/test', authenticateToken, async (_req, res) => {
    try {
      const status = await getGameStatus();
      if (!status.online) {
        return res.status(503).json({ ok: false, error: 'El juego está apagado' });
      }

      let token = null;
      try {
        token = parseAccessToken(fs.readFileSync(path.join(GAME_DIR, '.env'), 'utf8'));
      } catch {
        token = null;
      }
      if (!token) {
        return res
          .status(503)
          .json({ ok: false, error: 'ACCESS_TOKEN no encontrado en el .env del juego' });
      }

      const body = { action: 'announce', user: 'Prueba', gift: 'Test', coins: 1 };
      const { timestamp, deliveryId, signature, rawBody } = signTikToolStreamBody(token, body);

      let response;
      try {
        response = await fetch(`${GAME_API_URL}/donation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Access-Token': token,
            'X-TikToolStream-Timestamp': timestamp,
            'X-TikToolStream-Delivery': deliveryId,
            'X-TikToolStream-Signature': `v1=${signature}`
          },
          body: rawBody
        });
      } catch (e) {
        return res.status(502).json({ ok: false, error: `No se pudo contactar el juego: ${e.message}` });
      }

      const data = await response.json().catch(() => ({}));
      res.json({ ok: response.ok, status: response.status, data });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}

module.exports = { createGameRouter, ensureGameSchema, getGameStatus };
