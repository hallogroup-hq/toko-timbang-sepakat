import { Hono } from 'hono';
import crypto from 'node:crypto';
import { getDb } from '../../db/database.ts';
import { adminAuthMiddleware, AdminUserSession } from '../../middleware/auth.ts';

export const adminPricingRoutes = new Hono<{
  Variables: {
    adminUser: AdminUserSession;
  };
}>();

adminPricingRoutes.use('*', adminAuthMiddleware);

// 1. Get all sellable options for spreadsheet view
adminPricingRoutes.get('/', async (c) => {
  const db = getDb();
  const q = c.req.query('q')?.trim() || '';

  let sql = `
    SELECT so.id as option_id, so.unit_label, so.price_idr, so.pack_quantity, so.active as option_active,
           so.source_price_column, so.updated_at as option_updated_at,
           p.id as product_id, p.display_name as product_name, p.source_key, p.sku, p.status as product_status,
           c.name as category_name
    FROM sellable_options so
    JOIN products p ON p.id = so.product_id
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.status != 'archived'
  `;
  const params: any[] = [];

  if (q) {
    sql += ` AND (p.display_name LIKE ? OR p.source_key LIKE ? OR so.unit_label LIKE ?)`;
    const searchPattern = `%${q}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  sql += ` ORDER BY p.sort_order ASC, so.sort_order ASC`;

  const rows = db.all<any>(sql, ...params);
  return c.json({ data: rows, total: rows.length });
});

// 1b. Matrix view: grouped by product with carton & pcs options
adminPricingRoutes.get('/matrix', async (c) => {
  const db = getDb();
  const q = c.req.query('q')?.trim() || '';

  let sql = `
    SELECT p.id as product_id, p.display_name as product_name, p.source_key, p.sku,
           c.name as category_name
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.status != 'archived'
  `;
  const params: any[] = [];
  if (q) {
    sql += ` AND (p.display_name LIKE ? OR p.source_key LIKE ? OR p.sku LIKE ?)`;
    const searchPattern = `%${q}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }
  sql += ` ORDER BY p.sort_order ASC, p.display_name ASC`;

  const products = db.all<any>(sql, ...params);
  const options = db.all<any>(
    `SELECT id, product_id, unit_label, price_idr, pack_quantity, source_price_column, active
     FROM sellable_options`
  );

  const optionsByProduct = new Map<string, { karton: any | null; pcs: any | null }>();
  for (const opt of options) {
    const group = optionsByProduct.get(opt.product_id) || { karton: null, pcs: null };
    if (opt.source_price_column === 'karton_pack' || opt.unit_label.toLowerCase().includes('karton') || opt.unit_label.toLowerCase().includes('pack')) {
      group.karton = opt;
    } else {
      group.pcs = opt;
    }
    optionsByProduct.set(opt.product_id, group);
  }

  const matrix = products.map((p) => {
    const group = optionsByProduct.get(p.product_id) || { karton: null, pcs: null };
    return {
      product_id: p.product_id,
      product_name: p.product_name,
      source_key: p.source_key,
      sku: p.sku,
      category_name: p.category_name,
      karton_option: group.karton,
      pcs_option: group.pcs
    };
  });

  return c.json({ data: matrix, total: matrix.length });
});

// 2. Batch price update with transaction and audit trail
adminPricingRoutes.put('/batch', async (c) => {
  const adminUser = c.get('adminUser');
  const body = await c.req.json().catch(() => null);

  if (!body || !Array.isArray(body.updates) || body.updates.length === 0) {
    return c.json({ error: 'Daftar pembaruan harga tidak valid.' }, 400);
  }

  const db = getDb();
  const updates: Array<{
    option_id?: string;
    product_id?: string;
    unit_type?: 'karton_pack' | 'pcs';
    new_price_idr: number;
    reason?: string;
  }> = body.updates;

  // Validate all updates first
  for (const item of updates) {
    if ((!item.option_id && (!item.product_id || !item.unit_type)) || !item.new_price_idr || item.new_price_idr <= 0) {
      return c.json({ error: `Harga yang dimasukkan tidak valid (harus berupa angka positif > 0).` }, 400);
    }
  }

  let updatedCount = 0;

  // Execute in transaction
  db.exec('BEGIN TRANSACTION;');
  try {
    for (const item of updates) {
      let optionId = item.option_id;
      let currentPrice = 0;

      if (!optionId && item.product_id && item.unit_type) {
        // Look up or create option for this product and unit_type
        const existing = db.get<any>(
          'SELECT id, price_idr FROM sellable_options WHERE product_id = ? AND source_price_column = ?',
          item.product_id,
          item.unit_type
        );
        if (existing) {
          optionId = existing.id;
          currentPrice = existing.price_idr;
        } else {
          // Create new option
          optionId = 'opt_' + crypto.randomBytes(12).toString('hex');
          const unitLabel = item.unit_type === 'karton_pack' ? 'Karton / Pack' : 'Pcs';
          const sortOrder = item.unit_type === 'karton_pack' ? 1 : 2;
          db.run(
            `INSERT INTO sellable_options (
              id, product_id, unit_label, price_idr, source_price_column, active, sort_order
            ) VALUES (?, ?, ?, ?, ?, 1, ?)`,
            optionId,
            item.product_id,
            unitLabel,
            Math.floor(Number(item.new_price_idr)),
            item.unit_type,
            sortOrder
          );
          currentPrice = 0;
        }
      } else if (optionId) {
        const current = db.get<any>(
          'SELECT id, price_idr FROM sellable_options WHERE id = ?',
          optionId
        );
        if (current) currentPrice = current.price_idr;
      }

      if (!optionId) continue;

      const newPrice = Math.floor(Number(item.new_price_idr));
      if (newPrice !== currentPrice) {
        const pcId = 'pc_' + crypto.randomBytes(12).toString('hex');
        db.run(
          `INSERT INTO price_changes (
            id, sellable_option_id, changed_by, old_price_idr, new_price_idr, reason
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          pcId,
          optionId,
          adminUser.id,
          currentPrice,
          newPrice,
          item.reason ? String(item.reason).trim() : 'Pembaruan harga operasional'
        );

        db.run(
          `UPDATE sellable_options
           SET price_idr = ?, version = version + 1, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          newPrice,
          optionId
        );

        updatedCount++;
      }
    }
    db.exec('COMMIT;');
  } catch (err: any) {
    db.exec('ROLLBACK;');
    return c.json({ error: `Gagal memperbarui harga: ${err.message}` }, 500);
  }

  return c.json({ success: true, updated_count: updatedCount });
});

// 3. Price change history
adminPricingRoutes.get('/history', async (c) => {
  const db = getDb();
  const limit = Math.min(Number(c.req.query('limit')) || 50, 200);

  const history = db.all<any>(
    `SELECT pc.*, so.unit_label, p.display_name as product_name, p.source_key,
            u.display_name as changed_by_name, u.email as changed_by_email
     FROM price_changes pc
     JOIN sellable_options so ON so.id = pc.sellable_option_id
     JOIN products p ON p.id = so.product_id
     LEFT JOIN admin_users u ON u.id = pc.changed_by
     ORDER BY pc.created_at DESC
     LIMIT ?`,
    limit
  );

  return c.json({ data: history });
});
