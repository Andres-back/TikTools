const express = require('express');
const router = express.Router();
const db = require('../../../database/db');
const { authenticateToken } = require('../../shared/middlewares/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const r = await db.query(`SELECT * FROM chatbot_commands WHERE user_id = $1 ORDER BY command`, [req.user.userId]);
    res.json(r.rows || r);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { command, response, permission, cooldown } = req.body;
    if (!command || !response) return res.status(400).json({ error: 'command y response requeridos' });
    const cleanCmd = command.startsWith('!') ? command.toLowerCase() : `!${command.toLowerCase()}`;
    const r = await db.query(
      `INSERT INTO chatbot_commands (user_id, command, response, permission, cooldown) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.userId, cleanCmd, response, permission || 'all', parseInt(cooldown) || 0]
    );
    res.status(201).json(r.rows ? r.rows[0] : r);
  } catch (e) {
    if (e.code === '23505' || e.message?.includes('UNIQUE')) return res.status(409).json({ error: 'El comando ya existe' });
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { command, response, permission, cooldown, enabled } = req.body;
    const r = await db.query(
      `UPDATE chatbot_commands SET command = COALESCE($1, command), response = COALESCE($2, response), permission = COALESCE($3, permission), cooldown = COALESCE($4, cooldown), enabled = COALESCE($5, enabled) WHERE id = $6 AND user_id = $7 RETURNING *`,
      [command?.toLowerCase(), response, permission, cooldown, enabled, req.params.id, req.user.userId]
    );
    const rows = r.rows || r;
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Comando no encontrado' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await db.query(`DELETE FROM chatbot_commands WHERE id = $1 AND user_id = $2`, [req.params.id, req.user.userId]);
    res.json({ message: 'Comando eliminado' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id/toggle', authenticateToken, async (req, res) => {
  try {
    const r = await db.query(`UPDATE chatbot_commands SET enabled = NOT enabled WHERE id = $1 AND user_id = $2 RETURNING *`, [req.params.id, req.user.userId]);
    const rows = r.rows || r;
    res.json(rows[0] || {});
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/public/:userId', async (req, res) => {
  try {
    const r = await db.query(`SELECT command, response, permission, cooldown FROM chatbot_commands WHERE user_id = $1 AND enabled = true`, [req.params.userId]);
    res.json(r.rows || r);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
