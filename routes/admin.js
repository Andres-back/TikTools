/**
 * API Routes - Administración
 */

const { query } = require('../database/db');
const { 
  addDaysToUser, 
  removeDaysFromUser, 
  toggleUserAccount 
} = require('../middleware/plan');

/**
 * Obtener todos los usuarios
 * GET /api/admin/users
 */
async function getUsers(req, res) {
  try {
    const { search, status, plan, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT id, username, email, display_name, role, plan_type, 
             plan_expires_at, plan_days_remaining, is_active, 
             created_at, last_login
      FROM users
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (search) {
      sql += ` AND (username ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status === 'active') {
      sql += ` AND is_active = true`;
    } else if (status === 'inactive') {
      sql += ` AND is_active = false`;
    }

    if (plan) {
      sql += ` AND plan_type = $${paramIndex}`;
      params.push(plan);
      paramIndex++;
    }

    sql += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(sql, params);

    // Contar total
    let countSql = `SELECT COUNT(*) as total FROM users WHERE 1=1`;
    const countParams = [];
    let countIndex = 1;

    if (search) {
      countSql += ` AND (username LIKE $${countIndex} OR email LIKE $${countIndex})`;
      countParams.push(`%${search}%`);
      countIndex++;
    }

    const countResult = await query(countSql, countParams);

    res.json({
      users: result.rows,
      total: countResult.rows[0]?.total || result.rowCount,
      page: parseInt(page),
      limit: parseInt(limit)
    });

  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
}

/**
 * Obtener un usuario específico
 * GET /api/admin/users/:id
 */
async function getUser(req, res) {
  try {
    const { id } = req.params;

    const userResult = await query(
      `SELECT id, username, email, display_name, role, plan_type,
              plan_expires_at, plan_days_remaining, is_active,
              created_at, updated_at, last_login
       FROM users WHERE id = $1`,
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Obtener historial de planes
    const historyResult = await query(
      `SELECT ph.*, u.username as admin_username
       FROM plan_history ph
       LEFT JOIN users u ON u.id = ph.admin_id
       WHERE ph.user_id = $1
       ORDER BY ph.created_at DESC
       LIMIT 20`,
      [id]
    );

    // Obtener pagos
    const paymentsResult = await query(
      `SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`,
      [id]
    );

    // Estadísticas
    const statsResult = await query(
      `SELECT COUNT(*) as total_auctions,
              SUM(total_coins_collected) as total_coins
       FROM auctions WHERE user_id = $1`,
      [id]
    );

    res.json({
      user: userResult.rows[0],
      planHistory: historyResult.rows,
      payments: paymentsResult.rows,
      stats: statsResult.rows[0]
    });

  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
}

/**
 * Añadir días a un usuario
 * POST /api/admin/users/:id/add-days
 */
async function addDays(req, res) {
  try {
    const { id } = req.params;
    const { days, planType = 'premium' } = req.body;

    if (!days || days < 1) {
      return res.status(400).json({ error: 'Días inválidos' });
    }

    const result = await addDaysToUser(id, days, req.user.userId, planType);

    res.json({
      message: `${days} días añadidos exitosamente`,
      ...result
    });

  } catch (error) {
    res.status(500).json({ error: error.message || 'Error al añadir días' });
  }
}

/**
 * Quitar días a un usuario
 * POST /api/admin/users/:id/remove-days
 */
async function removeDays(req, res) {
  try {
    const { id } = req.params;
    const { days } = req.body;

    if (!days || days < 1) {
      return res.status(400).json({ error: 'Días inválidos' });
    }

    const result = await removeDaysFromUser(id, days, req.user.userId);

    res.json({
      message: `${days} días removidos exitosamente`,
      ...result
    });

  } catch (error) {
    res.status(500).json({ error: error.message || 'Error al remover días' });
  }
}

/**
 * Activar/Desactivar cuenta
 * POST /api/admin/users/:id/toggle-status
 */
async function toggleStatus(req, res) {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    // No permitir desactivar administradores
    const userResult = await query(`SELECT role FROM users WHERE id = $1`, [id]);
    if (userResult.rows[0]?.role === 'admin') {
      return res.status(400).json({ error: 'No se puede desactivar un administrador' });
    }

    const result = await toggleUserAccount(id, isActive, req.user.userId);

    res.json({
      message: isActive ? 'Cuenta activada' : 'Cuenta desactivada',
      ...result
    });

  } catch (error) {
    res.status(500).json({ error: error.message || 'Error al cambiar estado' });
  }
}

/**
 * Cambiar rol de usuario
 * PUT /api/admin/users/:id/role
 */
async function changeRole(req, res) {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['user', 'moderator', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }

    await query(`UPDATE users SET role = $1 WHERE id = $2`, [role, id]);

    res.json({ message: 'Rol actualizado', role });

  } catch (error) {
    res.status(500).json({ error: 'Error al cambiar rol' });
  }
}

/**
 * Dashboard de estadísticas admin
 * GET /api/admin/dashboard
 */
async function getDashboard(req, res) {
  try {
    // Total usuarios
    const usersResult = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_active = true) as active,
        COUNT(*) FILTER (WHERE plan_type = 'premium') as premium,
        COUNT(*) FILTER (WHERE plan_type = 'free') as free,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as new_last_week
      FROM users
    `);

    // Ingresos
    const paymentsResult = await query(`
      SELECT 
        COUNT(*) as total_payments,
        SUM(amount) as total_revenue,
        SUM(amount) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as revenue_last_month
      FROM payments
      WHERE status = 'completed'
    `);

    // Subastas
    const auctionsResult = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE started_at > NOW() - INTERVAL '7 days') as last_week
      FROM auctions
    `);

    // Usuarios recientes
    const recentUsersResult = await query(`
      SELECT id, username, email, plan_type, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 5
    `);

    // Pagos recientes
    const recentPaymentsResult = await query(`
      SELECT p.*, u.username
      FROM payments p
      JOIN users u ON u.id = p.user_id
      ORDER BY p.created_at DESC
      LIMIT 5
    `);

    res.json({
      users: usersResult.rows[0],
      payments: paymentsResult.rows[0],
      auctions: auctionsResult.rows[0],
      recentUsers: recentUsersResult.rows,
      recentPayments: recentPaymentsResult.rows
    });

  } catch (error) {
    res.status(500).json({ error: 'Error al obtener dashboard' });
  }
}

module.exports = {
  getUsers,
  getUser,
  addDays,
  removeDays,
  toggleStatus,
  changeRole,
  getDashboard
};
