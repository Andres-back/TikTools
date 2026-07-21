const express = require('express');
const router = express.Router();
const db = require('../../../database/db');
const { authenticateToken } = require('../../shared/middlewares/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM goals WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.userId]
    );
    res.json(result.rows || result);
  } catch (error) {
    console.error('[GOALS] Error fetching:', error);
    res.status(500).json({ error: 'Error al obtener metas' });
  }
});

router.get('/active', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM goals WHERE user_id = $1 AND active = true ORDER BY created_at DESC LIMIT 1`,
      [req.user.userId]
    );
    const goals = result.rows || result;
    res.json(goals.length > 0 ? goals[0] : null);
  } catch (error) {
    console.error('[GOALS] Error fetching active:', error);
    res.status(500).json({ error: 'Error al obtener meta activa' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { type, title, target, autoIncrement, incrementAmount, completionSound } = req.body;
    if (!type || !title || !target) {
      return res.status(400).json({ error: 'type, title y target son requeridos' });
    }
    if (!['likes', 'shares', 'followers', 'coins'].includes(type)) {
      return res.status(400).json({ error: 'Tipo inválido' });
    }
    const sound = completionSound || '/assets/sounds/effects/applause.mp3';
    const result = await db.query(
      `INSERT INTO goals (user_id, type, title, target, auto_increment, increment_amount, completion_sound) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.userId, type, title, target, autoIncrement ? 1 : 0, autoIncrement ? (parseInt(incrementAmount) || target) : 0, sound]
    );
    res.status(201).json(result.rows ? result.rows[0] : result);
  } catch (error) {
    console.error('[GOALS] Error creating:', error);
    res.status(500).json({ error: 'Error al crear meta' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, target, completionSound } = req.body;
    const result = await db.query(
      `UPDATE goals SET title = COALESCE($1, title), target = COALESCE($2, target), completion_sound = COALESCE($3, completion_sound) WHERE id = $4 AND user_id = $5 RETURNING *`,
      [title, target, completionSound, id, req.user.userId]
    );
    const rows = result.rows || result;
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Meta no encontrada' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('[GOALS] Error updating:', error);
    res.status(500).json({ error: 'Error al actualizar meta' });
  }
});

router.post('/:id/progress', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;
    if (!amount || amount < 1) {
      return res.status(400).json({ error: 'Monto inválido' });
    }
    const result = await db.query(
      `UPDATE goals SET current = current + $1 WHERE id = $2 AND user_id = $3 AND active = true RETURNING *`,
      [amount, id, req.user.userId]
    );
    const rows = result.rows || result;
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Meta no encontrada o ya completada' });
    }
    const goal = rows[0];

    // Auto-increment: cuando se alcanza la meta, sube el target automáticamente
    if (goal.current >= goal.target && goal.auto_increment && goal.increment_amount > 0) {
      const newTarget = goal.target + goal.increment_amount;
      await db.query(
        `UPDATE goals SET target = $1, current = 0 WHERE id = $2`,
        [newTarget, id]
      );
      goal.target = newTarget;
      goal.current = 0;
      goal.message = `🎉 Meta superada! Nuevo objetivo: ${newTarget.toLocaleString()}`;
    } else if (goal.current >= goal.target) {
      await db.query(
        `UPDATE goals SET active = false, finished_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [id]
      );
      goal.active = false;
      goal.finished_at = new Date().toISOString();
    }
    res.json(goal);
  } catch (error) {
    console.error('[GOALS] Error updating progress:', error);
    res.status(500).json({ error: 'Error al actualizar progreso' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await db.query(`DELETE FROM goals WHERE id = $1 AND user_id = $2`, [id, req.user.userId]);
    res.json({ message: 'Meta eliminada' });
  } catch (error) {
    console.error('[GOALS] Error deleting:', error);
    res.status(500).json({ error: 'Error al eliminar meta' });
  }
});

router.get('/public/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const type = req.query.type;
    let sql = `SELECT id, type, title, target, current, auto_increment, increment_amount, completion_sound, active, started_at FROM goals WHERE user_id = $1 AND active = true`;
    const params = [userId];
    if (type) {
      sql += ` AND type = $2`;
      params.push(type);
    }
    sql += ` ORDER BY created_at DESC LIMIT 1`;
    const result = await db.query(sql, params);
    const rows = result.rows || result;
    res.json(rows.length > 0 ? rows[0] : null);
  } catch (error) {
    console.error('[GOALS] Error fetching public:', error);
    res.status(500).json({ error: 'Error al obtener meta' });
  }
});

module.exports = router;
