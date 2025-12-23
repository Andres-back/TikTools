/**
 * API Routes - Pagos con PayPal
 */

const { query } = require('../database/db');

// Configuración de planes
const PLANS = {
  premium_monthly: {
    name: 'Premium Mensual',
    days: 30,
    price: 9.99,
    currency: 'USD'
  },
  premium_yearly: {
    name: 'Premium Anual',
    days: 365,
    price: 79.99,
    currency: 'USD'
  }
};

/**
 * Obtener planes disponibles
 * GET /api/payments/plans
 */
async function getPlans(req, res) {
  res.json({ plans: PLANS });
}

/**
 * Crear orden de PayPal
 * POST /api/payments/create-order
 */
async function createOrder(req, res) {
  try {
    const { planId } = req.body;
    const plan = PLANS[planId];

    if (!plan) {
      return res.status(400).json({ error: 'Plan no válido' });
    }

    // Crear registro de pago pendiente
    const paymentResult = await query(
      `INSERT INTO payments (user_id, amount, currency, plan_type, days_added, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING id`,
      [req.user.userId, plan.price, plan.currency, planId, plan.days]
    );

    const paymentId = paymentResult.rows[0].id;

    // Retornar datos para que el frontend cree la orden en PayPal
    res.json({
      paymentId,
      plan: {
        id: planId,
        ...plan
      },
      // El frontend usará estos datos para crear la orden en PayPal SDK
      orderData: {
        purchase_units: [{
          amount: {
            currency_code: plan.currency,
            value: plan.price.toFixed(2)
          },
          description: `TikTools - ${plan.name}`,
          custom_id: paymentId.toString()
        }]
      }
    });

  } catch (error) {
    res.status(500).json({ error: 'Error al crear orden' });
  }
}

/**
 * Capturar pago de PayPal (después de que el usuario aprueba)
 * POST /api/payments/capture-order
 */
async function captureOrder(req, res) {
  try {
    const { paymentId, orderId, payerId } = req.body;

    if (!paymentId || !orderId) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    // Obtener el pago pendiente
    const paymentResult = await query(
      `SELECT * FROM payments WHERE id = $1 AND user_id = $2 AND status = 'pending'`,
      [paymentId, req.user.userId]
    );

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pago no encontrado' });
    }

    const payment = paymentResult.rows[0];

    // Actualizar el pago como completado
    await query(
      `UPDATE payments 
       SET status = 'completed', 
           paypal_order_id = $1, 
           paypal_payer_id = $2,
           completed_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [orderId, payerId, paymentId]
    );

    // Añadir días al usuario
    const userResult = await query(
      `SELECT plan_expires_at FROM users WHERE id = $1`,
      [req.user.userId]
    );

    let newExpiresAt = new Date();
    const currentExpires = userResult.rows[0]?.plan_expires_at;
    
    if (currentExpires && new Date(currentExpires) > newExpiresAt) {
      newExpiresAt = new Date(currentExpires);
    }
    
    newExpiresAt.setDate(newExpiresAt.getDate() + payment.days_added);

    await query(
      `UPDATE users SET 
        plan_type = 'premium',
        plan_expires_at = $1,
        plan_days_remaining = plan_days_remaining + $2
       WHERE id = $3`,
      [newExpiresAt.toISOString(), payment.days_added, req.user.userId]
    );

    // Registrar en historial
    await query(
      `INSERT INTO plan_history (user_id, action, plan_type, days_changed, notes)
       VALUES ($1, 'payment', 'premium', $2, $3)`,
      [req.user.userId, payment.days_added, `Pago PayPal: ${orderId}`]
    );

    res.json({
      success: true,
      message: 'Pago procesado exitosamente',
      daysAdded: payment.days_added,
      newExpiresAt
    });

  } catch (error) {
    res.status(500).json({ error: 'Error al procesar pago' });
  }
}

/**
 * Obtener historial de pagos del usuario
 * GET /api/payments/history
 */
async function getPaymentHistory(req, res) {
  try {
    const result = await query(
      `SELECT * FROM payments 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 20`,
      [req.user.userId]
    );

    res.json({ payments: result.rows });

  } catch (error) {
    res.status(500).json({ error: 'Error al obtener historial' });
  }
}

/**
 * Verificar estado del plan del usuario
 * GET /api/payments/plan-status
 */
async function getPlanStatus(req, res) {
  try {
    const result = await query(
      `SELECT plan_type, plan_expires_at, plan_days_remaining 
       FROM users WHERE id = $1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const user = result.rows[0];
    const now = new Date();
    const expiresAt = user.plan_expires_at ? new Date(user.plan_expires_at) : null;
    
    let isActive = false;
    let daysRemaining = 0;

    if (expiresAt) {
      isActive = expiresAt > now;
      daysRemaining = Math.max(0, Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)));
    }

    res.json({
      planType: user.plan_type,
      isActive,
      expiresAt: user.plan_expires_at,
      daysRemaining
    });

  } catch (error) {
    res.status(500).json({ error: 'Error al verificar plan' });
  }
}

module.exports = {
  getPlans,
  createOrder,
  captureOrder,
  getPaymentHistory,
  getPlanStatus
};
