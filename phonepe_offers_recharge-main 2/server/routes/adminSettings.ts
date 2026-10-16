import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, requireRole, logAudit, type AuthenticatedRequest } from '../auth.js';
import { getPersistentPaymentSettings, isSupabasePaymentSettingsConfigured, savePersistentPaymentSettings, uploadPaymentQr } from '../supabasePaymentSettings.js';

export const adminSettingsRouter = Router();

adminSettingsRouter.use(requireAuth);

// GET /api/admin/settings - Get all settings
adminSettingsRouter.get('/', async (_req, res) => {
  try {
    const rows = await db.all('SELECT setting_key, setting_value, updated_at, updated_by FROM website_settings') as Array<{
      setting_key: string;
      setting_value: string;
      updated_at: string;
      updated_by: string;
    }>;

    const settings: Record<string, string> = {};
    for (const r of rows) {
      settings[r.setting_key] = r.setting_value;
    }

    if (isSupabasePaymentSettingsConfigured()) Object.assign(settings, await getPersistentPaymentSettings());
    // The checkout destination is intentionally fixed in code; do not display stale saved values as active.
    settings.upi_id = 'qwerty779@ibl';
    settings.qr_code_url = '/assets/upi-qr.svg';
    res.json({ success: true, settings });
  } catch (err) {
    console.error('[ADMIN_API_ERROR] GET /settings:', err);
    res.status(500).json({ error: 'Failed to retrieve settings' });
  }
});

// Helper to validate UPI ID format
function isValidUpiId(id: string): boolean {
  return /^[a-zA-Z0-9.\-_]{2,100}@[a-zA-Z0-9.\-_]{2,50}$/.test(id.trim());
}

// Allowed MIME types for uploaded QR images
const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BASE64_BYTES = 5 * 1024 * 1024; // 5 MB

// PUT /api/admin/settings - Update settings (Owner & Manager)
adminSettingsRouter.put('/', requireRole(['owner', 'manager']), async (req: AuthenticatedRequest, res) => {
  try {
    const updates = req.body;
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'Invalid settings payload.' });
    }

    // Validate UPI ID if provided
    if ('upi_id' in updates) {
      const upi = String(updates.upi_id || '').trim();
      if (!upi) {
        return res.status(400).json({ error: 'UPI ID cannot be empty.' });
      }
      if (!isValidUpiId(upi)) {
        return res.status(400).json({ error: 'Invalid UPI ID format. Expected format: username@bank (e.g. user@ybl).' });
      }
      updates.upi_id = upi;
    }

    // Validate QR Code image if provided
    if ('qr_code_url' in updates) {
      const qrVal = String(updates.qr_code_url || '').trim();
      if (!qrVal) {
        return res.status(400).json({ error: 'QR Code image cannot be empty.' });
      }

      if (qrVal.startsWith('data:')) {
        const mimeMatch = qrVal.match(/^data:([^;]+);base64,/);
        if (!mimeMatch) {
          return res.status(400).json({ error: 'Invalid image data URI format.' });
        }
        const mime = mimeMatch[1].toLowerCase();
        const normalizedMime = mime === 'image/jpg' ? 'image/jpeg' : mime;
        if (!ALLOWED_IMAGE_MIMES.includes(normalizedMime)) {
          return res.status(400).json({ error: 'Unsupported image format. Please upload JPEG, PNG, or WebP.' });
        }

        const base64Data = qrVal.replace(/^data:[^;]+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        if (buffer.length > MAX_BASE64_BYTES) {
          return res.status(400).json({ error: 'Image file size exceeds the maximum limit of 5MB.' });
        }

      }
    }

    const now = new Date().toISOString();
    const adminUser = req.admin?.username || 'admin';

    if (isSupabasePaymentSettingsConfigured() && typeof updates.qr_code_url === 'string' && updates.qr_code_url.startsWith('data:')) {
      updates.qr_code_url = await uploadPaymentQr(updates.qr_code_url);
    }
    const paymentUpdates: Record<string, string> = {};
    for (const key of ['upi_id', 'qr_code_url']) {
      if (key in updates && typeof updates[key] === 'string') paymentUpdates[key] = updates[key];
    }
    if (isSupabasePaymentSettingsConfigured() && Object.keys(paymentUpdates).length) {
      await savePersistentPaymentSettings(paymentUpdates, adminUser);
    }

    const upsertSql = `
      INSERT INTO website_settings (setting_key, setting_value, updated_at, updated_by)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(setting_key) DO UPDATE SET
        setting_value = excluded.setting_value,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by
    `;

    await db.transaction(async (tx) => {
      for (const [key, value] of Object.entries(updates)) {
        if (typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') {
          await tx.run(upsertSql, [key, String(value), now, adminUser]);
        }
      }
    });

    await logAudit(req.admin, 'SETTINGS_UPDATE', 'WEBSITE_SETTINGS', 'ALL', `Updated website settings and promotional parameters`, req);

    res.json({ success: true, message: 'Settings updated successfully.' });
  } catch (err) {
    console.error('[ADMIN_API_ERROR] PUT /settings:', err);
    // Return a bounded diagnostic to authenticated admins so configuration/API failures
    // can be identified from the Admin Panel without exposing stack traces.
    const detail = err instanceof Error ? err.message.slice(0, 300) : 'Unknown server error';
    res.status(500).json({ error: `Failed to update settings: ${detail}` });
  }
});
