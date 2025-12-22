-- ==========================================
-- SISTEMA DE RULETA - TABLAS POSTGRESQL
-- ==========================================

-- Tabla de participantes de ruleta
CREATE TABLE IF NOT EXISTS roulette_participants (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  unique_id VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  profile_image TEXT,
  entries INTEGER DEFAULT 0,
  total_hearts INTEGER DEFAULT 0,
  total_likes INTEGER DEFAULT 0,
  total_gifts INTEGER DEFAULT 0,
  has_followed BOOLEAN DEFAULT FALSE,
  last_heart_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, unique_id)
);

-- Tabla de configuración de ruleta
CREATE TABLE IF NOT EXISTS roulette_config (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  valid_gift_id VARCHAR(50),
  gift_entries INTEGER DEFAULT 1,
  likes_per_entry INTEGER DEFAULT 1000,
  follow_enabled BOOLEAN DEFAULT TRUE,
  heart_enabled BOOLEAN DEFAULT TRUE,
  auto_spin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Tabla de historial de ganadores
CREATE TABLE IF NOT EXISTS roulette_winners (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  unique_id VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  profile_image TEXT,
  total_entries INTEGER NOT NULL,
  won_at TIMESTAMP DEFAULT NOW()
);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_roulette_participants_user_id ON roulette_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_roulette_participants_unique_id ON roulette_participants(user_id, unique_id);
CREATE INDEX IF NOT EXISTS idx_roulette_participants_entries ON roulette_participants(user_id, entries DESC);
CREATE INDEX IF NOT EXISTS idx_roulette_winners_user_id ON roulette_winners(user_id);
CREATE INDEX IF NOT EXISTS idx_roulette_winners_won_at ON roulette_winners(won_at DESC);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_roulette_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_roulette_participants_updated_at
  BEFORE UPDATE ON roulette_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_roulette_updated_at();

CREATE TRIGGER update_roulette_config_updated_at
  BEFORE UPDATE ON roulette_config
  FOR EACH ROW
  EXECUTE FUNCTION update_roulette_updated_at();
