import { Hono } from 'hono';
import crypto from 'node:crypto';
import { getDb } from '../../db/database.ts';
import { adminAuthMiddleware, AdminUserSession } from '../../middleware/auth.ts';

export const adminImportRoutes = new Hono<{
  Variables: {
    adminUser: AdminUserSession;
  };
}>();

adminImportRoutes.use('*', adminAuthMiddleware);

function parseCsvText(content: string): Array<Record<string, string>> {
  const cleaned = content.replace(/^\uFEFF/, '');
  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const headers = parseLine(lines[0]);
  const rows: Array<Record<string, string>> = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (values.length === 0) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = (values[idx] || '').trim();
    });
    rows.push(row);
  }
  return rows;
}

function parseLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// 1. Preview CSV Import
adminImportRoutes.post('/preview', async (c) => {
  const adminUser = c.get('adminUser');
  const body = await c.req.json().catch(() => null);

  if (!body || !body.csv_content) {
    return c.json({ error: 'Konten CSV wajib diunggah.' }, 400);
  }

  const csvContent = String(body.csv_content);
  const filename = String(body.filename || 'import.csv').trim();
  const sha256 = crypto.createHash('sha256').update(csvContent).digest('hex');

  const rows = parseCsvText(csvContent);
  if (rows.length === 0) {
    return c.json({ error: 'File CSV kosong atau format tidak sesuai.' }, 400);
  }

  const db = getDb();
  const batchId = 'batch_' + crypto.randomBytes(12).toString('hex');

  let createCount = 0;
  let updateCount = 0;
  let unchangedCount = 0;
  let invalidCount = 0;
  let conflictCount = 0;

  const analyzedRows: any[] = [];

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    const rowNum = idx + 1;
    const sourceKey = row.source_key || row['Source Key'] || '';
    const name = row.nama_produk_asli || row.nama_produk || row['Nama Produk'] || '';
    const sku = row.sku || row.SKU || '';
    const priceKartonRaw = row.harga_karton_pack_idr || row.harga_karton || '';
    const pricePcsRaw = row.harga_pcs_idr || row.harga_pcs || '';

    if (!name && !sourceKey) {
      invalidCount++;
      analyzedRows.push({
        row_number: rowNum,
        source_key: sourceKey,
        action: 'invalid',
        errors: ['Nama produk tidak boleh kosong'],
        before: null,
        after: row
      });
      continue;
    }

    // Match product by source_key first, then sku
    let existingProduct: any = null;
    if (sourceKey) {
      existingProduct = db.get('SELECT * FROM products WHERE source_key = ?', sourceKey);
    } else if (sku) {
      existingProduct = db.get('SELECT * FROM products WHERE sku = ?', sku);
    }

    if (!existingProduct) {
      createCount++;
      analyzedRows.push({
        row_number: rowNum,
        source_key: sourceKey,
        action: 'create',
        errors: [],
        before: null,
        after: row
      });
    } else {
      // Check options
      const existingOptions = db.all<any>(
        'SELECT * FROM sellable_options WHERE product_id = ?',
        existingProduct.id
      );

      const kartonOpt = existingOptions.find((o) => o.source_price_column === 'karton_pack');
      const pcsOpt = existingOptions.find((o) => o.source_price_column === 'pcs');

      let hasPriceDiff = false;
      const parsedKarton = priceKartonRaw ? parseInt(priceKartonRaw.replace(/[^\d]/g, ''), 10) : null;
      const parsedPcs = pricePcsRaw ? parseInt(pricePcsRaw.replace(/[^\d]/g, ''), 10) : null;

      if (parsedKarton !== null && (!kartonOpt || kartonOpt.price_idr !== parsedKarton)) {
        hasPriceDiff = true;
      }
      if (parsedPcs !== null && (!pcsOpt || pcsOpt.price_idr !== parsedPcs)) {
        hasPriceDiff = true;
      }

      if (hasPriceDiff) {
        updateCount++;
        analyzedRows.push({
          row_number: rowNum,
          source_key: sourceKey,
          action: 'update',
          errors: [],
          before: {
            display_name: existingProduct.display_name,
            karton_price: kartonOpt?.price_idr || null,
            pcs_price: pcsOpt?.price_idr || null
          },
          after: {
            display_name: name || existingProduct.display_name,
            karton_price: parsedKarton,
            pcs_price: parsedPcs
          }
        });
      } else {
        unchangedCount++;
        analyzedRows.push({
          row_number: rowNum,
          source_key: sourceKey,
          action: 'unchanged',
          errors: [],
          before: {
            display_name: existingProduct.display_name,
            karton_price: kartonOpt?.price_idr || null,
            pcs_price: pcsOpt?.price_idr || null
          },
          after: row
        });
      }
    }
  }

  const summary = {
    total_rows: rows.length,
    create: createCount,
    update: updateCount,
    unchanged: unchangedCount,
    invalid: invalidCount,
    conflict: conflictCount
  };

  db.run(
    `INSERT INTO import_batches (
      id, created_by, source_filename, source_sha256, status, row_count, summary_json
    ) VALUES (?, ?, ?, ?, 'preview', ?, ?)`,
    batchId,
    adminUser.id,
    filename,
    sha256,
    rows.length,
    JSON.stringify(summary)
  );

  for (const item of analyzedRows) {
    const rowId = 'improw_' + crypto.randomBytes(12).toString('hex');
    db.run(
      `INSERT INTO import_rows (
        id, import_batch_id, source_row_number, source_key, action, before_json, after_json, errors_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      rowId,
      batchId,
      item.row_number,
      item.source_key || null,
      item.action,
      item.before ? JSON.stringify(item.before) : null,
      item.after ? JSON.stringify(item.after) : null,
      item.errors ? JSON.stringify(item.errors) : null
    );
  }

  return c.json({
    batch_id: batchId,
    summary,
    sample_rows: analyzedRows.slice(0, 50)
  });
});

// 2. Commit Previewed Import Batch
adminImportRoutes.post('/commit/:batchId', async (c) => {
  const adminUser = c.get('adminUser');
  const batchId = c.req.param('batchId');
  const db = getDb();

  const batch = db.get<any>('SELECT * FROM import_batches WHERE id = ?', batchId);
  if (!batch) return c.json({ error: 'Batch impor tidak ditemukan.' }, 404);
  if (batch.status !== 'preview') {
    return c.json({ error: `Batch telah berstatus: ${batch.status}. Tidak dapat dikomit ulang.` }, 400);
  }

  const importRows = db.all<any>(
    'SELECT * FROM import_rows WHERE import_batch_id = ? ORDER BY source_row_number ASC',
    batchId
  );

  let committedUpdates = 0;
  let committedCreates = 0;

  db.exec('BEGIN TRANSACTION;');
  try {
    for (const r of importRows) {
      if (r.action === 'update' && r.after_json) {
        const after = JSON.parse(r.after_json);
        const sourceKey = r.source_key;
        if (!sourceKey) continue;

        const prod = db.get<any>('SELECT id FROM products WHERE source_key = ?', sourceKey);
        if (!prod) continue;

        // Update Karton option
        if (after.karton_price !== undefined && after.karton_price !== null) {
          const opt = db.get<any>(
            "SELECT * FROM sellable_options WHERE product_id = ? AND source_price_column = 'karton_pack'",
            prod.id
          );
          if (opt && opt.price_idr !== after.karton_price) {
            const pcId = 'pc_' + crypto.randomBytes(12).toString('hex');
            db.run(
              `INSERT INTO price_changes (
                id, sellable_option_id, changed_by, import_batch_id, old_price_idr, new_price_idr, reason
              ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
              pcId,
              opt.id,
              adminUser.id,
              batchId,
              opt.price_idr,
              after.karton_price,
              `Impor berkas ${batch.source_filename}`
            );
            db.run(
              'UPDATE sellable_options SET price_idr = ?, version = version + 1 WHERE id = ?',
              after.karton_price,
              opt.id
            );
            committedUpdates++;
          }
        }

        // Update Pcs option
        if (after.pcs_price !== undefined && after.pcs_price !== null) {
          const opt = db.get<any>(
            "SELECT * FROM sellable_options WHERE product_id = ? AND source_price_column = 'pcs'",
            prod.id
          );
          if (opt && opt.price_idr !== after.pcs_price) {
            const pcId = 'pc_' + crypto.randomBytes(12).toString('hex');
            db.run(
              `INSERT INTO price_changes (
                id, sellable_option_id, changed_by, import_batch_id, old_price_idr, new_price_idr, reason
              ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
              pcId,
              opt.id,
              adminUser.id,
              batchId,
              opt.price_idr,
              after.pcs_price,
              `Impor berkas ${batch.source_filename}`
            );
            db.run(
              'UPDATE sellable_options SET price_idr = ?, version = version + 1 WHERE id = ?',
              after.pcs_price,
              opt.id
            );
            committedUpdates++;
          }
        }
      }
    }

    db.run(
      "UPDATE import_batches SET status = 'committed', committed_at = CURRENT_TIMESTAMP WHERE id = ?",
      batchId
    );
    db.exec('COMMIT;');
  } catch (err: any) {
    db.exec('ROLLBACK;');
    return c.json({ error: `Gagal mengomit impor: ${err.message}` }, 500);
  }

  return c.json({
    success: true,
    message: 'Impor berhasil dikomit.',
    committed_updates: committedUpdates,
    committed_creates: committedCreates
  });
});

// 3. List Import Batches
adminImportRoutes.get('/batches', async (c) => {
  const db = getDb();
  const batches = db.all<any>(
    `SELECT b.*, u.display_name as created_by_name
     FROM import_batches b
     LEFT JOIN admin_users u ON u.id = b.created_by
     ORDER BY b.created_at DESC
     LIMIT 50`
  );
  return c.json({ data: batches });
});
