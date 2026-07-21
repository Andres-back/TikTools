const express = require('express');
const router = express.Router();
const db = require('../../../database/db');
const { authenticateToken } = require('../../shared/middlewares/auth');

router.get('/config', authenticateToken, async (req, res) => {
  try {
    const r = await db.query(`SELECT * FROM song_requests WHERE user_id = $1`, [req.user.userId]);
    const rows = r.rows || r;
    if (rows.length > 0) return res.json(rows[0]);
    const created = await db.query(`INSERT INTO song_requests (user_id) VALUES ($1) RETURNING *`, [req.user.userId]);
    res.json(created.rows ? created.rows[0] : created);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/config', authenticateToken, async (req, res) => {
  try {
    const { spotifyConnected, spotifyAccessToken, spotifyRefreshToken, spotifyDeviceId, minGiftValue, maxRequests, enabled } = req.body;
    const r = await db.query(
      `INSERT INTO song_requests (user_id, spotify_connected, spotify_access_token, spotify_refresh_token, spotify_device_id, min_gift_value, max_requests, enabled)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (user_id)
       DO UPDATE SET spotify_connected = COALESCE($2, song_requests.spotify_connected), spotify_access_token = COALESCE($3, song_requests.spotify_access_token), spotify_refresh_token = COALESCE($4, song_requests.spotify_refresh_token), spotify_device_id = COALESCE($5, song_requests.spotify_device_id), min_gift_value = COALESCE($6, song_requests.min_gift_value), max_requests = COALESCE($7, song_requests.max_requests), enabled = COALESCE($8, song_requests.enabled)
       RETURNING *`,
      [req.user.userId, spotifyConnected, spotifyAccessToken, spotifyRefreshToken, spotifyDeviceId, minGiftValue, maxRequests, enabled]
    );
    res.json(r.rows ? r.rows[0] : r);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/queue', authenticateToken, async (req, res) => {
  try {
    const r = await db.query(`SELECT * FROM song_queue WHERE user_id = $1 AND played = false ORDER BY requested_at ASC`, [req.user.userId]);
    res.json(r.rows || r);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/queue', authenticateToken, async (req, res) => {
  try {
    const { requester, songTitle, songArtist, spotifyUri, songDuration } = req.body;
    if (!requester || !songTitle || !spotifyUri) return res.status(400).json({ error: 'requester, songTitle y spotifyUri requeridos' });

    const configR = await db.query(`SELECT max_requests FROM song_requests WHERE user_id = $1`, [req.user.userId]);
    const config = (configR.rows || configR)[0];
    const maxReqs = config?.max_requests || 10;

    const countR = await db.query(`SELECT COUNT(*) as cnt FROM song_queue WHERE user_id = $1 AND played = false`, [req.user.userId]);
    const count = (countR.rows || countR)[0];
    if (count && count.cnt >= maxReqs) return res.status(429).json({ error: 'Cola llena' });

    const r = await db.query(
      `INSERT INTO song_queue (user_id, requester, song_title, song_artist, spotify_uri, song_duration) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.userId, requester, songTitle, songArtist, spotifyUri, parseInt(songDuration) || 0]
    );
    res.status(201).json(r.rows ? r.rows[0] : r);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/queue/:id', authenticateToken, async (req, res) => {
  try {
    await db.query(`DELETE FROM song_queue WHERE id = $1 AND user_id = $2`, [req.params.id, req.user.userId]);
    res.json({ message: 'Canción eliminada de la cola' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/queue/:id/played', authenticateToken, async (req, res) => {
  try {
    const r = await db.query(`UPDATE song_queue SET played = true WHERE id = $1 AND user_id = $2 RETURNING *`, [req.params.id, req.user.userId]);
    const rows = r.rows || r;
    res.json(rows[0] || {});
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/public/:userId/queue', async (req, res) => {
  try {
    const r = await db.query(`SELECT id, requester, song_title, song_artist, song_duration FROM song_queue WHERE user_id = $1 AND played = false ORDER BY requested_at ASC LIMIT 20`, [req.params.userId]);
    res.json(r.rows || r);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
