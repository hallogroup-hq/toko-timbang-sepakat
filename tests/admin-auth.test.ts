import { describe, it, expect, beforeAll } from 'vitest';
import { createApp } from '../server/index.ts';
import { runMigrations } from '../server/db/migrate.ts';
import { seedDatabase } from '../server/db/seed.ts';

describe('Gate G2: Admin Authentication & Security Tests', () => {
  const app = createApp();

  beforeAll(() => {
    runMigrations();
    seedDatabase();
  });

  it('ADMIN-01: Unauthenticated request to mutate product or price returns 401', async () => {
    const res = await app.request('/api/admin/products');
    expect(res.status).toBe(401);

    const postRes = await app.request('/api/admin/pricing/batch', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates: [] })
    });
    expect(postRes.status).toBe(401);
  });

  it('Invalid login returns 401 with error message', async () => {
    const res = await app.request('/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@tokotimbangsepakat.com',
        password: 'WrongPassword123!'
      })
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('Valid login sets HttpOnly session cookie and returns user profile', async () => {
    const res = await app.request('/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@tokotimbangsepakat.com',
        password: 'AdminTokoSepakat2026!'
      })
    });

    expect(res.status).toBe(200);
    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toBeDefined();
    expect(setCookie).toContain('tts_admin_session');
    expect(setCookie).toContain('HttpOnly');

    const body = await res.json();
    expect(body.user.email).toBe('admin@tokotimbangsepakat.com');
    expect(body.user.role).toBe('owner');
  });

  it('Authenticated request succeeds with valid session cookie', async () => {
    // Login
    const loginRes = await app.request('/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@tokotimbangsepakat.com',
        password: 'AdminTokoSepakat2026!'
      })
    });
    const setCookie = loginRes.headers.get('set-cookie') || '';
    const cookieMatch = setCookie.match(/tts_admin_session=([^;]+)/);
    const cookieValue = cookieMatch ? cookieMatch[1] : '';

    const meRes = await app.request('/api/admin/auth/me', {
      headers: {
        Cookie: `tts_admin_session=${cookieValue}`
      }
    });

    expect(meRes.status).toBe(200);
    const meBody = await meRes.json();
    expect(meBody.user.email).toBe('admin@tokotimbangsepakat.com');

    // Logout
    const logoutRes = await app.request('/api/admin/auth/logout', {
      method: 'POST',
      headers: {
        Cookie: `tts_admin_session=${cookieValue}`
      }
    });
    expect(logoutRes.status).toBe(200);

    // Verify revoked session
    const meAfterLogout = await app.request('/api/admin/auth/me', {
      headers: {
        Cookie: `tts_admin_session=${cookieValue}`
      }
    });
    expect(meAfterLogout.status).toBe(401);
  });
});
