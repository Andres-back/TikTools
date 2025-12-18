/**
 * API Routes - Autenticación
 */

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { query } = require('../database/db');
const { generateTokens, verifyToken } = require('../middleware/auth');
const { activateTrialDays } = require('../middleware/plan');

const SALT_ROUNDS = 12;

/**
 * Registro de usuario
 * POST /api/auth/register
 */
async function register(req, res) {
  try {
    const { username, email, password, displayName } = req.body;

    // Validaciones
    if (!username || !email || !password) {
      return res.status(400).json({ 
        error: 'Campos requeridos',
        message: 'Username, email y password son requeridos' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'Password débil',
        message: 'El password debe tener al menos 6 caracteres' 
      });
    }

    // Verificar si usuario ya existe
    const existingUser = await query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username.toLowerCase(), email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Usuario existente',
        message: 'El username o email ya está registrado' 
      });
    }

    // Hash del password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Crear usuario
    const result = await query(
      `INSERT INTO users (username, email, password_hash, display_name) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, username, email, display_name, role, created_at`,
      [username.toLowerCase(), email.toLowerCase(), passwordHash, displayName || username]
    );

    const user = result.rows[0];

    // Crear configuración por defecto
    await query(
      'INSERT INTO user_settings (user_id) VALUES ($1)',
      [user.id]
    );

    // Crear estadísticas iniciales
    await query(
      'INSERT INTO user_stats (user_id) VALUES ($1)',
      [user.id]
    );

    // Activar período de prueba (2 días gratis)
    await activateTrialDays(user.id);

    // Generar tokens
    const tokens = generateTokens(user);

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
        role: user.role
      },
      ...tokens
    });

  } catch (error) {
    res.status(500).json({ 
      error: 'Error interno',
      message: 'Error al registrar usuario' 
    });
  }
}

/**
 * Login de usuario
 * POST /api/auth/login
 */
async function login(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Campos requeridos',
        message: 'Username/email y password son requeridos' 
      });
    }

    // Buscar usuario
    const result = await query(
      `SELECT id, username, email, password_hash, display_name, role, 
              tiktok_session_id, tiktok_target_idc, is_active, avatar_url
       FROM users 
       WHERE (username = $1 OR email = $1) AND is_active = true`,
      [username.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        error: 'Credenciales inválidas',
        message: 'Usuario o password incorrectos' 
      });
    }

    const user = result.rows[0];

    // Verificar password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ 
        error: 'Credenciales inválidas',
        message: 'Usuario o password incorrectos' 
      });
    }

    // Actualizar último login
    await query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Generar tokens
    const tokens = generateTokens(user);

    // Guardar refresh token en sesión
    const refreshHash = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días
    
    await query(
      `INSERT INTO sessions (user_id, refresh_token_hash, ip_address, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [user.id, refreshHash, req.ip || 'unknown', expiresAt]
    );

    res.json({
      message: 'Login exitoso',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        avatarUrl: user.avatar_url,
        tiktokSessionId: user.tiktok_session_id ? '***configurado***' : null,
        tiktokTargetIdc: user.tiktok_target_idc
      },
      ...tokens
    });

  } catch (error) {
    res.status(500).json({ 
      error: 'Error interno',
      message: 'Error al iniciar sesión' 
    });
  }
}

/**
 * Refresh token
 * POST /api/auth/refresh
 */
async function refreshToken(req, res) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ 
        error: 'Token requerido',
        message: 'Refresh token es requerido' 
      });
    }

    // Verificar token
    const decoded = verifyToken(refreshToken);
    if (!decoded || decoded.type !== 'refresh') {
      return res.status(401).json({ 
        error: 'Token inválido',
        message: 'Refresh token inválido o expirado' 
      });
    }

    // Verificar que la sesión existe
    const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const sessionResult = await query(
      `SELECT s.id, u.id as user_id, u.username, u.role, u.display_name, u.email
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.refresh_token_hash = $1 AND s.expires_at > CURRENT_TIMESTAMP AND u.is_active = true`,
      [refreshHash]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(401).json({ 
        error: 'Sesión inválida',
        message: 'La sesión ha expirado o fue revocada' 
      });
    }

    const user = sessionResult.rows[0];

    // Generar nuevos tokens
    const tokens = generateTokens({
      id: user.user_id,
      username: user.username,
      role: user.role
    });

    // Actualizar sesión con nuevo refresh token
    const newRefreshHash = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex');
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    await query(
      'UPDATE sessions SET refresh_token_hash = $1, expires_at = $2 WHERE id = $3',
      [newRefreshHash, newExpiresAt, sessionResult.rows[0].id]
    );

    res.json({
      message: 'Token renovado',
      ...tokens
    });

  } catch (error) {
    res.status(500).json({ 
      error: 'Error interno',
      message: 'Error al renovar token' 
    });
  }
}

/**
 * Logout
 * POST /api/auth/logout
 */
async function logout(req, res) {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await query(
        'DELETE FROM sessions WHERE refresh_token_hash = $1',
        [refreshHash]
      );
    }

    res.json({ message: 'Sesión cerrada exitosamente' });

  } catch (error) {
    res.status(500).json({ 
      error: 'Error interno',
      message: 'Error al cerrar sesión' 
    });
  }
}

/**
 * Obtener perfil del usuario actual
 * GET /api/auth/me
 */
async function getProfile(req, res) {
  try {
    const result = await query(
      `SELECT u.id, u.username, u.email, u.display_name, u.role, u.avatar_url,
              u.tiktok_session_id, u.tiktok_target_idc, u.created_at, u.last_login,
              s.default_initial_time, s.default_delay_time, s.default_tie_extension,
              s.overlay_theme, s.sound_enabled, s.auto_save_auctions,
              st.total_auctions, st.total_coins_collected, st.total_gifts_received
       FROM users u
       LEFT JOIN user_settings s ON s.user_id = u.id
       LEFT JOIN user_stats st ON st.user_id = u.id
       WHERE u.id = $1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Usuario no encontrado' 
      });
    }

    const user = result.rows[0];

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.display_name,
      role: user.role,
      avatarUrl: user.avatar_url,
      tiktokConfigured: !!user.tiktok_session_id,
      tiktokTargetIdc: user.tiktok_target_idc,
      createdAt: user.created_at,
      lastLogin: user.last_login,
      settings: {
        defaultInitialTime: user.default_initial_time,
        defaultDelayTime: user.default_delay_time,
        defaultTieExtension: user.default_tie_extension,
        overlayTheme: user.overlay_theme,
        soundEnabled: user.sound_enabled,
        autoSaveAuctions: user.auto_save_auctions
      },
      stats: {
        totalAuctions: user.total_auctions,
        totalCoinsCollected: user.total_coins_collected,
        totalGiftsReceived: user.total_gifts_received
      }
    });

  } catch (error) {
    console.error('[Auth] Error en getProfile:', error);
    res.status(500).json({ 
      error: 'Error interno',
      message: 'Error al obtener perfil' 
    });
  }
}

/**
 * Actualizar perfil
 * PUT /api/auth/profile
 */
async function updateProfile(req, res) {
  try {
    const { displayName, avatarUrl, tiktokSessionId, tiktokTargetIdc } = req.body;

    await query(
      `UPDATE users 
       SET display_name = COALESCE($1, display_name),
           avatar_url = COALESCE($2, avatar_url),
           tiktok_session_id = COALESCE($3, tiktok_session_id),
           tiktok_target_idc = COALESCE($4, tiktok_target_idc),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [displayName, avatarUrl, tiktokSessionId, tiktokTargetIdc, req.user.userId]
    );

    res.json({ message: 'Perfil actualizado exitosamente' });

  } catch (error) {
    console.error('[Auth] Error en updateProfile:', error);
    res.status(500).json({ 
      error: 'Error interno',
      message: 'Error al actualizar perfil' 
    });
  }
}

/**
 * Cambiar password
 * PUT /api/auth/password
 */
async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        error: 'Campos requeridos',
        message: 'Password actual y nuevo son requeridos' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        error: 'Password débil',
        message: 'El nuevo password debe tener al menos 6 caracteres' 
      });
    }

    // Verificar password actual
    const result = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.userId]
    );

    const validPassword = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!validPassword) {
      return res.status(401).json({ 
        error: 'Password incorrecto',
        message: 'El password actual es incorrecto' 
      });
    }

    // Actualizar password
    const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newHash, req.user.userId]
    );

    // Invalidar todas las sesiones excepto la actual
    await query(
      'DELETE FROM sessions WHERE user_id = $1',
      [req.user.userId]
    );

    res.json({ message: 'Password actualizado exitosamente' });

  } catch (error) {
    console.error('[Auth] Error en changePassword:', error);
    res.status(500).json({ 
      error: 'Error interno',
      message: 'Error al cambiar password' 
    });
  }
}

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  changePassword
};
