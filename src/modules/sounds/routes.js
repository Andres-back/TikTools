const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../../../database/db');
const { authenticateToken } = require('../../shared/middlewares/auth');

const uploadDir = path.join(process.cwd(), 'uploads', 'sounds');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true, mode: 0o755 });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${path.extname(file.originalname)}`;
    cb(null, unique);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const audioTypes = /mp3|wav|ogg|m4a|aac|flac/;
    const ok = audioTypes.test(path.extname(file.originalname).toLowerCase()) && file.mimetype.startsWith('audio/');
    cb(null, ok || cb(new Error('Solo archivos de audio')));
  }
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    const r = await db.query(`SELECT * FROM sound_alerts WHERE user_id = $1 ORDER BY created_at DESC`, [req.user.userId]);
    res.json(r.rows || r);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', authenticateToken, upload.single('sound'), async (req, res) => {
  try {
    const { triggerType, triggerId, volume, minGiftValue, enabled, soundFile } = req.body;
    
    // Check if using library sound (soundFile provided) or uploaded file
    let finalSoundPath;
    if (soundFile) {
      // Using library sound
      finalSoundPath = soundFile;
    } else if (req.file) {
      // Using uploaded file
      finalSoundPath = `/uploads/sounds/${req.file.filename}`;
    } else {
      return res.status(400).json({ error: 'Archivo de audio requerido o selecciona de la biblioteca' });
    }
    
    const r = await db.query(
      `INSERT INTO sound_alerts (user_id, trigger_type, trigger_id, sound_file, volume, min_gift_value, enabled) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        req.user.userId,
        triggerType || 'gift',
        triggerId || null,
        finalSoundPath,
        parseFloat(volume) || 0.8,
        parseInt(minGiftValue) || 1,
        enabled === undefined ? 1 : (enabled === 'false' || enabled === false ? 0 : 1)
      ]
    );
    res.status(201).json(r.rows ? r.rows[0] : r);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const r = await db.query(`SELECT sound_file FROM sound_alerts WHERE id = $1 AND user_id = $2`, [req.params.id, req.user.userId]);
    const rows = r.rows || r;
    await db.query(`DELETE FROM sound_alerts WHERE id = $1 AND user_id = $2`, [req.params.id, req.user.userId]);
    if (rows.length > 0) {
      const relativePath = rows[0].sound_file || '';
      const resolvedPath = path.resolve(process.cwd(), relativePath);
      const uploadsDir = path.resolve(process.cwd(), 'uploads');
      if (resolvedPath.startsWith(uploadsDir) && fs.existsSync(resolvedPath)) {
        fs.unlinkSync(resolvedPath);
      }
    }
    res.json({ message: 'Alerta eliminada' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id/toggle', authenticateToken, async (req, res) => {
  try {
    const r = await db.query(`UPDATE sound_alerts SET enabled = NOT enabled WHERE id = $1 AND user_id = $2 RETURNING *`, [req.params.id, req.user.userId]);
    const rows = r.rows || r;
    res.json(rows[0] || {});
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/public/:userId', async (req, res) => {
  try {
    const r = await db.query(`SELECT id, trigger_type, trigger_id, sound_file, volume FROM sound_alerts WHERE user_id = $1 AND enabled = true`, [req.params.userId]);
    res.json(r.rows || r);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
