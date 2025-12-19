/**
 * Middleware de Verificación de Planes y Suscripciones
 * Mejorado con logging, caching y funciones administrativas
 */

const { query } = require('../database/db');
const { ForbiddenError, NotFoundError } = require('./error-handler');
const { PLANS, isPlanActive } = require('../constants/plans');
const logger = require('../utils/logger');

/**
 * Verifica si el usuario tiene un plan activo
 */
async function checkPlanMiddleware(req, res, next) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new ForbiddenError('Autenticación requerida');
    }

    const result = await query(
      `SELECT role, plan_type, plan_expires_at, plan_days_remaining, is_active
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Usuario no encontrado');
    }

    const user = result.rows[0];

    // Admin siempre tiene acceso
    if (user.role === 'admin') {
      req.userPlan = { type: 'admin', active: true };
      return next();
    }

    // Verificar si la cuenta está activa
    if (!user.is_active) {
      logger.warn('Inactive account access attempt', {
        userId,
        username: req.user.username
      });

      throw new ForbiddenError('Cuenta desactivada. Contacta al administrador.');
    }

    // Verificar plan
    const planIsActive = isPlanActive(user.plan_expires_at);
    const hasDaysRemaining = user.plan_days_remaining > 0;

    if (!planIsActive && !hasDaysRemaining) {
      logger.info('Plan expired access attempt', {
        userId,
        planType: user.plan_type,
        expiresAt: user.plan_expires_at
      });

      throw new ForbiddenError('Tu plan ha expirado. Renueva para continuar.');
    }

    req.userPlan = {
      type: user.plan_type,
      expiresAt: user.plan_expires_at,
      daysRemaining: user.plan_days_remaining,
      active: true
    };

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware para verificar plan específico
 */
function requirePlan(requiredPlan) {
  return async (req, res, next) => {
    try {
      await checkPlanMiddleware(req, res, () => {
        const userPlan = req.userPlan?.type;

        if (!userPlan) {
          throw new ForbiddenError('Plan no detectado');
        }

        // Admin bypass
        if (userPlan === 'admin') {
          return next();
        }

        // Verificar jerarquía de planes
        const planHierarchy = { free: 1, basic: 2, premium: 3 };
        const userLevel = planHierarchy[userPlan] || 0;
        const requiredLevel = planHierarchy[requiredPlan] || 999;

        if (userLevel < requiredLevel) {
          throw new ForbiddenError(
            `Esta función requiere plan ${requiredPlan}. Tu plan actual: ${userPlan}`
          );
        }

        next();
      });
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Activa los días de prueba para un nuevo usuario
 */
async function activateTrialDays(userId, trialDays = 2) {
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + trialDays);

    await query(
      `UPDATE users SET
        plan_type = $1,
        plan_expires_at = $2,
        plan_days_remaining = $3
       WHERE id = $4`,
      [PLANS.FREE, expiresAt.toISOString(), trialDays, userId]
    );

    await query(
      `INSERT INTO plan_history (user_id, action, plan_type, days_changed, notes)
       VALUES ($1, 'activated', $2, $3, 'Período de prueba inicial')`,
      [userId, PLANS.FREE, trialDays]
    );

    logger.info('Trial activated', { userId, trialDays, expiresAt });

    return { expiresAt, trialDays };
  } catch (error) {
    logger.error('Error activating trial', { userId, error: error.message });
    throw error;
  }
}

/**
 * Añade días al plan de un usuario (admin)
 */
async function addDaysToUser(userId, days, adminId, planType = PLANS.PREMIUM) {
  try {
    const userResult = await query(
      `SELECT plan_expires_at, plan_days_remaining FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new NotFoundError('Usuario no encontrado');
    }

    let newExpiresAt = new Date();
    const currentExpires = userResult.rows[0].plan_expires_at;

    // Si tiene plan activo, extender desde la fecha actual de expiración
    if (currentExpires && new Date(currentExpires) > newExpiresAt) {
      newExpiresAt = new Date(currentExpires);
    }

    newExpiresAt.setDate(newExpiresAt.getDate() + days);

    const currentDaysRemaining = userResult.rows[0].plan_days_remaining || 0;
    const newDaysRemaining = currentDaysRemaining + days;

    await query(
      `UPDATE users SET
        plan_type = $1,
        plan_expires_at = $2,
        plan_days_remaining = $3
       WHERE id = $4`,
      [planType, newExpiresAt.toISOString(), newDaysRemaining, userId]
    );

    await query(
      `INSERT INTO plan_history (user_id, action, plan_type, days_changed, admin_id, notes)
       VALUES ($1, 'admin_add', $2, $3, $4, 'Días añadidos por administrador')`,
      [userId, planType, days, adminId]
    );

    logger.logAudit(adminId, 'ADD_PLAN_DAYS', {
      targetUserId: userId,
      days,
      planType,
      newExpiresAt
    });

    return { newExpiresAt, daysAdded: days, totalDaysRemaining: newDaysRemaining };
  } catch (error) {
    logger.error('Error adding days to user', {
      userId,
      adminId,
      days,
      error: error.message
    });
    throw error;
  }
}

/**
 * Quita días del plan de un usuario (admin)
 */
async function removeDaysFromUser(userId, days, adminId) {
  try {
    const userResult = await query(
      `SELECT plan_expires_at, plan_days_remaining FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new NotFoundError('Usuario no encontrado');
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

    logger.logAudit(adminId, 'REMOVE_PLAN_DAYS', {
      targetUserId: userId,
      days,
      newExpiresAt
    });

    return { newExpiresAt, daysRemoved: days, totalDaysRemaining: newDaysRemaining };
  } catch (error) {
    logger.error('Error removing days from user', {
      userId,
      adminId,
      days,
      error: error.message
    });
    throw error;
  }
}

/**
 * Activa o desactiva una cuenta de usuario (admin)
 */
async function toggleUserAccount(userId, isActive, adminId) {
  try {
    await query(
      `UPDATE users SET is_active = $1 WHERE id = $2`,
      [isActive, userId]
    );

    await query(
      `INSERT INTO plan_history (user_id, action, admin_id, notes)
       VALUES ($1, $2, $3, $4)`,
      [
        userId,
        isActive ? 'account_activated' : 'account_disabled',
        adminId,
        isActive ? 'Cuenta activada por administrador' : 'Cuenta desactivada por administrador'
      ]
    );

    logger.logAudit(adminId, isActive ? 'ACTIVATE_ACCOUNT' : 'DEACTIVATE_ACCOUNT', {
      targetUserId: userId
    });

    return { isActive };
  } catch (error) {
    logger.error('Error toggling user account', {
      userId,
      adminId,
      isActive,
      error: error.message
    });
    throw error;
  }
}

/**
 * Obtiene estadísticas del plan del usuario
 */
async function getPlanStats(userId) {
  try {
    const result = await query(
      `SELECT
        plan_type,
        plan_expires_at,
        plan_days_remaining,
        created_at
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Usuario no encontrado');
    }

    const user = result.rows[0];
    const now = new Date();
    const expiresAt = new Date(user.plan_expires_at);
    const daysUntilExpiration = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

    return {
      planType: user.plan_type,
      expiresAt: user.plan_expires_at,
      daysRemaining: user.plan_days_remaining,
      daysUntilExpiration: daysUntilExpiration > 0 ? daysUntilExpiration : 0,
      isActive: isPlanActive(user.plan_expires_at),
      memberSince: user.created_at
    };
  } catch (error) {
    logger.error('Error getting plan stats', { userId, error: error.message });
    throw error;
  }
}

module.exports = {
  checkPlanMiddleware,
  requirePlan,
  activateTrialDays,
  addDaysToUser,
  removeDaysFromUser,
  toggleUserAccount,
  getPlanStats
};
