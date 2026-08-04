'use strict';

/**
 * Game (Kaetram) — esquema de base de datos.
 * Tabla propia para la configuración del juego (funciona en PostgreSQL y SQLite).
 */

async function ensureGameSchema(db) {
  if (!db || typeof db.query !== 'function') throw new TypeError('Base de datos no inicializada');
  await db.query(`CREATE TABLE IF NOT EXISTS game_settings (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    config_json TEXT NOT NULL DEFAULT '{}',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
}

module.exports = { ensureGameSchema };
