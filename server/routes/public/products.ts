import { Hono } from 'hono';
import { getDb } from '../../db/database.ts';

export const publicProductRoutes = new Hono();

// 1. List published products
publicProductRoutes.get('/', async (c) => {
  const db = getDb();
  const q = c.req.query('q')?.trim() || '';
  const categorySlug = c.req.query('category')?.trim() || '';
  const sort = c.req.query('sort') || 'sort_order';

  let sql = `
    SELECT p.id, p.display_name, p.slug, p.source_key, p.sku, p.description,
           p.availability, p.sort_order,
           c.id as category_id, c.name as category_name, c.slug as category_slug
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.status = 'published'
  `;
  const params: any[] = [];

  if (q) {
    sql += ` AND (p.display_name LIKE ? OR p.source_name LIKE ? OR p.source_key LIKE ? OR p.sku LIKE ?)`;
    const pattern = `%${q}%`;
    params.push(pattern, pattern, pattern, pattern);
  }

  if (categorySlug) {
    sql += ` AND c.slug = ?`;
    params.push(categorySlug);
  }

  if (sort === 'name_asc') {
    sql += ` ORDER BY p.display_name COLLATE NOCASE ASC`;
  } else {
    sql += ` ORDER BY p.sort_order ASC, p.display_name COLLATE NOCASE ASC`;
  }

  const products = db.all<any>(sql, ...params);
  const productIds = products.map((p) => p.id);

  let options: any[] = [];
  let images: any[] = [];

  if (productIds.length > 0) {
    const placeholders = productIds.map(() => '?').join(',');
    options = db.all<any>(
      `SELECT id, product_id, unit_label, price_idr, pack_quantity, source_price_column, sort_order
       FROM sellable_options
       WHERE product_id IN (${placeholders}) AND active = 1
       ORDER BY sort_order ASC, price_idr ASC`,
      ...productIds
    );

    images = db.all<any>(
      `SELECT pi.product_id, pi.alt_text, ia.storage_key
       FROM product_images pi
       JOIN image_assets ia ON ia.id = pi.image_asset_id
       WHERE pi.product_id IN (${placeholders}) AND pi.is_primary = 1`,
      ...productIds
    );
  }

  const optionsMap = new Map<string, any[]>();
  for (const opt of options) {
    const list = optionsMap.get(opt.product_id) || [];
    list.push(opt);
    optionsMap.set(opt.product_id, list);
  }

  const imageMap = new Map<string, string>();
  for (const img of images) {
    imageMap.set(img.product_id, img.storage_key);
  }

  const results = products.map((p) => ({
    id: p.id,
    display_name: p.display_name,
    slug: p.slug,
    source_key: p.source_key,
    description: p.description,
    availability: p.availability,
    category: p.category_name ? { id: p.category_id, name: p.category_name, slug: p.category_slug } : null,
    image_url: imageMap.get(p.id) || null,
    options: optionsMap.get(p.id) || []
  }));

  return c.json({ data: results, total: results.length });
});

// 2. Get single product by slug
publicProductRoutes.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  const db = getDb();

  const product = db.get<any>(
    `SELECT p.*, c.name as category_name, c.slug as category_slug
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.slug = ? AND p.status = 'published'`,
    slug
  );

  if (!product) {
    return c.json({ error: 'Produk tidak ditemukan.' }, 404);
  }

  const options = db.all<any>(
    `SELECT id, product_id, unit_label, price_idr, pack_quantity, source_price_column, sort_order
     FROM sellable_options
     WHERE product_id = ? AND active = 1
     ORDER BY sort_order ASC, price_idr ASC`,
    product.id
  );

  const images = db.all<any>(
    `SELECT pi.alt_text, ia.storage_key
     FROM product_images pi
     JOIN image_assets ia ON ia.id = pi.image_asset_id
     WHERE pi.product_id = ?
     ORDER BY pi.sort_order ASC`,
    product.id
  );

  return c.json({
    data: {
      id: product.id,
      display_name: product.display_name,
      slug: product.slug,
      source_key: product.source_key,
      description: product.description,
      availability: product.availability,
      category: product.category_name
        ? { id: product.category_id, name: product.category_name, slug: product.category_slug }
        : null,
      image_url: images.length > 0 ? images[0].storage_key : null,
      images: images.map((img) => ({ url: img.storage_key, alt: img.alt_text })),
      options
    }
  });
});
