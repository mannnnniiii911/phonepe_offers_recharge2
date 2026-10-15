import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';

export const adminStatsRouter = Router();

adminStatsRouter.use(requireAuth);

// GET /api/admin/stats/dashboard - Dashboard summary cards & metrics
adminStatsRouter.get('/dashboard', async (_req, res) => {
  try {
    const totalProviders = (await db.get('SELECT COUNT(*) as c FROM network_providers') as { c: number }).c;
    const activeProviders = (await db.get('SELECT COUNT(*) as c FROM network_providers WHERE is_active = 1') as { c: number }).c;

    const totalPlans = (await db.get('SELECT COUNT(*) as c FROM recharge_plans') as { c: number }).c;
    const publishedPlans = (await db.get("SELECT COUNT(*) as c FROM recharge_plans WHERE status = 'published'") as { c: number }).c;
    const hiddenPlans = (await db.get("SELECT COUNT(*) as c FROM recharge_plans WHERE status = 'hidden'") as { c: number }).c;
    const archivedPlans = (await db.get("SELECT COUNT(*) as c FROM recharge_plans WHERE status = 'archived'") as { c: number }).c;

    const activeOffers = (await db.get("SELECT COUNT(*) as c FROM special_offers WHERE status = 'active'") as { c: number }).c;

    const totalSubmissions = (await db.get('SELECT COUNT(*) as c FROM customer_submissions') as { c: number }).c;
    // created_at is stored as an ISO-8601 UTC string, so the first 10 chars are the UTC date
    const todayUtc = new Date().toISOString().slice(0, 10);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const submissionsToday = (await db.get(`
      SELECT COUNT(*) as c FROM customer_submissions 
      WHERE LEFT(created_at, 10) = ?
    `, [todayUtc]) as { c: number }).c;

    const submissions7Days = (await db.get(`
      SELECT COUNT(*) as c FROM customer_submissions 
      WHERE created_at >= ?
    `, [sevenDaysAgo]) as { c: number }).c;

    // Recent activity logs (sanitized, no passwords, no full phone numbers)
    const recentActivity = await db.all(`
      SELECT id, admin_username as "adminUsername", action, entity_type as "entityType", entity_id as "entityId", summary, created_at as "createdAt"
      FROM admin_audit_logs
      ORDER BY created_at DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      stats: {
        totalProviders,
        activeProviders,
        totalPlans,
        publishedPlans,
        hiddenPlans,
        archivedPlans,
        activeOffers,
        totalSubmissions,
        submissionsToday,
        submissions7Days,
      },
      recentActivity,
    });
  } catch (err) {
    console.error('[ADMIN_API_ERROR] GET /stats/dashboard:', err);
    res.status(500).json({ error: 'Failed to retrieve dashboard metrics' });
  }
});

// GET /api/admin/stats/reports - Analytics reports
adminStatsRouter.get('/reports', async (_req, res) => {
  try {
    // 1. Submissions by Operator
    const submissionsByOperator = await db.all(`
      SELECT p.name, p.brand_color as "brandColor", COUNT(s.id) as count
      FROM network_providers p
      LEFT JOIN customer_submissions s ON p.id = s.provider_id
      GROUP BY p.id
      ORDER BY count DESC
    `);

    // 2. Submissions per day for the last 14 days
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const submissionsByDay = await db.all(`
      SELECT LEFT(created_at, 10) as "date", COUNT(id) as count
      FROM customer_submissions
      WHERE created_at >= ?
      GROUP BY LEFT(created_at, 10)
      ORDER BY "date" ASC
    `, [fourteenDaysAgo]);

    // 3. Plans by Provider
    const plansByProvider = await db.all(`
      SELECT 
        p.name,
        p.brand_color as "brandColor",
        COUNT(rp.id) as "totalPlans",
        SUM(CASE WHEN rp.status = 'published' THEN 1 ELSE 0 END) as "publishedPlans",
        SUM(CASE WHEN rp.status = 'hidden' THEN 1 ELSE 0 END) as "hiddenPlans"
      FROM network_providers p
      LEFT JOIN recharge_plans rp ON p.id = rp.provider_id
      GROUP BY p.id
      ORDER BY p.display_order ASC
    `);

    // 4. Audit events distribution
    const auditEvents = await db.all(`
      SELECT action, COUNT(id) as count
      FROM admin_audit_logs
      GROUP BY action
      ORDER BY count DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      reports: {
        submissionsByOperator,
        submissionsByDay,
        plansByProvider,
        auditEvents,
      },
    });
  } catch (err) {
    console.error('[ADMIN_API_ERROR] GET /stats/reports:', err);
    res.status(500).json({ error: 'Failed to retrieve reports' });
  }
});
