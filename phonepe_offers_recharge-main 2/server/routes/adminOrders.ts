import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, requireRole, logAudit } from '../auth.js';
import type { AuthenticatedRequest } from '../auth.js';

export const adminOrdersRouter = Router();

// Apply auth to all routes
adminOrdersRouter.use(requireAuth);

/**
 * GET /api/admin/orders
 * List all orders with filters and pagination.
 */
adminOrdersRouter.get('/', requireRole(['owner', 'manager', 'viewer']), async (req: AuthenticatedRequest, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const status = req.query.status as string;
    const search = req.query.search as string;

    let whereClause = '1=1';
    const params: any[] = [];

    if (status && status !== 'all') {
      whereClause += ' AND payment_status = ?';
      params.push(status);
    }

    if (search) {
      whereClause += ' AND (order_ref ILIKE ? OR masked_mobile ILIKE ? OR provider_name ILIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    const total = (await db.get(`SELECT COUNT(*) as c FROM recharge_orders WHERE ${whereClause}`, [...params]) as { c: number }).c;

    const orders = await db.all(`
      SELECT id, order_ref, masked_mobile, provider_id, provider_name, plan_id, plan_price, plan_snapshot,
             payment_method, upi_id, payment_status, payment_started_at, customer_confirmed_at, admin_verified_by, admin_verified_at,
             admin_notes, created_at, updated_at
      FROM recharge_orders
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    // Parse plan snapshots
    const parsedOrders = (orders as any[]).map((o) => ({
      ...o,
      planSnapshot: (() => { try { return JSON.parse(o.plan_snapshot); } catch { return {}; } })(),
    }));

    res.json({
      success: true,
      orders: parsedOrders,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('[ADMIN_API_ERROR] GET /orders:', err);
    res.status(500).json({ error: 'Failed to retrieve orders.' });
  }
});

/**
 * GET /api/admin/orders/stats
 * Summary statistics for the dashboard.
 */
adminOrdersRouter.get('/stats', requireRole(['owner', 'manager', 'viewer']), async (_req: AuthenticatedRequest, res) => {
  try {
    const stats = {
      total: (await db.get('SELECT COUNT(*) as c FROM recharge_orders') as { c: number }).c,
      pending_verification: (await db.get("SELECT COUNT(*) as c FROM recharge_orders WHERE payment_status IN ('pending_verification', 'pending', 'submitted_for_review')") as { c: number }).c,
      paid: (await db.get("SELECT COUNT(*) as c FROM recharge_orders WHERE payment_status = 'paid'") as { c: number }).c,
      failed: (await db.get("SELECT COUNT(*) as c FROM recharge_orders WHERE payment_status = 'failed'") as { c: number }).c,
      cancelled: (await db.get("SELECT COUNT(*) as c FROM recharge_orders WHERE payment_status = 'cancelled'") as { c: number }).c,
      totalRevenue: (await db.get("SELECT COALESCE(SUM(plan_price), 0) as total FROM recharge_orders WHERE payment_status = 'paid'") as { total: number }).total,
    };

    res.json({ success: true, stats });
  } catch (err) {
    console.error('[ADMIN_API_ERROR] GET /orders/stats:', err);
    res.status(500).json({ error: 'Failed to retrieve order stats.' });
  }
});

/**
 * PATCH /api/admin/orders/:id/status
 * Update order payment status (Owner/Manager only).
 * This is where admin manually verifies or rejects payment.
 */
adminOrdersRouter.patch('/:id/status', requireRole(['owner', 'manager']), async (req: AuthenticatedRequest, res) => {
  try {
    const id = String(req.params.id);
    const { status, notes } = req.body;

    const validStatuses = ['pending_verification', 'pending', 'submitted_for_review', 'paid', 'failed', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const order = await db.get('SELECT id, order_ref, payment_status, masked_mobile, plan_price FROM recharge_orders WHERE id = ?', [id]) as any;
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const now = new Date().toISOString();
    const updates: any = { status, updatedAt: now };

    if (status === 'paid') {
      updates.adminVerifiedBy = req.admin!.username;
      updates.adminVerifiedAt = now;
    }

    await db.run(`
      UPDATE recharge_orders
      SET payment_status = ?,
          admin_verified_by = COALESCE(?, admin_verified_by),
          admin_verified_at = COALESCE(?, admin_verified_at),
          admin_notes = COALESCE(?, admin_notes),
          updated_at = ?
      WHERE id = ?
    `, [
      status,
      status === 'paid' ? req.admin!.username : null,
      status === 'paid' ? now : null,
      notes || null,
      now,
      id
    ]);

    // Audit log
    await logAudit(
      req.admin,
      'ORDER_STATUS_UPDATE',
      'RECHARGE_ORDER',
      id,
      `Order ${order.order_ref} (${order.masked_mobile}, ₹${order.plan_price}) status changed from "${order.payment_status}" to "${status}" by ${req.admin!.username}${notes ? `. Notes: ${notes}` : ''}`,
      req
    );

    res.json({
      success: true,
      message: `Order status updated to "${status}"`,
      previousStatus: order.payment_status,
      newStatus: status,
    });
  } catch (err) {
    console.error('[ADMIN_API_ERROR] PATCH /orders/:id/status:', err);
    res.status(500).json({ error: 'Failed to update order status.' });
  }
});

/**
 * GET /api/admin/orders/:id
 * Get single order details (includes full info for admin).
 */
adminOrdersRouter.get('/:id', requireRole(['owner', 'manager', 'viewer']), async (req: AuthenticatedRequest, res) => {
  try {
    const id = String(req.params.id);

    const order = await db.get(`
      SELECT * FROM recharge_orders WHERE id = ? OR order_ref = ?
    `, [id, id]) as any;

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    let planSnapshot = {};
    try { planSnapshot = JSON.parse(order.plan_snapshot); } catch {}

    res.json({
      success: true,
      order: {
        ...order,
        planSnapshot,
      },
    });
  } catch (err) {
    console.error('[ADMIN_API_ERROR] GET /orders/:id:', err);
    res.status(500).json({ error: 'Failed to retrieve order.' });
  }
});
