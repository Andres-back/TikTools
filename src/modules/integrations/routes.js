'use strict';

const express = require('express');
const { authenticateToken } = require('../../shared/middlewares/auth');
const { encryptSecret } = require('./secret-box');
const { validateHttpConfig } = require('./http-client');
const { validateRconCommand, validateRconConfig } = require('./rcon-client');
const { buildTemplateContext, renderTemplate } = require('./template');

const EVENT_TYPES = new Set(['any', 'gift', 'like', 'follow', 'share', 'subscribe', 'chat', 'member', 'roomUser']);
const testWindows = new Map();

function createIntegrationRouter(options = {}) {
  const db = options.db;
  const engine = options.engine;
  if (!db?.query || !engine) throw new TypeError('createIntegrationRouter requiere db y engine');

  const router = express.Router();
  router.use(authenticateToken);

  router.get('/', asyncRoute(async (req, res) => {
    const result = await db.query(
      `SELECT id, name, kind, config_json, enabled, status, consecutive_failures,
              circuit_open_until, last_tested_at, created_at, updated_at,
              CASE WHEN secret_ciphertext IS NULL THEN 0 ELSE 1 END AS has_secret
       FROM integration_connections WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.userId]
    );
    res.json((result.rows || []).map(publicConnection));
  }));

  router.post('/', asyncRoute(async (req, res) => {
    const userId = req.user.userId;
    const name = cleanText(req.body.name, 120);
    const kind = String(req.body.kind || '').toLowerCase();
    if (!name || !['http', 'rcon'].includes(kind)) return res.status(400).json({ error: 'Nombre y tipo http/rcon requeridos' });

    const prepared = prepareConnection(kind, req.body.config || {}, req.body.secret || {});
    const encrypted = encryptSecret(prepared.secret, { userId, kind });
    const result = await db.query(
      `INSERT INTO integration_connections (user_id, name, kind, config_json, secret_ciphertext)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, name, kind, config_json, enabled, status, created_at`,
      [userId, name, kind, JSON.stringify(prepared.config), encrypted]
    );
    res.status(201).json(publicConnection({ ...result.rows[0], has_secret: 1 }));
  }));

  router.put('/:id', asyncRoute(async (req, res) => {
    const connection = await ownedConnection(db, req.user.userId, req.params.id);
    if (!connection) return res.status(404).json({ error: 'Integración no encontrada' });
    const name = cleanText(req.body.name || connection.name, 120);
    const enabled = req.body.enabled === undefined ? Number(connection.enabled) : (req.body.enabled ? 1 : 0);
    let configJson = connection.config_json;
    let secretCiphertext = connection.secret_ciphertext;
    if (req.body.config || req.body.secret) {
      const existingConfig = parseJson(connection.config_json, {});
      const prepared = prepareConnection(connection.kind, req.body.config || existingConfig, req.body.secret || null, { preserveSecret: !req.body.secret });
      configJson = JSON.stringify(prepared.config);
      if (req.body.secret) secretCiphertext = encryptSecret(prepared.secret, { userId: req.user.userId, kind: connection.kind });
    }
    const result = await db.query(
      `UPDATE integration_connections
       SET name = $1, enabled = $2, config_json = $3, secret_ciphertext = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND user_id = $6
       RETURNING id, name, kind, config_json, enabled, status, consecutive_failures, circuit_open_until, last_tested_at, updated_at`,
      [name, enabled, configJson, secretCiphertext, connection.id, req.user.userId]
    );
    res.json(publicConnection({ ...result.rows[0], has_secret: secretCiphertext ? 1 : 0 }));
  }));

  router.delete('/:id', asyncRoute(async (req, res) => {
    const result = await db.query(
      `DELETE FROM integration_connections WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.id, req.user.userId]
    );
    if (!result.rows?.length) return res.status(404).json({ error: 'Integración no encontrada' });
    res.json({ ok: true });
  }));

  router.post('/:id/test', asyncRoute(async (req, res) => {
    if (!consumeTestQuota(req.user.userId)) return res.status(429).json({ error: 'Máximo 5 pruebas cada 10 minutos' });
    const connection = await ownedConnection(db, req.user.userId, req.params.id);
    if (!connection) return res.status(404).json({ error: 'Integración no encontrada' });
    const action = {};
    if (connection.kind === 'rcon' && req.body.commandTemplate) action.commandTemplate = cleanText(req.body.commandTemplate, 2048, true);
    if (connection.kind === 'http' && req.body.bodyTemplate) action.bodyTemplate = req.body.bodyTemplate;
    const result = await engine.testConnection(req.user.userId, connection, action);
    res.json(result);
  }));

  router.get('/rules/list', asyncRoute(async (req, res) => {
    const result = await db.query(
      `SELECT r.*, c.name AS connection_name, c.kind AS connection_kind
       FROM integration_rules r JOIN integration_connections c ON c.id = r.connection_id
       WHERE r.user_id = $1 ORDER BY r.created_at DESC`,
      [req.user.userId]
    );
    res.json((result.rows || []).map(publicRule));
  }));

  router.post('/rules', asyncRoute(async (req, res) => {
    const userId = req.user.userId;
    const connection = await ownedConnection(db, userId, req.body.connectionId);
    if (!connection) return res.status(404).json({ error: 'Integración no encontrada' });
    const rule = prepareRule(req.body, connection);
    const result = await db.query(
      `INSERT INTO integration_rules
       (user_id, connection_id, name, event_type, conditions_json, action_json, global_cooldown_ms, user_cooldown_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [userId, connection.id, rule.name, rule.eventType, JSON.stringify(rule.conditions), JSON.stringify(rule.action), rule.globalCooldownMs, rule.userCooldownMs]
    );
    res.status(201).json(publicRule({ ...result.rows[0], connection_name: connection.name, connection_kind: connection.kind }));
  }));

  router.put('/rules/:id/toggle', asyncRoute(async (req, res) => {
    const result = await db.query(
      `UPDATE integration_rules SET enabled = CASE WHEN enabled = 1 THEN 0 ELSE 1 END, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2 RETURNING id, enabled`,
      [req.params.id, req.user.userId]
    );
    if (!result.rows?.length) return res.status(404).json({ error: 'Regla no encontrada' });
    res.json(result.rows[0]);
  }));

  router.delete('/rules/:id', asyncRoute(async (req, res) => {
    const result = await db.query(`DELETE FROM integration_rules WHERE id = $1 AND user_id = $2 RETURNING id`, [req.params.id, req.user.userId]);
    if (!result.rows?.length) return res.status(404).json({ error: 'Regla no encontrada' });
    res.json({ ok: true });
  }));

  router.get('/runs/history', asyncRoute(async (req, res) => {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
    // Filtro opcional por tipo de conexión (http | rcon).
    const kind = req.query.kind && ['http', 'rcon'].includes(String(req.query.kind)) ? String(req.query.kind) : null;
    const params = kind ? [req.user.userId, limit, kind] : [req.user.userId, limit];
    const result = await db.query(
      `SELECT x.id, x.rule_id, x.connection_id, x.event_type, x.status, x.request_summary,
              x.response_excerpt, x.error_code, x.error_message, x.duration_ms, x.created_at, x.finished_at,
              r.name AS rule_name, c.name AS connection_name, c.kind AS connection_kind
       FROM integration_runs x
       LEFT JOIN integration_rules r ON r.id = x.rule_id
       JOIN integration_connections c ON c.id = x.connection_id
       WHERE x.user_id = $1${kind ? ' AND c.kind = $3' : ''} ORDER BY x.created_at DESC LIMIT $2`,
      params
    );
    res.json(result.rows || []);
  }));

  router.use((error, _req, res, _next) => {
    const status = error.code === 'INTEGRATIONS_KEY_MISSING' || error.code === 'INTEGRATIONS_KEY_INVALID' ? 503 : 400;
    res.status(status).json({ error: safeMessage(error.message), code: error.code || 'INTEGRATION_ERROR' });
  });

  return router;
}

function prepareConnection(kind, config, secret, options = {}) {
  if (kind === 'rcon') {
    const safeConfig = validateRconConfig(config);
    if (!options.preserveSecret && !String(secret?.password || '')) throw requestError('Contraseña RCON requerida');
    return { config: safeConfig, secret: { password: String(secret?.password || '').slice(0, 256) } };
  }

  const safeConfig = validateHttpConfig(config);
  const parsedUrl = new URL(safeConfig.url);
  const headers = { ...(secret?.headers && typeof secret.headers === 'object' ? secret.headers : {}) };
  if (secret?.bearerToken) headers.Authorization = `Bearer ${String(secret.bearerToken).slice(0, 1800)}`;
  return {
    config: {
      method: safeConfig.method,
      timeoutMs: safeConfig.timeoutMs,
      targetHost: parsedUrl.hostname
    },
    secret: {
      url: safeConfig.url,
      headers,
      signingSecret: String(secret?.signingSecret || '').slice(0, 512)
    }
  };
}

function prepareRule(input, connection) {
  const name = cleanText(input.name, 160);
  const eventType = String(input.eventType || 'gift');
  if (!name || !EVENT_TYPES.has(eventType)) throw requestError('Nombre o evento inválido');
  const conditions = sanitizeConditions(input.conditions || {});
  const globalCooldownMs = bounded(input.globalCooldownMs, eventType === 'like' ? 3000 : 1000, 3600000, 5000);
  const userCooldownMs = bounded(input.userCooldownMs, 0, 3600000, 15000);

  let action;
  if (connection.kind === 'rcon') {
    const commandTemplate = cleanText(input.action?.commandTemplate, 2048, true);
    if (!commandTemplate || commandTemplate.startsWith('{{') || commandTemplate.startsWith('%')) throw requestError('El comando debe comenzar por una operación fija permitida');
    const context = buildTemplateContext({ type: eventType, data: {} }, String(connection.user_id));
    const preview = renderTemplate(commandTemplate, context, { mode: 'rcon', maxLength: 2048 });
    validateRconCommand(preview, parseJson(connection.config_json, {}).allowedCommands);
    action = { commandTemplate };
  } else {
    const bodyTemplate = input.action?.bodyTemplate || null;
    if (bodyTemplate && Buffer.byteLength(JSON.stringify(bodyTemplate), 'utf8') > 32768) throw requestError('Body template demasiado grande');
    action = bodyTemplate ? { bodyTemplate } : {};
  }
  return { name, eventType, conditions, action, globalCooldownMs, userCooldownMs };
}

function sanitizeConditions(input) {
  const output = {};
  if (input.minCoins !== undefined) output.minCoins = bounded(input.minCoins, 0, 1000000000, 0);
  if (input.maxCoins !== undefined) output.maxCoins = bounded(input.maxCoins, 0, 1000000000, 1000000000);
  if (input.minLikes !== undefined) output.minLikes = bounded(input.minLikes, 1, 1000000, 1);
  if (input.giftId) output.giftId = cleanText(input.giftId, 100);
  if (input.giftName) output.giftName = cleanText(input.giftName, 100);
  if (input.chatCommand) output.chatCommand = cleanText(input.chatCommand, 80);
  if (input.subscriberOnly) output.subscriberOnly = true;
  if (input.moderatorOnly) output.moderatorOnly = true;
  return output;
}

async function ownedConnection(db, userId, id) {
  const result = await db.query(`SELECT * FROM integration_connections WHERE id = $1 AND user_id = $2`, [id, userId]);
  return result.rows?.[0] || null;
}

function publicConnection(row) {
  const config = parseJson(row.config_json, {});
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    config,
    enabled: Boolean(Number(row.enabled)),
    status: row.status,
    consecutiveFailures: Number(row.consecutive_failures) || 0,
    circuitOpenUntil: row.circuit_open_until || null,
    lastTestedAt: row.last_tested_at || null,
    hasSecret: Boolean(Number(row.has_secret)),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function publicRule(row) {
  return {
    id: row.id,
    connectionId: row.connection_id,
    connectionName: row.connection_name,
    connectionKind: row.connection_kind,
    name: row.name,
    eventType: row.event_type,
    conditions: parseJson(row.conditions_json, {}),
    action: parseJson(row.action_json, {}),
    globalCooldownMs: Number(row.global_cooldown_ms) || 0,
    userCooldownMs: Number(row.user_cooldown_ms) || 0,
    enabled: Boolean(Number(row.enabled)),
    lastTriggeredAt: row.last_triggered_at,
    createdAt: row.created_at
  };
}

function consumeTestQuota(userId) {
  const now = Date.now();
  const key = String(userId);
  const attempts = (testWindows.get(key) || []).filter((timestamp) => now - timestamp < 600000);
  if (attempts.length >= 5) return false;
  attempts.push(now);
  testWindows.set(key, attempts);
  return true;
}

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function parseJson(value, fallback) {
  if (value && typeof value === 'object') return value;
  try { return JSON.parse(value || ''); } catch { return fallback; }
}

function cleanText(value, maxLength, allowNewlines = false) {
  let output = String(value || '').trim().replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '');
  if (!allowNewlines) output = output.replace(/[\r\n]/g, ' ');
  return output.slice(0, maxLength);
}

function bounded(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, Math.round(number))) : fallback;
}

function requestError(message) {
  const error = new Error(message);
  error.code = 'VALIDATION_ERROR';
  return error;
}

function safeMessage(message) {
  return String(message || 'Error de integración').replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, 300);
}

module.exports = { createIntegrationRouter, prepareConnection, prepareRule, publicConnection, publicRule };
