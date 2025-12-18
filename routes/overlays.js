/**
 * Routes - Overlays
 * Sistema de personalización de overlays por usuario
 */

const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configurar multer para subida de imágenes de overlay
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/overlays');
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
 * GET /api/overlays/my
 * Obtener configuración de overlay del usuario actual
 */
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await db.query(
      'SELECT * FROM overlays WHERE user_id = $1',
      [userId]
    );

    const overlay = result.rows ? result.rows[0] : result[0];

    if (!overlay) {
      // Devolver configuración por defecto
      return res.json({
        left_image_url: '/assets/QuesadillaCrocodilla.webp',
        right_image_url: '/assets/Noel.webp'
      });
    }

    res.json(overlay);
  } catch (error) {
    console.error('Error fetching overlay:', error);
    res.status(500).json({ error: 'Error al obtener configuración de overlay' });
  }
});

/**
 * GET /api/overlays/:userId
 * Obtener configuración de overlay de un usuario específico (público)
 */
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await db.query(
      'SELECT * FROM overlays WHERE user_id = $1',
      [userId]
    );

    const overlay = result.rows ? result.rows[0] : result[0];

    if (!overlay) {
      return res.json({
        left_image_url: '/assets/QuesadillaCrocodilla.webp',
        right_image_url: '/assets/Noel.webp'
      });
    }

    res.json(overlay);
  } catch (error) {
    console.error('Error fetching overlay:', error);
    res.status(500).json({ error: 'Error al obtener configuración de overlay' });
  }
});

/**
 * POST /api/overlays
 * Guardar/actualizar configuración de overlay
 */
router.post('/', authenticateToken, upload.fields([
  { name: 'leftImage', maxCount: 1 },
  { name: 'rightImage', maxCount: 1 }
]), async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Obtener overlay actual para eliminar imágenes antiguas si se reemplazan
    const currentResult = await db.query(
      'SELECT * FROM overlays WHERE user_id = $1',
      [userId]
    );
    const currentOverlay = currentResult.rows ? currentResult.rows[0] : currentResult[0];

    let leftImageUrl = currentOverlay?.left_image_url || '/assets/QuesadillaCrocodilla.webp';
    let rightImageUrl = currentOverlay?.right_image_url || '/assets/Noel.webp';

    // Actualizar imagen izquierda si se subió
    if (req.files && req.files.leftImage) {
      // Eliminar imagen anterior si existe
      if (currentOverlay?.left_image_url && !currentOverlay.left_image_url.startsWith('/assets/')) {
        const oldPath = path.join(__dirname, '..', currentOverlay.left_image_url);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      leftImageUrl = `/uploads/overlays/${req.files.leftImage[0].filename}`;
    }

    // Actualizar imagen derecha si se subió
    if (req.files && req.files.rightImage) {
      // Eliminar imagen anterior si existe
      if (currentOverlay?.right_image_url && !currentOverlay.right_image_url.startsWith('/assets/')) {
        const oldPath = path.join(__dirname, '..', currentOverlay.right_image_url);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      rightImageUrl = `/uploads/overlays/${req.files.rightImage[0].filename}`;
    }

    // Insertar o actualizar
    const result = await db.query(
      `INSERT INTO overlays (user_id, left_image_url, right_image_url, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id) 
       DO UPDATE SET 
         left_image_url = $2,
         right_image_url = $3,
         updated_at = NOW()
       RETURNING *`,
      [userId, leftImageUrl, rightImageUrl]
    );

    res.json(result.rows ? result.rows[0] : result);
  } catch (error) {
    console.error('Error saving overlay:', error);
    res.status(500).json({ error: 'Error al guardar configuración de overlay' });
  }
});

module.exports = router;
