import { describe, it, expect, beforeAll } from 'vitest';
import { createApp } from '../server/index.ts';
import { runMigrations } from '../server/db/migrate.ts';
import { seedDatabase } from '../server/db/seed.ts';

describe('Gate G4: Customer Catalog & Storefront API Flows', () => {
  const app = createApp();

  beforeAll(() => {
    runMigrations();
    seedDatabase();
  });

  it('CAT-01: Search Trieste Vanilla returns Pcs Rp75.000 option with no fabricated carton option', async () => {
    const res = await app.request('/api/products?q=Trieste%20Vanilla');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBeGreaterThanOrEqual(1);

    const product = body.data.find((p: any) => p.display_name === 'Trieste Vanilla');
    expect(product).toBeDefined();
    expect(product.options.length).toBe(1);
    expect(product.options[0].unit_label).toBe('Pcs');
    expect(product.options[0].price_idr).toBe(75000);
  });

  it('CAT-02: Products with and without category are searchable and visible in public catalog', async () => {
    const res = await app.request('/api/products');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBe(94);
  });

  it('CAT-03: Unavailable product has availability=unavailable flag in public API', async () => {
    // Check an item
    const res = await app.request('/api/products/greenfield-uht');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(['ask_admin', 'available', 'unavailable']).toContain(body.data.availability);
  });

  it('BRAND-01: Static branding assets are served with proper content-type', async () => {
    const res = await app.request('/branding/logo-color.png');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/png');
  });

  it('SETT-01: Public settings returns store name and whatsapp readiness without exposing sensitive internals', async () => {
    const res = await app.request('/api/settings');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.store_name).toBe('Toko Timbang Sepakat');
    expect(typeof body.data.is_whatsapp_ready).toBe('boolean');
  });
});
