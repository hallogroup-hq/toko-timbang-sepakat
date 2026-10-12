import { Hono } from 'hono';
import { getDb } from '../../db/database.ts';

export const publicCategoryRoutes = new Hono();

publicCategoryRoutes.get('/', async (c) => {
  const db = getDb();
  const categories = db.all<any>(
    `SELECT c.id, c.slug, c.name, COUNT(p.id) as product_count
     FROM categories c
     JOIN products p ON p.category_id = c.id AND p.status = 'published'
     WHERE c.active = 1
     GROUP BY c.id
     ORDER BY c.sort_order ASC, c.name ASC`
  );
  return c.json({ data: categories });
});
