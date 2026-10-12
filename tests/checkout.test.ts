import { describe, it, expect, beforeAll } from 'vitest';
import { createApp } from '../server/index.ts';
import { getDb } from '../server/db/database.ts';
import { runMigrations } from '../server/db/migrate.ts';
import { seedDatabase } from '../server/db/seed.ts';

describe('Gate G5: Server Checkout & Canonical WhatsApp Integration Tests', () => {
  const app = createApp();
  let greenfieldOptId = '';
  let greenfieldProdId = '';
  let triesteOptId = '';
  let triesteProdId = '';

  beforeAll(() => {
    runMigrations();
    seedDatabase();

    const db = getDb();
    const gProd = db.get<any>("SELECT id FROM products WHERE source_key = 'SEPAKAT-002'");
    const gOpt = db.get<any>(
      "SELECT id FROM sellable_options WHERE product_id = ? AND source_price_column = 'karton_pack'",
      gProd.id
    );
    greenfieldProdId = gProd.id;
    greenfieldOptId = gOpt.id;

    const tProd = db.get<any>("SELECT id FROM products WHERE source_key = 'SEPAKAT-021'");
    const tOpt = db.get<any>(
      "SELECT id FROM sellable_options WHERE product_id = ? AND source_price_column = 'pcs'",
      tProd.id
    );
    triesteProdId = tProd.id;
    triesteOptId = tOpt.id;
  });

  it('PRICE-01: Preview API correctly verifies 2 × Greenfield UHT (240k) + 3 × Trieste Vanilla (75k) = Rp705.000', async () => {
    const res = await app.request('/api/checkout/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [
          { product_id: greenfieldProdId, sellable_option_id: greenfieldOptId, qty: 2 },
          { product_id: triesteProdId, sellable_option_id: triesteOptId, qty: 3 }
        ]
      })
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.subtotal_idr).toBe(705000);
    expect(body.has_price_change).toBe(false);
    expect(body.lines.length).toBe(2);
    expect(body.lines[0].line_subtotal_idr).toBe(480000);
    expect(body.lines[1].line_subtotal_idr).toBe(225000);
  });

  it('WA-01: Rejects checkout when Buyer Name is blank or less than 2 characters', async () => {
    const res = await app.request('/api/checkout/intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        buyer_name: 'A',
        idempotency_key: 'test_key_1',
        items: [{ product_id: greenfieldProdId, sellable_option_id: greenfieldOptId, qty: 1 }]
      })
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Nama Pembeli wajib diisi');
  });

  it('WA-02 & WA-03: Creates intent with valid buyer name and formats canonical message', async () => {
    const idempotencyKey = 'unique_idemp_' + Date.now();
    const res = await app.request('/api/checkout/intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        buyer_name: 'Budi Santoso',
        business_name: 'Kopi Senja Bersama',
        idempotency_key: idempotencyKey,
        items: [
          { product_id: greenfieldProdId, sellable_option_id: greenfieldOptId, qty: 2 },
          { product_id: triesteProdId, sellable_option_id: triesteOptId, qty: 3 }
        ]
      })
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.subtotal_idr).toBe(705000);
    expect(body.public_ref).toMatch(/^TS-[A-F0-9]{8}$/);
    expect(body.buyer_name).toBe('Budi Santoso');
    expect(body.business_name).toBe('Kopi Senja Bersama');

    const msg = body.message_snapshot;
    expect(msg).toContain('Halo Admin Toko Timbang Sepakat');
    expect(msg).toContain('Referensi: ' + body.public_ref);
    expect(msg).toContain('Nama Pembeli: Budi Santoso');
    expect(msg).toContain('Nama Toko/Usaha: Kopi Senja Bersama');
    expect(msg).toContain('Greenfield UHT');
    expect(msg).toContain('2 x Rp240.000 = Rp480.000');
    expect(msg).toContain('Trieste Vanilla');
    expect(msg).toContain('3 x Rp75.000 = Rp225.000');
    expect(msg).toContain('Subtotal barang: Rp705.000');
    expect(msg).toContain('Ongkir: dikonfirmasi admin');

    // Test Idempotency (WA-05)
    const retryRes = await app.request('/api/checkout/intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        buyer_name: 'Budi Santoso',
        business_name: 'Kopi Senja Bersama',
        idempotency_key: idempotencyKey,
        items: [
          { product_id: greenfieldProdId, sellable_option_id: greenfieldOptId, qty: 2 },
          { product_id: triesteProdId, sellable_option_id: triesteOptId, qty: 3 }
        ]
      })
    });

    expect(retryRes.status).toBe(200);
    const retryBody = await retryRes.json();
    expect(retryBody.intent_id).toBe(body.intent_id);
    expect(retryBody.public_ref).toBe(body.public_ref);
  });

  it('WA-02b: When business name is empty, it is omitted from the message without blank placeholder label', async () => {
    const res = await app.request('/api/checkout/intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        buyer_name: 'Siti Rahma',
        business_name: '',
        idempotency_key: 'idemp_nobiz_' + Date.now(),
        items: [{ product_id: triesteProdId, sellable_option_id: triesteOptId, qty: 1 }]
      })
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.message_snapshot).not.toContain('Nama Toko/Usaha:');
    expect(body.message_snapshot).toContain('Nama Pembeli: Siti Rahma');
  });
});
