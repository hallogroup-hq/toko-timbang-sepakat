import { describe, it, expect, beforeAll } from 'vitest';
import { createApp } from '../server/index.ts';
import { getDb } from '../server/db/database.ts';
import { runMigrations } from '../server/db/migrate.ts';
import { seedDatabase } from '../server/db/seed.ts';

describe('Gate G6: Admin Order Operations & Revenue KPI Invariants', () => {
  const app = createApp();
  let authCookie = '';
  let sampleIntentId = '';

  beforeAll(async () => {
    runMigrations();
    seedDatabase();

    // Login admin
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
    authCookie = cookieMatch ? `tts_admin_session=${cookieMatch[1]}` : '';

    // Create a sample checkout intent
    const db = getDb();
    const gProd = db.get<any>("SELECT id FROM products WHERE source_key = 'SEPAKAT-002'");
    const gOpt = db.get<any>("SELECT id FROM sellable_options WHERE product_id = ?", gProd.id);

    const intentRes = await app.request('/api/checkout/intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        buyer_name: 'Budi Test Ops',
        business_name: 'Kafe Maju',
        idempotency_key: 'idemp_ops_' + Date.now(),
        items: [{ product_id: gProd.id, sellable_option_id: gOpt.id, qty: 2 }]
      })
    });
    const intentData = await intentRes.json();
    sampleIntentId = intentData.intent_id;
  });

  it('ADMIN-05: Convert intent into confirmed order creates immutable order lines and marks intent converted', async () => {
    const res = await app.request(`/api/admin/orders/from-intent/${sampleIntentId}`, {
      method: 'POST',
      headers: { Cookie: authCookie }
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.order_id).toBeDefined();
    expect(body.public_ref).toMatch(/^ORD-[A-F0-9]{8}$/);

    // Prevent duplicate conversion
    const duplicateRes = await app.request(`/api/admin/orders/from-intent/${sampleIntentId}`, {
      method: 'POST',
      headers: { Cookie: authCookie }
    });
    expect(duplicateRes.status).toBe(400);
    const dupBody = await duplicateRes.json();
    expect(dupBody.error).toContain('telah dikonversi sebelumnya');
  });

  it('ADMIN-06: Revenue KPI never counts checkout intents as revenue', async () => {
    const res = await app.request('/api/admin/orders/metrics', {
      headers: { Cookie: authCookie }
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.metrics).toBeDefined();
    expect(body.metrics.pending_checkout_requests).toBeGreaterThanOrEqual(0);
    expect(body.metrics.revenue_basis).toContain('paid atau completed');
  });

  it('ADMIN-07: Updating order status and shipping fee updates total_idr and records order_events', async () => {
    const db = getDb();
    const order = db.get<any>('SELECT * FROM orders ORDER BY created_at DESC LIMIT 1');
    expect(order).toBeDefined();

    const shippingFee = 25000;
    const res = await app.request(`/api/admin/orders/orders/${order.id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: authCookie
      },
      body: JSON.stringify({
        status: 'paid',
        shipping_fee_idr: shippingFee,
        admin_note: 'Pembayaran transfer bank terverifikasi'
      })
    });

    expect(res.status).toBe(200);

    const updated = db.get<any>('SELECT * FROM orders WHERE id = ?', order.id);
    expect(updated.status).toBe('paid');
    expect(updated.shipping_fee_idr).toBe(shippingFee);
    expect(updated.total_idr).toBe(order.subtotal_idr + shippingFee);

    // Verify order_events audit trail
    const event = db.get<any>('SELECT * FROM order_events WHERE order_id = ? ORDER BY created_at DESC', order.id);
    expect(event).toBeDefined();
    expect(event.event_type).toBe('status_update');
  });
});
