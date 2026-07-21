/**
 * Settings API — Hype Config
 */
const express = require('express');
const router = express.Router();
const db = require('../../../database/db');
const { authenticateToken } = require('../../shared/middlewares/auth');

const DEFAULT_HYPE_CONFIG = {
  multiplier: 1, decay: 0.65, thresholdBase: 100,
  thresholdMultiplier: 1.5, animations: true, sound: true, maxLevels: 0
};

router.get('/hype', authenticateToken, async (req, res) => {
  try {
    const r = await db.query(`SELECT hype_config FROM user_settings WHERE user_id = $1`, [req.user.userId]);
    const row = r.rows?.[0] || r?.[0];
    if (!row?.hype_config) return res.json(DEFAULT_HYPE_CONFIG);
    try { return res.json({ ...DEFAULT_HYPE_CONFIG, ...JSON.parse(row.hype_config) }); }
    catch { return res.json(DEFAULT_HYPE_CONFIG); }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/hype', authenticateToken, async (req, res) => {
  try {
    const config = { ...DEFAULT_HYPE_CONFIG, ...(req.body || {}) };
    // Clamp values
    config.multiplier = Math.max(0.1, Math.min(5, Number(config.multiplier) || 1));
    config.decay = Math.max(0.1, Math.min(5, Number(config.decay) || 0.65));
    config.thresholdBase = Math.max(10, Math.min(10000, Number(config.thresholdBase) || 100));
    config.thresholdMultiplier = Math.max(1.1, Math.min(5, Number(config.thresholdMultiplier) || 1.5));
    config.maxLevels = Math.max(0, Math.min(100, Number(config.maxLevels) || 0));
    config.animations = config.animations !== false;
    config.sound = config.sound !== false;

    await db.query(
      `INSERT INTO user_settings (user_id, hype_config) VALUES ($1, $2)
       ON CONFLICT(user_id) DO UPDATE SET hype_config = $2, updated_at = CURRENT_TIMESTAMP`,
      [req.user.userId, JSON.stringify(config)]
    );
    res.json(config);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* Public endpoint: returns hype config for a userId (used by overlay in OBS) */
router.get('/hype/public/:userId', async (req, res) => {
  try {
    const r = await db.query(`SELECT hype_config FROM user_settings WHERE user_id = $1`, [req.params.userId]);
    const row = r.rows?.[0] || r?.[0];
    if (!row?.hype_config) return res.json(DEFAULT_HYPE_CONFIG);
    try { return res.json({ ...DEFAULT_HYPE_CONFIG, ...JSON.parse(row.hype_config) }); }
    catch { return res.json(DEFAULT_HYPE_CONFIG); }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
