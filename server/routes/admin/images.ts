import { Hono } from 'hono';
import crypto from 'node:crypto';
import { getDb } from '../../db/database.ts';
import { adminAuthMiddleware, AdminUserSession } from '../../middleware/auth.ts';

export const adminImageRoutes = new Hono<{
  Variables: {
    adminUser: AdminUserSession;
  };
}>();

adminImageRoutes.use('*', adminAuthMiddleware);

// 1. List Image Candidates queue
adminImageRoutes.get('/candidates', async (c) => {
  const db = getDb();
  const status = c.req.query('status') || '';

  let sql = `
    SELECT ic.*, p.display_name as product_name, p.source_key
    FROM image_candidates ic
    JOIN products p ON p.id = ic.product_id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (status) {
    sql += ' AND ic.review_status = ?';
    params.push(status);
  }
  sql += ' ORDER BY ic.created_at DESC LIMIT 100';

  const rows = db.all<any>(sql, ...params);
  return c.json({ data: rows });
});

// 2. Approve or Reject Candidate
adminImageRoutes.put('/candidates/:id/review', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => null);

  if (!body || !['approved', 'rejected'].includes(body.review_status)) {
    return c.json({ error: 'Status review harus approved atau rejected.' }, 400);
  }

  const db = getDb();
  const candidate = db.get<any>('SELECT * FROM image_candidates WHERE id = ?', id);
  if (!candidate) return c.json({ error: 'Kandidat gambar tidak ditemukan.' }, 404);

  const reviewStatus = body.review_status;
  const reviewerNote = body.reviewer_note ? String(body.reviewer_note).trim() : null;

  db.exec('BEGIN TRANSACTION;');
  try {
    db.run(
      `UPDATE image_candidates
       SET review_status = ?, reviewer_note = ?, checked_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      reviewStatus,
      reviewerNote,
      id
    );

    if (reviewStatus === 'approved') {
      const assetId = 'asset_' + crypto.randomBytes(12).toString('hex');
      const storageKey = candidate.image_url;

      // Insert asset
      db.run(
        `INSERT INTO image_assets (
          id, storage_key, mime_type, source_page_url, rights_status
        ) VALUES (?, ?, 'image/jpeg', ?, 'permitted')`,
        assetId,
        storageKey,
        candidate.source_page_url
      );

      // Unset previous primary image
      db.run('UPDATE product_images SET is_primary = 0 WHERE product_id = ?', candidate.product_id);

      // Set as primary image
      const prodImgId = 'pimg_' + crypto.randomBytes(12).toString('hex');
      db.run(
        `INSERT INTO product_images (
          id, product_id, image_asset_id, is_primary, alt_text
        ) VALUES (?, ?, ?, 1, ?)`,
        prodImgId,
        candidate.product_id,
        assetId,
        candidate.product_name || 'Foto Produk'
      );
    }

    db.exec('COMMIT;');
  } catch (err: any) {
    db.exec('ROLLBACK;');
    return c.json({ error: `Gagal memperbarui status kandidat: ${err.message}` }, 500);
  }

  return c.json({ success: true, message: `Status kandidat diperbarui menjadi ${reviewStatus}.` });
});
