import fs from 'node:fs';
import path from 'node:path';
import { getDb } from './database.ts';
import { hashPassword } from '../lib/auth.ts';

interface CsvRow {
  source_key: string;
  source_row: string;
  nama_produk_asli: string;
  harga_karton_pack_idr: string;
  harga_pcs_idr: string;
  status_satuan_karton_pack: string;
  sku: string;
  kategori: string;
  foto_status: string;
  catatan_review: string;
}

function parseCsv(content: string): CsvRow[] {
  // Handle UTF-8 BOM
  const cleaned = content.replace(/^\uFEFF/, '');
  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines[0]);
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.length < headers.length) continue;
    const row: any = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = (values[idx] || '').trim();
    });
    rows.push(row as CsvRow);
  }

  return rows;
}

function parseCsvLine(line: string): string[] {
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

function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function seedDatabase(customDbPath?: string) {
  const db = getDb(customDbPath);

  // 1. Seed Categories
  const categories = [
    { id: 'cat_dairy', slug: 'dairy-susu', name: 'Dairy & Susu', sort_order: 1 },
    { id: 'cat_syrup', slug: 'sirup-perisa', name: 'Sirup & Perisa', sort_order: 2 },
    { id: 'cat_powder', slug: 'bubuk-teh-kopi', name: 'Bubuk, Teh & Kopi', sort_order: 3 },
    { id: 'cat_beverage', slug: 'minuman-jus', name: 'Minuman & Air Mineral', sort_order: 4 },
    { id: 'cat_packaging', slug: 'kemasan-takeaway', name: 'Kemasan & Perlengkapan', sort_order: 5 },
    { id: 'cat_food', slug: 'makanan-frozen', name: 'Bahan Makanan & Frozen', sort_order: 6 },
    { id: 'cat_topping', slug: 'topping-pemanis', name: 'Topping, Gula & Selai', sort_order: 7 }
  ];

  for (const cat of categories) {
    const exists = db.get('SELECT id FROM categories WHERE id = ?', cat.id);
    if (!exists) {
      db.run(
        'INSERT INTO categories (id, slug, name, sort_order, active) VALUES (?, ?, ?, ?, 1)',
        cat.id,
        cat.slug,
        cat.name,
        cat.sort_order
      );
    }
  }

  // 2. Seed Default Admin User if not exists
  const adminExists = db.get('SELECT id FROM admin_users WHERE email = ?', 'admin@tokotimbangsepakat.com');
  let adminId = 'admin_001';
  if (!adminExists) {
    const initialPassword = process.env.ADMIN_INITIAL_PASSWORD || 'AdminTokoSepakat2026!';
    const passwordHash = hashPassword(initialPassword);
    db.run(
      `INSERT INTO admin_users (id, email, display_name, password_hash, role, active)
       VALUES (?, ?, ?, ?, 'owner', 1)`,
      adminId,
      'admin@tokotimbangsepakat.com',
      'Owner Toko Timbang Sepakat',
      passwordHash
    );
    console.log('Seeded initial admin user: admin@tokotimbangsepakat.com');
  } else {
    adminId = (adminExists as any).id;
  }

  // 3. Seed Store Settings if not exists
  const settingsKeys = [
    { key: 'store_name', value: 'Toko Timbang Sepakat' },
    { key: 'whatsapp_number', value: '6287749415861' }, // Official store WhatsApp
    { key: 'business_info', value: 'Penyedia bahan baku terpercaya untuk coffee shop, kafe, dan F&B.' }
  ];

  for (const s of settingsKeys) {
    const settingExists = db.get('SELECT key FROM store_settings WHERE key = ?', s.key);
    if (!settingExists) {
      db.run(
        'INSERT INTO store_settings (key, value_json, updated_by) VALUES (?, ?, ?)',
        s.key,
        JSON.stringify(s.value),
        adminId
      );
    }
  }

  // 4. Parse CSV File
  const csvPath = path.resolve(process.cwd(), 'TTS_Katalog_Awal_94_Produk.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCsv(csvContent);

  if (rows.length !== 94) {
    throw new Error(`Expected exactly 94 rows from CSV, found ${rows.length}`);
  }

  // Helper for category classification
  function classifyCategory(name: string): string {
    const n = name.toLowerCase();
    if (
      n.includes('greenfield') ||
      n.includes('milk') ||
      n.includes('uht') ||
      n.includes('susu') ||
      n.includes('creamer') ||
      n.includes('tiga sapi') ||
      n.includes('dairy champ') ||
      n.includes('milac') ||
      n.includes('whip cream') ||
      n.includes('dc skm') ||
      n.includes('oatside')
    ) {
      return 'cat_dairy';
    }
    if (n.includes('trieste') || n.includes('marjan') || n.includes('davinci') || n.includes('sanquick')) {
      return 'cat_syrup';
    }
    if (
      n.includes('matcha') ||
      n.includes('dilico') ||
      n.includes('thai tea') ||
      n.includes('pondan') ||
      n.includes('van houten') ||
      n.includes('lipton')
    ) {
      return 'cat_powder';
    }
    if (
      n.includes('equil') ||
      n.includes('cleo') ||
      n.includes('jungle juice') ||
      n.includes('sprite') ||
      n.includes('amidis') ||
      n.includes('le minerale') ||
      n.includes('diamond cranberry') ||
      n.includes('diamond apple') ||
      n.includes('diamond mango')
    ) {
      return 'cat_beverage';
    }
    if (
      n.includes('cup seal') ||
      n.includes('paper wrap') ||
      n.includes('filter v60') ||
      n.includes('plastik') ||
      n.includes('lunch box') ||
      n.includes('straw') ||
      n.includes('trash bag') ||
      n.includes('tissue')
    ) {
      return 'cat_packaging';
    }
    if (
      n.includes('cilok') ||
      n.includes('batagor') ||
      n.includes('dimsum') ||
      n.includes('lumpia') ||
      n.includes('kanzler') ||
      n.includes('kentang') ||
      n.includes('beras') ||
      n.includes('telor')
    ) {
      return 'cat_food';
    }
    return 'cat_topping'; // Gula, selai, buah kaleng, biskuit, etc.
  }

  let productsInserted = 0;
  let optionsInserted = 0;
  let productsExisting = 0;
  let optionsExisting = 0;

  const usedSlugs = new Set<string>();

  for (const r of rows) {
    const sourceKey = r.source_key;
    const sourceRow = parseInt(r.source_row, 10);
    const sourceName = r.nama_produk_asli;
    const productId = `prod_${sourceKey.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

    let baseSlug = createSlug(sourceName);
    if (!baseSlug) baseSlug = `product-${sourceRow}`;
    let uniqueSlug = baseSlug;
    let counter = 1;
    while (usedSlugs.has(uniqueSlug)) {
      counter++;
      uniqueSlug = `${baseSlug}-${counter}`;
    }
    usedSlugs.add(uniqueSlug);

    const categoryId = classifyCategory(sourceName);

    // Check if product already exists (Idempotence)
    const existingProduct = db.get('SELECT id FROM products WHERE source_key = ?', sourceKey);
    if (!existingProduct) {
      db.run(
        `INSERT INTO products (
          id, source_key, source_row, source_name, source_data_json,
          sku, brand, display_name, slug, category_id,
          description, status, availability, sort_order, version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', 'ask_admin', ?, 1)`,
        productId,
        sourceKey,
        sourceRow,
        sourceName,
        JSON.stringify(r),
        r.sku || null,
        null,
        sourceName,
        uniqueSlug,
        categoryId,
        null,
        sourceRow
      );
      productsInserted++;
    } else {
      productsExisting++;
    }

    const actualProductId = existingProduct ? (existingProduct as any).id : productId;

    // Sellable options
    // 1. Karton / Pack
    const kartonPriceRaw = r.harga_karton_pack_idr.trim();
    if (kartonPriceRaw) {
      const kartonPrice = parseInt(kartonPriceRaw, 10);
      if (isNaN(kartonPrice) || kartonPrice <= 0) {
        throw new Error(`Invalid Karton/Pack price for ${sourceKey}: ${kartonPriceRaw}`);
      }
      const optId = `opt_${sourceKey.toLowerCase().replace(/[^a-z0-9]/g, '_')}_kp`;
      const existingOption = db.get(
        'SELECT id FROM sellable_options WHERE product_id = ? AND source_price_column = ?',
        actualProductId,
        'karton_pack'
      );
      if (!existingOption) {
        db.run(
          `INSERT INTO sellable_options (
            id, product_id, source_price_column, sku, unit_label,
            pack_quantity, price_idr, active, sort_order, version
          ) VALUES (?, ?, 'karton_pack', null, 'Karton / Pack', null, ?, 1, 1, 1)`,
          optId,
          actualProductId,
          kartonPrice
        );
        optionsInserted++;
      } else {
        optionsExisting++;
      }
    }

    // 2. Pcs
    const pcsPriceRaw = r.harga_pcs_idr.trim();
    if (pcsPriceRaw) {
      const pcsPrice = parseInt(pcsPriceRaw, 10);
      if (isNaN(pcsPrice) || pcsPrice <= 0) {
        throw new Error(`Invalid Pcs price for ${sourceKey}: ${pcsPriceRaw}`);
      }
      const optId = `opt_${sourceKey.toLowerCase().replace(/[^a-z0-9]/g, '_')}_pcs`;
      const existingOption = db.get(
        'SELECT id FROM sellable_options WHERE product_id = ? AND source_price_column = ?',
        actualProductId,
        'pcs'
      );
      if (!existingOption) {
        db.run(
          `INSERT INTO sellable_options (
            id, product_id, source_price_column, sku, unit_label,
            pack_quantity, price_idr, active, sort_order, version
          ) VALUES (?, ?, 'pcs', null, 'Pcs', null, ?, 1, 2, 1)`,
          optId,
          actualProductId,
          pcsPrice
        );
        optionsInserted++;
      } else {
        optionsExisting++;
      }
    }
  }

  // Total check
  const totalProducts = db.get<{ count: number }>('SELECT count(*) as count FROM products');
  const totalOptions = db.get<{ count: number }>('SELECT count(*) as count FROM sellable_options');
  const kartonOptions = db.get<{ count: number }>(
    "SELECT count(*) as count FROM sellable_options WHERE source_price_column = 'karton_pack'"
  );
  const pcsOptions = db.get<{ count: number }>(
    "SELECT count(*) as count FROM sellable_options WHERE source_price_column = 'pcs'"
  );

  console.log('Seed summary:');
  console.log(` - Products: ${totalProducts?.count} (new: ${productsInserted}, skipped/existing: ${productsExisting})`);
  console.log(` - Total Sellable Options: ${totalOptions?.count} (new: ${optionsInserted}, existing: ${optionsExisting})`);
  console.log(` - Karton/Pack Options: ${kartonOptions?.count}`);
  console.log(` - Pcs Options: ${pcsOptions?.count}`);

  return {
    totalProducts: totalProducts?.count,
    totalOptions: totalOptions?.count,
    kartonOptions: kartonOptions?.count,
    pcsOptions: pcsOptions?.count
  };
}

if (process.argv[1]?.endsWith('seed.ts')) {
  seedDatabase();
}
