import { Hono } from 'hono';
import crypto from 'node:crypto';
import { getDb } from '../../db/database.ts';
import { adminAuthMiddleware, AdminUserSession } from '../../middleware/auth.ts';

export const adminOrderRoutes = new Hono<{
  Variables: {
    adminUser: AdminUserSession;
  };
}>();

adminOrderRoutes.use('*', adminAuthMiddleware);

// 1. Get operational metrics (Revenue only from confirmed/paid/completed orders, NEVER from checkout intents!)
adminOrderRoutes.get('/metrics', async (c) => {
  const db = getDb();

  const published = db.get<{ count: number }>(
    "SELECT count(*) as count FROM products WHERE status = 'published'"
  );
  const unavailable = db.get<{ count: number }>(
    "SELECT count(*) as count FROM products WHERE availability = 'unavailable'"
  );
  const pendingIntents = db.get<{ count: number }>(
    "SELECT count(*) as count FROM checkout_intents WHERE status = 'created'"
  );
  const confirmedOrders = db.get<{ count: number }>(
    "SELECT count(*) as count FROM orders WHERE status != 'cancelled'"
  );
  const paidRevenue = db.get<{ revenue: number }>(
    "SELECT COALESCE(SUM(COALESCE(total_idr, subtotal_idr)), 0) as revenue FROM orders WHERE status IN ('paid', 'completed')"
  );

  return c.json({
    metrics: {
      total_published_products: published?.count || 0,
      total_unavailable_products: unavailable?.count || 0,
      pending_checkout_requests: pendingIntents?.count || 0,
      confirmed_orders_count: confirmedOrders?.count || 0,
      verified_revenue_idr: paidRevenue?.revenue || 0,
      revenue_basis: 'Hanya mencakup pesanan berstatus paid atau completed. Percobaan checkout dan klik WhatsApp TIDAK dihitung sebagai omzet.'
    }
  });
});

// 2. List Checkout Requests (Intents)
adminOrderRoutes.get('/intents', async (c) => {
  const db = getDb();
  const status = c.req.query('status') || '';

  let sql = 'SELECT * FROM checkout_intents WHERE 1=1';
  const params: any[] = [];
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  sql += ' ORDER BY created_at DESC LIMIT 100';

  const intents = db.all<any>(sql, ...params);
  return c.json({ data: intents });
});

// 3. Get single intent with lines
adminOrderRoutes.get('/intents/:id', async (c) => {
  const id = c.req.param('id');
  const db = getDb();

  const intent = db.get<any>('SELECT * FROM checkout_intents WHERE id = ?', id);
  if (!intent) return c.json({ error: 'Permintaan checkout tidak ditemukan.' }, 404);

  const lines = db.all<any>(
    'SELECT * FROM checkout_intent_lines WHERE checkout_intent_id = ? ORDER BY line_position ASC',
    id
  );

  return c.json({ data: { ...intent, lines } });
});

// 4. Convert Intent into Confirmed Order
adminOrderRoutes.post('/from-intent/:intentId', async (c) => {
  const adminUser = c.get('adminUser');
  const intentId = c.req.param('intentId');
  const db = getDb();

  const intent = db.get<any>('SELECT * FROM checkout_intents WHERE id = ?', intentId);
  if (!intent) return c.json({ error: 'Permintaan checkout tidak ditemukan.' }, 404);
  if (intent.status === 'converted') {
    return c.json({ error: 'Permintaan checkout ini telah dikonversi sebelumnya.' }, 400);
  }

  const intentLines = db.all<any>(
    'SELECT * FROM checkout_intent_lines WHERE checkout_intent_id = ? ORDER BY line_position ASC',
    intentId
  );

  const orderId = 'ord_' + crypto.randomBytes(12).toString('hex');
  const publicRef = 'ORD-' + crypto.randomBytes(4).toString('hex').toUpperCase();

  db.exec('BEGIN TRANSACTION;');
  try {
    db.run(
      `INSERT INTO orders (
        id, public_ref, checkout_intent_id, buyer_name, business_name,
        status, subtotal_idr, shipping_fee_idr, total_idr, admin_note,
        created_by, version
      ) VALUES (?, ?, ?, ?, ?, 'confirmed', ?, null, null, null, ?, 1)`,
      orderId,
      publicRef,
      intentId,
      intent.buyer_name,
      intent.business_name,
      intent.subtotal_idr,
      adminUser.id
    );

    for (const line of intentLines) {
      const orderLineId = 'oline_' + crypto.randomBytes(12).toString('hex');
      db.run(
        `INSERT INTO order_lines (
          id, order_id, product_id, sellable_option_id, line_position,
          product_name_snapshot, unit_label_snapshot, qty, unit_price_idr, line_subtotal_idr
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        orderLineId,
        orderId,
        line.product_id,
        line.sellable_option_id,
        line.line_position,
        line.product_name_snapshot,
        line.unit_label_snapshot,
        line.qty,
        line.unit_price_idr,
        line.line_subtotal_idr
      );
    }

    // Mark intent as converted
    db.run("UPDATE checkout_intents SET status = 'converted', updated_at = CURRENT_TIMESTAMP WHERE id = ?", intentId);

    // Record order event
    const eventId = 'oevt_' + crypto.randomBytes(12).toString('hex');
    db.run(
      `INSERT INTO order_events (
        id, order_id, actor_admin_user_id, event_type, reason
      ) VALUES (?, ?, ?, 'convert_from_intent', ?)`,
      eventId,
      orderId,
      adminUser.id,
      `Dikonversi dari checkout intent ${intent.public_ref}`
    );

    db.exec('COMMIT;');
  } catch (err: any) {
    db.exec('ROLLBACK;');
    return c.json({ error: `Gagal mengonversi pesanan: ${err.message}` }, 500);
  }

  return c.json({ success: true, order_id: orderId, public_ref: publicRef }, 201);
});

// 5. List Confirmed Orders
adminOrderRoutes.get('/orders', async (c) => {
  const db = getDb();
  const status = c.req.query('status') || '';

  let sql = `
    SELECT o.*, u.display_name as created_by_name
    FROM orders o
    LEFT JOIN admin_users u ON u.id = o.created_by
    WHERE 1=1
  `;
  const params: any[] = [];
  if (status) {
    sql += ' AND o.status = ?';
    params.push(status);
  }
  sql += ' ORDER BY o.created_at DESC LIMIT 100';

  const orders = db.all<any>(sql, ...params);
  return c.json({ data: orders });
});

// 6. Get single Order with lines & events
adminOrderRoutes.get('/orders/:id', async (c) => {
  const id = c.req.param('id');
  const db = getDb();

  const order = db.get<any>(
    `SELECT o.*, u.display_name as created_by_name
     FROM orders o
     LEFT JOIN admin_users u ON u.id = o.created_by
     WHERE o.id = ?`,
    id
  );
  if (!order) return c.json({ error: 'Pesanan tidak ditemukan.' }, 404);

  const lines = db.all<any>(
    'SELECT * FROM order_lines WHERE order_id = ? ORDER BY line_position ASC',
    id
  );

  const events = db.all<any>(
    `SELECT oe.*, u.display_name as actor_name
     FROM order_events oe
     LEFT JOIN admin_users u ON u.id = oe.actor_admin_user_id
     WHERE oe.order_id = ? ORDER BY oe.created_at DESC`,
    id
  );

  return c.json({ data: { ...order, lines, events } });
});

// 7. Update order status, shipping, or notes
adminOrderRoutes.put('/orders/:id/status', async (c) => {
  const adminUser = c.get('adminUser');
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => null);

  if (!body) return c.json({ error: 'Data tidak valid.' }, 400);

  const db = getDb();
  const existing = db.get<any>('SELECT * FROM orders WHERE id = ?', id);
  if (!existing) return c.json({ error: 'Pesanan tidak ditemukan.' }, 404);

  const validStatuses = ['confirmed', 'awaiting_payment', 'paid', 'preparing', 'completed', 'cancelled'];
  const newStatus = body.status && validStatuses.includes(body.status) ? body.status : existing.status;
  const adminNote = body.admin_note !== undefined ? body.admin_note : existing.admin_note;

  let shippingFee = existing.shipping_fee_idr;
  let totalIdr = existing.total_idr;

  if (body.shipping_fee_idr !== undefined) {
    if (body.shipping_fee_idr === null) {
      shippingFee = null;
      totalIdr = null;
    } else {
      shippingFee = Math.max(0, Math.floor(Number(body.shipping_fee_idr)));
      totalIdr = existing.subtotal_idr + shippingFee;
    }
  }

  db.exec('BEGIN TRANSACTION;');
  try {
    db.run(
      `UPDATE orders
       SET status = ?, shipping_fee_idr = ?, total_idr = ?, admin_note = ?,
           version = version + 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      newStatus,
      shippingFee,
      totalIdr,
      adminNote,
      id
    );

    const eventId = 'oevt_' + crypto.randomBytes(12).toString('hex');
    db.run(
      `INSERT INTO order_events (
        id, order_id, actor_admin_user_id, event_type, previous_json, next_json, reason
      ) VALUES (?, ?, ?, 'status_update', ?, ?, ?)`,
      eventId,
      id,
      adminUser.id,
      JSON.stringify({ status: existing.status, shipping_fee: existing.shipping_fee_idr }),
      JSON.stringify({ status: newStatus, shipping_fee: shippingFee }),
      body.reason || 'Pembaruan status operasional'
    );

    db.exec('COMMIT;');
  } catch (err: any) {
    db.exec('ROLLBACK;');
    return c.json({ error: `Gagal memperbarui pesanan: ${err.message}` }, 500);
  }

  return c.json({ success: true, message: 'Pesanan berhasil diperbarui.' });
});
