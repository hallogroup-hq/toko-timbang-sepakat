import { Hono } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import crypto from 'node:crypto';
import { getDb } from '../../db/database.ts';
import { verifyPassword, generateToken, hashToken } from '../../lib/auth.ts';
import { adminAuthMiddleware, AdminUserSession } from '../../middleware/auth.ts';

export const adminAuthRoutes = new Hono<{
  Variables: {
    adminUser: AdminUserSession;
  };
}>();

// Rate limiting map for failed login attempts
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();

adminAuthRoutes.post('/login', async (c) => {
  const ip = c.req.header('x-forwarded-for') || 'local';
  const now = Date.now();

  const attempt = loginAttempts.get(ip);
  if (attempt && attempt.lockedUntil > now) {
    const waitSec = Math.ceil((attempt.lockedUntil - now) / 1000);
    return c.json({ error: `Terlalu banyak percobaan. Silakan coba lagi dalam ${waitSec} detik.` }, 429);
  }

  const body = await c.req.json().catch(() => null);
  if (!body || !body.email || !body.password) {
    return c.json({ error: 'Email dan password wajib diisi.' }, 400);
  }

  const email = String(body.email).trim().toLowerCase();
  const password = String(body.password);

  const db = getDb();
  const user = db.get<{
    id: string;
    email: string;
    display_name: string;
    password_hash: string;
    role: 'owner' | 'staff';
    active: number;
  }>('SELECT * FROM admin_users WHERE email = ?', email);

  if (!user || user.active !== 1 || !verifyPassword(password, user.password_hash)) {
    const cur = loginAttempts.get(ip) || { count: 0, lockedUntil: 0 };
    cur.count += 1;
    if (cur.count >= 5) {
      cur.lockedUntil = now + 60 * 1000; // 1 minute lockout
    }
    loginAttempts.set(ip, cur);
    return c.json({ error: 'Email atau password tidak sesuai.' }, 401);
  }

  // Clear attempts on success
  loginAttempts.delete(ip);

  // Generate session token
  const token = generateToken(32);
  const tokenHash = hashToken(token);
  const sessionId = 'sess_' + crypto.randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  db.run(
    `INSERT INTO admin_sessions (id, admin_user_id, token_hash, expires_at)
     VALUES (?, ?, ?, ?)`,
    sessionId,
    user.id,
    tokenHash,
    expiresAt
  );

  // Set secure cookie
  setCookie(c, 'tts_admin_session', token, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: 7 * 24 * 60 * 60
  });

  return c.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      role: user.role
    }
  });
});

adminAuthRoutes.post('/logout', adminAuthMiddleware, async (c) => {
  const adminUser = c.get('adminUser');
  const db = getDb();

  db.run('UPDATE admin_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE id = ?', adminUser.sessionId);
  deleteCookie(c, 'tts_admin_session', { path: '/' });

  return c.json({ success: true, message: 'Berhasil keluar.' });
});

adminAuthRoutes.get('/me', adminAuthMiddleware, async (c) => {
  const adminUser = c.get('adminUser');
  return c.json({
    user: {
      id: adminUser.id,
      email: adminUser.email,
      displayName: adminUser.displayName,
      role: adminUser.role
    }
  });
});
