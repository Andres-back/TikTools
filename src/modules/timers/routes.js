const express = require('express');
const router = express.Router();
const db = require('../../../database/db');
const { authenticateToken } = require('../../shared/middlewares/auth');
const extendLimiter = new Map();
setInterval(() => extendLimiter.clear(), 60000);

router.get('/', authenticateToken, async (req, res) => {
  try {
    const r = await db.query(`SELECT * FROM extendable_timers WHERE user_id = $1 ORDER BY created_at DESC`, [req.user.userId]);
    res.json(r.rows || r);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/active', authenticateToken, async (req, res) => {
  try {
    const r = await db.query(`SELECT * FROM extendable_timers WHERE user_id = $1 AND active = true LIMIT 1`, [req.user.userId]);
    const rows = r.rows || r;
    res.json(rows.length > 0 ? rows[0] : null);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, duration, giftExtension, minGiftValue } = req.body;
    if (!duration) return res.status(400).json({ error: 'duration requerido' });
    const r = await db.query(
      `INSERT INTO extendable_timers (user_id, title, duration, remaining, gift_extension, min_gift_value) VALUES ($1, $2, $3, $3, $4, $5) RETURNING *`,
      [req.user.userId, title || 'COUNTDOWN', parseInt(duration), parseInt(giftExtension) || 10, parseInt(minGiftValue) || 1]
    );
    res.status(201).json(r.rows ? r.rows[0] : r);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id/start', authenticateToken, async (req, res) => {
  try {
    const r = await db.query(`UPDATE extendable_timers SET active = true, paused = false, started_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2 RETURNING *`, [req.params.id, req.user.userId]);
    const rows = r.rows || r;
    res.json(rows[0] || {});
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id/pause', authenticateToken, async (req, res) => {
  try {
    const r = await db.query(`UPDATE extendable_timers SET paused = true WHERE id = $1 AND user_id = $2 RETURNING *`, [req.params.id, req.user.userId]);
    const rows = r.rows || r;
    res.json(rows[0] || {});
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id/resume', authenticateToken, async (req, res) => {
  try {
    const r = await db.query(`UPDATE extendable_timers SET paused = false WHERE id = $1 AND user_id = $2 RETURNING *`, [req.params.id, req.user.userId]);
    const rows = r.rows || r;
    res.json(rows[0] || {});
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id/extend', authenticateToken, async (req, res) => {
  try {
    const r = await db.query(`UPDATE extendable_timers SET remaining = remaining + gift_extension WHERE id = $1 AND user_id = $2 AND active = true AND paused = false RETURNING *`, [req.params.id, req.user.userId]);
    const rows = r.rows || r;
    res.json(rows[0] || {});
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { title, duration, giftExtension, minGiftValue } = req.body;
    const fields = [];
    const params = [];
    let idx = 1;
    if (title !== undefined) { fields.push(`title = $${idx++}`); params.push(title); }
    if (duration !== undefined) { fields.push(`duration = $${idx++}`); params.push(parseInt(duration)); }
    if (giftExtension !== undefined) { fields.push(`gift_extension = $${idx++}`); params.push(parseInt(giftExtension)); }
    if (minGiftValue !== undefined) { fields.push(`min_gift_value = $${idx++}`); params.push(parseInt(minGiftValue)); }
    if (fields.length === 0) return res.status(400).json({ error: 'Nada que actualizar' });
    params.push(parseInt(req.params.id), req.user.userId);
    const r = await db.query(
      `UPDATE extendable_timers SET ${fields.join(', ')} WHERE id = $${idx++} AND user_id = $${idx} RETURNING *`,
      params
    );
    const rows = r.rows || r;
    if (rows.length === 0) return res.status(404).json({ error: 'Timer no encontrado' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await db.query(`DELETE FROM extendable_timers WHERE id = $1 AND user_id = $2`, [req.params.id, req.user.userId]);
    res.json({ message: 'Timer eliminado' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/public/:userId', async (req, res) => {
  try {
    const r = await db.query(`SELECT id, title, duration, remaining, gift_extension, min_gift_value, active, paused, started_at FROM extendable_timers WHERE user_id = $1 AND active = true LIMIT 1`, [req.params.userId]);
    const rows = r.rows || r;
    res.json(rows.length > 0 ? rows[0] : null);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/public/:timerId/extend', async (req, res) => {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const count = (extendLimiter.get(ip) || 0) + 1;
  extendLimiter.set(ip, count);
  if (count > 30) return res.status(429).json({ error: 'Demasiadas solicitudes. Espera un momento.' });
  try {
    const r = await db.query(`UPDATE extendable_timers SET remaining = remaining + gift_extension WHERE id = $1 AND active = true AND paused = false RETURNING *`, [req.params.timerId]);
    const rows = r.rows || r;
    res.json(rows[0] || { error: 'No se pudo extender' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
