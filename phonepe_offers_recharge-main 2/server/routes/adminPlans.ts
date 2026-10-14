import { Router } from 'express';
import { db } from '../db';
import { requireAuth, requireRole, logAudit, type AuthenticatedRequest } from '../auth';
import crypto from 'crypto';

export const adminPlansRouter = Router();

adminPlansRouter.use(requireAuth);

// GET /api/admin/plans - List plans with search, filter, pagination
adminPlansRouter.get('/', async (req, res) => {
  try {
    const { search, providerId, status, page = 1, limit = 50 } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    let whereClause = 'WHERE 1=1';
    const params: (string | number)[] = [];

    if (search) {
      whereClause += ` AND (p.id ILIKE ? OR p.data_allowance ILIKE ? OR p.tag ILIKE ? OR p.validity ILIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    if (providerId && providerId !== 'all') {
      whereClause += ` AND p.provider_id = ?`;
      params.push(providerId as string);
    }

    if (status && status !== 'all') {
      whereClause += ` AND p.status = ?`;
      params.push(status as string);
    }

    const countQuery = `SELECT COUNT(*) as total FROM recharge_plans p ${whereClause}`;
    const total = (await db.get(countQuery, [...params]) as { total: number }).total;

    const query = `
      SELECT 
        p.id,
        p.provider_id as "providerId",
        prov.name as "providerName",
        prov.logo_url as "providerLogo",
        p.price,
        p.original_price as "originalPrice",
        p.validity,
        p.data_allowance as "dataAllowance",
        p.voice,
        p.sms,
        p.tag,
        p.category,
        p.description,
        p.status,
        p.display_order as "displayOrder",
        p.created_at as "createdAt",
        p.updated_at as "updatedAt"
      FROM recharge_plans p
      LEFT JOIN network_providers prov ON p.provider_id = prov.id
      ${whereClause}
      ORDER BY p.provider_id ASC, p.display_order ASC, p.price ASC
      LIMIT ? OFFSET ?
    `;

    const plans = await db.all(query, [...params, limitNum, offset]);

    res.json({
      success: true,
      plans,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error('[ADMIN_API_ERROR] GET /plans:', err);
    res.status(500).json({ error: 'Failed to retrieve plans' });
  }
});

// POST /api/admin/plans - Create new plan
adminPlansRouter.post('/', requireRole(['owner', 'manager']), async (req: AuthenticatedRequest, res) => {
  try {
    const { providerId, price, originalPrice, validity, dataAllowance, voice, sms, tag, category, description, status, displayOrder } = req.body;

    if (!providerId || price === undefined || !validity || !dataAllowance) {
      return res.status(400).json({ error: 'Provider, Price, Validity, and Data Allowance are required.' });
    }

    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0) {
      return res.status(400).json({ error: 'Price must be a valid non-negative number.' });
    }

    // Verify provider exists
    const provider = await db.get('SELECT id, name FROM network_providers WHERE id = ?', [providerId]) as { id: string; name: string } | undefined;
    if (!provider) {
      return res.status(400).json({ error: 'Selected network provider does not exist.' });
    }

    const id = `${providerId}-${numPrice}-${crypto.randomUUID().slice(0, 4)}`;
    const now = new Date().toISOString();

    await db.run(`
      INSERT INTO recharge_plans (id, provider_id, price, original_price, validity, data_allowance, voice, sms, tag, category, description, status, display_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      providerId,
      numPrice,
      Number(originalPrice) || numPrice,
      validity.trim(),
      dataAllowance.trim(),
      voice?.trim() || 'Unlimited',
      sms?.trim() || '100/day',
      tag?.trim() || '',
      category || 'popular',
      description?.trim() || '',
      status || 'published',
      Number(displayOrder) || 0,
      now,
      now
    ]);

    await logAudit(req.admin, 'PLAN_CREATE', 'PLAN', id, `Created ₹${numPrice} plan for ${provider.name} (${validity}, ${dataAllowance})`, req);

    res.json({ success: true, message: 'Plan created successfully', id });
  } catch (err) {
    console.error('[ADMIN_API_ERROR] POST /plans:', err);
    res.status(500).json({ error: 'Failed to create plan' });
  }
});

// PUT /api/admin/plans/:id - Update plan
adminPlansRouter.put('/:id', requireRole(['owner', 'manager']), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { providerId, price, originalPrice, validity, dataAllowance, voice, sms, tag, category, description, status, displayOrder } = req.body;

    const existing = await db.get('SELECT id, provider_id FROM recharge_plans WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Plan not found.' });
    }

    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0) {
      return res.status(400).json({ error: 'Price must be a valid non-negative number.' });
    }

    const now = new Date().toISOString();

    await db.run(`
      UPDATE recharge_plans
      SET provider_id = ?, price = ?, original_price = ?, validity = ?, data_allowance = ?, voice = ?, sms = ?, tag = ?, category = ?, description = ?, status = ?, display_order = ?, updated_at = ?
      WHERE id = ?
    `, [
      providerId,
      numPrice,
      Number(originalPrice) || numPrice,
      validity.trim(),
      dataAllowance.trim(),
      voice?.trim() || 'Unlimited',
      sms?.trim() || '100/day',
      tag?.trim() || '',
      category || 'popular',
      description?.trim() || '',
      status || 'published',
      Number(displayOrder) || 0,
      now,
      id
    ]);

    await logAudit(req.admin, 'PLAN_UPDATE', 'PLAN', id, `Updated ₹${numPrice} plan (${id})`, req);

    res.json({ success: true, message: 'Plan updated successfully' });
  } catch (err) {
    console.error('[ADMIN_API_ERROR] PUT /plans/:id:', err);
    res.status(500).json({ error: 'Failed to update plan' });
  }
});

// PATCH /api/admin/plans/:id/status - Publish, Hide, Draft, Archive
adminPlansRouter.patch('/:id/status', requireRole(['owner', 'manager']), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['draft', 'published', 'hidden', 'archived'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const plan = await db.get('SELECT id, price, status FROM recharge_plans WHERE id = ?', [id]) as { id: string; price: number; status: string } | undefined;
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found.' });
    }

    const now = new Date().toISOString();
    await db.run('UPDATE recharge_plans SET status = ?, updated_at = ? WHERE id = ?', [status, now, id]);

    await logAudit(req.admin, 'PLAN_STATUS_CHANGE', 'PLAN', id, `Changed plan ₹${plan.price} status from '${plan.status}' to '${status}'`, req);

    res.json({ success: true, message: `Plan status updated to '${status}'.` });
  } catch (err) {
    console.error('[ADMIN_API_ERROR] PATCH /plans/:id/status:', err);
    res.status(500).json({ error: 'Failed to update plan status' });
  }
});

// DELETE /api/admin/plans/:id - Archive or delete plan safely
adminPlansRouter.delete('/:id', requireRole(['owner', 'manager']), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const plan = await db.get('SELECT id, price FROM recharge_plans WHERE id = ?', [id]) as { id: string; price: number } | undefined;

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found.' });
    }

    // Check if any customer submissions reference this plan
    const subCount = (await db.get('SELECT COUNT(*) as c FROM customer_submissions WHERE plan_id = ?', [id]) as { c: number }).c;

    if (subCount > 0) {
      // Historical references exist - archive instead to preserve history
      const now = new Date().toISOString();
      await db.run(`UPDATE recharge_plans SET status = 'archived', updated_at = ? WHERE id = ?`, [now, id]);
      await logAudit(req.admin, 'PLAN_ARCHIVE', 'PLAN', id, `Archived plan ₹${plan.price} because it has ${subCount} historical submissions`, req);
      return res.json({
        success: true,
        message: `Plan has ${subCount} historical customer submissions, so it was safely Archived instead of permanently deleted to preserve referential records.`,
      });
    }

    await db.run('DELETE FROM recharge_plans WHERE id = ?', [id]);
    await logAudit(req.admin, 'PLAN_DELETE', 'PLAN', id, `Deleted unused plan ₹${plan.price} (${id})`, req);

    res.json({ success: true, message: 'Plan deleted successfully.' });
  } catch (err) {
    console.error('[ADMIN_API_ERROR] DELETE /plans/:id:', err);
    res.status(500).json({ error: 'Failed to delete plan' });
  }
});
