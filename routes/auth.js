/**
 * API Routes - Autenticación
 */

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { query } = require('../database/db');
const { generateTokens, verifyToken } = require('../middleware/auth');
const { activateTrialDays } = require('../middleware/plan');

const SALT_ROUNDS = 12;

const { sendVerificationEmail } = require('../utils/mailer');

// ... (código existente) ...

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

    // Generar token de verificación
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Crear usuario (no verificado)
    const result = await query(
      `INSERT INTO users (username, email, password_hash, display_name, verification_token, is_verified) 
       VALUES ($1, $2, $3, $4, $5, false) 
       RETURNING id, username, email, display_name, role, created_at`,
      [username.toLowerCase(), email.toLowerCase(), passwordHash, displayName || username, verificationToken]
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

    // Enviar correo de verificación
    const emailSent = await sendVerificationEmail(email, verificationToken);

    if (!emailSent) {
      // Si falla el envío, podríamos borrar el usuario o avisar
      console.error('Fallo al enviar correo de verificación');
    }

    res.status(201).json({
      message: 'Usuario registrado exitosamente. Por favor verifica tu correo electrónico.',
      requireVerification: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Error en registro:', error);
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
              tiktok_session_id, tiktok_target_idc, is_active, avatar_url, is_verified
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

    // Verificar contraseña
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({
        error: 'Credenciales inválidas',
        message: 'Usuario o password incorrectos'
      });
    }

    // Verificar si el correo está confirmado
    if (user.is_verified === false) { // Chequeo explícito por si es null (viejos usuarios asumen true si no tienen campo, pero aquí el campo existe)
      // Para usuarios anteriores a la migración, is_verified podría ser NULL. Tratarlos como verificados o forzarlos.
      // Asumiremos que si es false, requiere verificación. Si es null (viejos), se pase.
      // Pero espera, acabamos de agregar la columna DEFAULT false. Entonces los viejos serán false.
      // Como vamos a borrar todos los usuarios, no importa.

      return res.status(403).json({
        error: 'Verificación requerida',
        message: 'Por favor verifica tu correo electrónico para iniciar sesión.'
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
    console.error('Error en login:', error);
    res.status(500).json({
      error: 'Error interno',
      message: 'Error al iniciar sesión'
    });
  }
}

/**
 * Verificar correo
 * GET /api/auth/verify
 */
async function verifyEmail(req, res) {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Token requerido' });
    }

    const result = await query(
      'SELECT id, email FROM users WHERE verification_token = $1',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Token inválido o expirado' });
    }

    const user = result.rows[0];

    await query(
      'UPDATE users SET is_verified = true, verification_token = NULL WHERE id = $1',
      [user.id]
    );

    // Redirigir al frontend con mensaje de éxito (o devolver JSON si se llama desde app)
    // Pero el link del correo abrirá una pestaña del navegador, así que es mejor devolver HTML o redirigir.
    // Como esto es una API JSON normalmente, vamos a devolver JSON si acepta JSON, o redirigir si no.

    // Asumiremos redirección a una página estática
    res.redirect('/login.html?verified=true');

  } catch (error) {
    console.error('Error verificado correo:', error);
    res.status(500).json({ error: 'Error interno al verificar correo' });
  }
}

// ... (Resto de funciones: refreshToken, logout, getProfile, updateProfile, changePassword)

module.exports = {
  register,
  login,
  verifyEmail,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  changePassword
};
