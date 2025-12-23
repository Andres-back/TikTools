/**
 * API Routes - Administración
 */

const { query } = require('../../../database/db');
const {
  addDaysToUser,
  removeDaysFromUser,
  toggleUserAccount
} = require('../../shared/middlewares/plan');

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
    const adminId = req.user.userId;

    // Total usuarios
    const usersResult = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_active = true) as active,
        COUNT(*) FILTER (WHERE plan_type = 'premium') as premium,
        COUNT(*) FILTER (WHERE plan_type = 'free') as free,
        COUNT(*) FILTER (WHERE is_verified = true) as verified,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as new_last_week
      FROM users
    `);

    // Ingresos
    const paymentsResult = await query(`
      SELECT 
        COUNT(*) as total_payments,
        COALESCE(SUM(amount), 0) as total_revenue,
        COALESCE(SUM(amount) FILTER (WHERE created_at > NOW() - INTERVAL '30 days'), 0) as revenue_last_month
      FROM payments
      WHERE status = 'completed'
    `);

    // Subastas
    const auctionsResult = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE started_at > NOW() - INTERVAL '7 days') as last_week,
        COUNT(*) FILTER (WHERE DATE(started_at) = CURRENT_DATE) as today
      FROM auctions
    `);

    // Mensajes sin leer (para el admin)
    const messagesResult = await query(`
      SELECT COUNT(*) as unread
      FROM messages
      WHERE recipient_id = $1 AND read = false
    `, [adminId]);

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
      messages: messagesResult.rows[0],
      recentUsers: recentUsersResult.rows,
      recentPayments: recentPaymentsResult.rows
    });

  } catch (error) {
    console.error('Error getting dashboard:', error);
    res.status(500).json({ error: 'Error al obtener dashboard' });
  }
}

/**
 * Crear nuevo usuario (desde admin)
 * POST /api/admin/users
 */
async function createUser(req, res) {
  try {
    const { username, email, password, planType = 'free', planDays = 2, role = 'user' } = req.body;
    const bcrypt = require('bcryptjs');

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email y password son requeridos' });
    }

    // Verificar si ya existe
    const existing = await query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username.toLowerCase(), email.toLowerCase()]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Usuario o email ya existe' });
    }

    // Hash de password
    const passwordHash = await bcrypt.hash(password, 12);

    // Crear usuario
    const result = await query(
      `INSERT INTO users (username, email, password_hash, role, is_verified, is_active, plan_type, plan_days_remaining)
       VALUES ($1, $2, $3, $4, true, true, $5, $6)
       RETURNING id, username, email, role, plan_type, plan_days_remaining`,
      [username.toLowerCase(), email.toLowerCase(), passwordHash, role, planType, planDays]
    );

    // Establecer fecha de expiración
    if (planDays > 0) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + planDays);
      await query(
        'UPDATE users SET plan_expires_at = $1 WHERE id = $2',
        [expiresAt.toISOString(), result.rows[0].id]
      );
    }

    // Crear configuración por defecto
    await query('INSERT INTO user_settings (user_id) VALUES ($1)', [result.rows[0].id]);
    await query('INSERT INTO user_stats (user_id) VALUES ($1)', [result.rows[0].id]);

    // Registrar en historial
    await query(
      `INSERT INTO plan_history (user_id, action, plan_type, days_changed, admin_id, notes)
       VALUES ($1, 'created', $2, $3, $4, 'Usuario creado por administrador')`,
      [result.rows[0].id, planType, planDays, req.user.userId]
    );

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
}

/**
 * Eliminar usuario (solo admin)
 * DELETE /api/admin/users/:id
 */
async function deleteUser(req, res) {
  try {
    const { id } = req.params;

    // No permitir eliminar administradores
    const userResult = await query('SELECT role FROM users WHERE id = $1', [id]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (userResult.rows[0].role === 'admin') {
      return res.status(400).json({ error: 'No se puede eliminar un administrador' });
    }

    // Eliminar en cascada (gracias a las foreign keys)
    await query('DELETE FROM users WHERE id = $1', [id]);

    res.json({ message: 'Usuario eliminado exitosamente' });

  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
}

/**
 * Resetear contraseña de usuario
 * POST /api/admin/users/:id/reset-password
 */
async function resetPassword(req, res) {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    const bcrypt = require('bcryptjs');

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, id]);

    res.json({ message: 'Contraseña reseteada exitosamente' });

  } catch (error) {
    res.status(500).json({ error: 'Error al resetear contraseña' });
  }
}

/**
 * Actualizar usuario completo
 * PUT /api/admin/users/:id
 */
async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { username, email, displayName, role, planType, days, isActive, isVerified, password } = req.body;
    const bcrypt = require('bcryptjs');

    // Verificar que el usuario existe
    const existing = await query('SELECT id, role FROM users WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // No permitir cambiar rol de admin a no-admin si es el propio usuario
    if (existing.rows[0].role === 'admin' && role !== 'admin' && req.user.userId === parseInt(id)) {
      return res.status(400).json({ error: 'No puedes quitarte el rol de administrador' });
    }

    // Construir la actualización
    let updateFields = [];
    let params = [];
    let paramIndex = 1;

    if (username) {
      updateFields.push(`username = $${paramIndex++}`);
      params.push(username.toLowerCase());
    }
    if (email) {
      updateFields.push(`email = $${paramIndex++}`);
      params.push(email.toLowerCase());
    }
    if (displayName !== undefined) {
      updateFields.push(`display_name = $${paramIndex++}`);
      params.push(displayName);
    }
    if (role) {
      updateFields.push(`role = $${paramIndex++}`);
      params.push(role);
    }
    if (planType) {
      updateFields.push(`plan_type = $${paramIndex++}`);
      params.push(planType);
    }
    if (days !== undefined) {
      updateFields.push(`plan_days_remaining = $${paramIndex++}`);
      params.push(days);
      
      // Actualizar fecha de expiración
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + days);
      updateFields.push(`plan_expires_at = $${paramIndex++}`);
      params.push(expiresAt.toISOString());
    }
    if (typeof isActive === 'boolean') {
      updateFields.push(`is_active = $${paramIndex++}`);
      params.push(isActive);
    }
    if (typeof isVerified === 'boolean') {
      updateFields.push(`is_verified = $${paramIndex++}`);
      params.push(isVerified);
    }
    if (password && password.length >= 6) {
      const passwordHash = await bcrypt.hash(password, 12);
      updateFields.push(`password_hash = $${paramIndex++}`);
      params.push(passwordHash);
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);

    const sql = `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await query(sql, params);

    // Registrar en historial
    await query(
      `INSERT INTO plan_history (user_id, action, plan_type, days_changed, admin_id, notes)
       VALUES ($1, 'admin_update', $2, $3, $4, 'Usuario actualizado por administrador')`,
      [id, planType || null, days || 0, req.user.userId]
    );

    res.json({
      message: 'Usuario actualizado',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
}

/**
 * Obtener todas las conversaciones (bandeja de chat admin)
 * GET /api/admin/chats
 */
async function getChats(req, res) {
  try {
    // Obtener ID del admin actual
    const adminId = req.user.userId;

    // Obtener lista de usuarios que han enviado mensajes al admin
    const result = await query(`
      SELECT 
        u.id as user_id,
        u.username,
        u.email,
        u.display_name,
        (SELECT message FROM messages 
         WHERE (sender_id = u.id AND recipient_id = $1) OR (sender_id = $1 AND recipient_id = u.id)
         ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM messages 
         WHERE (sender_id = u.id AND recipient_id = $1) OR (sender_id = $1 AND recipient_id = u.id)
         ORDER BY created_at DESC LIMIT 1) as last_message_at,
        (SELECT COUNT(*) FROM messages 
         WHERE sender_id = u.id AND recipient_id = $1 AND read = false)::int as unread_count
      FROM users u
      WHERE EXISTS (
        SELECT 1 FROM messages m 
        WHERE (m.sender_id = u.id AND m.recipient_id = $1) 
           OR (m.sender_id = $1 AND m.recipient_id = u.id)
      )
      AND u.id != $1
      ORDER BY last_message_at DESC NULLS LAST
    `, [adminId]);

    res.json({ conversations: result.rows });

  } catch (error) {
    console.error('Error getting chats:', error);
    res.status(500).json({ error: 'Error al obtener conversaciones' });
  }
}

/**
 * Marcar mensajes como leídos
 * POST /api/admin/chats/:userId/read
 */
async function markChatAsRead(req, res) {
  try {
    const { userId } = req.params;
    const adminId = req.user.userId;

    await query(
      `UPDATE messages SET read = true 
       WHERE sender_id = $1 AND recipient_id = $2 AND read = false`,
      [userId, adminId]
    );

    res.json({ message: 'Mensajes marcados como leídos' });

  } catch (error) {
    console.error('Error marking chat as read:', error);
    res.status(500).json({ error: 'Error al marcar mensajes como leídos' });
  }
}

/**
 * Eliminar conversación (cerrar caso)
 * DELETE /api/admin/chats/:userId
 */
async function deleteChat(req, res) {
  try {
    const { userId } = req.params;
    const adminId = req.user.userId;

    await query(
      `DELETE FROM messages 
       WHERE (sender_id = $1 AND recipient_id = $2) 
          OR (sender_id = $2 AND recipient_id = $1)`,
      [userId, adminId]
    );

    res.json({ message: 'Conversación eliminada' });

  } catch (error) {
    console.error('Error deleting chat:', error);
    res.status(500).json({ error: 'Error al eliminar conversación' });
  }
}

module.exports = {
  getUsers,
  getUser,
  addDays,
  removeDays,
  toggleStatus,
  changeRole,
  getDashboard,
  createUser,
  deleteUser,
  resetPassword,
  updateUser,
  getChats,
  markChatAsRead,
  deleteChat
};
