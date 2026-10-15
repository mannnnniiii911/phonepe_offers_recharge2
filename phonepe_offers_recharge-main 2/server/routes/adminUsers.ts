import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { requireAuth, requireRole, logAudit, type AuthenticatedRequest } from '../auth.js';
import crypto from 'crypto';

export const adminUsersRouter = Router();

adminUsersRouter.use(requireAuth);

// GET /api/admin/users - List administrator users (Owner only)
adminUsersRouter.get('/', requireRole(['owner']), async (_req, res) => {
  try {
    const users = await db.all(`
      SELECT id, username, email, role, status, created_at as "createdAt", updated_at as "updatedAt"
      FROM admin_users
      ORDER BY created_at ASC
    `);

    res.json({ success: true, users });
  } catch (err) {
    console.error('[ADMIN_API_ERROR] GET /users:', err);
    res.status(500).json({ error: 'Failed to retrieve admin users' });
  }
});

// POST /api/admin/users - Create new administrator user (Owner only)
adminUsersRouter.post('/', requireRole(['owner']), async (req: AuthenticatedRequest, res) => {
  try {
    const { username, email, password, role = 'viewer' } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    // Check existing
    const existing = await db.get('SELECT id FROM admin_users WHERE username = ? OR email = ?', [cleanUsername, cleanEmail]);
    if (existing) {
      return res.status(400).json({ error: 'A user with this username or email already exists.' });
    }

    const salt = bcrypt.genSaltSync(12);
    const passwordHash = bcrypt.hashSync(password, salt);
    const id = 'admin-' + crypto.randomUUID().slice(0, 8);
    const now = new Date().toISOString();

    await db.run(`
      INSERT INTO admin_users (id, username, email, password_hash, role, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'active', ?, ?)
    `, [id, cleanUsername, cleanEmail, passwordHash, role, now, now]);

    await logAudit(req.admin, 'ADMIN_USER_CREATE', 'ADMIN_USER', id, `Created new administrator '${cleanUsername}' with role '${role}'`, req);

    res.json({ success: true, message: 'Administrator created successfully', id });
  } catch (err) {
    console.error('[ADMIN_API_ERROR] POST /users:', err);
    res.status(500).json({ error: 'Failed to create administrator' });
  }
});

// PUT /api/admin/users/:id/role - Change user role (Owner only)
adminUsersRouter.put('/:id/role', requireRole(['owner']), async (req: AuthenticatedRequest, res) => {
  try {
    const id = String(req.params.id);
    const { role, status } = req.body;

    const user = await db.get('SELECT id, username, role FROM admin_users WHERE id = ?', [id]) as { id: string; username: string; role: string } | undefined;
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Protect last owner
    if (user.role === 'owner' && (role !== 'owner' || status === 'inactive')) {
      const ownerCount = (await db.get("SELECT COUNT(*) as c FROM admin_users WHERE role = 'owner' AND status = 'active'") as { c: number }).c;
      if (ownerCount <= 1) {
        return res.status(400).json({ error: 'Cannot downgrade or deactivate the only active Owner account.' });
      }
    }

    const now = new Date().toISOString();
    await db.run(`
      UPDATE admin_users
      SET role = COALESCE(?, role), status = COALESCE(?, status), updated_at = ?
      WHERE id = ?
    `, [role || null, status || null, now, id]);

    await logAudit(req.admin, 'ADMIN_USER_UPDATE', 'ADMIN_USER', id, `Updated role/status for admin '${user.username}'`, req);

    res.json({ success: true, message: 'Administrator updated successfully.' });
  } catch (err) {
    console.error('[ADMIN_API_ERROR] PUT /users/:id/role:', err);
    res.status(500).json({ error: 'Failed to update administrator' });
  }
});

// DELETE /api/admin/users/:id - Delete administrator (Owner only)
adminUsersRouter.delete('/:id', requireRole(['owner']), async (req: AuthenticatedRequest, res) => {
  try {
    const id = String(req.params.id);

    if (id === req.admin?.id) {
      return res.status(400).json({ error: 'You cannot delete your own account.' });
    }

    const user = await db.get('SELECT id, username, role FROM admin_users WHERE id = ?', [id]) as { id: string; username: string; role: string } | undefined;
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (user.role === 'owner') {
      const ownerCount = (await db.get("SELECT COUNT(*) as c FROM admin_users WHERE role = 'owner'") as { c: number }).c;
      if (ownerCount <= 1) {
        return res.status(400).json({ error: 'Cannot delete the only Owner account.' });
      }
    }

    await db.run('DELETE FROM admin_users WHERE id = ?', [id]);

    await logAudit(req.admin, 'ADMIN_USER_DELETE', 'ADMIN_USER', id, `Deleted administrator '${user.username}'`, req);

    res.json({ success: true, message: 'Administrator deleted.' });
  } catch (err) {
    console.error('[ADMIN_API_ERROR] DELETE /users/:id:', err);
    res.status(500).json({ error: 'Failed to delete administrator' });
  }
});
