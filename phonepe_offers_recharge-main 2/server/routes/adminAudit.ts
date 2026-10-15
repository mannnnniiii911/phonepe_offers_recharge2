import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../auth.js';

export const adminAuditRouter = Router();

adminAuditRouter.use(requireAuth);

// GET /api/admin/audit-logs - Read-only paginated audit trail
adminAuditRouter.get('/', async (req, res) => {
  try {
    const { action, entityType, page = 1, limit = 25 } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 25));
    const offset = (pageNum - 1) * limitNum;

    let whereClause = 'WHERE 1=1';
    const params: string[] = [];

    if (action && action !== 'all') {
      whereClause += ` AND action = ?`;
      params.push(action as string);
    }

    if (entityType && entityType !== 'all') {
      whereClause += ` AND entity_type = ?`;
      params.push(entityType as string);
    }

    const countQuery = `SELECT COUNT(*) as total FROM admin_audit_logs ${whereClause}`;
    const total = (await db.get(countQuery, [...params]) as { total: number }).total;

    const query = `
      SELECT id, admin_id as "adminId", admin_username as "adminUsername", action, entity_type as "entityType", entity_id as "entityId", summary, ip_address as "ipAddress", created_at as "createdAt"
      FROM admin_audit_logs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const logs = await db.all(query, [...params, limitNum, offset]);

    res.json({
      success: true,
      logs,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error('[ADMIN_API_ERROR] GET /audit-logs:', err);
    res.status(500).json({ error: 'Failed to retrieve audit logs' });
  }
});
