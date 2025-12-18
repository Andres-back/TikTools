-- =============================================
-- SCHEMA DE BASE DE DATOS - TikTok Auction System
-- =============================================

-- Tabla de usuarios del sistema
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    avatar_url TEXT,
    role VARCHAR(20) DEFAULT 'user', -- 'admin', 'user', 'moderator'
    plan_type VARCHAR(20) DEFAULT 'free', -- 'free', 'premium'
    plan_expires_at TIMESTAMP,
    plan_days_remaining INTEGER DEFAULT 2,
    tiktok_session_id TEXT,
    tiktok_target_idc VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Tabla de pagos/transacciones
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    paypal_order_id VARCHAR(100),
    paypal_payer_id VARCHAR(100),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    plan_type VARCHAR(20) NOT NULL,
    days_added INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Tabla de historial de planes
CREATE TABLE IF NOT EXISTS plan_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'activated', 'expired', 'admin_add', 'admin_remove', 'payment'
    plan_type VARCHAR(20),
    days_changed INTEGER,
    admin_id INTEGER REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de subastas/sesiones
CREATE TABLE IF NOT EXISTS auctions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    tiktok_username VARCHAR(100) NOT NULL,
    title VARCHAR(200),
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'finished', 'cancelled'
    initial_time INTEGER DEFAULT 120,
    delay_time INTEGER DEFAULT 20,
    tie_extension INTEGER DEFAULT 10,
    winner_username VARCHAR(100),
    winner_coins INTEGER DEFAULT 0,
    total_coins_collected INTEGER DEFAULT 0,
    total_gifts_received INTEGER DEFAULT 0,
    unique_donors INTEGER DEFAULT 0,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP,
    notes TEXT
);

-- Tabla de donadores/participantes
CREATE TABLE IF NOT EXISTS donors (
    id SERIAL PRIMARY KEY,
    auction_id INTEGER REFERENCES auctions(id) ON DELETE CASCADE,
    tiktok_unique_id VARCHAR(100) NOT NULL,
    tiktok_nickname VARCHAR(100),
    profile_picture_url TEXT,
    total_coins INTEGER DEFAULT 0,
    total_gifts INTEGER DEFAULT 0,
    final_position INTEGER,
    is_winner BOOLEAN DEFAULT false,
    first_donation_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_donation_at TIMESTAMP,
    UNIQUE(auction_id, tiktok_unique_id)
);

-- Tabla de regalos recibidos
CREATE TABLE IF NOT EXISTS gifts (
    id SERIAL PRIMARY KEY,
    auction_id INTEGER REFERENCES auctions(id) ON DELETE CASCADE,
    donor_id INTEGER REFERENCES donors(id) ON DELETE CASCADE,
    tiktok_unique_id VARCHAR(100) NOT NULL,
    gift_id VARCHAR(50),
    gift_name VARCHAR(100),
    diamond_count INTEGER DEFAULT 0,
    repeat_count INTEGER DEFAULT 1,
    total_coins INTEGER DEFAULT 0,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de estadísticas globales por usuario del sistema
CREATE TABLE IF NOT EXISTS user_stats (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    total_auctions INTEGER DEFAULT 0,
    total_coins_collected BIGINT DEFAULT 0,
    total_gifts_received BIGINT DEFAULT 0,
    total_unique_donors BIGINT DEFAULT 0,
    average_auction_duration INTEGER DEFAULT 0, -- en segundos
    most_valuable_gift_name VARCHAR(100),
    most_valuable_gift_diamonds INTEGER DEFAULT 0,
    top_donor_username VARCHAR(100),
    top_donor_total_coins BIGINT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de configuraciones del usuario
CREATE TABLE IF NOT EXISTS user_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    default_initial_time INTEGER DEFAULT 120,
    default_delay_time INTEGER DEFAULT 20,
    default_tie_extension INTEGER DEFAULT 10,
    default_min_message VARCHAR(50) DEFAULT 'MIN',
    overlay_theme VARCHAR(50) DEFAULT 'default',
    sound_enabled BOOLEAN DEFAULT true,
    auto_save_auctions BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de sesiones activas (JWT refresh tokens)
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) NOT NULL,
    device_info TEXT,
    ip_address VARCHAR(45),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_auctions_user_id ON auctions(user_id);
CREATE INDEX IF NOT EXISTS idx_auctions_status ON auctions(status);
CREATE INDEX IF NOT EXISTS idx_donors_auction_id ON donors(auction_id);
CREATE INDEX IF NOT EXISTS idx_gifts_auction_id ON gifts(auction_id);
CREATE INDEX IF NOT EXISTS idx_gifts_donor_id ON gifts(donor_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
