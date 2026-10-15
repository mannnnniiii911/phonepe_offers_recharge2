import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, requireRole, logAudit, type AuthenticatedRequest } from '../auth.js';
import crypto from 'crypto';

export const adminProvidersRouter = Router();

// Apply auth to all admin provider routes
adminProvidersRouter.use(requireAuth);

// GET /api/admin/providers - list all providers with associated plan counts
adminProvidersRouter.get('/', async (_req, res) => {
  try {
    const providers = await db.all(`
      SELECT 
        p.id, 
        p.slug, 
        p.name, 
        p.brand_color as "brandColor", 
        p.badge_bg as "badgeBg", 
        p.text_color as "textColor", 
        p.tagline, 
        p.logo_url as "logoUrl", 
        p.description, 
        p.is_active as "isActive", 
        p.display_order as "displayOrder", 
        p.created_at as "createdAt", 
        p.updated_at as "updatedAt",
        (SELECT COUNT(*) FROM recharge_plans WHERE provider_id = p.id) as "planCount"
      FROM network_providers p
      ORDER BY p.display_order ASC, p.name ASC
    `);

    res.json({ success: true, providers });
  } catch (err) {
    console.error('[ADMIN_API_ERROR] GET /providers:', err);
    res.status(500).json({ error: 'Failed to retrieve providers' });
  }
});

// POST /api/admin/providers - Add provider
adminProvidersRouter.post('/', requireRole(['owner', 'manager']), async (req: AuthenticatedRequest, res) => {
  try {
    const { name, slug, brandColor, badgeBg, textColor, tagline, logoUrl, description, isActive, displayOrder } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ error: 'Provider name and slug identifier are required.' });
    }

    const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');

    // Check slug uniqueness
    const existing = await db.get('SELECT id FROM network_providers WHERE slug = ?', [cleanSlug]);
    if (existing) {
      return res.status(400).json({ error: `Provider with identifier '${cleanSlug}' already exists.` });
    }

    const id = cleanSlug;
    const now = new Date().toISOString();

    await db.run(`
      INSERT INTO network_providers (id, slug, name, brand_color, badge_bg, text_color, tagline, logo_url, description, is_active, display_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      cleanSlug,
      name.trim(),
      brandColor || '#6426AD',
      badgeBg || '#F2EAFE',
      textColor || '#FFFFFF',
      tagline || '',
      logoUrl || '',
      description || '',
      isActive === false ? 0 : 1,
      Number(displayOrder) || 0,
      now,
      now
    ]);

    await logAudit(req.admin, 'PROVIDER_CREATE', 'PROVIDER', id, `Created new telecom provider '${name}' (${cleanSlug})`, req);

    res.json({ success: true, message: 'Provider added successfully', id });
  } catch (err) {
    console.error('[ADMIN_API_ERROR] POST /providers:', err);
    res.status(500).json({ error: 'Failed to create provider' });
  }
});

// PUT /api/admin/providers/:id - Edit provider
adminProvidersRouter.put('/:id', requireRole(['owner', 'manager']), async (req: AuthenticatedRequest, res) => {
  try {
    const id = String(req.params.id);
    const { name, brandColor, badgeBg, textColor, tagline, logoUrl, description, isActive, displayOrder } = req.body;

    const existing = await db.get('SELECT id, name FROM network_providers WHERE id = ?', [id]) as { id: string; name: string } | undefined;
    if (!existing) {
      return res.status(404).json({ error: 'Provider not found.' });
    }

    const now = new Date().toISOString();

    await db.run(`
      UPDATE network_providers
      SET name = ?, brand_color = ?, badge_bg = ?, text_color = ?, tagline = ?, logo_url = ?, description = ?, is_active = ?, display_order = ?, updated_at = ?
      WHERE id = ?
    `, [
      name.trim(),
      brandColor || '#6426AD',
      badgeBg || '#F2EAFE',
      textColor || '#FFFFFF',
      tagline || '',
      logoUrl || '',
      description || '',
      isActive === false ? 0 : 1,
      Number(displayOrder) || 0,
      now,
      id
    ]);

    await logAudit(req.admin, 'PROVIDER_UPDATE', 'PROVIDER', id, `Updated telecom provider '${name}'`, req);

    res.json({ success: true, message: 'Provider updated successfully' });
  } catch (err) {
    console.error('[ADMIN_API_ERROR] PUT /providers/:id:', err);
    res.status(500).json({ error: 'Failed to update provider' });
  }
});

// PATCH /api/admin/providers/:id/toggle - Toggle active status
adminProvidersRouter.patch('/:id/toggle', requireRole(['owner', 'manager']), async (req: AuthenticatedRequest, res) => {
  try {
    const id = String(req.params.id);
    const provider = await db.get('SELECT id, name, is_active FROM network_providers WHERE id = ?', [id]) as {
      id: string;
      name: string;
      is_active: number;
    } | undefined;

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found.' });
    }

    const newStatus = provider.is_active === 1 ? 0 : 1;
    const now = new Date().toISOString();

    await db.run('UPDATE network_providers SET is_active = ?, updated_at = ? WHERE id = ?', [newStatus, now, id]);

    await logAudit(
      req.admin,
      newStatus === 1 ? 'PROVIDER_ENABLED' : 'PROVIDER_DISABLED',
      'PROVIDER',
      id,
      `${newStatus === 1 ? 'Enabled' : 'Disabled'} telecom provider '${provider.name}'`,
      req
    );

    res.json({
      success: true,
      message: `Provider '${provider.name}' is now ${newStatus === 1 ? 'Active' : 'Inactive'}.`,
      isActive: newStatus === 1,
    });
  } catch (err) {
    console.error('[ADMIN_API_ERROR] PATCH /providers/:id/toggle:', err);
    res.status(500).json({ error: 'Failed to toggle provider status' });
  }
});

// DELETE /api/admin/providers/:id - Safe deletion check
adminProvidersRouter.delete('/:id', requireRole(['owner']), async (req: AuthenticatedRequest, res) => {
  try {
    const id = String(req.params.id);

    const provider = await db.get('SELECT id, name FROM network_providers WHERE id = ?', [id]) as { id: string; name: string } | undefined;
    if (!provider) {
      return res.status(404).json({ error: 'Provider not found.' });
    }

    // Check dependent historical submissions
    const submissionCount = (await db.get('SELECT COUNT(*) as c FROM customer_submissions WHERE provider_id = ?', [id]) as { c: number }).c;
    if (submissionCount > 0) {
      return res.status(400).json({
        error: `Cannot permanently delete provider '${provider.name}' because it has ${submissionCount} historical customer submission record(s). Please disable/deactivate the provider instead to preserve historical integrity.`,
      });
    }

    // Check dependent recharge plans
    const planCount = (await db.get('SELECT COUNT(*) as c FROM recharge_plans WHERE provider_id = ?', [id]) as { c: number }).c;
    if (planCount > 0) {
      return res.status(400).json({
        error: `Cannot permanently delete provider '${provider.name}' because it has ${planCount} associated recharge plan(s). Please archive or remove those plans first, or deactivate the provider.`,
      });
    }

    await db.run('DELETE FROM network_providers WHERE id = ?', [id]);

    await logAudit(req.admin, 'PROVIDER_DELETE', 'PROVIDER', id, `Deleted unused telecom provider '${provider.name}'`, req);

    res.json({ success: true, message: `Provider '${provider.name}' deleted successfully.` });
  } catch (err) {
    console.error('[ADMIN_API_ERROR] DELETE /providers/:id:', err);
    res.status(500).json({ error: 'Failed to delete provider' });
  }
});
