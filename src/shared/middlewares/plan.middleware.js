/**
 * Middleware de verificación de planes
 */

const { query } = require('../database/db');

/**
 * Verifica si el usuario tiene un plan activo
 */
async function checkPlanMiddleware(req, res, next) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const result = await query(
      `SELECT role, plan_type, plan_expires_at, plan_days_remaining, is_active 
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const user = result.rows[0];

    // Admin siempre tiene acceso
    if (user.role === 'admin') {
      req.userPlan = { type: 'admin', active: true };
      return next();
    }

    // Verificar si la cuenta está activa
    if (!user.is_active) {
      return res.status(403).json({ 
        error: 'Cuenta desactivada',
        code: 'ACCOUNT_DISABLED'
      });
    }

    // Verificar plan
    const now = new Date();
    let planActive = false;

    if (user.plan_expires_at) {
      const expiresAt = new Date(user.plan_expires_at);
      planActive = expiresAt > now;
    } else if (user.plan_days_remaining > 0) {
      planActive = true;
    }

    if (!planActive) {
      return res.status(403).json({ 
        error: 'Tu plan ha expirado. Renueva para continuar usando la plataforma.',
        code: 'PLAN_EXPIRED',
        planType: user.plan_type
      });
    }

    req.userPlan = {
      type: user.plan_type,
      expiresAt: user.plan_expires_at,
      daysRemaining: user.plan_days_remaining,
      active: true
    };

    next();
  } catch (error) {
    res.status(500).json({ error: 'Error al verificar plan' });
  }
}

/**
 * Verifica si el usuario es administrador
 */
async function adminMiddleware(req, res, next) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const result = await query(
      `SELECT role FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0 || result.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador.' });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Error al verificar permisos' });
  }
}

/**
 * Activa los días de prueba para un nuevo usuario
 */
async function activateTrialDays(userId) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 2); // 2 días de prueba

  await query(
    `UPDATE users SET 
      plan_type = 'free',
      plan_expires_at = $1,
      plan_days_remaining = 2
     WHERE id = $2`,
    [expiresAt.toISOString(), userId]
  );

  await query(
    `INSERT INTO plan_history (user_id, action, plan_type, days_changed, notes)
     VALUES ($1, 'activated', 'free', 2, 'Período de prueba inicial')`,
    [userId]
  );
}

/**
 * Añade días al plan de un usuario (admin)
 */
async function addDaysToUser(userId, days, adminId, planType = 'premium') {
  const userResult = await query(
    `SELECT plan_expires_at FROM users WHERE id = $1`,
    [userId]
  );

  if (userResult.rows.length === 0) {
    throw new Error('Usuario no encontrado');
  }

  let newExpiresAt = new Date();
  const currentExpires = userResult.rows[0].plan_expires_at;
  
  if (currentExpires && new Date(currentExpires) > newExpiresAt) {
    newExpiresAt = new Date(currentExpires);
  }
  
  newExpiresAt.setDate(newExpiresAt.getDate() + days);

  await query(
    `UPDATE users SET 
      plan_type = $1,
      plan_expires_at = $2,
      plan_days_remaining = plan_days_remaining + $3
     WHERE id = $4`,
    [planType, newExpiresAt.toISOString(), days, userId]
  );

  await query(
    `INSERT INTO plan_history (user_id, action, plan_type, days_changed, admin_id, notes)
     VALUES ($1, 'admin_add', $2, $3, $4, 'Días añadidos por administrador')`,
    [userId, planType, days, adminId]
  );

  return { newExpiresAt, daysAdded: days };
}

/**
 * Quita días del plan de un usuario (admin)
 */
async function removeDaysFromUser(userId, days, adminId) {
  const userResult = await query(
    `SELECT plan_expires_at, plan_days_remaining FROM users WHERE id = $1`,
    [userId]
  );

  if (userResult.rows.length === 0) {
    throw new Error('Usuario no encontrado');
  }

  let newExpiresAt = new Date(userResult.rows[0].plan_expires_at);
  newExpiresAt.setDate(newExpiresAt.getDate() - days);

  const newDaysRemaining = Math.max(0, (userResult.rows[0].plan_days_remaining || 0) - days);

  await query(
    `UPDATE users SET 
      plan_expires_at = $1,
      plan_days_remaining = $2
     WHERE id = $3`,
    [newExpiresAt.toISOString(), newDaysRemaining, userId]
  );

  await query(
    `INSERT INTO plan_history (user_id, action, plan_type, days_changed, admin_id, notes)
     VALUES ($1, 'admin_remove', NULL, $2, $3, 'Días removidos por administrador')`,
    [userId, -days, adminId]
  );

  return { newExpiresAt, daysRemoved: days };
}

/**
 * Activa o desactiva una cuenta de usuario (admin)
 */
async function toggleUserAccount(userId, isActive, adminId) {
  await query(
    `UPDATE users SET is_active = $1 WHERE id = $2`,
    [isActive ? 1 : 0, userId]
  );

  await query(
    `INSERT INTO plan_history (user_id, action, admin_id, notes)
     VALUES ($1, $2, $3, $4)`,
    [userId, isActive ? 'account_activated' : 'account_disabled', adminId, 
     isActive ? 'Cuenta activada por administrador' : 'Cuenta desactivada por administrador']
  );

  return { isActive };
}

module.exports = {
  checkPlanMiddleware,
  adminMiddleware,
  activateTrialDays,
  addDaysToUser,
  removeDaysFromUser,
  toggleUserAccount
};
