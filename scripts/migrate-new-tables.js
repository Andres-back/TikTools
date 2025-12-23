/**
 * Script de Migración - Nuevas Tablas
 * Ejecuta las migraciones para news, messages y overlays
 */

const { initDatabase, getDB, closeDatabase } = require('./database/db');

const migrations = `
-- Tabla de noticias/novedades
CREATE TABLE IF NOT EXISTS news (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_news_created_at ON news(created_at DESC);

-- Tabla de mensajes (chat usuario-admin)
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    recipient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    image_url TEXT,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Tabla de configuración de overlays por usuario
CREATE TABLE IF NOT EXISTS overlays (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    left_image_url TEXT DEFAULT '/assets/QuesadillaCrocodilla.webp',
    right_image_url TEXT DEFAULT '/assets/Noel.webp',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger para updated_at en overlays
DROP TRIGGER IF EXISTS update_overlays_updated_at ON overlays;
CREATE TRIGGER update_overlays_updated_at
    BEFORE UPDATE ON overlays
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
`;

async function runMigrations() {
  try {
    console.log('🔄 Iniciando migraciones...\n');
    
    await initDatabase();
    const db = getDB();
    
    console.log('📊 Ejecutando SQL...');
    await db.query(migrations);
    
    console.log('✅ Migraciones completadas exitosamente!\n');
    console.log('Tablas creadas:');
    console.log('  - news (noticias/novedades)');
    console.log('  - messages (chat usuario-admin)');
    console.log('  - overlays (configuración personalizada)');
    console.log('');
    
  } catch (error) {
    console.error('❌ Error ejecutando migraciones:', error.message);
    console.error('');
    console.error('Si el error es "relation already exists", las tablas ya están creadas.');
    console.error('Si el error es de conexión, verifica DATABASE_URL en .env');
    process.exit(1);
  } finally {
    await closeDatabase();
    process.exit(0);
  }
}

runMigrations();
