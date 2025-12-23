/**
 * API Routes - Subastas
 */

const { query } = require('../../../database/db');

/**
 * Obtener todas las subastas del usuario
 * GET /api/auctions
 */
async function getAuctions(req, res) {
  try {
    const { status, limit = 20, offset = 0 } = req.query;

    let sql = `
      SELECT a.*, 
             (SELECT COUNT(*) FROM donors WHERE auction_id = a.id) as donors_count
      FROM auctions a
      WHERE a.user_id = $1
    `;
    const params = [req.user.userId];

    if (status) {
      sql += ` AND a.status = $2`;
      params.push(status);
    }

    sql += ` ORDER BY a.started_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(sql, params);

    res.json({
      auctions: result.rows,
      total: result.rowCount
    });

  } catch (error) {
    console.error('[Auctions] Error:', error);
    res.status(500).json({ error: 'Error al obtener subastas' });
  }
}

/**
 * Obtener una subasta específica con detalles
 * GET /api/auctions/:id
 */
async function getAuction(req, res) {
  try {
    const { id } = req.params;

    const auctionResult = await query(
      `SELECT * FROM auctions WHERE id = $1 AND user_id = $2`,
      [id, req.user.userId]
    );

    if (auctionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Subasta no encontrada' });
    }

    const auction = auctionResult.rows[0];

    // Obtener donadores
    const donorsResult = await query(
      `SELECT * FROM donors WHERE auction_id = $1 ORDER BY total_coins DESC`,
      [id]
    );

    // Obtener últimos regalos
    const giftsResult = await query(
      `SELECT g.*, d.tiktok_nickname 
       FROM gifts g
       JOIN donors d ON d.id = g.donor_id
       WHERE g.auction_id = $1 
       ORDER BY g.received_at DESC 
       LIMIT 50`,
      [id]
    );

    res.json({
      auction,
      donors: donorsResult.rows,
      recentGifts: giftsResult.rows
    });

  } catch (error) {
    console.error('[Auctions] Error:', error);
    res.status(500).json({ error: 'Error al obtener subasta' });
  }
}

/**
 * Crear nueva subasta
 * POST /api/auctions
 */
async function createAuction(req, res) {
  try {
    const { 
      tiktokUsername, 
      title, 
      initialTime = 120, 
      delayTime = 20, 
      tieExtension = 10 
    } = req.body;

    if (!tiktokUsername) {
      return res.status(400).json({ error: 'TikTok username requerido' });
    }

    const result = await query(
      `INSERT INTO auctions (user_id, tiktok_username, title, initial_time, delay_time, tie_extension)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user.userId, tiktokUsername, title, initialTime, delayTime, tieExtension]
    );

    res.status(201).json({
      message: 'Subasta creada',
      auction: result.rows[0]
    });

  } catch (error) {
    console.error('[Auctions] Error:', error);
    res.status(500).json({ error: 'Error al crear subasta' });
  }
}

/**
 * Actualizar subasta
 * PUT /api/auctions/:id
 */
async function updateAuction(req, res) {
  try {
    const { id } = req.params;
    const { title, status, notes, winnerUsername, winnerCoins } = req.body;

    const result = await query(
      `UPDATE auctions 
       SET title = COALESCE($1, title),
           status = COALESCE($2, status),
           notes = COALESCE($3, notes),
           winner_username = COALESCE($4, winner_username),
           winner_coins = COALESCE($5, winner_coins),
           finished_at = CASE WHEN $2 = 'finished' THEN CURRENT_TIMESTAMP ELSE finished_at END
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [title, status, notes, winnerUsername, winnerCoins, id, req.user.userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Subasta no encontrada' });
    }

    res.json({
      message: 'Subasta actualizada',
      auction: result.rows[0]
    });

  } catch (error) {
    console.error('[Auctions] Error:', error);
    res.status(500).json({ error: 'Error al actualizar subasta' });
  }
}

/**
 * Registrar regalo en subasta activa
 * POST /api/auctions/:id/gifts
 */
async function recordGift(req, res) {
  try {
    const { id } = req.params;
    const { 
      tiktokUniqueId, 
      tiktokNickname, 
      profilePictureUrl,
      giftId, 
      giftName, 
      diamondCount, 
      repeatCount = 1 
    } = req.body;

    // Verificar que la subasta existe y está activa
    const auctionResult = await query(
      `SELECT * FROM auctions WHERE id = $1 AND user_id = $2 AND status = 'active'`,
      [id, req.user.userId]
    );

    if (auctionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Subasta no encontrada o no activa' });
    }

    const totalCoins = diamondCount * repeatCount;

    // Buscar o crear donador
    let donorResult = await query(
      `SELECT id, total_coins, total_gifts FROM donors 
       WHERE auction_id = $1 AND tiktok_unique_id = $2`,
      [id, tiktokUniqueId]
    );

    let donorId;
    if (donorResult.rows.length === 0) {
      // Crear nuevo donador
      const newDonor = await query(
        `INSERT INTO donors (auction_id, tiktok_unique_id, tiktok_nickname, profile_picture_url, total_coins, total_gifts)
         VALUES ($1, $2, $3, $4, $5, 1)
         RETURNING id`,
        [id, tiktokUniqueId, tiktokNickname, profilePictureUrl, totalCoins]
      );
      donorId = newDonor.rows[0].id;

      // Actualizar contador de donadores únicos
      await query(
        `UPDATE auctions SET unique_donors = unique_donors + 1 WHERE id = $1`,
        [id]
      );
    } else {
      // Actualizar donador existente
      donorId = donorResult.rows[0].id;
      await query(
        `UPDATE donors 
         SET total_coins = total_coins + $1, 
             total_gifts = total_gifts + 1,
             last_donation_at = CURRENT_TIMESTAMP,
             tiktok_nickname = COALESCE($2, tiktok_nickname),
             profile_picture_url = COALESCE($3, profile_picture_url)
         WHERE id = $4`,
        [totalCoins, tiktokNickname, profilePictureUrl, donorId]
      );
    }

    // Registrar regalo
    await query(
      `INSERT INTO gifts (auction_id, donor_id, tiktok_unique_id, gift_id, gift_name, diamond_count, repeat_count, total_coins)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, donorId, tiktokUniqueId, giftId, giftName, diamondCount, repeatCount, totalCoins]
    );

    // Actualizar totales de la subasta
    await query(
      `UPDATE auctions 
       SET total_coins_collected = total_coins_collected + $1,
           total_gifts_received = total_gifts_received + 1
       WHERE id = $2`,
      [totalCoins, id]
    );

    res.status(201).json({
      message: 'Regalo registrado',
      totalCoins,
      donorId
    });

  } catch (error) {
    console.error('[Auctions] Error:', error);
    res.status(500).json({ error: 'Error al registrar regalo' });
  }
}

/**
 * Finalizar subasta
 * POST /api/auctions/:id/finish
 */
async function finishAuction(req, res) {
  try {
    const { id } = req.params;

    // Obtener el ganador (top 1)
    const winnerResult = await query(
      `SELECT tiktok_unique_id, total_coins 
       FROM donors 
       WHERE auction_id = $1 
       ORDER BY total_coins DESC 
       LIMIT 1`,
      [id]
    );

    let winnerUsername = null;
    let winnerCoins = 0;

    if (winnerResult.rows.length > 0) {
      winnerUsername = winnerResult.rows[0].tiktok_unique_id;
      winnerCoins = winnerResult.rows[0].total_coins;

      // Marcar ganador
      await query(
        `UPDATE donors SET is_winner = true, final_position = 1 
         WHERE auction_id = $1 AND tiktok_unique_id = $2`,
        [id, winnerUsername]
      );
    }

    // Actualizar posiciones finales
    await query(
      `UPDATE donors d
       SET final_position = sub.rank
       FROM (
         SELECT id, ROW_NUMBER() OVER (ORDER BY total_coins DESC) as rank
         FROM donors WHERE auction_id = $1
       ) sub
       WHERE d.id = sub.id`,
      [id]
    );

    // Finalizar subasta
    const result = await query(
      `UPDATE auctions 
       SET status = 'finished',
           finished_at = CURRENT_TIMESTAMP,
           winner_username = $1,
           winner_coins = $2
       WHERE id = $3 AND user_id = $4
       RETURNING *`,
      [winnerUsername, winnerCoins, id, req.user.userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Subasta no encontrada' });
    }

    // Actualizar estadísticas del usuario
    await query(
      `UPDATE user_stats 
       SET total_auctions = total_auctions + 1,
           total_coins_collected = total_coins_collected + $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2`,
      [result.rows[0].total_coins_collected, req.user.userId]
    );

    res.json({
      message: 'Subasta finalizada',
      auction: result.rows[0],
      winner: winnerUsername ? { username: winnerUsername, coins: winnerCoins } : null
    });

  } catch (error) {
    console.error('[Auctions] Error:', error);
    res.status(500).json({ error: 'Error al finalizar subasta' });
  }
}

/**
 * Eliminar subasta
 * DELETE /api/auctions/:id
 */
async function deleteAuction(req, res) {
  try {
    const { id } = req.params;

    const result = await query(
      `DELETE FROM auctions WHERE id = $1 AND user_id = $2`,
      [id, req.user.userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Subasta no encontrada' });
    }

    res.json({ message: 'Subasta eliminada' });

  } catch (error) {
    console.error('[Auctions] Error:', error);
    res.status(500).json({ error: 'Error al eliminar subasta' });
  }
}

/**
 * Obtener estadísticas del usuario
 * GET /api/stats
 */
async function getStats(req, res) {
  try {
    const statsResult = await query(
      `SELECT * FROM user_stats WHERE user_id = $1`,
      [req.user.userId]
    );

    // Obtener estadísticas adicionales
    const recentResult = await query(
      `SELECT 
         COUNT(*) FILTER (WHERE started_at > NOW() - INTERVAL '7 days') as auctions_last_week,
         SUM(total_coins_collected) FILTER (WHERE started_at > NOW() - INTERVAL '7 days') as coins_last_week,
         COUNT(*) FILTER (WHERE started_at > NOW() - INTERVAL '30 days') as auctions_last_month
       FROM auctions 
       WHERE user_id = $1`,
      [req.user.userId]
    );

    // Top donadores globales
    const topDonorsResult = await query(
      `SELECT d.tiktok_unique_id, d.tiktok_nickname, SUM(d.total_coins) as total
       FROM donors d
       JOIN auctions a ON a.id = d.auction_id
       WHERE a.user_id = $1
       GROUP BY d.tiktok_unique_id, d.tiktok_nickname
       ORDER BY total DESC
       LIMIT 10`,
      [req.user.userId]
    );

    res.json({
      stats: statsResult.rows[0] || {},
      recent: recentResult.rows[0] || {},
      topDonors: topDonorsResult.rows
    });

  } catch (error) {
    console.error('[Stats] Error:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
}

module.exports = {
  getAuctions,
  getAuction,
  createAuction,
  updateAuction,
  recordGift,
  finishAuction,
  deleteAuction,
  getStats
};
