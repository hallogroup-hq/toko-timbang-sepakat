import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { getDb } from '../server/db/database.ts';

describe('Gate G3: Media Provenance & Image Discovery Invariants', () => {
  const db = getDb();

  it('MEDIA-01: Exactly 94 auditable ledger outcomes in docs/media-provenance.csv', () => {
    const csvPath = path.resolve(process.cwd(), 'docs/media-provenance.csv');
    expect(fs.existsSync(csvPath)).toBe(true);

    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.trim().split(/\r?\n/);
    // 1 header + 94 data rows = 95 lines
    expect(lines.length).toBe(95);
  });

  it('MEDIA-02: Unverified package variants for Susu F&N, Matcha, Oatside, Greenfield are not published without evidence', () => {
    const csvPath = path.resolve(process.cwd(), 'docs/media-provenance.csv');
    const content = fs.readFileSync(csvPath, 'utf-8');

    // Parse CSV rows
    const lines = content.trim().split(/\r?\n/).slice(1);
    for (const line of lines) {
      if (line.includes('SEPAKAT-004') || line.includes('SEPAKAT-072') || line.includes('SEPAKAT-007')) {
        expect(line).not.toContain(',approved,');
      }
    }

    // Verify database: no primary product image set for these without review
    const fnProduct = db.get<any>("SELECT id FROM products WHERE source_key = 'SEPAKAT-004'");
    const primaryImg = db.get<any>("SELECT * FROM product_images WHERE product_id = ? AND is_primary = 1", fnProduct.id);
    expect(primaryImg).toBeUndefined();
  });

  it('MEDIA-04: Admin review queue contains candidates for manual inspection', () => {
    const candidates = db.all<any>('SELECT * FROM image_candidates');
    expect(candidates.length).toBeGreaterThan(0);
    for (const c of candidates) {
      expect(c.review_status).toBe('pending');
    }
  });
});
