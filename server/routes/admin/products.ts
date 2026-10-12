import { Hono } from 'hono';
import crypto from 'node:crypto';
import { getDb } from '../../db/database.ts';
import { adminAuthMiddleware, AdminUserSession } from '../../middleware/auth.ts';

export const adminProductRoutes = new Hono<{
  Variables: {
    adminUser: AdminUserSession;
  };
}>();

adminProductRoutes.use('*', adminAuthMiddleware);

// 1. List products with options and category
adminProductRoutes.get('/', async (c) => {
  const db = getDb();
  const q = c.req.query('q')?.trim() || '';
  const categoryId = c.req.query('category')?.trim() || '';
  const status = c.req.query('status')?.trim() || '';
  const availability = c.req.query('availability')?.trim() || '';

  let sql = `
    SELECT p.*, c.name as category_name, c.slug as category_slug
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (q) {
    sql += ` AND (p.display_name LIKE ? OR p.source_key LIKE ? OR p.sku LIKE ? OR p.source_name LIKE ?)`;
    const searchPattern = `%${q}%`;
    params.push(searchPattern, searchPattern, searchPattern, searchPattern);
  }

  if (categoryId) {
    sql += ` AND p.category_id = ?`;
    params.push(categoryId);
  }

  if (status) {
    sql += ` AND p.status = ?`;
    params.push(status);
  }

  if (availability) {
    sql += ` AND p.availability = ?`;
    params.push(availability);
  }

  sql += ` ORDER BY p.sort_order ASC, p.created_at DESC`;

  const products = db.all<any>(sql, ...params);

  // Fetch options and primary images for these products
  const productIds = products.map((p) => p.id);
  let options: any[] = [];
  let images: any[] = [];

  if (productIds.length > 0) {
    const placeholders = productIds.map(() => '?').join(',');
    options = db.all<any>(
      `SELECT * FROM sellable_options WHERE product_id IN (${placeholders}) ORDER BY sort_order ASC`,
      ...productIds
    );
    images = db.all<any>(
      `SELECT pi.product_id, pi.alt_text, pi.is_primary, ia.storage_key, ia.mime_type
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

  const imageMap = new Map<string, any>();
  for (const img of images) {
    imageMap.set(img.product_id, img);
  }

  const result = products.map((p) => ({
    ...p,
    options: optionsMap.get(p.id) || [],
    primary_image: imageMap.get(p.id) || null
  }));

  return c.json({ data: result, total: result.length });
});

// 2. Get single product by id
adminProductRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = getDb();

  const product = db.get<any>(
    `SELECT p.*, c.name as category_name
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.id = ?`,
    id
  );

  if (!product) {
    return c.json({ error: 'Produk tidak ditemukan.' }, 404);
  }

  const options = db.all<any>(
    `SELECT * FROM sellable_options WHERE product_id = ? ORDER BY sort_order ASC`,
    id
  );

  const images = db.all<any>(
    `SELECT pi.*, ia.storage_key, ia.mime_type, ia.rights_status
     FROM product_images pi
     JOIN image_assets ia ON ia.id = pi.image_asset_id
     WHERE pi.product_id = ? ORDER BY pi.sort_order ASC`,
    id
  );

  const priceHistory = db.all<any>(
    `SELECT pc.*, so.unit_label, u.display_name as changed_by_name
     FROM price_changes pc
     JOIN sellable_options so ON so.id = pc.sellable_option_id
     LEFT JOIN admin_users u ON u.id = pc.changed_by
     WHERE so.product_id = ?
     ORDER BY pc.created_at DESC`,
    id
  );

  return c.json({
    data: {
      ...product,
      options,
      images,
      price_history: priceHistory
    }
  });
});

// 3. Create new product
adminProductRoutes.post('/', async (c) => {
  const adminUser = c.get('adminUser');
  const body = await c.req.json().catch(() => null);

  if (!body || !body.display_name) {
    return c.json({ error: 'Nama produk wajib diisi.' }, 400);
  }

  const db = getDb();
  const id = 'prod_' + crypto.randomBytes(12).toString('hex');
  const displayName = String(body.display_name).trim();
  const baseSlug = displayName
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-');
  const slug = baseSlug + '-' + crypto.randomBytes(4).toString('hex');

  const categoryId = body.category_id || null;
  const sku = body.sku ? String(body.sku).trim() : null;
  const description = body.description ? String(body.description).trim() : null;
  const status = ['draft', 'published', 'archived'].includes(body.status) ? body.status : 'draft';
  const availability = ['ask_admin', 'available', 'unavailable'].includes(body.availability)
    ? body.availability
    : 'ask_admin';

  db.run(
    `INSERT INTO products (
      id, display_name, slug, category_id, sku, description,
      status, availability, sort_order, version
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 999, 1)`,
    id,
    displayName,
    slug,
    categoryId,
    sku,
    description,
    status,
    availability
  );

  // If initial options provided
  if (Array.isArray(body.options)) {
    for (const opt of body.options) {
      if (opt.unit_label && opt.price_idr && Number(opt.price_idr) > 0) {
        const optId = 'opt_' + crypto.randomBytes(12).toString('hex');
        db.run(
          `INSERT INTO sellable_options (
            id, product_id, unit_label, price_idr, pack_quantity, active, sort_order
          ) VALUES (?, ?, ?, ?, ?, 1, ?)`,
          optId,
          id,
          String(opt.unit_label).trim(),
          Math.floor(Number(opt.price_idr)),
          opt.pack_quantity ? Math.floor(Number(opt.pack_quantity)) : null,
          opt.sort_order || 1
        );
      }
    }
  }

  return c.json({ success: true, id }, 201);
});

// 4. Update product details
adminProductRoutes.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => null);

  if (!body) return c.json({ error: 'Data tidak valid.' }, 400);

  const db = getDb();
  const existing = db.get<any>('SELECT * FROM products WHERE id = ?', id);
  if (!existing) return c.json({ error: 'Produk tidak ditemukan.' }, 404);

  const displayName = body.display_name !== undefined ? String(body.display_name).trim() : existing.display_name;
  const categoryId = body.category_id !== undefined ? body.category_id : existing.category_id;
  const sku = body.sku !== undefined ? (body.sku ? String(body.sku).trim() : null) : existing.sku;
  const description = body.description !== undefined ? body.description : existing.description;
  const status = ['draft', 'published', 'archived'].includes(body.status) ? body.status : existing.status;
  const availability = ['ask_admin', 'available', 'unavailable'].includes(body.availability)
    ? body.availability
    : existing.availability;
  const sortOrder = body.sort_order !== undefined ? Number(body.sort_order) : existing.sort_order;

  db.run(
    `UPDATE products
     SET display_name = ?, category_id = ?, sku = ?, description = ?,
         status = ?, availability = ?, sort_order = ?, version = version + 1,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    displayName,
    categoryId,
    sku,
    description,
    status,
    availability,
    sortOrder,
    id
  );

  return c.json({ success: true, message: 'Produk berhasil diperbarui.' });
});

// 5. Update sellable option with audit trail
adminProductRoutes.put('/:id/options/:optionId', async (c) => {
  const adminUser = c.get('adminUser');
  const productId = c.req.param('id');
  const optionId = c.req.param('optionId');
  const body = await c.req.json().catch(() => null);

  if (!body) return c.json({ error: 'Data tidak valid.' }, 400);

  const db = getDb();
  const existingOption = db.get<any>(
    'SELECT * FROM sellable_options WHERE id = ? AND product_id = ?',
    optionId,
    productId
  );

  if (!existingOption) {
    return c.json({ error: 'Opsi jual tidak ditemukan.' }, 404);
  }

  const newPrice = body.price_idr !== undefined ? Math.floor(Number(body.price_idr)) : existingOption.price_idr;
  const unitLabel = body.unit_label !== undefined ? String(body.unit_label).trim() : existingOption.unit_label;
  const packQuantity = body.pack_quantity !== undefined ? (body.pack_quantity ? Math.floor(Number(body.pack_quantity)) : null) : existingOption.pack_quantity;
  const active = body.active !== undefined ? (body.active ? 1 : 0) : existingOption.active;
  const reason = body.reason ? String(body.reason).trim() : null;

  if (newPrice <= 0) {
    return c.json({ error: 'Harga harus lebih besar dari 0.' }, 400);
  }

  // If price changed, record in price_changes table
  if (newPrice !== existingOption.price_idr) {
    const pcId = 'pc_' + crypto.randomBytes(12).toString('hex');
    db.run(
      `INSERT INTO price_changes (
        id, sellable_option_id, changed_by, old_price_idr, new_price_idr, reason
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      pcId,
      optionId,
      adminUser.id,
      existingOption.price_idr,
      newPrice,
      reason || 'Pembaruan manual melalui admin'
    );
  }

  db.run(
    `UPDATE sellable_options
     SET price_idr = ?, unit_label = ?, pack_quantity = ?, active = ?,
         version = version + 1, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    newPrice,
    unitLabel,
    packQuantity,
    active,
    optionId
  );

  return c.json({ success: true, message: 'Opsi berhasil diperbarui.' });
});

// 6. Add new sellable option
adminProductRoutes.post('/:id/options', async (c) => {
  const productId = c.req.param('id');
  const body = await c.req.json().catch(() => null);

  if (!body || !body.unit_label || !body.price_idr) {
    return c.json({ error: 'Label satuan dan harga wajib diisi.' }, 400);
  }

  const priceIdr = Math.floor(Number(body.price_idr));
  if (priceIdr <= 0) {
    return c.json({ error: 'Harga harus lebih besar dari 0.' }, 400);
  }

  const db = getDb();
  const product = db.get('SELECT id FROM products WHERE id = ?', productId);
  if (!product) return c.json({ error: 'Produk tidak ditemukan.' }, 404);

  const optId = 'opt_' + crypto.randomBytes(12).toString('hex');
  const packQuantity = body.pack_quantity ? Math.floor(Number(body.pack_quantity)) : null;

  db.run(
    `INSERT INTO sellable_options (
      id, product_id, unit_label, price_idr, pack_quantity, active, sort_order
    ) VALUES (?, ?, ?, ?, ?, 1, 2)`,
    optId,
    productId,
    String(body.unit_label).trim(),
    priceIdr,
    packQuantity
  );

  return c.json({ success: true, id: optId }, 201);
});
