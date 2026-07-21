'use strict';

async function ensureIntegrationSchema(db) {
  if (!db || typeof db.query !== 'function') throw new TypeError('Base de datos no inicializada');
  const statements = process.env.DATABASE_URL ? postgresStatements() : sqliteStatements();
  for (const statement of statements) await db.query(statement);
}

function sqliteStatements() {
  return [
    `CREATE TABLE IF NOT EXISTS integration_connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      kind TEXT NOT NULL CHECK(kind IN ('http', 'rcon')),
      config_json TEXT NOT NULL DEFAULT '{}',
      secret_ciphertext TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'untested',
      consecutive_failures INTEGER NOT NULL DEFAULT 0,
      circuit_open_until DATETIME,
      last_tested_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    'CREATE INDEX IF NOT EXISTS idx_integration_connections_user ON integration_connections(user_id)',
    `CREATE TABLE IF NOT EXISTS integration_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      connection_id INTEGER NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      event_type TEXT NOT NULL,
      conditions_json TEXT NOT NULL DEFAULT '{}',
      action_json TEXT NOT NULL DEFAULT '{}',
      global_cooldown_ms INTEGER NOT NULL DEFAULT 5000,
      user_cooldown_ms INTEGER NOT NULL DEFAULT 15000,
      enabled INTEGER NOT NULL DEFAULT 1,
      last_triggered_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    'CREATE INDEX IF NOT EXISTS idx_integration_rules_user_event ON integration_rules(user_id, event_type, enabled)',
    `CREATE TABLE IF NOT EXISTS integration_runs (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rule_id INTEGER REFERENCES integration_rules(id) ON DELETE SET NULL,
      connection_id INTEGER NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
      event_key TEXT NOT NULL,
      event_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      request_summary TEXT,
      response_excerpt TEXT,
      error_code TEXT,
      error_message TEXT,
      duration_ms INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      finished_at DATETIME,
      UNIQUE(rule_id, event_key)
    )`,
    'CREATE INDEX IF NOT EXISTS idx_integration_runs_user_created ON integration_runs(user_id, created_at)',
    `CREATE TABLE IF NOT EXISTS integration_event_receipts (
      user_id INTEGER NOT NULL,
      event_key TEXT NOT NULL,
      event_type TEXT NOT NULL,
      received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(user_id, event_key)
    )`
  ];
}

function postgresStatements() {
  return [
    `CREATE TABLE IF NOT EXISTS integration_connections (
      id BIGSERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(120) NOT NULL,
      kind VARCHAR(20) NOT NULL CHECK(kind IN ('http', 'rcon')),
      config_json TEXT NOT NULL DEFAULT '{}',
      secret_ciphertext TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      status VARCHAR(30) NOT NULL DEFAULT 'untested',
      consecutive_failures INTEGER NOT NULL DEFAULT 0,
      circuit_open_until TIMESTAMP,
      last_tested_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    'CREATE INDEX IF NOT EXISTS idx_integration_connections_user ON integration_connections(user_id)',
    `CREATE TABLE IF NOT EXISTS integration_rules (
      id BIGSERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      connection_id BIGINT NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
      name VARCHAR(160) NOT NULL,
      event_type VARCHAR(50) NOT NULL,
      conditions_json TEXT NOT NULL DEFAULT '{}',
      action_json TEXT NOT NULL DEFAULT '{}',
      global_cooldown_ms INTEGER NOT NULL DEFAULT 5000,
      user_cooldown_ms INTEGER NOT NULL DEFAULT 15000,
      enabled INTEGER NOT NULL DEFAULT 1,
      last_triggered_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    'CREATE INDEX IF NOT EXISTS idx_integration_rules_user_event ON integration_rules(user_id, event_type, enabled)',
    `CREATE TABLE IF NOT EXISTS integration_runs (
      id UUID PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rule_id BIGINT REFERENCES integration_rules(id) ON DELETE SET NULL,
      connection_id BIGINT NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
      event_key TEXT NOT NULL,
      event_type VARCHAR(50) NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'queued',
      request_summary TEXT,
      response_excerpt TEXT,
      error_code VARCHAR(80),
      error_message TEXT,
      duration_ms INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      finished_at TIMESTAMP,
      UNIQUE(rule_id, event_key)
    )`,
    'CREATE INDEX IF NOT EXISTS idx_integration_runs_user_created ON integration_runs(user_id, created_at DESC)',
    `CREATE TABLE IF NOT EXISTS integration_event_receipts (
      user_id INTEGER NOT NULL,
      event_key TEXT NOT NULL,
      event_type VARCHAR(50) NOT NULL,
      received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(user_id, event_key)
    )`
  ];
}

module.exports = { ensureIntegrationSchema, postgresStatements, sqliteStatements };
