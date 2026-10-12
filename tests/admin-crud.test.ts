import { describe, it, expect, beforeAll } from 'vitest';
import { createApp } from '../server/index.ts';
import { getDb } from '../server/db/database.ts';
import { runMigrations } from '../server/db/migrate.ts';
import { seedDatabase } from '../server/db/seed.ts';

describe('Gate G2: Admin CRUD, Pricing Audit & Import Tests', () => {
  const app = createApp();
  let authCookie = '';

  beforeAll(async () => {
    runMigrations();
    seedDatabase();

    // Authenticate admin
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
  });

  it('ADMIN-02: Modify selling price creates price_changes audit record and updates option', async () => {
    const db = getDb();
    const opt = db.get<any>(
      `SELECT so.id, so.product_id, so.price_idr
       FROM sellable_options so
       JOIN products p ON p.id = so.product_id
       WHERE p.source_key = 'SEPAKAT-021' AND so.source_price_column = 'pcs'`
    );
    expect(opt).toBeDefined();
    const oldPrice = opt.price_idr;
    const newPrice = oldPrice + 5000;

    const res = await app.request(`/api/admin/products/${opt.product_id}/options/${opt.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: authCookie
      },
      body: JSON.stringify({
        price_idr: newPrice,
        reason: 'Penyesuaian harga distributor'
      })
    });

    expect(res.status).toBe(200);

    // Verify option updated
    const updatedOpt = db.get<any>('SELECT price_idr FROM sellable_options WHERE id = ?', opt.id);
    expect(updatedOpt.price_idr).toBe(newPrice);

    // Verify price_changes entry created
    const pc = db.get<any>(
      'SELECT * FROM price_changes WHERE sellable_option_id = ? ORDER BY created_at DESC',
      opt.id
    );
    expect(pc).toBeDefined();
    expect(pc.old_price_idr).toBe(oldPrice);
    expect(pc.new_price_idr).toBe(newPrice);
    expect(pc.reason).toBe('Penyesuaian harga distributor');

    // Restore price
    await app.request(`/api/admin/products/${opt.product_id}/options/${opt.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: authCookie
      },
      body: JSON.stringify({
        price_idr: oldPrice,
        reason: 'Reset test'
      })
    });
  });

  it('ADMIN-03: Toggle availability to unavailable disables public add', async () => {
    const db = getDb();
    const prod = db.get<any>("SELECT id, slug FROM products WHERE source_key = 'SEPAKAT-003'");

    // Update availability to unavailable
    const res = await app.request(`/api/admin/products/${prod.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: authCookie
      },
      body: JSON.stringify({
        availability: 'unavailable'
      })
    });
    expect(res.status).toBe(200);

    // Check public API
    const pubRes = await app.request(`/api/products/${prod.slug}`);
    expect(pubRes.status).toBe(200);
    const pubBody = await pubRes.json();
    expect(pubBody.data.availability).toBe('unavailable');

    // Reset back
    await app.request(`/api/admin/products/${prod.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: authCookie
      },
      body: JSON.stringify({
        availability: 'ask_admin'
      })
    });
  });

  it('ADMIN-04: Batch price update updates multiple options with audit trail', async () => {
    const db = getDb();
    const options = db.all<any>('SELECT id, price_idr FROM sellable_options LIMIT 2');

    const updates = [
      { option_id: options[0].id, new_price_idr: options[0].price_idr + 1000, reason: 'Batch test 1' },
      { option_id: options[1].id, new_price_idr: options[1].price_idr + 2000, reason: 'Batch test 2' }
    ];

    const res = await app.request('/api/admin/pricing/batch', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: authCookie
      },
      body: JSON.stringify({ updates })
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.updated_count).toBe(2);

    // Reset back
    await app.request('/api/admin/pricing/batch', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: authCookie
      },
      body: JSON.stringify({
        updates: [
          { option_id: options[0].id, new_price_idr: options[0].price_idr, reason: 'Reset 1' },
          { option_id: options[1].id, new_price_idr: options[1].price_idr, reason: 'Reset 2' }
        ]
      })
    });
  });

  it('ADMIN-05: CSV Import preview and commit diff flow', async () => {
    const sampleCsv = `source_key,nama_produk_asli,harga_karton_pack_idr,harga_pcs_idr
SEPAKAT-001,Greenfield,285000,24000
SEPAKAT-999,Sirup Baru Uji Coba,,50000`;

    // 1. Preview
    const prevRes = await app.request('/api/admin/import/preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: authCookie
      },
      body: JSON.stringify({
        filename: 'test_price_update.csv',
        csv_content: sampleCsv
      })
    });

    expect(prevRes.status).toBe(200);
    const prevBody = await prevRes.json();
    expect(prevBody.batch_id).toBeDefined();
    expect(prevBody.summary.total_rows).toBe(2);
    expect(prevBody.summary.update).toBe(1); // SEPAKAT-001 price updated
    expect(prevBody.summary.create).toBe(1); // SEPAKAT-999 new item

    // 2. Commit
    const commitRes = await app.request(`/api/admin/import/commit/${prevBody.batch_id}`, {
      method: 'POST',
      headers: {
        Cookie: authCookie
      }
    });

    expect(commitRes.status).toBe(200);
    const commitBody = await commitRes.json();
    expect(commitBody.success).toBe(true);
    expect(commitBody.committed_updates).toBeGreaterThan(0);

    // Reset Greenfield prices back to original
    const db = getDb();
    const gProd = db.get<any>("SELECT id FROM products WHERE source_key = 'SEPAKAT-001'");
    db.run(
      "UPDATE sellable_options SET price_idr = 280000 WHERE product_id = ? AND source_price_column = 'karton_pack'",
      gProd.id
    );
    db.run(
      "UPDATE sellable_options SET price_idr = 23500 WHERE product_id = ? AND source_price_column = 'pcs'",
      gProd.id
    );
  });
});
