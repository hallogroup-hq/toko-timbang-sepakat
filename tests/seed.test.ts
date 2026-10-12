import { describe, it, expect, beforeAll } from 'vitest';
import { getDb } from '../server/db/database.ts';
import { runMigrations } from '../server/db/migrate.ts';
import { seedDatabase } from '../server/db/seed.ts';

describe('Gate G1: Data Model, Schema & Seed Invariants', () => {
  const db = getDb();

  beforeAll(() => {
    runMigrations();
    seedDatabase();
  });

  it('DATA-01: Exactly 94 products and 106 sellable options (35 Karton/Pack, 71 Pcs)', () => {
    const products = db.all('SELECT * FROM products');
    expect(products.length).toBe(94);

    const options = db.all('SELECT * FROM sellable_options');
    expect(options.length).toBe(106);

    const karton = db.all("SELECT * FROM sellable_options WHERE source_price_column = 'karton_pack'");
    expect(karton.length).toBe(35);

    const pcs = db.all("SELECT * FROM sellable_options WHERE source_price_column = 'pcs'");
    expect(pcs.length).toBe(71);
  });

  it('DATA-02: No zero-price or negative-price options exist', () => {
    const invalidOptions = db.all('SELECT * FROM sellable_options WHERE price_idr <= 0');
    expect(invalidOptions.length).toBe(0);
  });

  it('DATA-03: Greenfield vs Greenfield UHT are separate products', () => {
    const p1 = db.get<{ id: string; display_name: string }>(
      "SELECT id, display_name FROM products WHERE source_key = 'SEPAKAT-001'"
    );
    const p2 = db.get<{ id: string; display_name: string }>(
      "SELECT id, display_name FROM products WHERE source_key = 'SEPAKAT-002'"
    );

    expect(p1).toBeDefined();
    expect(p2).toBeDefined();
    expect(p1?.id).not.toBe(p2?.id);
    expect(p1?.display_name).toBe('Greenfield');
    expect(p2?.display_name).toBe('Greenfield UHT');

    const p1Options = db.all('SELECT * FROM sellable_options WHERE product_id = ?', p1?.id);
    const p2Options = db.all('SELECT * FROM sellable_options WHERE product_id = ?', p2?.id);

    expect(p1Options.length).toBe(2);
    expect(p2Options.length).toBe(2);
  });

  it('DATA-04: Owner-approved naming corrections applied, unverified names preserved', () => {
    const fnProduct = db.get<{ display_name: string }>(
      "SELECT display_name FROM products WHERE source_key = 'SEPAKAT-004'"
    );
    expect(fnProduct?.display_name).toBe('Susu F&N');

    const oatsideProduct = db.get<{ display_name: string }>(
      "SELECT display_name FROM products WHERE source_key = 'SEPAKAT-072'"
    );
    expect(oatsideProduct?.display_name).toBe('Oatside');

    const davinci = db.get<{ display_name: string }>(
      "SELECT display_name FROM products WHERE source_key = 'SEPAKAT-036'"
    );
    expect(davinci?.display_name).toBe('Davinci Cramel');

    const lotus = db.get<{ display_name: string }>(
      "SELECT display_name FROM products WHERE source_key = 'SEPAKAT-093'"
    );
    expect(lotus?.display_name).toBe('Lotus Bisqof');
  });

  it('PRICE-01: Canonical arithmetic check: 2 × Greenfield UHT Karton + 3 × Trieste Vanilla Pcs = Rp705.000', () => {
    const greenfieldUht = db.get<{ id: string }>(
      "SELECT id FROM products WHERE source_key = 'SEPAKAT-002'"
    );
    const triesteVanilla = db.get<{ id: string }>(
      "SELECT id FROM products WHERE source_key = 'SEPAKAT-021'"
    );

    const optGreenfield = db.get<{ price_idr: number }>(
      "SELECT price_idr FROM sellable_options WHERE product_id = ? AND source_price_column = 'karton_pack'",
      greenfieldUht?.id
    );
    const optTrieste = db.get<{ price_idr: number }>(
      "SELECT price_idr FROM sellable_options WHERE product_id = ? AND source_price_column = 'pcs'",
      triesteVanilla?.id
    );

    expect(optGreenfield?.price_idr).toBe(240000);
    expect(optTrieste?.price_idr).toBe(75000);

    const qtyGreenfield = 2;
    const qtyTrieste = 3;

    const subtotal = qtyGreenfield * (optGreenfield?.price_idr || 0) + qtyTrieste * (optTrieste?.price_idr || 0);
    expect(subtotal).toBe(705000);
  });

  it('DATA-05: Idempotent rerun does not corrupt or duplicate data', () => {
    const rerun = seedDatabase();
    expect(rerun.totalProducts).toBe(94);
    expect(rerun.totalOptions).toBe(106);
    expect(rerun.kartonOptions).toBe(35);
    expect(rerun.pcsOptions).toBe(71);
  });
});
