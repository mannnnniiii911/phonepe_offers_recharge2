import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import {
  generateToken,
  setAuthCookie,
  clearAuthCookie,
  requireAuth,
  logAudit,
  checkLoginRateLimit,
  recordFailedLogin,
  resetLoginRateLimit,
  type AuthenticatedRequest,
} from '../auth.js';

export const authRouter = Router();

// POST /api/admin/login
authRouter.post('/login', async (req, res) => {
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Username/Email and password are required.' });
  }

  // Check rate limit
  const rateLimit = await checkLoginRateLimit(ip);
  if (!rateLimit.allowed) {
    return res.status(429).json({
      error: `Too many failed login attempts. Please wait ${rateLimit.retryAfterSeconds} seconds before trying again.`,
    });
  }

  // Find user by username or email
  const user = await db.get(`
    SELECT id, username, email, password_hash, role, status
    FROM admin_users
    WHERE username = ? OR email = ?
  `, [identifier.trim(), identifier.trim()]) as {
    id: string;
    username: string;
    email: string;
    password_hash: string;
    role: 'owner' | 'manager' | 'viewer';
    status: string;
  } | undefined;

  if (!user || user.status !== 'active') {
    await recordFailedLogin(ip);
    return res.status(401).json({ error: 'Invalid credentials or inactive account.' });
  }

  const isPasswordValid = bcrypt.compareSync(password, user.password_hash);
  if (!isPasswordValid) {
    await recordFailedLogin(ip);
    return res.status(401).json({ error: 'Invalid credentials or inactive account.' });
  }

  // Login successful
  await resetLoginRateLimit(ip);

  const payload = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
  };

  const token = generateToken(payload);
  setAuthCookie(res, token);

  await logAudit(payload, 'ADMIN_LOGIN', 'ADMIN_USER', user.id, `Administrator ${user.username} logged in successfully`, req);

  res.json({
    success: true,
    user: payload,
    token, // Also return in body for Authorization header clients
  });
});

// POST /api/admin/logout
authRouter.post('/logout', requireAuth, async (req: AuthenticatedRequest, res) => {
  if (req.admin) {
    await logAudit(req.admin, 'ADMIN_LOGOUT', 'ADMIN_USER', req.admin.id, `Administrator ${req.admin.username} logged out`, req);
  }
  clearAuthCookie(res);
  res.json({ success: true, message: 'Logged out successfully.' });
});

// GET /api/admin/me
authRouter.get('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  res.json({
    success: true,
    user: req.admin,
  });
});
