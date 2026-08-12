'use strict';

const express = require('express');
const net = require('node:net');
const { authenticateToken } = require('../../shared/middlewares/auth');
const { minecraftEnvConfig, craftyConfigError } = require('./config');
const { craftyApi } = require('./crafty');
const { validateRconCommand } = require('../integrations/rcon-client');
const { GAME_MODES, getGameMode, presetIdFromName, presetPrefix, renderGameModeRules } = require('./game-modes');

const STATUS_TIMEOUT = 1500;
const START_POLL_MS = 60000;
const MC_VERSION_HINT = 'Paper 1.21.9';
const ruleTestWindows = new Map();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPortOpen(host, port, timeoutMs = STATUS_TIMEOUT) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const done = (value) => { socket.destroy(); resolve(value); };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
    socket.connect(Number(port), host);
  });
}

async function fetchCraftyPlayers(cfg) {
  try {
    const data = await craftyApi('GET', '/api/v2/servers/status');
    const list = Array.isArray(data) ? data : data?.data ?? [];
    const entry = list.find((item) => String(item?.server_id ?? item?.id ?? '') === cfg.craftyServerId);
    if (entry && Array.isArray(entry.players)) {
      const onlinePlayers = entry.players.filter((player) => player && typeof player === 'object' && player.online !== false);
      return {
        online: onlinePlayers.length,
        max: Number(entry.max_players || entry.max || 0),
        names: onlinePlayers.map((player) => String(player.name || player.username || '')).filter(Boolean).slice(0, 20)
      };
    }
    return { online: null, max: null, names: [] };
  } catch {
    return { online: null, max: null, names: [] };
  }
}

function createMinecraftRouter(options = {}) {
  const db = options.db;
  const engine = options.engine;
  const router = express.Router();

  router.get('/game-modes', authenticateToken, async (req, res) => {
    try {
      const connectionId = req.query.connectionId;
      if (!connectionId || !db?.query) return res.json(GAME_MODES.map((mode) => publicMode(mode, [])));
      const connection = await ownedRconConnection(db, req.user.userId, connectionId);
      if (!connection) return res.status(404).json({ error: 'Conexión RCON no encontrada' });
      const result = await db.query(
        `SELECT id, connection_id, name, conditions_json, action_json, enabled
         FROM integration_rules WHERE user_id = $1 AND connection_id = $2 AND name LIKE $3 ORDER BY id`,
        [req.user.userId, connection.id, '[TikGame:%']
      );
      res.json(GAME_MODES.map((mode) => publicMode(mode, result.rows || [])));
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/game-modes/:id/install', authenticateToken, async (req, res) => {
    try {
      if (!db?.query) return res.status(503).json({ error: 'Base de datos de integraciones no disponible' });
      const mode = getGameMode(req.params.id);
      if (!mode) return res.status(404).json({ error: 'Modo de juego no encontrado' });
      const userId = req.user.userId;
      const connection = await ownedRconConnection(db, userId, req.body.connectionId);
      if (!connection) return res.status(404).json({ error: 'Selecciona una conexión RCON válida' });

      const rules = renderGameModeRules(mode, req.body.playerName);
      const config = parseJson(connection.config_json, {});
      const requiredRoots = rules.map((rule) => rootCommand(rule.action.commandTemplate));
      config.allowedCommands = [...new Set([...(config.allowedCommands || []), ...requiredRoots])];
      for (const rule of rules) validateRconCommand(rule.action.commandTemplate, config.allowedCommands);
      await db.query(
        `UPDATE integration_connections SET config_json = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3`,
        [JSON.stringify(config), connection.id, userId]
      );

      const existingResult = await db.query(
        `SELECT id, name, action_json, enabled FROM integration_rules
         WHERE user_id = $1 AND connection_id = $2 AND name LIKE $3 ORDER BY id`,
        [userId, connection.id, `${presetPrefix(mode.id)}%`]
      );
      const existingRows = existingResult.rows || [];
      const byKey = new Map(existingRows.map((row) => [parseJson(row.action_json, {}).presetRuleKey, row]).filter(([key]) => key));
      let installed = 0;
      let updated = 0;

      for (let index = 0; index < rules.length; index += 1) {
        const rule = rules[index];
        const key = rule.action.presetRuleKey;
        const existing = byKey.get(key) || (existingRows.length === rules.length ? existingRows[index] : null);
        if (existing) {
          await db.query(
            `UPDATE integration_rules SET name = $1, event_type = $2, conditions_json = $3, action_json = $4,
                    global_cooldown_ms = $5, user_cooldown_ms = $6, updated_at = CURRENT_TIMESTAMP
             WHERE id = $7 AND user_id = $8`,
            [rule.name, rule.eventType, JSON.stringify(rule.conditions), JSON.stringify(rule.action), rule.globalCooldownMs, rule.userCooldownMs, existing.id, userId]
          );
          updated += 1;
        } else {
          await db.query(
            `INSERT INTO integration_rules
             (user_id, connection_id, name, event_type, conditions_json, action_json, global_cooldown_ms, user_cooldown_ms, enabled)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0)`,
            [userId, connection.id, rule.name, rule.eventType, JSON.stringify(rule.conditions), JSON.stringify(rule.action), rule.globalCooldownMs, rule.userCooldownMs]
          );
          installed += 1;
        }
      }
      res.status(installed ? 201 : 200).json({ ok: true, modeId: mode.id, installed, updated, setupCommand: mode.setupCommand || null });
    } catch (error) {
      res.status(400).json({ error: error.message, code: error.code || 'MC_MODE_INSTALL_FAILED' });
    }
  });

  router.put('/game-modes/:id/equip', authenticateToken, async (req, res) => {
    try {
      const mode = getGameMode(req.params.id);
      if (!mode) return res.status(404).json({ error: 'Modo de juego no encontrado' });
      const connection = await ownedRconConnection(db, req.user.userId, req.body.connectionId);
      if (!connection) return res.status(404).json({ error: 'Conexión RCON no encontrada' });
      const installed = await db.query(
        `SELECT id FROM integration_rules WHERE user_id = $1 AND connection_id = $2 AND name LIKE $3`,
        [req.user.userId, connection.id, `${presetPrefix(mode.id)}%`]
      );
      if ((installed.rows || []).length < mode.rules.length) {
        return res.status(409).json({ error: 'Instala o actualiza este preset antes de equiparlo' });
      }
      await db.query(
        `UPDATE integration_rules SET enabled = 0, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND connection_id = $2`,
        [req.user.userId, connection.id]
      );
      await db.query(
        `UPDATE integration_rules SET enabled = 1, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND connection_id = $2 AND name LIKE $3`,
        [req.user.userId, connection.id, `${presetPrefix(mode.id)}%`]
      );
      res.json({ ok: true, modeId: mode.id, equipped: true, enabledRules: mode.rules.length });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  router.put('/game-modes/:id/unequip', authenticateToken, async (req, res) => {
    try {
      const mode = getGameMode(req.params.id);
      if (!mode) return res.status(404).json({ error: 'Modo de juego no encontrado' });
      const connection = await ownedRconConnection(db, req.user.userId, req.body.connectionId);
      if (!connection) return res.status(404).json({ error: 'Conexión RCON no encontrada' });
      await db.query(
        `UPDATE integration_rules SET enabled = 0, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND connection_id = $2 AND name LIKE $3`,
        [req.user.userId, connection.id, `${presetPrefix(mode.id)}%`]
      );
      res.json({ ok: true, modeId: mode.id, equipped: false });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/rules/:id/test', authenticateToken, async (req, res) => {
    try {
      if (!engine?.testConnection) return res.status(503).json({ error: 'Motor de integraciones no disponible' });
      if (!consumeRuleTestQuota(req.user.userId)) return res.status(429).json({ error: 'Máximo 30 pruebas cada 10 minutos' });
      const result = await db.query(
        `SELECT r.*, c.name AS connection_name, c.kind, c.config_json, c.secret_ciphertext,
                c.status, c.consecutive_failures, c.circuit_open_until
         FROM integration_rules r JOIN integration_connections c ON c.id = r.connection_id
         WHERE r.id = $1 AND r.user_id = $2 AND c.kind = 'rcon'`,
        [req.params.id, req.user.userId]
      );
      const rule = result.rows?.[0];
      if (!rule) return res.status(404).json({ error: 'Regla RCON no encontrada' });
      const action = parseJson(rule.action_json, {});
      const connection = {
        id: rule.connection_id, name: rule.connection_name, kind: rule.kind,
        config_json: rule.config_json, secret_ciphertext: rule.secret_ciphertext,
        status: rule.status, consecutive_failures: rule.consecutive_failures,
        circuit_open_until: rule.circuit_open_until
      };
      const execution = await engine.testConnection(req.user.userId, connection, { commandTemplate: action.commandTemplate });
      const run = await db.query(`SELECT response_excerpt, error_code, error_message FROM integration_runs WHERE id = $1`, [execution.runId]);
      const details = run.rows?.[0] || {};
      const response = String(details.response_excerpt || '');
      const accepted = execution.success && !looksLikeCommandError(response);
      res.json({
        ...execution,
        success: accepted,
        response,
        errorCode: accepted ? undefined : (details.error_code || execution.errorCode || 'MC_COMMAND_REJECTED'),
        errorMessage: details.error_message || undefined
      });
    } catch (error) {
      res.status(400).json({ error: error.message, code: error.code || 'MC_RULE_TEST_FAILED' });
    }
  });

  router.get('/status', authenticateToken, async (_req, res) => {
    try {
      const cfg = minecraftEnvConfig();
      const online = await isPortOpen('127.0.0.1', cfg.serverPort, 1200);
      const players = online ? await fetchCraftyPlayers(cfg) : { online: null, max: null, names: [] };
      res.json({ online, version: online ? MC_VERSION_HINT : null, serverPort: cfg.serverPort, rconPort: cfg.rconPort, players });
    } catch (error) {
      res.status(500).json({ error: error.message });
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
        if (await isPortOpen('127.0.0.1', cfg.serverPort, 1200)) return res.json({ ok: true, online: true });
      }
      return res.status(504).json({ ok: false, error: 'El servidor no respondió a tiempo (~60 s)' });
    } catch (error) {
      res.status(502).json({ ok: false, error: error.message });
    }
  });

  router.post('/stop', authenticateToken, async (_req, res) => {
    try {
      const cfg = minecraftEnvConfig();
      const configError = craftyConfigError(cfg);
      if (configError) return res.status(503).json({ ok: false, error: configError });
      await craftyApi('POST', `/api/v2/servers/${cfg.craftyServerId}/action/stop_server`, {});
      for (let index = 0; index < 20; index += 1) {
        if (!(await isPortOpen('127.0.0.1', cfg.serverPort, 800))) return res.json({ ok: true, online: false });
        await sleep(1000);
      }
      res.json({ ok: true, online: true, warning: 'El puerto sigue respondiendo; verifica en Crafty' });
    } catch (error) {
      res.status(502).json({ ok: false, error: error.message });
    }
  });

  router.get('/config', authenticateToken, (_req, res) => {
    try {
      const cfg = minecraftEnvConfig();
      res.json({
        playitUrl: cfg.playitUrl, serverPort: cfg.serverPort, rconPort: cfg.rconPort,
        craftyUrl: cfg.craftyUrl, version: MC_VERSION_HINT, craftyConfigured: !craftyConfigError(cfg)
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

function publicMode(mode, rows) {
  const presetRows = rows.filter((row) => presetIdFromName(row.name) === mode.id);
  const byKey = new Map(presetRows.map((row) => [parseJson(row.action_json, {}).presetRuleKey, row]).filter(([key]) => key));
  const rules = mode.rules.map((rule, index) => {
    const row = byKey.get(rule.key) || (presetRows.length === mode.rules.length ? presetRows[index] : null);
    const action = parseJson(row?.action_json, {});
    return {
      ...rule,
      ruleId: row?.id || null,
      installed: Boolean(row),
      enabled: Boolean(Number(row?.enabled)),
      installedCommand: action.commandTemplate || null
    };
  });
  const installedCount = rules.filter((rule) => rule.installed).length;
  const enabledCount = rules.filter((rule) => rule.enabled).length;
  return {
    ...mode,
    rules,
    installedCount,
    installed: installedCount === mode.rules.length,
    equipped: installedCount === mode.rules.length && enabledCount === mode.rules.length,
    connectionId: presetRows[0]?.connection_id || null
  };
}

async function ownedRconConnection(db, userId, id) {
  if (!db?.query || !id) return null;
  const result = await db.query(
    `SELECT * FROM integration_connections WHERE id = $1 AND user_id = $2 AND kind = 'rcon'`,
    [id, userId]
  );
  return result.rows?.[0] || null;
}

function consumeRuleTestQuota(userId) {
  const now = Date.now();
  const key = String(userId);
  const attempts = (ruleTestWindows.get(key) || []).filter((timestamp) => now - timestamp < 600000);
  if (attempts.length >= 30) return false;
  attempts.push(now);
  ruleTestWindows.set(key, attempts);
  return true;
}

function rootCommand(command) {
  return String(command || '').trim().replace(/^\/+/, '').split(/\s+/, 1)[0].toLowerCase();
}

function looksLikeCommandError(response) {
  return /unknown (?:or incomplete )?command|incorrect argument|no (?:entity|player) was found|expected .+ at position|not found|error:/i.test(response);
}

function parseJson(value, fallback) {
  if (value && typeof value === 'object') return value;
  try { return JSON.parse(value || ''); } catch { return fallback; }
}

module.exports = {
  MC_VERSION_HINT,
  createMinecraftRouter,
  isPortOpen,
  looksLikeCommandError,
  publicMode,
  rootCommand
};
