const express = require('express');
const router = express.Router();
const db = require('../../../database/db');
const { authenticateToken } = require('../../shared/middlewares/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const r = await db.query(`SELECT * FROM actions WHERE user_id = $1 ORDER BY created_at DESC`, [req.user.userId]);
    res.json(r.rows || r);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, triggerType, triggerId, actionType, actionConfig, cooldown } = req.body;
    if (!name || !triggerType || !actionType) return res.status(400).json({ error: 'name, triggerType y actionType requeridos' });
    const r = await db.query(
      `INSERT INTO actions (user_id, name, trigger_type, trigger_id, action_type, action_config, cooldown) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.userId, name, triggerType, triggerId || null, actionType, JSON.stringify(actionConfig || {}), parseInt(cooldown) || 0]
    );
    res.status(201).json(r.rows ? r.rows[0] : r);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, triggerType, triggerId, actionType, actionConfig, cooldown, enabled } = req.body;
    const r = await db.query(
      `UPDATE actions SET name = COALESCE($1, name), trigger_type = COALESCE($2, trigger_type), trigger_id = $3, action_type = COALESCE($4, action_type), action_config = COALESCE($5, action_config), cooldown = COALESCE($6, cooldown), enabled = COALESCE($7, enabled) WHERE id = $8 AND user_id = $9 RETURNING *`,
      [name, triggerType, triggerId || null, actionType, actionConfig ? JSON.stringify(actionConfig) : null, cooldown, enabled, req.params.id, req.user.userId]
    );
    const rows = r.rows || r;
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Acción no encontrada' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await db.query(`DELETE FROM actions WHERE id = $1 AND user_id = $2`, [req.params.id, req.user.userId]);
    res.json({ message: 'Acción eliminada' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id/toggle', authenticateToken, async (req, res) => {
  try {
    const r = await db.query(`UPDATE actions SET enabled = NOT enabled WHERE id = $1 AND user_id = $2 RETURNING *`, [req.params.id, req.user.userId]);
    const rows = r.rows || r;
    res.json(rows[0] || {});
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/public/:userId', async (req, res) => {
  try {
    const r = await db.query(`SELECT id, name, trigger_type, trigger_id, action_type, action_config, cooldown, enabled FROM actions WHERE user_id = $1 AND enabled = true`, [req.params.userId]);
    res.json(r.rows || r);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
