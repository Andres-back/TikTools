'use strict';

const crypto = require('crypto');
const { decryptSecret } = require('./secret-box');
const { executeHttpWebhook } = require('./http-client');
const { RconClient, validateRconCommand, validateRconConfig } = require('./rcon-client');
const { buildTemplateContext, matchesConditions, renderJsonTemplate, renderTemplate } = require('./template');

class IntegrationEngine {
  constructor(options = {}) {
    if (!options.db?.query) throw new TypeError('IntegrationEngine requiere db.query');
    this.db = options.db;
    this.broadcast = typeof options.broadcastToChannel === 'function' ? options.broadcastToChannel : () => {};
    this.userCooldowns = new Map();
    this.connectionChains = new Map();
  }

  async handleLiveEvent(channelId, event) {
    const userId = positiveInteger(channelId);
    if (!userId || !event?.type || ['giftProgress', 'connected', 'disconnected', 'streamEnd', 'error'].includes(event.type)) return [];
    const eventKey = eventIdentity(event);

    const receipt = await this.db.query(
      `INSERT INTO integration_event_receipts (user_id, event_key, event_type)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, event_key) DO NOTHING RETURNING event_key`,
      [userId, eventKey, event.type]
    );
    if (!receipt.rows?.length) return [];

    const result = await this.db.query(
      `SELECT r.*, c.kind, c.name AS connection_name, c.config_json AS connection_config,
              c.secret_ciphertext, c.status AS connection_status, c.consecutive_failures,
              c.circuit_open_until
       FROM integration_rules r
       JOIN integration_connections c ON c.id = r.connection_id
       WHERE r.user_id = $1 AND r.enabled = 1 AND c.enabled = 1
         AND (r.event_type = $2 OR r.event_type = 'any')
       ORDER BY r.id ASC`,
      [userId, event.type]
    );

    const executions = [];
    for (const rule of result.rows || []) {
      const conditions = parseJson(rule.conditions_json, {});
      if (!matchesConditions(conditions, event)) continue;
      executions.push(this.claimAndQueueRule({ channelId: String(channelId), userId, rule, event, eventKey }));
    }
    return Promise.allSettled(executions);
  }

  async claimAndQueueRule(context) {
    const { rule, event } = context;
    const globalCooldown = Math.max(event.type === 'like' ? 3000 : 1000, bounded(rule.global_cooldown_ms, 0, 3600000, 5000));
    const threshold = dbTimestamp(Date.now() - globalCooldown);
    const claimed = await this.db.query(
      `UPDATE integration_rules SET last_triggered_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2
         AND (last_triggered_at IS NULL OR last_triggered_at <= $3)
       RETURNING id`,
      [rule.id, context.userId, threshold]
    );
    if (!claimed.rows?.length) return { status: 'cooldown', ruleId: rule.id };

    const actor = String(event.data?.userId || event.data?.uniqueId || 'anonymous').slice(0, 128);
    const userCooldown = bounded(rule.user_cooldown_ms, 0, 3600000, 15000);
    const userKey = `${rule.id}:${actor}`;
    const nextAllowed = this.userCooldowns.get(userKey) || 0;
    if (Date.now() < nextAllowed) return { status: 'user_cooldown', ruleId: rule.id };
    this.userCooldowns.set(userKey, Date.now() + userCooldown);
    this.pruneCooldowns();

    return this.createAndQueueRun(context);
  }

  async createAndQueueRun(context) {
    const runId = crypto.randomUUID();
    const { userId, rule, event, eventKey, channelId } = context;
    const inserted = await this.db.query(
      `INSERT INTO integration_runs
       (id, user_id, rule_id, connection_id, event_key, event_type, status, request_summary)
       VALUES ($1, $2, $3, $4, $5, $6, 'queued', $7)
       ON CONFLICT (rule_id, event_key) DO NOTHING RETURNING id`,
      [runId, userId, rule.id, rule.connection_id, eventKey, event.type, safeSummary(event)]
    );
    if (!inserted.rows?.length) return { status: 'duplicate', ruleId: rule.id };

    this.broadcast(channelId, {
      type: 'interactionQueued',
      data: publicResult({ runId, rule, event, status: 'queued' })
    });

    return this.enqueue(rule.connection_id, () => this.executeRun({ ...context, runId }));
  }

  async executeRun(context) {
    const startedAt = Date.now();
    const { runId, rule, userId, event, channelId } = context;
    const openUntil = rule.circuit_open_until ? new Date(rule.circuit_open_until).getTime() : 0;
    if (Number.isFinite(openUntil) && openUntil > Date.now()) {
      await this.finishRun(runId, 'skipped', startedAt, { code: 'CIRCUIT_OPEN', message: 'Conexión pausada temporalmente por fallos consecutivos' });
      const result = publicResult({ runId, rule, event, status: 'skipped', errorCode: 'CIRCUIT_OPEN' });
      this.broadcast(channelId, { type: 'interactionResult', data: result });
      return result;
    }

    await this.db.query(`UPDATE integration_runs SET status = 'running' WHERE id = $1`, [runId]);
    try {
      const config = parseJson(rule.connection_config, {});
      const action = parseJson(rule.action_json, {});
      const secret = decryptSecret(rule.secret_ciphertext, { userId, kind: rule.kind }) || {};
      const templateContext = buildTemplateContext(event, channelId);
      let execution;

      if (rule.kind === 'rcon') {
        const safeConfig = validateRconConfig(config);
        const command = renderTemplate(action.commandTemplate || '', templateContext, { mode: 'rcon', maxLength: 2048 });
        const safeCommand = validateRconCommand(command, safeConfig.allowedCommands);
        const client = new RconClient({ host: safeConfig.host, port: safeConfig.port, password: secret.password });
        execution = await client.execute(safeCommand);
      } else if (rule.kind === 'http') {
        const payload = action.bodyTemplate
          ? renderJsonTemplate(action.bodyTemplate, templateContext)
          : canonicalWebhookPayload(runId, event, templateContext);
        const httpConfig = { ...config, url: secret.url };
        execution = await executeHttpWebhook({ config: httpConfig, secret, payload, deliveryId: runId });
        if (!execution.ok) {
          const error = new Error(`Webhook respondió HTTP ${execution.status}`);
          error.code = 'HTTP_NON_SUCCESS';
          error.response = execution.response;
          throw error;
        }
      } else {
        const error = new Error('Tipo de integración no soportado');
        error.code = 'INTEGRATION_KIND_UNSUPPORTED';
        throw error;
      }

      const response = String(execution.response || '').slice(0, 4096);
      await this.finishRun(runId, 'succeeded', startedAt, { response });
      await this.markConnectionSuccess(rule.connection_id);
      const result = publicResult({ runId, rule, event, status: 'succeeded', durationMs: Date.now() - startedAt });
      this.broadcast(channelId, { type: 'interactionResult', data: result });
      return result;
    } catch (error) {
      const code = safeErrorCode(error.code);
      const status = code === 'RCON_RESULT_UNKNOWN' ? 'unknown' : 'failed';
      await this.finishRun(runId, status, startedAt, { code, message: safeErrorMessage(error.message), response: error.response });
      await this.markConnectionFailure(rule.connection_id, Number(rule.consecutive_failures) || 0);
      const result = publicResult({ runId, rule, event, status, errorCode: code, durationMs: Date.now() - startedAt });
      this.broadcast(channelId, { type: 'interactionResult', data: result });
      return result;
    }
  }

  async testConnection(userId, connection, action = {}) {
    const runId = crypto.randomUUID();
    const eventKey = `test:${runId}`;
    await this.db.query(
      `INSERT INTO integration_runs
       (id, user_id, rule_id, connection_id, event_key, event_type, status, request_summary)
       VALUES ($1, $2, NULL, $3, $4, 'test', 'queued', 'Prueba manual')`,
      [runId, userId, connection.id, eventKey]
    );

    const rule = {
      ...connection,
      connection_id: connection.id,
      connection_config: connection.config_json,
      action_json: JSON.stringify(connection.kind === 'rcon'
        ? { commandTemplate: action.commandTemplate || 'say TikToolStream conectado' }
        : { bodyTemplate: action.bodyTemplate || { source: 'tiktoolstream', type: 'connection.test', message: 'Conexión verificada' } }),
      name: `Prueba · ${connection.name}`
    };
    return this.enqueue(connection.id, () => this.executeRun({
      runId,
      channelId: String(userId),
      userId,
      rule,
      eventKey,
      event: { type: 'test', data: { nickname: 'TikToolStream', uniqueId: 'tiktoolstream' } }
    }));
  }

  enqueue(connectionId, worker) {
    const key = String(connectionId);
    const previous = this.connectionChains.get(key) || Promise.resolve();
    const current = previous.catch(() => {}).then(worker);
    this.connectionChains.set(key, current);
    current.finally(() => { if (this.connectionChains.get(key) === current) this.connectionChains.delete(key); });
    return current;
  }

  async finishRun(runId, status, startedAt, details = {}) {
    await this.db.query(
      `UPDATE integration_runs
       SET status = $1, response_excerpt = $2, error_code = $3, error_message = $4,
           duration_ms = $5, finished_at = CURRENT_TIMESTAMP
       WHERE id = $6`,
      [status, safeResponse(details.response), details.code || null, details.message || null, Date.now() - startedAt, runId]
    );
  }

  async markConnectionSuccess(connectionId) {
    await this.db.query(
      `UPDATE integration_connections
       SET status = 'connected', consecutive_failures = 0, circuit_open_until = NULL,
           last_tested_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [connectionId]
    );
  }

  async markConnectionFailure(connectionId, previousFailures) {
    const failures = previousFailures + 1;
    const openUntil = failures >= 5 ? dbTimestamp(Date.now() + 60000) : null;
    await this.db.query(
      `UPDATE integration_connections
       SET status = 'error', consecutive_failures = $1, circuit_open_until = $2,
           last_tested_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [failures, openUntil, connectionId]
    );
  }

  pruneCooldowns() {
    if (this.userCooldowns.size < 2000) return;
    const now = Date.now();
    for (const [key, expiresAt] of this.userCooldowns) if (expiresAt <= now) this.userCooldowns.delete(key);
  }
}

function eventIdentity(event) {
  const data = event.data || {};
  if (data.eventId) return `${event.type}:${String(data.eventId).slice(0, 180)}`;
  const fingerprint = JSON.stringify([
    event.type, data.timestamp || data.receivedAt || Date.now(), data.userId || data.uniqueId || '',
    data.giftId || '', data.repeatCount || '', data.comment || '', data.likeCount || ''
  ]);
  return `${event.type}:${crypto.createHash('sha256').update(fingerprint).digest('hex').slice(0, 32)}`;
}

function canonicalWebhookPayload(runId, event, context) {
  return {
    version: 'event_v1',
    deliveryId: runId,
    event: context.event,
    stream: context.stream,
    user: context.user,
    gift: context.gift,
    like: context.like,
    chat: context.chat,
    subscribe: context.subscribe,
    room: context.room,
    rawType: event.type
  };
}

function publicResult({ runId, rule, event, status, errorCode = '', durationMs = 0 }) {
  return {
    runId,
    ruleId: rule.id || null,
    ruleName: String(rule.name || 'Interacción').slice(0, 120),
    connectionKind: rule.kind,
    eventType: event.type,
    nickname: String(event.data?.nickname || event.data?.uniqueId || 'Viewer').slice(0, 48),
    uniqueId: String(event.data?.uniqueId || '').slice(0, 64),
    status,
    success: status === 'succeeded',
    errorCode: errorCode || undefined,
    durationMs
  };
}

function safeSummary(event) {
  const data = event.data || {};
  return JSON.stringify({
    type: event.type,
    user: String(data.uniqueId || data.userId || '').slice(0, 64),
    gift: String(data.giftName || '').slice(0, 80),
    coins: Number(data.coins) || 0
  }).slice(0, 1000);
}

function safeResponse(value) {
  return value ? String(value).replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, 4096) : null;
}

function safeErrorMessage(value) {
  return String(value || 'Falló la integración').replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, 300);
}

function safeErrorCode(value) {
  const code = String(value || 'INTEGRATION_FAILED').toUpperCase().replace(/[^A-Z0-9_]/g, '_');
  return code.slice(0, 80) || 'INTEGRATION_FAILED';
}

function parseJson(value, fallback) {
  if (value && typeof value === 'object') return value;
  try { return JSON.parse(value || ''); } catch { return fallback; }
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : 0;
}

function bounded(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

function dbTimestamp(value) {
  return new Date(value).toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
}

module.exports = {
  IntegrationEngine,
  canonicalWebhookPayload,
  eventIdentity,
  parseJson,
  publicResult
};
