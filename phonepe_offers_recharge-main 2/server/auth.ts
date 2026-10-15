import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from './db.js';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'antigravity-phonepe-admin-supersecret-jwt-key-2026';
const TOKEN_EXPIRY = '8h';

export interface AdminPayload {
  id: string;
  username: string;
  email: string;
  role: 'owner' | 'manager' | 'viewer';
}

export interface AuthenticatedRequest extends Request {
  admin?: AdminPayload;
}

// Generate Auth Token
export function generateToken(payload: AdminPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

// Set HttpOnly Cookie
export function setAuthCookie(res: Response, token: string) {
  res.cookie('admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
    path: '/',
  });
}

// Clear Auth Cookie
export function clearAuthCookie(res: Response) {
  res.clearCookie('admin_token', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });
}

// Authentication Middleware
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // Support either HttpOnly cookie or Authorization: Bearer header
  let token = req.cookies?.admin_token;
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AdminPayload;

    // Verify user still exists and is active in database
    const user = await db.get('SELECT id, username, email, role, status FROM admin_users WHERE id = ?', [decoded.id]) as {
      id: string;
      username: string;
      email: string;
      role: 'owner' | 'manager' | 'viewer';
      status: string;
    } | undefined;

    if (!user || user.status !== 'active') {
      return res.status(401).json({ error: 'User account inactive or session invalid.' });
    }

    req.admin = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
  }
}

// Role Authorization Middleware
export function requireRole(allowedRoles: ('owner' | 'manager' | 'viewer')[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.admin) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.admin.role)) {
      return res.status(403).json({
        error: `Permission denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${req.admin.role}.`,
      });
    }

    next();
  };
}

// Log Audit Action
export async function logAudit(
  admin: { id: string; username: string } | undefined,
  action: string,
  entityType: string,
  entityId: string,
  summary: string,
  req?: Request
): Promise<void> {
  const adminId = admin?.id || 'system';
  const adminUsername = admin?.username || 'system';
  const ip = (req?.headers['x-forwarded-for'] as string) || req?.socket?.remoteAddress || '127.0.0.1';
  const now = new Date().toISOString();
  const id = 'audit-' + crypto.randomUUID();

  try {
    await db.run(`
      INSERT INTO admin_audit_logs (id, admin_id, admin_username, action, entity_type, entity_id, summary, ip_address, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, adminId, adminUsername, action, entityType, entityId, summary, ip, now]);
  } catch (err) {
    console.error('[AUDIT_ERROR] Failed to write audit log:', err);
  }
}

// Brute-force Login Rate Limiter (5 attempts per 15 minutes)
export async function checkLoginRateLimit(ip: string): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const now = Date.now();
  const record = await db.get('SELECT attempts, last_attempt, blocked_until FROM login_attempts WHERE ip = ?', [ip]) as {
    attempts: number;
    last_attempt: number;
    blocked_until: number;
  } | undefined;

  if (record) {
    if (record.blocked_until > now) {
      const waitSec = Math.ceil((record.blocked_until - now) / 1000);
      return { allowed: false, retryAfterSeconds: waitSec };
    }

    // Reset attempts if last attempt was > 15 minutes ago
    if (now - record.last_attempt > 15 * 60 * 1000) {
      await db.run('UPDATE login_attempts SET attempts = 0, last_attempt = ?, blocked_until = 0 WHERE ip = ?', [now, ip]);
    }
  }

  return { allowed: true };
}

export async function recordFailedLogin(ip: string): Promise<void> {
  const now = Date.now();
  const record = await db.get('SELECT attempts FROM login_attempts WHERE ip = ?', [ip]) as { attempts: number } | undefined;

  if (!record) {
    await db.run('INSERT INTO login_attempts (ip, attempts, last_attempt, blocked_until) VALUES (?, 1, ?, 0) ON CONFLICT (ip) DO NOTHING', [ip, now]);
  } else {
    const newAttempts = record.attempts + 1;
    let blockedUntil = 0;
    if (newAttempts >= 5) {
      blockedUntil = now + 15 * 60 * 1000; // 15 minute lock
    }
    await db.run('UPDATE login_attempts SET attempts = ?, last_attempt = ?, blocked_until = ? WHERE ip = ?', [
      newAttempts,
      now,
      blockedUntil,
      ip
    ]);
  }
}

export async function resetLoginRateLimit(ip: string): Promise<void> {
  await db.run('DELETE FROM login_attempts WHERE ip = ?', [ip]);
}
