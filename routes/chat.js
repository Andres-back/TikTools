/**
 * Routes - Chat
 * Sistema de mensajería usuario-administrador
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
    const uploadDir = path.join(__dirname, '../uploads/chat');
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
 * GET /api/chat/:userId
 * Obtener historial de chat con el admin
 */
router.get('/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const requesterId = req.user.id;
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
 */
router.post('/', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const senderId = req.user.id;
    const { message } = req.body;
    const isAdminUser = req.user.role === 'admin';

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
    } else {
      // Si es usuario normal, siempre envía al admin
      const adminResult = await db.query(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`);
      const admin = adminResult.rows ? adminResult.rows[0] : adminResult[0];
      if (!admin) {
        return res.status(404).json({ error: 'No se encontró un administrador' });
      }
      recipientId = admin.id;
    }

    const imageUrl = req.file ? `/uploads/chat/${req.file.filename}` : null;

    const result = await db.query(
      `INSERT INTO messages (sender_id, recipient_id, message, image_url, created_at, read)
       VALUES ($1, $2, $3, $4, NOW(), false)
       RETURNING *`,
      [senderId, recipientId, message || '', imageUrl]
    );

    res.status(201).json(result.rows ? result.rows[0] : result);
  } catch (error) {
    console.error('Error sending message:', error);
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
    const userId = req.user.id;

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

module.exports = router;
