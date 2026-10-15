import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../db.js';
import { recordSupabasePaymentClick } from '../supabase.js';

export const paymentClicksRouter = Router();

const VALID_PAYMENT_OPTIONS = ['phonepe', 'google_pay', 'qr_code', 'paytm'] as const;
type ValidPaymentOption = (typeof VALID_PAYMENT_OPTIONS)[number];

/**
 * POST /api/payment-clicks
 * Track customer click on a payment option.
 * Immediately records click event in local database and syncs to Supabase.
 * Never treats click as proof of payment completion.
 */
paymentClicksRouter.post('/payment-clicks', async (req, res) => {
  try {
    const { paymentOption, orderId, sessionId } = req.body;

    // Validate paymentOption
    if (!paymentOption || typeof paymentOption !== 'string') {
      return res.status(400).json({ error: 'Missing paymentOption parameter.' });
    }

    const normalized = paymentOption.toLowerCase().trim() as ValidPaymentOption;
    if (!VALID_PAYMENT_OPTIONS.includes(normalized)) {
      return res.status(400).json({
        error: `Invalid paymentOption '${paymentOption}'. Must be one of: ${VALID_PAYMENT_OPTIONS.join(', ')}`,
      });
    }

    const eventId = crypto.randomUUID();
    const now = new Date().toISOString();
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress || '';
    const userAgent = (req.headers['user-agent'] as string) || '';

    const safeOrderId = typeof orderId === 'string' && orderId.trim() ? orderId.trim() : null;
    const safeSessionId = typeof sessionId === 'string' && sessionId.trim() ? sessionId.trim() : null;

    // 1. Immediately record in PostgreSQL database
    await db.run(`
      INSERT INTO payment_click_events (
        id, order_id, session_id, payment_option, clicked_at, client_ip, user_agent, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      eventId,
      safeOrderId,
      safeSessionId,
      normalized,
      now,
      clientIp,
      userAgent,
      now
    ]);

    // 2. Sync to Supabase in background (never blocks or throws error to client)
    recordSupabasePaymentClick({
      id: eventId,
      order_id: safeOrderId,
      session_id: safeSessionId,
      payment_option: normalized,
      clicked_at: now,
      client_ip: clientIp,
      user_agent: userAgent,
    }).catch((err) => {
      console.warn('[Supabase Sync Warning]:', err?.message || err);
    });

    return res.status(201).json({
      success: true,
      eventId,
      paymentOption: normalized,
      orderId: safeOrderId,
      sessionId: safeSessionId,
      clickedAt: now,
    });
  } catch (error) {
    console.error('[API_ERROR] POST /payment-clicks:', error);
    // Return gracefully so customer payment flow remains uninterrupted
    return res.status(500).json({ error: 'Internal tracking error' });
  }
});

// Alias for compatibility
paymentClicksRouter.post('/track/payment-click', (_req, res) => {
  // Preserve the POST method and body while routing legacy clients to the canonical endpoint.
  return res.redirect(307, '/api/payment-clicks');
});

/**
 * GET /api/payment-clicks
 * Retrieve recent payment option click events for verification and admin analytics.
 */
paymentClicksRouter.get('/payment-clicks', async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 50));
    const events = await db.all(`
      SELECT id, order_id, session_id, payment_option, clicked_at, created_at
      FROM payment_click_events
      ORDER BY clicked_at DESC
      LIMIT ?
    `, [limit]);

    res.json({ success: true, count: events.length, events });
  } catch (error) {
    console.error('[API_ERROR] GET /payment-clicks:', error);
    res.status(500).json({ error: 'Failed to fetch payment click events' });
  }
});
