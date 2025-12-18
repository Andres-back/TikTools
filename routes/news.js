/**
 * Routes - News (Novedades)
 * Sistema de noticias/anuncios del administrador
 */

const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configurar multer para subida de imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/news');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Solo se permiten imágenes (JPEG, PNG, GIF, WEBP)'));
  }
});

/**
 * GET /api/news
 * Obtener todas las noticias (público)
 */
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT n.*, u.username as author_name 
       FROM news n 
       LEFT JOIN users u ON n.author_id = u.id 
       ORDER BY n.created_at DESC 
       LIMIT 50`
    );
    res.json(result.rows || result);
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({ error: 'Error al obtener las novedades' });
  }
});

/**
 * POST /api/news
 * Crear noticia (solo admin)
 */
router.post('/', authenticateToken, isAdmin, upload.single('image'), async (req, res) => {
  try {
    const { title, content } = req.body;
    const userId = req.user.id;

    if (!title || !content) {
      return res.status(400).json({ error: 'Título y contenido son requeridos' });
    }

    const imageUrl = req.file ? `/uploads/news/${req.file.filename}` : null;

    const result = await db.query(
      `INSERT INTO news (title, content, image_url, author_id, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [title, content, imageUrl, userId]
    );

    res.status(201).json(result.rows ? result.rows[0] : result);
  } catch (error) {
    console.error('Error creating news:', error);
    res.status(500).json({ error: 'Error al crear la novedad' });
  }
});

/**
 * DELETE /api/news/:id
 * Eliminar noticia (solo admin)
 */
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener la noticia para eliminar la imagen
    const newsResult = await db.query('SELECT image_url FROM news WHERE id = $1', [id]);
    const news = newsResult.rows ? newsResult.rows[0] : newsResult[0];

    if (news && news.image_url) {
      const imagePath = path.join(__dirname, '..', news.image_url);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await db.query('DELETE FROM news WHERE id = $1', [id]);
    res.json({ message: 'Novedad eliminada exitosamente' });
  } catch (error) {
    console.error('Error deleting news:', error);
    res.status(500).json({ error: 'Error al eliminar la novedad' });
  }
});

module.exports = router;
