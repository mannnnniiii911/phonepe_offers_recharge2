import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, requireRole, logAudit, type AuthenticatedRequest } from '../auth.js';
import crypto from 'crypto';

export const adminOffersRouter = Router();

adminOffersRouter.use(requireAuth);

// GET /api/admin/offers - List all offers
adminOffersRouter.get('/', async (_req, res) => {
  try {
    const offers = await db.all(`
      SELECT 
        o.id,
        o.title,
        o.message,
        o.subtitle,
        o.banner_url as "bannerUrl",
        o.provider_id as "providerId",
        prov.name as "providerName",
        o.timer_mode as "timerMode",
        o.start_time as "startTime",
        o.end_time as "endTime",
        o.duration_minutes as "durationMinutes",
        o.status,
        o.display_order as "displayOrder",
        o.created_at as "createdAt",
        o.updated_at as "updatedAt"
      FROM special_offers o
      LEFT JOIN network_providers prov ON o.provider_id = prov.id
      ORDER BY o.display_order ASC, o.created_at DESC
    `);

    res.json({ success: true, offers });
  } catch (err) {
    console.error('[ADMIN_API_ERROR] GET /offers:', err);
    res.status(500).json({ error: 'Failed to retrieve offers' });
  }
});

// POST /api/admin/offers - Create new offer (fixed deadline or duration-based campaign)
adminOffersRouter.post('/', requireRole(['owner', 'manager']), async (req: AuthenticatedRequest, res) => {
  try {
    const { title, message, subtitle, bannerUrl, providerId, timerMode = 'duration', durationMinutes = 30, startTime, endTime, status = 'active', displayOrder } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required.' });
    }

    const now = new Date();
    let computedStartTime = startTime ? new Date(startTime).toISOString() : now.toISOString();
    let computedEndTime: string;

    if (timerMode === 'duration') {
      const durationMs = Number(durationMinutes || 30) * 60 * 1000;
      computedEndTime = new Date(new Date(computedStartTime).getTime() + durationMs).toISOString();
    } else {
      if (!endTime) {
        return res.status(400).json({ error: 'End time is required for fixed deadline mode.' });
      }
      computedEndTime = new Date(endTime).toISOString();
    }

    const id = 'offer-' + crypto.randomUUID().slice(0, 8);

    await db.run(`
      INSERT INTO special_offers (id, title, message, subtitle, banner_url, provider_id, timer_mode, start_time, end_time, duration_minutes, status, display_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      title.trim(),
      message.trim(),
      subtitle?.trim() || '',
      bannerUrl || '',
      providerId || null,
      timerMode,
      computedStartTime,
      computedEndTime,
      Number(durationMinutes) || 30,
      status,
      Number(displayOrder) || 0,
      now.toISOString(),
      now.toISOString()
    ]);

    await logAudit(req.admin, 'OFFER_CREATE', 'OFFER', id, `Created special offer '${title}' (Mode: ${timerMode}, End: ${computedEndTime})`, req);

    res.json({ success: true, message: 'Special offer created successfully', id });
  } catch (err) {
    console.error('[ADMIN_API_ERROR] POST /offers:', err);
    res.status(500).json({ error: 'Failed to create offer' });
  }
});

// PUT /api/admin/offers/:id - Update offer
adminOffersRouter.put('/:id', requireRole(['owner', 'manager']), async (req: AuthenticatedRequest, res) => {
  try {
    const id = String(req.params.id);
    const { title, message, subtitle, bannerUrl, providerId, timerMode, durationMinutes, startTime, endTime, status, displayOrder } = req.body;

    const existing = await db.get('SELECT id, title FROM special_offers WHERE id = ?', [id]) as { id: string; title: string } | undefined;
    if (!existing) {
      return res.status(404).json({ error: 'Offer not found.' });
    }

    const now = new Date();
    let computedStartTime = startTime ? new Date(startTime).toISOString() : now.toISOString();
    let computedEndTime: string;

    if (timerMode === 'duration') {
      const durationMs = Number(durationMinutes || 30) * 60 * 1000;
      computedEndTime = new Date(new Date(computedStartTime).getTime() + durationMs).toISOString();
    } else {
      computedEndTime = endTime ? new Date(endTime).toISOString() : new Date(now.getTime() + 30 * 60 * 1000).toISOString();
    }

    await db.run(`
      UPDATE special_offers
      SET title = ?, message = ?, subtitle = ?, banner_url = ?, provider_id = ?, timer_mode = ?, start_time = ?, end_time = ?, duration_minutes = ?, status = ?, display_order = ?, updated_at = ?
      WHERE id = ?
    `, [
      title.trim(),
      message.trim(),
      subtitle?.trim() || '',
      bannerUrl || '',
      providerId || null,
      timerMode || 'duration',
      computedStartTime,
      computedEndTime,
      Number(durationMinutes) || 30,
      status || 'active',
      Number(displayOrder) || 0,
      now.toISOString(),
      id
    ]);

    await logAudit(req.admin, 'OFFER_UPDATE', 'OFFER', id, `Updated special offer '${title}'`, req);

    res.json({ success: true, message: 'Offer updated successfully' });
  } catch (err) {
    console.error('[ADMIN_API_ERROR] PUT /offers/:id:', err);
    res.status(500).json({ error: 'Failed to update offer' });
  }
});

// PATCH /api/admin/offers/:id/status - Pause, activate, or end early
adminOffersRouter.patch('/:id/status', requireRole(['owner', 'manager']), async (req: AuthenticatedRequest, res) => {
  try {
    const id = String(req.params.id);
    const { status } = req.body;

    const offer = await db.get('SELECT id, title, status FROM special_offers WHERE id = ?', [id]) as { id: string; title: string; status: string } | undefined;
    if (!offer) {
      return res.status(404).json({ error: 'Offer not found.' });
    }

    const now = new Date().toISOString();
    await db.run('UPDATE special_offers SET status = ?, updated_at = ? WHERE id = ?', [status, now, id]);

    await logAudit(req.admin, 'OFFER_STATUS_CHANGE', 'OFFER', id, `Changed offer '${offer.title}' status to '${status}'`, req);

    res.json({ success: true, message: `Offer status changed to '${status}'.` });
  } catch (err) {
    console.error('[ADMIN_API_ERROR] PATCH /offers/:id/status:', err);
    res.status(500).json({ error: 'Failed to update offer status' });
  }
});

// DELETE /api/admin/offers/:id - Delete offer
adminOffersRouter.delete('/:id', requireRole(['owner', 'manager']), async (req: AuthenticatedRequest, res) => {
  try {
    const id = String(req.params.id);
    const offer = await db.get('SELECT id, title FROM special_offers WHERE id = ?', [id]) as { id: string; title: string } | undefined;
    if (!offer) {
      return res.status(404).json({ error: 'Offer not found.' });
    }

    await db.run('DELETE FROM special_offers WHERE id = ?', [id]);
    await logAudit(req.admin, 'OFFER_DELETE', 'OFFER', id, `Deleted offer '${offer.title}'`, req);

    res.json({ success: true, message: 'Offer deleted successfully.' });
  } catch (err) {
    console.error('[ADMIN_API_ERROR] DELETE /offers/:id:', err);
    res.status(500).json({ error: 'Failed to delete offer' });
  }
});
