import { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { getDb } from '../db/database.ts';
import { hashToken } from '../lib/auth.ts';

export interface AdminUserSession {
  id: string;
  email: string;
  displayName: string;
  role: 'owner' | 'staff';
  sessionId: string;
}

export async function adminAuthMiddleware(c: Context, next: Next) {
  const sessionToken = getCookie(c, 'tts_admin_session');

  if (!sessionToken) {
    return c.json({ error: 'Unauthorized: No session token provided' }, 401);
  }

  const tokenHash = hashToken(sessionToken);
  const db = getDb();

  const session = db.get<{
    session_id: string;
    admin_user_id: string;
    expires_at: string;
    revoked_at: string | null;
    email: string;
    display_name: string;
    role: 'owner' | 'staff';
    active: number;
  }>(
    `SELECT s.id as session_id, s.admin_user_id, s.expires_at, s.revoked_at,
            u.email, u.display_name, u.role, u.active
     FROM admin_sessions s
     JOIN admin_users u ON u.id = s.admin_user_id
     WHERE s.token_hash = ? AND s.revoked_at IS NULL AND u.active = 1`,
    tokenHash
  );

  if (!session) {
    return c.json({ error: 'Unauthorized: Invalid or revoked session' }, 401);
  }

  const now = new Date().toISOString();
  if (session.expires_at < now) {
    return c.json({ error: 'Unauthorized: Session has expired' }, 401);
  }

  // Set user context
  c.set('adminUser', {
    id: session.admin_user_id,
    email: session.email,
    displayName: session.display_name,
    role: session.role,
    sessionId: session.session_id
  } as AdminUserSession);

  await next();
}
