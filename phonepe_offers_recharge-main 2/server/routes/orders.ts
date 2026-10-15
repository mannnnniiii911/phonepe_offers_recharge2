import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../db.js';

export const ordersRouter = Router();

// Mask mobile number: 98******10
function maskMobile(num: string): string {
  if (num.length < 4) return '****';
  return num.slice(0, 2) + '******' + num.slice(-2);
}

// SHA-256 hash for privacy
function hashMobile(num: string): string {
  return crypto.createHash('sha256').update(num).digest('hex');
}

/**
 * POST /api/orders
 * Create a new recharge order (customer-facing).
 * Never marks payment as paid or completed.
 * Starts the 2-minute payment guidance window.
 */
ordersRouter.post('/orders', async (req, res) => {
  try {
    const { mobileNumber, providerId, providerName, planId, planPrice, planSnapshot, paymentMethod, upiId, orderRef } = req.body;

    if (!mobileNumber || !providerId || !providerName || planPrice === undefined || !upiId || !orderRef) {
      return res.status(400).json({ error: 'Missing required order fields.' });
    }

    // Validate mobile number format
    const cleaned = mobileNumber.replace(/\D/g, '');
    const digits = cleaned.length === 12 && cleaned.startsWith('91') ? cleaned.slice(2) : cleaned;
    if (!/^[6-9]\d{9}$/.test(digits)) {
      return res.status(400).json({ error: 'Invalid mobile number format.' });
    }

    // Validate price
    const numPrice = Number(planPrice);
    if (isNaN(numPrice) || numPrice <= 0 || numPrice > 100000) {
      return res.status(400).json({ error: 'Invalid plan price.' });
    }

    // Check for duplicate order ref
    const existingOrder = await db.get('SELECT id, payment_started_at, created_at FROM recharge_orders WHERE order_ref = ?', [orderRef]) as {
      id: string;
      payment_started_at: string | null;
      created_at: string;
    } | undefined;

    if (existingOrder) {
      // If order already exists, return existing order with its original start time
      const windowSecs = paymentMethod === 'qr' ? 300 : 210;
      return res.status(200).json({
        success: true,
        orderId: existingOrder.id,
        orderRef,
        status: 'pending_verification',
        paymentStartedAt: existingOrder.payment_started_at || existingOrder.created_at,
        paymentWindowSeconds: windowSecs,
        message: 'Order already exists. Timer continues from original start time.',
      });
    }

    const id = 'order-' + crypto.randomUUID();
    const now = new Date().toISOString();
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress || '';

    await db.run(`
      INSERT INTO recharge_orders (
        id, order_ref, mobile_number_hash, masked_mobile, provider_id, provider_name,
        plan_id, plan_price, plan_snapshot, payment_method, upi_id, payment_status,
        payment_started_at, client_ip, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_verification', ?, ?, ?, ?)
    `, [
      id,
      orderRef,
      hashMobile(digits),
      maskMobile(digits),
      providerId,
      providerName,
      planId || null,
      numPrice,
      JSON.stringify(planSnapshot || {}),
      paymentMethod || 'upi',
      upiId,
      now, // payment_started_at
      clientIp,
      now,
      now
    ]);

    const windowSecs = paymentMethod === 'qr' ? 300 : 210;

    res.status(201).json({
      success: true,
      orderId: id,
      orderRef,
      status: 'pending_verification',
      paymentStartedAt: now,
      paymentWindowSeconds: windowSecs,
      message: 'Order created for manual verification.',
    });
  } catch (err) {
    console.error('[API_ERROR] POST /orders:', err);
    res.status(500).json({ error: 'Failed to create order.' });
  }
});

/**
 * POST /api/orders/:orderRef/confirm
 * Explicitly disabled: Customers cannot self-mark orders as paid.
 */
ordersRouter.post('/orders/:orderRef/confirm', async (_req, res) => {
  return res.status(403).json({
    error: 'Customer self-confirmation is disabled. Payments must be verified manually by an authorized administrator.',
  });
});

/**
 * GET /api/orders/:orderRef/status
 * Check order status (public, but only returns non-sensitive info).
 */
ordersRouter.get('/orders/:orderRef/status', async (req, res) => {
  try {
    const { orderRef } = req.params;

    const order = await db.get(`
      SELECT order_ref, masked_mobile, provider_name, plan_price, payment_method,
             payment_status, payment_started_at, created_at
      FROM recharge_orders WHERE order_ref = ?
    `, [orderRef]) as any;

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    res.json({
      success: true,
      order: {
        orderRef: order.order_ref,
        maskedMobile: order.masked_mobile,
        providerName: order.provider_name,
        amount: order.plan_price,
        paymentMethod: order.payment_method,
        status: order.payment_status,
        paymentStartedAt: order.payment_started_at || order.created_at,
        paymentWindowSeconds: 120,
        createdAt: order.created_at,
      },
    });
  } catch (err) {
    console.error('[API_ERROR] GET /orders/:orderRef/status:', err);
    res.status(500).json({ error: 'Failed to retrieve order status.' });
  }
});
