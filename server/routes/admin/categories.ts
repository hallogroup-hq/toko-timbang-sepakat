import { Hono } from 'hono';
import crypto from 'node:crypto';
import { getDb } from '../../db/database.ts';
import { adminAuthMiddleware, AdminUserSession } from '../../middleware/auth.ts';

export const adminCategoryRoutes = new Hono<{
  Variables: {
    adminUser: AdminUserSession;
  };
}>();

adminCategoryRoutes.use('*', adminAuthMiddleware);

adminCategoryRoutes.get('/', async (c) => {
  const db = getDb();
  const categories = db.all<any>(
    `SELECT c.*, COUNT(p.id) as product_count
     FROM categories c
     LEFT JOIN products p ON p.category_id = c.id
     GROUP BY c.id
     ORDER BY c.sort_order ASC, c.name ASC`
  );
  return c.json({ data: categories });
});

adminCategoryRoutes.post('/', async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || !body.name) {
    return c.json({ error: 'Nama kategori wajib diisi.' }, 400);
  }

  const name = String(body.name).trim();
  const slug = String(body.slug || name.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/[\s_-]+/g, '-'));
  const sortOrder = Number(body.sort_order) || 0;
  const id = 'cat_' + crypto.randomBytes(8).toString('hex');

  const db = getDb();
  db.run(
    'INSERT INTO categories (id, slug, name, sort_order, active) VALUES (?, ?, ?, ?, 1)',
    id,
    slug,
    name,
    sortOrder
  );

  return c.json({ success: true, id }, 201);
});

adminCategoryRoutes.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: 'Data tidak valid.' }, 400);

  const db = getDb();
  const existing = db.get<any>('SELECT * FROM categories WHERE id = ?', id);
  if (!existing) return c.json({ error: 'Kategori tidak ditemukan.' }, 404);

  const name = body.name !== undefined ? String(body.name).trim() : existing.name;
  const slug = body.slug !== undefined ? String(body.slug).trim() : existing.slug;
  const sortOrder = body.sort_order !== undefined ? Number(body.sort_order) : existing.sort_order;
  const active = body.active !== undefined ? (body.active ? 1 : 0) : existing.active;

  db.run(
    `UPDATE categories
     SET name = ?, slug = ?, sort_order = ?, active = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    name,
    slug,
    sortOrder,
    active,
    id
  );

  return c.json({ success: true, message: 'Kategori berhasil diperbarui.' });
});
