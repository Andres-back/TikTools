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
      pool.query('DELETE FROM users');
      pool.query('DELETE FROM sqlite_sequence WHERE name="users"');
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

      // Parsear la URL para extraer componentes
      const url = new URL(connectionString.replace('postgresql://', 'postgres://'));

      // Configuración explícita sin usar connectionString
      // Esto evita conflictos con sslmode en la URL
      pool = new Pool({
        user: url.username,
        password: url.password,
        host: url.hostname,
        port: parseInt(url.port) || 5432,
        database: url.pathname.slice(1), // Remover el / inicial
        ssl: {
          rejectUnauthorized: false
        },
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });

      // Verificar conexión
      await pool.query('SELECT NOW()');
      process.stdout.write('✓ PostgreSQL connected successfully\n');

      // Crear tablas si no existen
      await initPostgresSchema(pool);

      // Aplicar migraciones (verificación de correo)
      try {
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false');
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token TEXT');
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
          // Convertir $1, $2 a ?, ?
          const sqliteText = text.replace(/\$(\d+)/g, '?');

          if (sqliteText.trim().toUpperCase().startsWith('SELECT')) {
            const rows = sqlite.prepare(sqliteText).all(...(params || []));
            return { rows, rowCount: rows.length };
          } else {
            const result = sqlite.prepare(sqliteText).run(...(params || []));
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

    CREATE INDEX IF NOT EXISTS idx_auctions_user_id ON auctions(user_id);
    CREATE INDEX IF NOT EXISTS idx_donors_auction_id ON donors(auction_id);
    CREATE INDEX IF NOT EXISTS idx_gifts_auction_id ON gifts(auction_id);
    CREATE INDEX IF NOT EXISTS idx_news_created_at ON news(created_at);
    CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
    CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
  `);
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

      CREATE INDEX IF NOT EXISTS idx_auctions_user_id ON auctions(user_id);
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
  if (!pool) {
    initDatabase();
  }
  return pool;
}

/**
 * Ejecuta una query
 */
async function query(text, params) {
  const db = getDB();
  return db.query(text, params);
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
  resetUsers // Exportada para uso administrativo
};
