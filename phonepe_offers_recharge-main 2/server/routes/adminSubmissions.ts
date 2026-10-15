import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, requireRole, logAudit, type AuthenticatedRequest } from '../auth.js';

export const adminSubmissionsRouter = Router();

adminSubmissionsRouter.use(requireAuth);

function maskPhoneNumber(phone: string): string {
  if (!phone || phone.length < 6) return '******';
  const start = phone.slice(0, 2);
  const end = phone.slice(-2);
  return `${start}******${end}`;
}

// GET /api/admin/submissions - List customer submissions with default masking
adminSubmissionsRouter.get('/', async (req, res) => {
  try {
    const { search, providerId, startDate, endDate, sort = 'desc', page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit as string, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    let whereClause = 'WHERE 1=1';
    const params: (string | number)[] = [];

    if (search) {
      whereClause += ` AND (s.mobile_number ILIKE ? OR s.id ILIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    if (providerId && providerId !== 'all') {
      whereClause += ` AND s.provider_id = ?`;
      params.push(providerId as string);
    }

    if (startDate) {
      whereClause += ` AND s.created_at >= ?`;
      params.push(startDate as string);
    }

    if (endDate) {
      whereClause += ` AND s.created_at <= ?`;
      params.push(endDate as string);
    }

    const sortDir = sort === 'asc' ? 'ASC' : 'DESC';

    const countQuery = `SELECT COUNT(*) as total FROM customer_submissions s ${whereClause}`;
    const total = (await db.get(countQuery, [...params]) as { total: number }).total;

    const query = `
      SELECT 
        s.id,
        s.mobile_number as "rawMobile",
        s.provider_id as "providerId",
        s.provider_name as "providerName",
        prov.logo_url as "providerLogo",
        s.plan_id as "planId",
        s.plan_snapshot as "planSnapshot",
        s.status,
        s.consent_version as "consentVersion",
        s.created_at as "createdAt"
      FROM customer_submissions s
      LEFT JOIN network_providers prov ON s.provider_id = prov.id
      ${whereClause}
      ORDER BY s.created_at ${sortDir}
      LIMIT ? OFFSET ?
    `;

    const rows = await db.all(query, [...params, limitNum, offset]) as Array<{
      id: string;
      rawMobile: string;
      providerId: string;
      providerName: string;
      providerLogo: string;
      planId: string | null;
      planSnapshot: string | null;
      status: string;
      consentVersion: string;
      createdAt: string;
    }>;

    // Mask phone numbers by default for presentation
    const submissions = rows.map((r) => ({
      id: r.id,
      maskedMobile: maskPhoneNumber(r.rawMobile),
      providerId: r.providerId,
      providerName: r.providerName,
      providerLogo: r.providerLogo,
      planId: r.planId,
      planSnapshot: r.planSnapshot ? JSON.parse(r.planSnapshot) : null,
      status: r.status,
      consentVersion: r.consentVersion,
      createdAt: r.createdAt,
    }));

    res.json({
      success: true,
      submissions,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error('[ADMIN_API_ERROR] GET /submissions:', err);
    res.status(500).json({ error: 'Failed to retrieve submissions' });
  }
});

// POST /api/admin/submissions/:id/reveal - Reveal unmasked phone number (Audited)
adminSubmissionsRouter.post('/:id/reveal', requireRole(['owner', 'manager']), async (req: AuthenticatedRequest, res) => {
  try {
    const id = String(req.params.id);

    const record = await db.get('SELECT id, mobile_number FROM customer_submissions WHERE id = ?', [id]) as {
      id: string;
      mobile_number: string;
    } | undefined;

    if (!record) {
      return res.status(404).json({ error: 'Submission not found.' });
    }

    // Log explicit audit event for security & compliance
    await logAudit(
      req.admin,
      'REVEAL_PHONE_NUMBER',
      'CUSTOMER_SUBMISSION',
      id,
      `Administrator ${req.admin?.username} revealed confidential customer phone number for record ${id}`,
      req
    );

    res.json({
      success: true,
      id: record.id,
      mobileNumber: record.mobile_number,
    });
  } catch (err) {
    console.error('[ADMIN_API_ERROR] POST /submissions/:id/reveal:', err);
    res.status(500).json({ error: 'Failed to reveal number' });
  }
});

// GET /api/admin/submissions/export - Safe CSV Export with formula injection prevention
adminSubmissionsRouter.get('/export', requireRole(['owner', 'manager']), async (req: AuthenticatedRequest, res) => {
  try {
    const { providerId, startDate, endDate, includeFullNumbers } = req.query;

    let whereClause = 'WHERE 1=1';
    const params: string[] = [];

    if (providerId && providerId !== 'all') {
      whereClause += ` AND s.provider_id = ?`;
      params.push(providerId as string);
    }
    if (startDate) {
      whereClause += ` AND s.created_at >= ?`;
      params.push(startDate as string);
    }
    if (endDate) {
      whereClause += ` AND s.created_at <= ?`;
      params.push(endDate as string);
    }

    const rows = await db.all(`
      SELECT s.id, s.mobile_number, s.provider_name, s.status, s.consent_version, s.created_at
      FROM customer_submissions s
      ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT 5000
    `, [...params]) as Array<{
      id: string;
      mobile_number: string;
      provider_name: string;
      status: string;
      consent_version: string;
      created_at: string;
    }>;

    // Defense against CSV formula injection (prevent executing `=cmd`, `+`, `-`, `@`)
    const sanitizeCsvCell = (val: string) => {
      let cell = String(val ?? '');
      if (/^[=+\-@\t\r]/.test(cell)) {
        cell = "'" + cell;
      }
      return `"${cell.replace(/"/g, '""')}"`;
    };

    const allowFull = includeFullNumbers === 'true' && req.admin?.role === 'owner';
    const headers = ['Submission ID', 'Mobile Number', 'Operator', 'Status', 'Consent Version', 'Date & Time'];
    const lines = [headers.join(',')];

    for (const r of rows) {
      const phone = allowFull ? r.mobile_number : maskPhoneNumber(r.mobile_number);
      lines.push([
        sanitizeCsvCell(r.id),
        sanitizeCsvCell(phone),
        sanitizeCsvCell(r.provider_name),
        sanitizeCsvCell(r.status),
        sanitizeCsvCell(r.consent_version),
        sanitizeCsvCell(r.created_at),
      ].join(','));
    }

    await logAudit(
      req.admin,
      'EXPORT_CUSTOMER_DATA',
      'CUSTOMER_SUBMISSIONS',
      'BULK',
      `Exported ${rows.length} customer submission records (Full numbers: ${allowFull})`,
      req
    );

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="customer_submissions_${Date.now()}.csv"`);
    res.send(lines.join('\n'));
  } catch (err) {
    console.error('[ADMIN_API_ERROR] GET /submissions/export:', err);
    res.status(500).json({ error: 'Failed to export customer records' });
  }
});

// DELETE /api/admin/submissions/:id - Delete / Anonymize submission (Owner only)
adminSubmissionsRouter.delete('/:id', requireRole(['owner']), async (req: AuthenticatedRequest, res) => {
  try {
    const id = String(req.params.id);
    const existing = await db.get('SELECT id FROM customer_submissions WHERE id = ?', [id]);

    if (!existing) {
      return res.status(404).json({ error: 'Record not found.' });
    }

    await db.run('DELETE FROM customer_submissions WHERE id = ?', [id]);

    await logAudit(req.admin, 'DELETE_CUSTOMER_RECORD', 'CUSTOMER_SUBMISSION', id, `Deleted customer submission ${id}`, req);

    res.json({ success: true, message: 'Record deleted.' });
  } catch (err) {
    console.error('[ADMIN_API_ERROR] DELETE /submissions/:id:', err);
    res.status(500).json({ error: 'Failed to delete submission' });
  }
});
