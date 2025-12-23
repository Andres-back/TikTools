/**
 * Routes - Roulette
 * API para sistema de ruleta TikTok Live
 */

const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/roulette/participants
 * Obtener lista de participantes de la ruleta actual
 */
router.get('/participants', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await db.query(
      `SELECT * FROM roulette_participants
       WHERE user_id = $1
       ORDER BY entries DESC, created_at ASC`,
      [userId]
    );

    res.json(result.rows || result);
  } catch (error) {
    console.error('[ROULETTE] Error fetching participants:', error);
    res.status(500).json({ error: 'Error al obtener participantes' });
  }
});

/**
 * POST /api/roulette/participants
 * Agregar o actualizar participante
 */
router.post('/participants', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { uniqueId, displayName, entries, profileImage } = req.body;

    if (!uniqueId || !displayName || !entries) {
      return res.status(400).json({ error: 'uniqueId, displayName y entries son requeridos' });
    }

    // Verificar si el participante ya existe
    const existing = await db.query(
      'SELECT * FROM roulette_participants WHERE user_id = $1 AND unique_id = $2',
      [userId, uniqueId]
    );

    let participant;

    if (existing.rows && existing.rows.length > 0) {
      // Actualizar entradas existentes
      const currentEntries = existing.rows[0].entries;
      const newEntries = currentEntries + entries;

      participant = await db.query(
        `UPDATE roulette_participants
         SET entries = $1, display_name = $2, profile_image = $3, updated_at = NOW()
         WHERE user_id = $4 AND unique_id = $5
         RETURNING *`,
        [newEntries, displayName, profileImage, userId, uniqueId]
      );

      console.log(`[ROULETTE] @${uniqueId} actualizado: ${currentEntries} + ${entries} = ${newEntries} entradas`);
    } else {
      // Crear nuevo participante
      participant = await db.query(
        `INSERT INTO roulette_participants
         (user_id, unique_id, display_name, entries, profile_image, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING *`,
        [userId, uniqueId, displayName, entries, profileImage]
      );

      console.log(`[ROULETTE] Nuevo participante: @${uniqueId} con ${entries} entradas`);
    }

    res.status(201).json(participant.rows ? participant.rows[0] : participant);
  } catch (error) {
    console.error('[ROULETTE] Error adding/updating participant:', error);
    res.status(500).json({ error: 'Error al agregar participante' });
  }
});

/**
 * DELETE /api/roulette/participants/:uniqueId
 * Eliminar participante
 */
router.delete('/participants/:uniqueId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { uniqueId } = req.params;

    await db.query(
      'DELETE FROM roulette_participants WHERE user_id = $1 AND unique_id = $2',
      [userId, uniqueId]
    );

    res.json({ message: 'Participante eliminado' });
  } catch (error) {
    console.error('[ROULETTE] Error deleting participant:', error);
    res.status(500).json({ error: 'Error al eliminar participante' });
  }
});

/**
 * POST /api/roulette/participants/:uniqueId/eliminate
 * Reducir una entrada de un participante (por giro de ruleta)
 */
router.post('/participants/:uniqueId/eliminate', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { uniqueId } = req.params;

    const participant = await db.query(
      'SELECT * FROM roulette_participants WHERE user_id = $1 AND unique_id = $2',
      [userId, uniqueId]
    );

    if (!participant.rows || participant.rows.length === 0) {
      return res.status(404).json({ error: 'Participante no encontrado' });
    }

    const currentEntries = participant.rows[0].entries;

    if (currentEntries <= 1) {
      // Eliminar participante si no tiene más entradas
      await db.query(
        'DELETE FROM roulette_participants WHERE user_id = $1 AND unique_id = $2',
        [userId, uniqueId]
      );

      // Guardar en historial si es el ganador final
      const remainingCount = await db.query(
        'SELECT COUNT(*) as count FROM roulette_participants WHERE user_id = $1',
        [userId]
      );

      if (remainingCount.rows && remainingCount.rows[0].count == 0) {
        // Este era el último, guardar como ganador
        await db.query(
          `INSERT INTO roulette_winners
           (user_id, unique_id, display_name, profile_image, total_entries, won_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [userId, uniqueId, participant.rows[0].display_name, participant.rows[0].profile_image, currentEntries]
        );

        console.log(`[ROULETTE] 🏆 GANADOR FINAL: @${uniqueId}`);
      }

      res.json({ eliminated: true, entries: 0 });
    } else {
      // Reducir una entrada
      const updated = await db.query(
        `UPDATE roulette_participants
         SET entries = entries - 1, updated_at = NOW()
         WHERE user_id = $1 AND unique_id = $2
         RETURNING *`,
        [userId, uniqueId]
      );

      res.json({ eliminated: false, entries: updated.rows[0].entries });
    }
  } catch (error) {
    console.error('[ROULETTE] Error eliminating participant:', error);
    res.status(500).json({ error: 'Error al eliminar entrada' });
  }
});

/**
 * DELETE /api/roulette/reset
 * Reiniciar juego (borrar todos los participantes)
 */
router.delete('/reset', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    await db.query(
      'DELETE FROM roulette_participants WHERE user_id = $1',
      [userId]
    );

    console.log(`[ROULETTE] Juego reiniciado por usuario ${userId}`);
    res.json({ message: 'Juego reiniciado' });
  } catch (error) {
    console.error('[ROULETTE] Error resetting game:', error);
    res.status(500).json({ error: 'Error al reiniciar juego' });
  }
});

/**
 * GET /api/roulette/config
 * Obtener configuración de ruleta del usuario
 */
router.get('/config', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await db.query(
      'SELECT * FROM roulette_config WHERE user_id = $1',
      [userId]
    );

    if (result.rows && result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      // Devolver configuración por defecto
      res.json({
        user_id: userId,
        valid_gift_id: null,
        gift_entries: 1,
        likes_per_entry: 1000,
        follow_enabled: false,
        heart_enabled: true,
        auto_spin: false
      });
    }
  } catch (error) {
    console.error('[ROULETTE] Error fetching config:', error);
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
});

/**
 * PUT /api/roulette/config
 * Actualizar configuración de ruleta
 */
router.put('/config', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      valid_gift_id,
      gift_entries,
      likes_per_entry,
      follow_enabled,
      heart_enabled,
      auto_spin
    } = req.body;

    const result = await db.query(
      `INSERT INTO roulette_config
       (user_id, valid_gift_id, gift_entries, likes_per_entry, follow_enabled, heart_enabled, auto_spin, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET
         valid_gift_id = $2,
         gift_entries = $3,
         likes_per_entry = $4,
         follow_enabled = $5,
         heart_enabled = $6,
         auto_spin = $7,
         updated_at = NOW()
       RETURNING *`,
      [userId, valid_gift_id, gift_entries, likes_per_entry, follow_enabled, heart_enabled, auto_spin]
    );

    console.log(`[ROULETTE] Configuración actualizada para usuario ${userId}`);
    res.json(result.rows ? result.rows[0] : result);
  } catch (error) {
    console.error('[ROULETTE] Error updating config:', error);
    res.status(500).json({ error: 'Error al actualizar configuración' });
  }
});

/**
 * GET /api/roulette/winners
 * Obtener historial de ganadores
 */
router.get('/winners', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 10;

    const result = await db.query(
      `SELECT * FROM roulette_winners
       WHERE user_id = $1
       ORDER BY won_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    res.json(result.rows || result);
  } catch (error) {
    console.error('[ROULETTE] Error fetching winners:', error);
    res.status(500).json({ error: 'Error al obtener ganadores' });
  }
});

module.exports = router;
