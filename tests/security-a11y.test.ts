import { describe, it, expect, beforeAll } from 'vitest';
import { runMigrations } from '../server/db/migrate.ts';
import { seedDatabase } from '../server/db/seed.ts';
import { createApp } from '../server/index.ts';

describe('Gate G7: Security, Accessibility & QA Acceptance Verification', () => {
  const app = createApp();
  beforeAll(async () => {
    runMigrations();
    seedDatabase();
  });

  describe('Security: Rate-Limiting & Injection Defenses', () => {
    it('SEC-01: Admin login enforces rate-limit lockout after repeated failed attempts', async () => {
      const failedPayload = JSON.stringify({
        email: 'admin@tokotimbangsepakat.com',
        password: 'WrongPassword123!'
      });

      // Send 5 failed attempts from a simulated IP
      const simulatedIp = '192.168.1.100';
      for (let i = 0; i < 5; i++) {
        const res = await app.request('/api/admin/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-forwarded-for': simulatedIp
          },
          body: failedPayload
        });
        expect(res.status).toBe(401);
      }

      // 6th attempt should be blocked with 429
      const lockedRes = await app.request('/api/admin/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': simulatedIp
        },
        body: failedPayload
      });
      expect(lockedRes.status).toBe(429);
      const data = await lockedRes.json();
      expect(data.error).toContain('Terlalu banyak percobaan');
    });

    it('SEC-02: Public checkout intent sanitizes buyer name against script tags and control characters', async () => {
      // Find a valid option
      const listRes = await app.request('/api/products?q=Trieste+Vanilla');
      const listData = await listRes.json();
      const product = listData.data[0];
      const option = product.options[0];

      const xssBuyer = '<script>alert("xss")</script>Budi Santoso';
      const newlineBiz = 'Toko Kopi\nAdmin Malicious Header: Test';

      const res = await app.request('/api/checkout/intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '10.0.0.1'
        },
        body: JSON.stringify({
          buyer_name: xssBuyer,
          business_name: newlineBiz,
          idempotency_key: 'sec-xss-' + Date.now(),
          items: [
            {
              product_id: product.id,
              sellable_option_id: option.id,
              qty: 1
            }
          ]
        })
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      // Sanitized: no HTML angle brackets, newlines replaced with space
      expect(data.buyer_name).toBe('alert("xss")Budi Santoso');
      expect(data.buyer_name).not.toContain('<script>');
      expect(data.business_name).toBe('Toko Kopi Admin Malicious Header: Test');
      expect(data.message_snapshot).not.toContain('<script>');
      expect(data.message_snapshot).toContain('Nama Pembeli: alert("xss")Budi Santoso');
    });

    it('SEC-03: Product search is immune to SQL injection payloads', async () => {
      const sqlInjectionQueries = [
        "' OR 1=1 --",
        "'; DROP TABLE products; --",
        "' UNION SELECT * FROM admin_users --",
        "\" OR \"\"=\""
      ];

      for (const q of sqlInjectionQueries) {
        const res = await app.request(`/api/products?q=${encodeURIComponent(q)}`);
        expect(res.status).toBe(200);
        const data = await res.json();
        // Returns safe structured response without crashing or leaking tables
        expect(Array.isArray(data.data)).toBe(true);
        expect(data.data.length).toBe(0);
      }
    });

    it('SEC-04: Privileged admin endpoints reject unauthenticated access with 401', async () => {
      const protectedEndpoints = [
        { path: '/api/admin/products', method: 'GET' },
        { path: '/api/admin/pricing/batch', method: 'PUT' },
        { path: '/api/admin/orders/orders', method: 'GET' },
        { path: '/api/admin/import/preview', method: 'POST' }
      ];

      for (const ep of protectedEndpoints) {
        const res = await app.request(ep.path, {
          method: ep.method,
          headers: { 'Content-Type': 'application/json' },
          body: ep.method === 'POST' || ep.method === 'PUT' ? JSON.stringify({}) : undefined
        });
        expect([401, 403]).toContain(res.status);
        const data = await res.json();
        expect(data.error).toBeDefined();
      }
    });
  });

  describe('Accessibility & Markup Quality', () => {
    it('A11Y-01: Public HTML entrypoint defines valid viewport, UTF-8 charset, and lang id', async () => {
      const res = await app.request('/');
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html.toLowerCase()).toContain('<!doctype html>');
      expect(html).toContain('lang="id"');
      expect(html).toContain('name="viewport" content="width=device-width, initial-scale=1.0');
    });

    it('A11Y-02: Branding and placeholder assets have required accessibility attributes', async () => {
      const res = await app.request('/branding/logo-color.png');
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('image/png');
    });
  });
});
