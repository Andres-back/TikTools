/**
 * Routes - Chat
 * Sistema de mensajería usuario-administrador
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
    const uploadDir = path.join(__dirname, '../uploads/chat');
    console.log(`[CHAT-UPLOAD] Destination check: ${uploadDir}`);
    if (!fs.existsSync(uploadDir)) {
      console.log(`[CHAT-UPLOAD] Creating directory: ${uploadDir}`);
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    console.log(`[CHAT-UPLOAD] Directory ready for file: ${file.originalname}`);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${path.extname(file.originalname)}`;
    console.log(`[CHAT-UPLOAD] Generated filename: ${uniqueName} for original: ${file.originalname}`);
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
 * GET /api/chat/:userId
 * Obtener historial de chat con el admin
 */
router.get('/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const requesterId = req.user.userId;
    const isAdminUser = req.user.role === 'admin';

    // Solo el usuario mismo o el admin pueden ver sus mensajes
    if (requesterId !== parseInt(userId) && !isAdminUser) {
      return res.status(403).json({ error: 'No tienes permiso para ver estos mensajes' });
    }

    // Obtener ID del admin
    const adminResult = await db.query(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`);
    const admin = adminResult.rows ? adminResult.rows[0] : adminResult[0];

    if (!admin) {
      return res.json([]);
    }

    const adminId = admin.id;

    // Obtener mensajes entre el usuario y el admin
    const result = await db.query(
      `SELECT m.*, 
              CASE WHEN m.sender_id = $1 THEN 'user' ELSE 'admin' END as sender_type
       FROM messages m
       WHERE (m.sender_id = $1 AND m.recipient_id = $2)
          OR (m.sender_id = $2 AND m.recipient_id = $1)
       ORDER BY m.created_at ASC`,
      [userId, adminId]
    );

    res.json(result.rows || result);
  } catch (error) {
    console.error('Error fetching chat:', error);
    res.status(500).json({ error: 'Error al obtener el chat' });
  }
});

/**
 * POST /api/chat
 * Enviar mensaje
 * Soporta tanto JSON como multipart/form-data (para imágenes)
 */
router.post('/', authenticateToken, (req, res, next) => {
  console.log(`[CHAT-POST] Content-Type: ${req.get('content-type')}`);
  // Si es JSON, continuar directamente
  if (req.is('application/json')) {
    console.log(`[CHAT-POST] Using JSON mode`);
    return next();
  }
  // Si es multipart, usar multer
  console.log(`[CHAT-POST] Using multipart mode`);
  upload.single('image')(req, res, next);
}, async (req, res) => {
  try {
    const senderId = req.user.userId;
    const { message } = req.body;
    const isAdminUser = req.user.role === 'admin';
    console.log(`[CHAT-POST] Request from user ${senderId} (admin: ${isAdminUser})`);
    console.log(`[CHAT-POST] Message: "${message}"`);
    console.log(`[CHAT-POST] File received:`, req.file ? req.file.filename : 'none');

    if (!message && !req.file) {
      return res.status(400).json({ error: 'Mensaje o imagen requeridos' });
    }

    // Determinar destinatario
    let recipientId;
    if (isAdminUser) {
      // Si es admin, debe especificar el destinatario
      recipientId = req.body.recipientId;
      if (!recipientId) {
        return res.status(400).json({ error: 'recipientId requerido para admin' });
      }
      console.log(`[CHAT-POST] Admin sending to user ${recipientId}`);
    } else {
      // Si es usuario normal, siempre envía al admin
      const adminResult = await db.query(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`);
      const admin = adminResult.rows ? adminResult.rows[0] : adminResult[0];
      if (!admin) {
        return res.status(404).json({ error: 'No se encontró un administrador' });
      }
      recipientId = admin.id;
      console.log(`[CHAT-POST] User sending to admin ${recipientId}`);
    }

    const imageUrl = req.file ? `/uploads/chat/${req.file.filename}` : null;

    if (req.file) {
      console.log(`[CHAT-POST] ✅ Image uploaded successfully`);
      console.log(`[CHAT-POST] Image URL: ${imageUrl}`);
      console.log(`[CHAT-POST] File saved at: ${req.file.path}`);
      console.log(`[CHAT-POST] File size: ${req.file.size} bytes`);
      console.log(`[CHAT-POST] MIME type: ${req.file.mimetype}`);

      // Verificar que el archivo realmente existe
      if (!fs.existsSync(req.file.path)) {
        console.error(`[CHAT-POST] ❌ ERROR: File was not saved to disk!`);
        return res.status(500).json({ error: 'Error al guardar la imagen' });
      }
    }

    const result = await db.query(
      `INSERT INTO messages (sender_id, recipient_id, message, image_url, created_at, read)
       VALUES ($1, $2, $3, $4, NOW(), false)
       RETURNING *`,
      [senderId, recipientId, message || '', imageUrl]
    );

    console.log(`[CHAT-POST] Message saved successfully with ID ${result.rows ? result.rows[0].id : result.id}`);
    res.status(201).json(result.rows ? result.rows[0] : result);
  } catch (error) {
    console.error('[CHAT-POST] Error sending message:', error);
    res.status(500).json({ error: 'Error al enviar el mensaje' });
  }
});

/**
 * PATCH /api/chat/:messageId/read
 * Marcar mensaje como leído
 */
router.patch('/:messageId/read', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId;

    await db.query(
      `UPDATE messages 
       SET read = true 
       WHERE id = $1 AND recipient_id = $2`,
      [messageId, userId]
    );

    res.json({ message: 'Mensaje marcado como leído' });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ error: 'Error al marcar mensaje como leído' });
  }
});

/**
 * POST /api/chat/cleanup
 * Limpiar referencias a imágenes que no existen físicamente (solo admin)
 */
router.post('/cleanup', authenticateToken, isAdmin, async (req, res) => {
  try {
    console.log('[CHAT-CLEANUP] Iniciando limpieza de imágenes faltantes...');

    // Obtener todos los mensajes con imágenes
    const result = await db.query('SELECT id, message, image_url FROM messages WHERE image_url IS NOT NULL');
    const messagesWithImages = result.rows || result;

    let fixed = 0;
    let errors = 0;

    for (const msg of messagesWithImages) {
      if (msg.image_url) {
        const fullPath = path.join(__dirname, '..', msg.image_url);

        if (!fs.existsSync(fullPath)) {
          console.log(`[CHAT-CLEANUP] Imagen faltante: ${msg.image_url} en mensaje ID ${msg.id}`);

          // Limpiar referencia de imagen en la base de datos
          await db.query('UPDATE messages SET image_url = NULL WHERE id = $1', [msg.id]);
          fixed++;
        }
      }
    }

    console.log(`[CHAT-CLEANUP] Completado. ${fixed} referencias limpiadas, ${errors} errores`);

    res.json({
      message: 'Limpieza completada',
      fixed,
      errors,
      total: messagesWithImages.length
    });

  } catch (error) {
    console.error('[CHAT-CLEANUP] Error:', error);
    res.status(500).json({ error: 'Error en limpieza' });
  }
});

module.exports = router;
