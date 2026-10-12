import { Hono } from 'hono';
import crypto from 'node:crypto';
import { getDb } from '../../db/database.ts';

export const publicCheckoutRoutes = new Hono();

function formatRupiah(amount: number): string {
  return 'Rp' + amount.toLocaleString('id-ID');
}

export interface CartLineInput {
  product_id: string;
  sellable_option_id: string;
  qty: number;
  client_price_idr?: number;
}

// 1. Preview API: validates items against authoritative DB prices
publicCheckoutRoutes.post('/preview', async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || !Array.isArray(body.items) || body.items.length === 0) {
    return c.json({ error: 'Keranjang belanja kosong.' }, 400);
  }

  const db = getDb();
  const items: CartLineInput[] = body.items;

  let subtotalIdr = 0;
  let hasPriceChange = false;
  let hasUnavailableItem = false;
  const validatedLines: any[] = [];

  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    const qty = Math.max(1, Math.min(99999, Math.floor(Number(item.qty) || 1)));

    const option = db.get<any>(
      `SELECT so.id as option_id, so.product_id, so.unit_label, so.price_idr, so.active as option_active,
              p.display_name, p.status as product_status, p.availability
       FROM sellable_options so
       JOIN products p ON p.id = so.product_id
       WHERE so.id = ? AND so.product_id = ?`,
      item.sellable_option_id,
      item.product_id
    );

    if (!option || option.product_status !== 'published' || option.option_active !== 1) {
      return c.json(
        {
          error: `Produk atau satuan sudah tidak tersedia di katalog.`,
          invalid_item: { product_id: item.product_id, option_id: item.sellable_option_id }
        },
        400
      );
    }

    if (option.availability === 'unavailable') {
      hasUnavailableItem = true;
    }

    const unitPriceIdr = option.price_idr;
    const lineSubtotal = qty * unitPriceIdr;
    subtotalIdr += lineSubtotal;

    let priceChanged = false;
    if (item.client_price_idr !== undefined && item.client_price_idr !== unitPriceIdr) {
      hasPriceChange = true;
      priceChanged = true;
    }

    validatedLines.push({
      line_position: idx + 1,
      product_id: option.product_id,
      sellable_option_id: option.option_id,
      product_name: option.display_name,
      unit_label: option.unit_label,
      qty,
      unit_price_idr: unitPriceIdr,
      line_subtotal_idr: lineSubtotal,
      price_changed: priceChanged,
      old_price_idr: item.client_price_idr || unitPriceIdr,
      availability: option.availability
    });
  }

  return c.json({
    subtotal_idr: subtotalIdr,
    has_price_change: hasPriceChange,
    has_unavailable_item: hasUnavailableItem,
    lines: validatedLines
  });
});

// Rate limiting map for checkout intents: max 20 per minute per IP
const intentRateLimits = new Map<string, { count: number; resetAt: number }>();

// 2. Create Checkout Intent & Canonical WhatsApp message
publicCheckoutRoutes.post('/intent', async (c) => {
  const ip = c.req.header('x-forwarded-for') || 'local';
  const now = Date.now();

  const rl = intentRateLimits.get(ip) || { count: 0, resetAt: now + 60 * 1000 };
  if (now > rl.resetAt) {
    rl.count = 0;
    rl.resetAt = now + 60 * 1000;
  }
  rl.count += 1;
  intentRateLimits.set(ip, rl);

  if (rl.count > 20) {
    return c.json({ error: 'Terlalu banyak permintaan pemesanan. Silakan coba lagi sebentar lagi.' }, 429);
  }

  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: 'Permintaan checkout tidak valid.' }, 400);

  // Sanitize buyer name and business name against newline injection and HTML tags
  const buyerName = String(body.buyer_name || '').replace(/<[^>]*>/g, '').replace(/[\r\n]/g, ' ').replace(/[<>]/g, '').trim();
  const rawBiz = body.business_name ? String(body.business_name).replace(/<[^>]*>/g, '').replace(/[\r\n]/g, ' ').replace(/[<>]/g, '').trim() : '';
  const businessName = rawBiz ? rawBiz : null;
  const idempotencyKey = String(body.idempotency_key || '').trim();
  const items: CartLineInput[] = Array.isArray(body.items) ? body.items : [];

  if (buyerName.length < 2 || buyerName.length > 100) {
    return c.json({ error: 'Nama Pembeli wajib diisi (antara 2 hingga 100 karakter).' }, 400);
  }

  if (businessName && businessName.length > 120) {
    return c.json({ error: 'Nama Toko / Usaha maksimal 120 karakter.' }, 400);
  }

  if (!idempotencyKey) {
    return c.json({ error: 'Idempotency key wajib disertakan.' }, 400);
  }

  if (items.length === 0) {
    return c.json({ error: 'Keranjang belanja kosong.' }, 400);
  }

  const db = getDb();

  // Check existing intent by idempotency key (idempotency safety)
  const existingIntent = db.get<any>(
    'SELECT * FROM checkout_intents WHERE idempotency_key = ?',
    idempotencyKey
  );
  if (existingIntent) {
    const lines = db.all<any>(
      'SELECT * FROM checkout_intent_lines WHERE checkout_intent_id = ? ORDER BY line_position ASC',
      existingIntent.id
    );

    // Reconstruct WA URL
    const settingRow = db.get<any>("SELECT value_json FROM store_settings WHERE key = 'whatsapp_number'");
    let waNumber = '';
    if (settingRow) {
      try {
        waNumber = String(JSON.parse(settingRow.value_json)).replace(/\D/g, '');
      } catch {
        waNumber = String(settingRow.value_json).replace(/\D/g, '');
      }
    }
    const whatsappUrl = waNumber
      ? `https://wa.me/${waNumber}?text=${encodeURIComponent(existingIntent.message_snapshot)}`
      : null;

    return c.json({
      intent_id: existingIntent.id,
      public_ref: existingIntent.public_ref,
      buyer_name: existingIntent.buyer_name,
      business_name: existingIntent.business_name,
      subtotal_idr: existingIntent.subtotal_idr,
      message_snapshot: existingIntent.message_snapshot,
      whatsapp_url: whatsappUrl,
      whatsapp_number_configured: Boolean(waNumber),
      lines
    });
  }

  // Validate items and compute canonical pricing
  let subtotalIdr = 0;
  const lineDetails: any[] = [];

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const qty = Math.max(1, Math.min(99999, Math.floor(Number(it.qty) || 1)));

    const option = db.get<any>(
      `SELECT so.id as option_id, so.product_id, so.unit_label, so.price_idr, so.active as option_active,
              p.display_name, p.status as product_status, p.availability
       FROM sellable_options so
       JOIN products p ON p.id = so.product_id
       WHERE so.id = ? AND so.product_id = ?`,
      it.sellable_option_id,
      it.product_id
    );

    if (!option || option.product_status !== 'published' || option.option_active !== 1) {
      return c.json({ error: `Produk atau satuan sudah tidak aktif di katalog.` }, 400);
    }

    if (option.availability === 'unavailable') {
      return c.json(
        { error: `Produk "${option.display_name}" sedang tidak tersedia. Silakan hapus dari keranjang.` },
        400
      );
    }

    const unitPrice = option.price_idr;
    const lineTotal = qty * unitPrice;
    subtotalIdr += lineTotal;

    lineDetails.push({
      line_position: i + 1,
      product_id: option.product_id,
      sellable_option_id: option.option_id,
      product_name: option.display_name,
      unit_label: option.unit_label,
      qty,
      unit_price_idr: unitPrice,
      line_subtotal_idr: lineTotal
    });
  }

  // Generate public ref: TS-[8 chars]
  const publicRef = 'TS-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  const intentId = 'cint_' + crypto.randomBytes(12).toString('hex');

  // Format canonical WhatsApp message
  const linesText = lineDetails
    .map(
      (l) =>
        `${l.line_position}. ${l.product_name} - ${l.unit_label}\n   ${l.qty} x ${formatRupiah(l.unit_price_idr)} = ${formatRupiah(l.line_subtotal_idr)}`
    )
    .join('\n');

  let message = `Halo Admin Toko Timbang Sepakat, saya ingin memesan:\n\nReferensi: ${publicRef}\nNama Pembeli: ${buyerName}\n`;
  if (businessName) {
    message += `Nama Toko/Usaha: ${businessName}\n`;
  }
  message += `\n${linesText}\n\nSubtotal barang: ${formatRupiah(subtotalIdr)}\n`;
  message += `Ongkir: dikonfirmasi admin\n`;
  message += `Mohon konfirmasi ketersediaan produk, ongkir, total akhir, dan cara pembayaran. Terima kasih.`;

  // Fetch configured WhatsApp number from settings
  const settingRow = db.get<any>("SELECT value_json FROM store_settings WHERE key = 'whatsapp_number'");
  let waNumber = '';
  if (settingRow) {
    try {
      waNumber = String(JSON.parse(settingRow.value_json)).replace(/\D/g, '');
    } catch {
      waNumber = String(settingRow.value_json).replace(/\D/g, '');
    }
  }

  const whatsappUrl = waNumber ? `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}` : null;

  // Insert into DB inside transaction
  db.exec('BEGIN TRANSACTION;');
  try {
    db.run(
      `INSERT INTO checkout_intents (
        id, public_ref, idempotency_key, buyer_name, business_name,
        subtotal_idr, message_snapshot, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'created')`,
      intentId,
      publicRef,
      idempotencyKey,
      buyerName,
      businessName,
      subtotalIdr,
      message
    );

    for (const l of lineDetails) {
      const lineId = 'cline_' + crypto.randomBytes(12).toString('hex');
      db.run(
        `INSERT INTO checkout_intent_lines (
          id, checkout_intent_id, product_id, sellable_option_id, line_position,
          product_name_snapshot, unit_label_snapshot, qty, unit_price_idr, line_subtotal_idr
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        lineId,
        intentId,
        l.product_id,
        l.sellable_option_id,
        l.line_position,
        l.product_name,
        l.unit_label,
        l.qty,
        l.unit_price_idr,
        l.line_subtotal_idr
      );
    }

    db.exec('COMMIT;');
  } catch (err: any) {
    db.exec('ROLLBACK;');
    return c.json({ error: `Gagal membuat checkout intent: ${err.message}` }, 500);
  }

  return c.json(
    {
      intent_id: intentId,
      public_ref: publicRef,
      buyer_name: buyerName,
      business_name: businessName,
      subtotal_idr: subtotalIdr,
      message_snapshot: message,
      whatsapp_url: whatsappUrl,
      whatsapp_number_configured: Boolean(waNumber),
      lines: lineDetails
    },
    201
  );
});
