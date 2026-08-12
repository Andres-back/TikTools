'use strict';

/**
 * Minecraft (Crafty Controller) — API de integración.
 * Endpoints:
 *   GET  /api/minecraft/status  → estado del servidor (online, jugadores, puertos)
 *   POST /api/minecraft/start   → arranca el servidor en Crafty y espera a que responda
 *   POST /api/minecraft/stop    → detiene el servidor en Crafty
 *   GET  /api/minecraft/config  → dirección de conexión (playit.gg), puertos, panel
 */

const express = require('express');
const net = require('node:net');
const { authenticateToken } = require('../../shared/middlewares/auth');
const { minecraftEnvConfig, craftyConfigError } = require('./config');
const { craftyApi } = require('./crafty');
const { validateRconCommand } = require('../integrations/rcon-client');
const { GAME_MODES, getGameMode, renderGameModeRules } = require('./game-modes');

const STATUS_TIMEOUT = 1500;
const START_POLL_MS = 60000;
const MC_VERSION_HINT = 'Paper 1.21.9';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** ¿El puerto del servidor responde TCP? */
function isPortOpen(host, port, timeoutMs = STATUS_TIMEOUT) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const done = (value) => {
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
    socket.connect(Number(port), host);
  });
}

/** Consulta jugadores online vía la API de estado de Crafty (tolerante a fallos). */
async function fetchCraftyPlayers(cfg) {
  try {
    const data = await craftyApi('GET', '/api/v2/servers/status');
    const list = Array.isArray(data) ? data : data?.data ?? [];
    const entry = list.find((item) => String(item?.server_id ?? item?.id ?? '') === cfg.craftyServerId);
    if (entry && Array.isArray(entry.players)) {
      return {
        online: entry.players.filter((p) => p && typeof p === 'object' && p.online !== false).length,
        max: Number(entry.max_players || entry.max || 0)
      };
    }
    return { online: null, max: null };
  } catch {
    return { online: null, max: null };
  }
}

function createMinecraftRouter(options = {}) {
  const db = options.db;
  const router = express.Router();

  router.get('/game-modes', authenticateToken, (_req, res) => {
    res.json(GAME_MODES);
  });

  router.post('/game-modes/:id/install', authenticateToken, async (req, res) => {
    try {
      if (!db?.query) return res.status(503).json({ error: 'Base de datos de integraciones no disponible' });
      const mode = getGameMode(req.params.id);
      if (!mode) return res.status(404).json({ error: 'Modo de juego no encontrado' });

      const userId = req.user.userId;
      const connectionResult = await db.query(
        `SELECT * FROM integration_connections WHERE id = $1 AND user_id = $2`,
        [req.body.connectionId, userId]
      );
      const connection = connectionResult.rows?.[0];
      if (!connection || connection.kind !== 'rcon') return res.status(404).json({ error: 'Selecciona una conexion RCON valida' });

      const rules = renderGameModeRules(mode, req.body.playerName);
      const config = parseJson(connection.config_json, {});
      for (const rule of rules) validateRconCommand(rule.action.commandTemplate, config.allowedCommands);

      const existingResult = await db.query(
        `SELECT name FROM integration_rules WHERE user_id = $1 AND connection_id = $2`,
        [userId, connection.id]
      );
      const existingNames = new Set((existingResult.rows || []).map((row) => row.name));
      let installed = 0;
      let skipped = 0;

      for (const rule of rules) {
        if (existingNames.has(rule.name)) { skipped += 1; continue; }
        await db.query(
          `INSERT INTO integration_rules
           (user_id, connection_id, name, event_type, conditions_json, action_json, global_cooldown_ms, user_cooldown_ms)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [userId, connection.id, rule.name, rule.eventType, JSON.stringify(rule.conditions), JSON.stringify(rule.action), rule.globalCooldownMs, rule.userCooldownMs]
        );
        installed += 1;
      }

      res.status(installed ? 201 : 200).json({ ok: true, modeId: mode.id, installed, skipped, setupCommand: mode.setupCommand || null });
    } catch (e) {
      res.status(400).json({ error: e.message, code: e.code || 'MC_MODE_INSTALL_FAILED' });
    }
  });

  router.get('/status', authenticateToken, async (_req, res) => {
    try {
      const cfg = minecraftEnvConfig();
      const online = await isPortOpen('127.0.0.1', cfg.serverPort, 1200);
      const players = online ? await fetchCraftyPlayers(cfg) : { online: null, max: null };
      res.json({
        online,
        version: online ? MC_VERSION_HINT : null,
        serverPort: cfg.serverPort,
        rconPort: cfg.rconPort,
        players
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/start', authenticateToken, async (_req, res) => {
    try {
      const cfg = minecraftEnvConfig();
      const configError = craftyConfigError(cfg);
      if (configError) return res.status(503).json({ ok: false, error: configError });

      await craftyApi('POST', `/api/v2/servers/${cfg.craftyServerId}/action/start_server`, {});
      const deadline = Date.now() + START_POLL_MS;
      while (Date.now() < deadline) {
        await sleep(2000);
        if (await isPortOpen('127.0.0.1', cfg.serverPort, 1200)) {
          return res.json({ ok: true, online: true });
        }
      }
      return res.status(504).json({ ok: false, error: 'El servidor no respondió a tiempo (~60 s)' });
    } catch (e) {
      res.status(502).json({ ok: false, error: e.message });
    }
  });

  router.post('/stop', authenticateToken, async (_req, res) => {
    try {
      const cfg = minecraftEnvConfig();
      const configError = craftyConfigError(cfg);
      if (configError) return res.status(503).json({ ok: false, error: configError });

      await craftyApi('POST', `/api/v2/servers/${cfg.craftyServerId}/action/stop_server`, {});
      // Espera razonable a que el puerto se libere.
      for (let i = 0; i < 20; i += 1) {
        if (!(await isPortOpen('127.0.0.1', cfg.serverPort, 800))) {
          return res.json({ ok: true, online: false });
        }
        await sleep(1000);
      }
      res.json({ ok: true, online: true, warning: 'El puerto sigue respondiendo; verifica en el panel de Crafty' });
    } catch (e) {
      res.status(502).json({ ok: false, error: e.message });
    }
  });

  router.get('/config', authenticateToken, async (_req, res) => {
    try {
      const cfg = minecraftEnvConfig();
      res.json({
        playitUrl: cfg.playitUrl,
        serverPort: cfg.serverPort,
        rconPort: cfg.rconPort,
        craftyUrl: cfg.craftyUrl,
        version: MC_VERSION_HINT,
        craftyConfigured: !craftyConfigError(cfg)
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}

module.exports = { createMinecraftRouter, isPortOpen, MC_VERSION_HINT };

function parseJson(value, fallback) {
  if (value && typeof value === 'object') return value;
  try { return JSON.parse(value || ''); } catch { return fallback; }
}
