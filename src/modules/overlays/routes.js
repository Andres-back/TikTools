/**
 * Routes - Overlays
 * Sistema de personalización de overlays por usuario
 */

const express = require('express');
const router = express.Router();
const db = require('../../../database/db');
const { authenticateToken } = require('../../shared/middlewares/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configurar multer para subida de imágenes de overlay
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // CORREGIDO: Usar process.cwd() para ruta absoluta desde raíz del proyecto
    const uploadDir = path.join(process.cwd(), 'uploads', 'overlays');
    console.log(`[OVERLAY-UPLOAD] Destination check: ${uploadDir}`);
    
    try {
      if (!fs.existsSync(uploadDir)) {
        console.log(`[OVERLAY-UPLOAD] Creating directory: ${uploadDir}`);
        fs.mkdirSync(uploadDir, { recursive: true, mode: 0o755 });
      }
      
      // Verificar que el directorio es escribible
      fs.accessSync(uploadDir, fs.constants.W_OK);
      console.log(`[OVERLAY-UPLOAD] Directory ready for file: ${file.originalname}`);
      cb(null, uploadDir);
    } catch (error) {
      console.error(`[OVERLAY-UPLOAD] Error with directory ${uploadDir}:`, error);
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 9);
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${timestamp}-${randomId}${ext}`;

    console.log(`[OVERLAY-UPLOAD] Generated filename: ${uniqueName} for original: ${file.originalname}`);

    // Verificar que el archivo se guardará correctamente
    const uploadDir = path.join(process.cwd(), 'uploads', 'overlays');
    const fullPath = path.join(uploadDir, uniqueName);
    console.log(`[OVERLAY-UPLOAD] File will be saved at: ${fullPath}`);

    cb(null, uniqueName);

    // Verificar después de 2 segundos que el archivo existe
    setTimeout(() => {
      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        console.log(`[OVERLAY-UPLOAD] ✓ File saved successfully: ${fullPath} (${stats.size} bytes)`);
      } else {
        console.error(`[OVERLAY-UPLOAD] ✗ File NOT found after save: ${fullPath}`);
      }
    }, 2000);
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
    const userId = req.user.userId;
    console.log(`[OVERLAY-MY] Request from user ${userId}`);

    const result = await db.query(
      'SELECT * FROM overlays WHERE user_id = $1',
      [userId]
    );

    const overlay = result.rows ? result.rows[0] : result[0];
    console.log(`[OVERLAY-MY] Found overlay for user ${userId}:`, overlay ? 'Yes' : 'No, using defaults');

    if (!overlay) {
      // Devolver configuración por defecto
      const defaultConfig = {
        left_image_url: '/assets/QuesadillaCrocodilla.webp',
        right_image_url: '/assets/Noel.webp'
      };
      console.log(`[OVERLAY-MY] Returning default config for user ${userId}`);
      return res.json(defaultConfig);
    }

    console.log(`[OVERLAY-MY] Returning user config for user ${userId}`);
    res.json(overlay);
  } catch (error) {
    console.error('Error fetching overlay:', error);
    res.status(500).json({ error: 'Error al obtener configuración de overlay' });
  }
});

/**
 * GET /api/overlays/:identifier
 * Obtener configuración de overlay de un usuario específico (público)
 * Acepta ID o Username
 */
router.get('/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    let userId = identifier;

    // Si no es un número, asumir que es un username
    if (isNaN(identifier)) {
      const userResult = await db.query('SELECT id FROM users WHERE username = $1', [identifier]);
      const user = userResult.rows ? userResult.rows[0] : userResult[0];

      if (!user) {
        // Si no existe el usuario, devolver default sin error 404 para no romper el overlay
        return res.json({
          left_image_url: '/assets/QuesadillaCrocodilla.webp',
          right_image_url: '/assets/Noel.webp'
        });
      }
      userId = user.id;
    }

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
    const userId = req.user.userId;
    console.log(`[OVERLAY-POST] Request from user ${userId}`);
    console.log(`[OVERLAY-POST] Files received:`, req.files ? Object.keys(req.files) : 'none');

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
      console.log(`[OVERLAY-POST] Processing left image: ${req.files.leftImage[0].filename}`);
      // Eliminar imagen anterior si existe
      if (currentOverlay?.left_image_url && !currentOverlay.left_image_url.startsWith('/assets/')) {
        const oldPath = path.join(process.cwd(), currentOverlay.left_image_url);
        if (fs.existsSync(oldPath)) {
          console.log(`[OVERLAY-POST] Deleting old left image: ${oldPath}`);
          fs.unlinkSync(oldPath);
        }
      }
      leftImageUrl = `/uploads/overlays/${req.files.leftImage[0].filename}`;
      console.log(`[OVERLAY-POST] Left image URL set to: ${leftImageUrl}`);
      console.log(`[OVERLAY-POST] File saved at: ${req.files.leftImage[0].path}`);

      // Verificar que el archivo existe en el sistema
      const fullPath = path.join(process.cwd(), leftImageUrl);
      if (fs.existsSync(fullPath)) {
        console.log(`[OVERLAY-POST] ✓ Left image verified: ${fullPath}`);
      } else {
        console.error(`[OVERLAY-POST] ✗ Left image NOT found: ${fullPath}`);
      }
    }

    // Actualizar imagen derecha si se subió
    if (req.files && req.files.rightImage) {
      console.log(`[OVERLAY-POST] Processing right image: ${req.files.rightImage[0].filename}`);
      // Eliminar imagen anterior si existe
      if (currentOverlay?.right_image_url && !currentOverlay.right_image_url.startsWith('/assets/')) {
        const oldPath = path.join(process.cwd(), currentOverlay.right_image_url);
        if (fs.existsSync(oldPath)) {
          console.log(`[OVERLAY-POST] Deleting old right image: ${oldPath}`);
          fs.unlinkSync(oldPath);
        }
      }
      rightImageUrl = `/uploads/overlays/${req.files.rightImage[0].filename}`;
      console.log(`[OVERLAY-POST] Right image URL set to: ${rightImageUrl}`);
      console.log(`[OVERLAY-POST] File saved at: ${req.files.rightImage[0].path}`);

      // Verificar que el archivo existe en el sistema
      const fullPath = path.join(process.cwd(), rightImageUrl);
      if (fs.existsSync(fullPath)) {
        console.log(`[OVERLAY-POST] ✓ Right image verified: ${fullPath}`);
      } else {
        console.error(`[OVERLAY-POST] ✗ Right image NOT found: ${fullPath}`);
      }
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

    console.log(`[OVERLAY-POST] Database updated successfully for user ${userId}`);
    res.json(result.rows ? result.rows[0] : result);
  } catch (error) {
    console.error('[OVERLAY-POST] Error saving overlay:', error);
    res.status(500).json({ error: 'Error al guardar configuración de overlay' });
  }
});

/**
 * GET /api/overlays/check/:filename
 * Verificar si un archivo existe
 */
router.get('/check/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../uploads/overlays', filename);
    
    console.log(`[OVERLAY-CHECK] Verificando archivo: ${filePath}`);
    
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      res.json({
        exists: true,
        size: stats.size,
        lastModified: stats.mtime,
        url: `/uploads/overlays/${filename}`
      });
    } else {
      res.json({ exists: false });
    }
  } catch (error) {
    console.error('[OVERLAY-CHECK] Error:', error);
    res.status(500).json({ error: 'Error verificando archivo' });
  }
});

module.exports = router;
