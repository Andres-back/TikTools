/**
 * Configuración de Base de Datos
 * Soporta PostgreSQL (producción) y SQLite (desarrollo)
 */

const { Pool } = require('pg');
const path = require('path');

// Detectar entorno
const isProduction = process.env.NODE_ENV === 'production';

// Log de diagnóstico (solo en producción para debugging)
if (isProduction) {
  process.stdout.write(`🔍 Environment Check:\n`);
  process.stdout.write(`  NODE_ENV: ${process.env.NODE_ENV}\n`);
  process.stdout.write(`  DATABASE_URL: ${process.env.DATABASE_URL ? 'SET' : 'NOT SET'}\n`);
  process.stdout.write(`  JWT_SECRET: ${process.env.JWT_SECRET ? 'SET' : 'NOT SET'}\n`);
}

/**
 * Borra todos los usuarios (y datos relacionados por CASCADE)
 * ¡USAR CON PRECAUCIÓN!
 */
async function resetUsers() {
  if (!pool) return;

  try {
    if (process.env.DATABASE_URL) {
      await pool.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE');
    } else {
      await pool.query('DELETE FROM users');
      await pool.query('DELETE FROM sqlite_sequence WHERE name="users"');
    }
    console.log('⚠️ TODOS LOS USUARIOS HAN SIDO BORRADOS');
  } catch (error) {
    console.error('Error reseteando usuarios:', error);
  }
}

let pool = null;

/**
 * Inicializa la conexión a la base de datos
 */
async function initDatabase() {
  if (pool) return pool;

  try {
    if (process.env.DATABASE_URL) {
      // PostgreSQL (Digital Ocean, Heroku, etc.)
      const connectionString = process.env.DATABASE_URL;

      process.stdout.write(`🔗 Connecting to PostgreSQL...\n`);
      process.stdout.write(`   URL format: ${connectionString.split('@')[1]?.split('/')[0] || 'parsing...'}\n`);

      // Parsear la URL para extraer componentes
      const url = new URL(connectionString.replace('postgresql://', 'postgres://'));

      // Configuración explícita sin usar connectionString
      // Esto evita conflictos con sslmode en la URL
      pool = new Pool({
        user: url.username,
        password: decodeURIComponent(url.password), // Decodificar por si tiene caracteres especiales
        host: url.hostname,
        port: parseInt(url.port) || 5432,
        database: url.pathname.slice(1), // Remover el / inicial
        ssl: {
          rejectUnauthorized: false
        },
        max: 10,
        idleTimeoutMillis: 60000,
        connectionTimeoutMillis: 30000, // Aumentado a 30 segundos
        query_timeout: 60000, // Timeout de queries
        statement_timeout: 60000, // Timeout de statements
      });

      // Manejar errores del pool
      pool.on('error', (err) => {
        console.error('❌ Error inesperado en el pool de PostgreSQL:', err.message);
      });

      // Verificar conexión con timeout
      const testQuery = await Promise.race([
        pool.query('SELECT NOW()'),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout after 30s')), 30000)
        )
      ]);
      process.stdout.write('✓ PostgreSQL connected successfully\n');

      // Crear tablas si no existen
      await initPostgresSchema(pool);

      // Aplicar migraciones (verificación de correo)
      try {
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false');
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token TEXT');
        await pool.query('ALTER TABLE sound_alerts ADD COLUMN IF NOT EXISTS min_gift_value INTEGER DEFAULT 1');
      } catch (err) {
        console.warn('Migración de columnas falló (posiblemente ya existen):', err.message);
      }

      process.stdout.write('✓ PostgreSQL schema initialized\n');
    } else {
      // Fallback a SQLite para desarrollo local
      const Database = require('better-sqlite3');
      const dbPath = path.join(__dirname, '..', 'data', 'auction.db');

      // Crear directorio si no existe
      const fs = require('fs');
      const dataDir = path.dirname(dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      const sqlite = new Database(dbPath);
      sqlite.pragma('journal_mode = WAL');

      // Wrapper para hacer SQLite compatible con la API de pg
      pool = {
        query: async (text, params) => {
          // Convertir $1, $2 a ?, ? expandiendo parámetros para referencias repetidas
          const indices = [];
          const sqliteText = text.replace(/\$(\d+)/g, (_, idx) => {
            indices.push(parseInt(idx));
            return '?';
          });

          // Expandir params para cada ? individual (PostgreSQL permite $1 repetido, SQLite no)
          const expanded = indices.map(i => (params || [])[i - 1]);

          const upper = sqliteText.trim().toUpperCase();
          if (upper.startsWith('SELECT') || /RETURNING/i.test(sqliteText)) {
            /* SELECT or INSERT/UPDATE/DELETE with RETURNING clause */
            const stmt = sqlite.prepare(sqliteText);
            let rows;
            if (upper.startsWith('SELECT')) {
              rows = stmt.all(...expanded);
            } else {
              /* INSERT/UPDATE/DELETE ... RETURNING * — better-sqlite supports .all() for these */
              rows = stmt.all(...expanded);
            }
            return { rows, rowCount: rows.length };
          } else {
            const result = sqlite.prepare(sqliteText).run(...expanded);
            return {
              rows: [{ id: result.lastInsertRowid }],
              rowCount: result.changes
            };
          }
        },
        end: () => sqlite.close()
      };

      // Ejecutar schema de SQLite
      initSQLiteSchema(sqlite);
    }

    return pool;
  } catch (error) {
    process.stderr.write(`Database initialization error: ${error.message}\n`);
    throw error;
  }
}

/**
 * Inicializa el schema en SQLite
 */
function initSQLiteSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT,
      avatar_url TEXT,
      role TEXT DEFAULT 'user',
      plan_type TEXT DEFAULT 'free',
      plan_expires_at DATETIME,
      plan_days_remaining INTEGER DEFAULT 2,
      tiktok_session_id TEXT,
      tiktok_target_idc TEXT,
      is_active INTEGER DEFAULT 1,
      is_verified INTEGER DEFAULT 0,
      verification_token TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      paypal_order_id TEXT,
      paypal_payer_id TEXT,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'USD',
      plan_type TEXT NOT NULL,
      days_added INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS plan_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      action TEXT NOT NULL,
      plan_type TEXT,
      days_changed INTEGER,
      admin_id INTEGER REFERENCES users(id),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS auctions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      tiktok_username TEXT NOT NULL,
      title TEXT,
      status TEXT DEFAULT 'active',
      initial_time INTEGER DEFAULT 120,
      delay_time INTEGER DEFAULT 20,
      tie_extension INTEGER DEFAULT 10,
      winner_username TEXT,
      winner_coins INTEGER DEFAULT 0,
      total_coins_collected INTEGER DEFAULT 0,
      total_gifts_received INTEGER DEFAULT 0,
      unique_donors INTEGER DEFAULT 0,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      finished_at DATETIME,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS donors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      auction_id INTEGER REFERENCES auctions(id),
      tiktok_unique_id TEXT NOT NULL,
      tiktok_nickname TEXT,
      profile_picture_url TEXT,
      total_coins INTEGER DEFAULT 0,
      total_gifts INTEGER DEFAULT 0,
      final_position INTEGER,
      is_winner INTEGER DEFAULT 0,
      first_donation_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_donation_at DATETIME,
      UNIQUE(auction_id, tiktok_unique_id)
    );

    CREATE TABLE IF NOT EXISTS gifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      auction_id INTEGER REFERENCES auctions(id),
      donor_id INTEGER REFERENCES donors(id),
      tiktok_unique_id TEXT NOT NULL,
      gift_id TEXT,
      gift_name TEXT,
      diamond_count INTEGER DEFAULT 0,
      repeat_count INTEGER DEFAULT 1,
      total_coins INTEGER DEFAULT 0,
      received_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE REFERENCES users(id),
      total_auctions INTEGER DEFAULT 0,
      total_coins_collected INTEGER DEFAULT 0,
      total_gifts_received INTEGER DEFAULT 0,
      total_unique_donors INTEGER DEFAULT 0,
      average_auction_duration INTEGER DEFAULT 0,
      most_valuable_gift_name TEXT,
      most_valuable_gift_diamonds INTEGER DEFAULT 0,
      top_donor_username TEXT,
      top_donor_total_coins INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE REFERENCES users(id),
      default_initial_time INTEGER DEFAULT 120,
      default_delay_time INTEGER DEFAULT 20,
      default_tie_extension INTEGER DEFAULT 10,
      default_min_message TEXT DEFAULT 'MIN',
      overlay_theme TEXT DEFAULT 'default',
      sound_enabled INTEGER DEFAULT 1,
      auto_save_auctions INTEGER DEFAULT 1,
      hype_config TEXT DEFAULT '{"multiplier":1,"decay":0.65,"thresholdBase":100,"thresholdMultiplier":1.5,"animations":true,"sound":true,"maxLevels":0}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      refresh_token_hash TEXT NOT NULL,
      device_info TEXT,
      ip_address TEXT,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Tabla de noticias/novedades
    CREATE TABLE IF NOT EXISTS news (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      image_url TEXT,
      author_id INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Tabla de mensajes (chat usuario-admin)
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER REFERENCES users(id),
      recipient_id INTEGER REFERENCES users(id),
      message TEXT NOT NULL,
      image_url TEXT,
      read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Tabla de configuración de overlays por usuario
    CREATE TABLE IF NOT EXISTS overlays (
      user_id INTEGER PRIMARY KEY REFERENCES users(id),
      left_image_url TEXT DEFAULT '/assets/QuesadillaCrocodilla.webp',
      right_image_url TEXT DEFAULT '/assets/Noel.webp',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Tabla de metas/objetivos (goal overlays)
    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      type TEXT NOT NULL CHECK(type IN ('likes', 'shares', 'followers', 'coins')),
      title TEXT NOT NULL,
      target INTEGER NOT NULL DEFAULT 1000,
      current INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      auto_increment INTEGER NOT NULL DEFAULT 0,
      increment_amount INTEGER DEFAULT 0,
      completion_sound TEXT DEFAULT '/assets/sounds/effects/applause.mp3',
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      finished_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);

    -- Tabla de alertas de sonido (gift → sound mapping)
    CREATE TABLE IF NOT EXISTS sound_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      trigger_type TEXT NOT NULL DEFAULT 'gift',
      trigger_id TEXT,
      sound_file TEXT NOT NULL,
      volume REAL DEFAULT 0.8,
      min_gift_value INTEGER DEFAULT 1,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_sound_alerts_user_id ON sound_alerts(user_id);

    -- Tabla de timers extensibles por gifts
    CREATE TABLE IF NOT EXISTS extendable_timers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      title TEXT DEFAULT 'COUNTDOWN',
      duration INTEGER NOT NULL DEFAULT 300,
      remaining INTEGER NOT NULL DEFAULT 300,
      gift_extension INTEGER NOT NULL DEFAULT 10,
      min_gift_value INTEGER NOT NULL DEFAULT 1,
      active INTEGER NOT NULL DEFAULT 0,
      paused INTEGER NOT NULL DEFAULT 0,
      started_at DATETIME,
      finished_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_timers_user_id ON extendable_timers(user_id);

    -- Tabla de acciones y eventos (IFTTT)
    CREATE TABLE IF NOT EXISTS actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      trigger_type TEXT NOT NULL,
      trigger_id TEXT,
      action_type TEXT NOT NULL,
      action_config TEXT NOT NULL DEFAULT '{}',
      enabled INTEGER NOT NULL DEFAULT 1,
      cooldown INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_actions_user_id ON actions(user_id);

    -- Tabla de comandos del chatbot
    CREATE TABLE IF NOT EXISTS chatbot_commands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      command TEXT NOT NULL,
      response TEXT NOT NULL,
      permission TEXT DEFAULT 'all' CHECK(permission IN ('all', 'sub', 'mod', 'vip')),
      cooldown INTEGER DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 1,
      usage_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, command)
    );
    CREATE INDEX IF NOT EXISTS idx_chatbot_user_id ON chatbot_commands(user_id);

    -- Tabla de solicitudes de canciones (Spotify)
    CREATE TABLE IF NOT EXISTS song_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      spotify_connected INTEGER NOT NULL DEFAULT 0,
      spotify_access_token TEXT,
      spotify_refresh_token TEXT,
      spotify_device_id TEXT,
      min_gift_value INTEGER DEFAULT 1,
      max_requests INTEGER DEFAULT 10,
      enabled INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_song_requests_user_id ON song_requests(user_id);

    -- Tabla de cola de canciones solicitadas
    CREATE TABLE IF NOT EXISTS song_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      requester TEXT NOT NULL,
      song_title TEXT NOT NULL,
      song_artist TEXT,
      spotify_uri TEXT NOT NULL,
      song_duration INTEGER DEFAULT 0,
      played INTEGER NOT NULL DEFAULT 0,
      requested_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_song_queue_user_id ON song_queue(user_id);

    CREATE INDEX IF NOT EXISTS idx_donors_auction_id ON donors(auction_id);
    CREATE INDEX IF NOT EXISTS idx_gifts_auction_id ON gifts(auction_id);
    CREATE INDEX IF NOT EXISTS idx_news_created_at ON news(created_at);
    CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
    CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
  `);

  // Migraciones para schemas existentes
  try { db.exec('ALTER TABLE users ADD COLUMN verification_token TEXT'); } catch (e) {}
  try { db.exec('ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 0'); } catch (e) {}
  try { db.exec('ALTER TABLE goals ADD COLUMN auto_increment INTEGER DEFAULT 0'); } catch (e) {}
  try { db.exec('ALTER TABLE goals ADD COLUMN increment_amount INTEGER DEFAULT 0'); } catch (e) {}
  try { db.exec("ALTER TABLE goals ADD COLUMN completion_sound TEXT DEFAULT '/assets/sounds/effects/applause.mp3'"); } catch (e) {}
  try { db.exec('ALTER TABLE sound_alerts ADD COLUMN min_gift_value INTEGER DEFAULT 1'); } catch (e) {}
  try { db.exec("ALTER TABLE sessions ADD COLUMN last_used_at DATETIME DEFAULT CURRENT_TIMESTAMP"); } catch (e) {}
  try { db.exec("ALTER TABLE user_settings ADD COLUMN hype_config TEXT DEFAULT '{\"multiplier\":1,\"decay\":0.65,\"thresholdBase\":100,\"thresholdMultiplier\":1.5,\"animations\":true,\"sound\":true,\"maxLevels\":0}'"); } catch (e) {}
}

/**
 * Inicializa el schema en PostgreSQL (producción)
 */
async function initPostgresSchema(pool) {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        display_name VARCHAR(255),
        avatar_url TEXT,
        role VARCHAR(50) DEFAULT 'user',
        plan_type VARCHAR(50) DEFAULT 'free',
        plan_expires_at TIMESTAMP,
        plan_days_remaining INTEGER DEFAULT 2,
        tiktok_session_id TEXT,
        tiktok_target_idc TEXT,
        is_active BOOLEAN DEFAULT true,
        is_verified BOOLEAN DEFAULT false,
        verification_token TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        paypal_order_id TEXT,
        paypal_payer_id TEXT,
        amount NUMERIC(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        plan_type VARCHAR(50) NOT NULL,
        days_added INTEGER NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS plan_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action TEXT NOT NULL,
        plan_type VARCHAR(50),
        days_changed INTEGER,
        admin_id INTEGER REFERENCES users(id),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS auctions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        tiktok_username VARCHAR(255) NOT NULL,
        title TEXT,
        status VARCHAR(50) DEFAULT 'active',
        initial_time INTEGER DEFAULT 120,
        delay_time INTEGER DEFAULT 20,
        tie_extension INTEGER DEFAULT 10,
        winner_username VARCHAR(255),
        winner_coins INTEGER DEFAULT 0,
        total_coins_collected INTEGER DEFAULT 0,
        total_gifts_received INTEGER DEFAULT 0,
        unique_donors INTEGER DEFAULT 0,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        finished_at TIMESTAMP,
        notes TEXT
      );

      CREATE TABLE IF NOT EXISTS donors (
        id SERIAL PRIMARY KEY,
        auction_id INTEGER REFERENCES auctions(id),
        tiktok_unique_id VARCHAR(255) NOT NULL,
        tiktok_nickname VARCHAR(255),
        profile_picture_url TEXT,
        total_coins INTEGER DEFAULT 0,
        total_gifts INTEGER DEFAULT 0,
        final_position INTEGER,
        is_winner BOOLEAN DEFAULT false,
        first_donation_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_donation_at TIMESTAMP,
        UNIQUE(auction_id, tiktok_unique_id)
      );

      CREATE TABLE IF NOT EXISTS gifts (
        id SERIAL PRIMARY KEY,
        auction_id INTEGER REFERENCES auctions(id),
        donor_id INTEGER REFERENCES donors(id),
        tiktok_unique_id VARCHAR(255) NOT NULL,
        gift_id VARCHAR(255),
        gift_name VARCHAR(255),
        diamond_count INTEGER DEFAULT 0,
        repeat_count INTEGER DEFAULT 1,
        total_coins INTEGER DEFAULT 0,
        received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS user_stats (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE REFERENCES users(id),
        total_auctions INTEGER DEFAULT 0,
        total_coins_collected INTEGER DEFAULT 0,
        total_gifts_received INTEGER DEFAULT 0,
        total_unique_donors INTEGER DEFAULT 0,
        average_auction_duration INTEGER DEFAULT 0,
        most_valuable_gift_name VARCHAR(255),
        most_valuable_gift_diamonds INTEGER DEFAULT 0,
        top_donor_username VARCHAR(255),
        top_donor_total_coins INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS user_settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE REFERENCES users(id),
        default_initial_time INTEGER DEFAULT 120,
        default_delay_time INTEGER DEFAULT 20,
        default_tie_extension INTEGER DEFAULT 10,
        default_min_message VARCHAR(10) DEFAULT 'MIN',
        overlay_theme VARCHAR(50) DEFAULT 'default',
        sound_enabled BOOLEAN DEFAULT true,
        auto_save_auctions BOOLEAN DEFAULT true,
        hype_config TEXT DEFAULT '{"multiplier":1,"decay":0.65,"thresholdBase":100,"thresholdMultiplier":1.5,"animations":true,"sound":true,"maxLevels":0}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        refresh_token_hash TEXT NOT NULL,
        device_info TEXT,
        ip_address VARCHAR(45),
        expires_at TIMESTAMP NOT NULL,
        last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Tabla de noticias/novedades
      CREATE TABLE IF NOT EXISTS news (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        image_url TEXT,
        author_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Tabla de mensajes (chat usuario-admin)
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER REFERENCES users(id),
        recipient_id INTEGER REFERENCES users(id),
        message TEXT NOT NULL,
        image_url TEXT,
        read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Tabla de configuración de overlays por usuario
      CREATE TABLE IF NOT EXISTS overlays (
        user_id INTEGER PRIMARY KEY REFERENCES users(id),
        left_image_url TEXT DEFAULT '/assets/QuesadillaCrocodilla.webp',
        right_image_url TEXT DEFAULT '/assets/Noel.webp',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Tabla de metas/objetivos (goal overlays)
      CREATE TABLE IF NOT EXISTS goals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        type VARCHAR(20) NOT NULL CHECK(type IN ('likes', 'shares', 'followers', 'coins')),
        title VARCHAR(255) NOT NULL,
        target INTEGER NOT NULL DEFAULT 1000,
        current INTEGER NOT NULL DEFAULT 0,
        active BOOLEAN NOT NULL DEFAULT true,
        auto_increment BOOLEAN NOT NULL DEFAULT false,
        increment_amount INTEGER DEFAULT 0,
        completion_sound VARCHAR(500) DEFAULT '/assets/sounds/effects/applause.mp3',
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        finished_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);

      CREATE TABLE IF NOT EXISTS sound_alerts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        trigger_type VARCHAR(20) NOT NULL DEFAULT 'gift',
        trigger_id VARCHAR(255),
        sound_file VARCHAR(500) NOT NULL,
        volume REAL DEFAULT 0.8,
        min_gift_value INTEGER DEFAULT 1,
        enabled BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_sound_alerts_user_id ON sound_alerts(user_id);

      CREATE TABLE IF NOT EXISTS extendable_timers (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        title VARCHAR(255) DEFAULT 'COUNTDOWN',
        duration INTEGER NOT NULL DEFAULT 300,
        remaining INTEGER NOT NULL DEFAULT 300,
        gift_extension INTEGER NOT NULL DEFAULT 10,
        min_gift_value INTEGER NOT NULL DEFAULT 1,
        active BOOLEAN NOT NULL DEFAULT false,
        paused BOOLEAN NOT NULL DEFAULT false,
        started_at TIMESTAMP,
        finished_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_timers_user_id ON extendable_timers(user_id);

      CREATE TABLE IF NOT EXISTS actions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        name VARCHAR(255) NOT NULL,
        trigger_type VARCHAR(50) NOT NULL,
        trigger_id VARCHAR(255),
        action_type VARCHAR(50) NOT NULL,
        action_config JSONB NOT NULL DEFAULT '{}',
        enabled BOOLEAN NOT NULL DEFAULT true,
        cooldown INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_actions_user_id ON actions(user_id);

      CREATE TABLE IF NOT EXISTS chatbot_commands (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        command VARCHAR(100) NOT NULL,
        response TEXT NOT NULL,
        permission VARCHAR(20) DEFAULT 'all' CHECK(permission IN ('all', 'sub', 'mod', 'vip')),
        cooldown INTEGER DEFAULT 0,
        enabled BOOLEAN NOT NULL DEFAULT true,
        usage_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, command)
      );
      CREATE INDEX IF NOT EXISTS idx_chatbot_user_id ON chatbot_commands(user_id);

      CREATE TABLE IF NOT EXISTS song_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        spotify_connected BOOLEAN NOT NULL DEFAULT false,
        spotify_access_token TEXT,
        spotify_refresh_token TEXT,
        spotify_device_id TEXT,
        min_gift_value INTEGER DEFAULT 1,
        max_requests INTEGER DEFAULT 10,
        enabled BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_song_requests_user_id ON song_requests(user_id);

      CREATE TABLE IF NOT EXISTS song_queue (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        requester VARCHAR(255) NOT NULL,
        song_title TEXT NOT NULL,
        song_artist VARCHAR(255),
        spotify_uri TEXT NOT NULL,
        song_duration INTEGER DEFAULT 0,
        played BOOLEAN NOT NULL DEFAULT false,
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_song_queue_user_id ON song_queue(user_id);

      CREATE INDEX IF NOT EXISTS idx_donors_auction_id ON donors(auction_id);
      CREATE INDEX IF NOT EXISTS idx_gifts_auction_id ON gifts(auction_id);
      CREATE INDEX IF NOT EXISTS idx_news_created_at ON news(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
      CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
    `);
  } catch (error) {
    process.stderr.write(`PostgreSQL schema initialization error: ${error.message}\n`);
    throw error;
  }
}

/**
 * Obtiene la instancia de la base de datos
 */
function getDB() {
  if (!pool) throw new Error('Base de datos no inicializada. Llama a initDatabase() primero.');
  return pool;
}

async function query(text, params) {
  const db = getDB();
  return db.query(text, params);
}

/**
 * Genera SQL compatible con SQLite y PostgreSQL para fechas
 * Uso: sqlDate('-7 days') → "datetime('now', '-7 days')" (SQLite) o "NOW() - INTERVAL '7 days'" (PG)
 */
let _isSQLite = null;
function sqlDate(interval) {
  if (_isSQLite === null) _isSQLite = !process.env.DATABASE_URL;
  if (_isSQLite) return interval ? `datetime('now', '${interval}')` : "datetime('now')";
  return interval ? `NOW() - INTERVAL '${interval}'` : 'NOW()';
}

/**
 * Cierra la conexión
 */
async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  initDatabase,
  getDB: () => pool,
  query,
  closeDatabase,
  resetUsers, // Exportada para uso administrativo
  sqlDate
};
