/**
 * Routes - News (Novedades)
 * Sistema de noticias/anuncios del administrador
 */

const express = require('express');
const router = express.Router();
const db = require('../../../database/db');
const { authenticateToken, isAdmin } = require('../../shared/middlewares/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configurar multer para subida de imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/news');
    console.log(`[NEWS-UPLOAD] Destination check: ${uploadDir}`);
    
    try {
      if (!fs.existsSync(uploadDir)) {
        console.log(`[NEWS-UPLOAD] Creating directory: ${uploadDir}`);
        fs.mkdirSync(uploadDir, { recursive: true, mode: 0o755 });
      }
      
      // Verificar que el directorio es escribible
      fs.accessSync(uploadDir, fs.constants.W_OK);
      console.log(`[NEWS-UPLOAD] Directory ready for file: ${file.originalname}`);
      cb(null, uploadDir);
    } catch (error) {
      console.error(`[NEWS-UPLOAD] Error with directory ${uploadDir}:`, error);
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 9);
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${timestamp}-${randomId}${ext}`;
    
    console.log(`[NEWS-UPLOAD] Generated filename: ${uniqueName} for original: ${file.originalname}`);
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
    console.log('[NEWS-GET] Fetching news...');
    
    const result = await db.query(
      `SELECT n.*, u.username as author_name 
       FROM news n 
       LEFT JOIN users u ON n.author_id = u.id 
       ORDER BY n.created_at DESC 
       LIMIT 50`
    );
    
    const news = result.rows || result;
    console.log(`[NEWS-GET] Found ${news.length} news items`);
    
    // Verificar imágenes y añadir logging
    const processedNews = news.map(item => {
      if (item.image_url) {
        console.log(`[NEWS-GET] News "${item.title}" has image: ${item.image_url}`);
        
        // Verificar si el archivo existe físicamente
        const fullPath = path.join(__dirname, '..', item.image_url);
        if (fs.existsSync(fullPath)) {
          console.log(`[NEWS-GET] Image file exists: ${fullPath}`);
        } else {
          console.warn(`[NEWS-GET] Image file missing: ${fullPath}`);
        }
      }
      return item;
    });
    
    res.json(processedNews);
  } catch (error) {
    console.error('[NEWS-GET] Error fetching news:', error);
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
    const userId = req.user.userId;
    console.log(`[NEWS-POST] Request from user ${userId}`);
    console.log(`[NEWS-POST] File received:`, req.file ? req.file.filename : 'none');

    if (!title || !content) {
      return res.status(400).json({ error: 'Título y contenido son requeridos' });
    }

    const imageUrl = req.file ? `/uploads/news/${req.file.filename}` : null;

    if (req.file) {
      console.log(`[NEWS-POST] Image URL set to: ${imageUrl}`);
      console.log(`[NEWS-POST] File saved at: ${req.file.path}`);
    }

    const result = await db.query(
      `INSERT INTO news (title, content, image_url, author_id, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [title, content, imageUrl, userId]
    );

    console.log(`[NEWS-POST] Database updated successfully`);
    res.status(201).json(result.rows ? result.rows[0] : result);
  } catch (error) {
    console.error('[NEWS-POST] Error creating news:', error);
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

/**
 * GET /api/news/check/:filename
 * Verificar si un archivo de noticia existe
 */
router.get('/check/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../uploads/news', filename);
    
    console.log(`[NEWS-CHECK] Verificando archivo: ${filePath}`);
    
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      res.json({
        exists: true,
        size: stats.size,
        lastModified: stats.mtime,
        url: `/uploads/news/${filename}`
      });
    } else {
      res.json({ exists: false });
    }
  } catch (error) {
    console.error('[NEWS-CHECK] Error:', error);
    res.status(500).json({ error: 'Error verificando archivo' });
  }
});

/**
 * POST /api/news/cleanup
 * Limpiar referencias a imágenes que no existen físicamente (solo admin)
 */
router.post('/cleanup', authenticateToken, isAdmin, async (req, res) => {
  try {
    console.log('[NEWS-CLEANUP] Iniciando limpieza de imágenes faltantes...');
    
    // Obtener todas las noticias con imágenes
    const result = await db.query('SELECT id, title, image_url FROM news WHERE image_url IS NOT NULL');
    const newsWithImages = result.rows || result;
    
    let fixed = 0;
    let errors = 0;
    
    for (const news of newsWithImages) {
      if (news.image_url) {
        const fullPath = path.join(__dirname, '..', news.image_url);
        
        if (!fs.existsSync(fullPath)) {
          console.log(`[NEWS-CLEANUP] Imagen faltante: ${news.image_url} en noticia "${news.title}"`);
          
          // Limpiar referencia de imagen en la base de datos
          await db.query('UPDATE news SET image_url = NULL WHERE id = $1', [news.id]);
          fixed++;
        }
      }
    }
    
    console.log(`[NEWS-CLEANUP] Completado. ${fixed} referencias limpiadas, ${errors} errores`);
    
    res.json({
      message: 'Limpieza completada',
      fixed,
      errors,
      total: newsWithImages.length
    });
    
  } catch (error) {
    console.error('[NEWS-CLEANUP] Error:', error);
    res.status(500).json({ error: 'Error en limpieza' });
  }
});

module.exports = router;
