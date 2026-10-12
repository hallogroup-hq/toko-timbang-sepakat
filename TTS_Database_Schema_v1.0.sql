-- TOKO TIMBANG SEPAKAT — D1/SQLite initial schema v1.0
-- Reviewed design baseline. Test against local SQLite / Wrangler D1 before rollout.
-- Initial create only. Apply future changes using versioned migrations, never reset live data.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner','staff')),
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS admin_sessions (
  id TEXT PRIMARY KEY,
  admin_user_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_user ON admin_sessions(admin_user_id,expires_at);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  parent_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  source_key TEXT UNIQUE,
  source_row INTEGER CHECK(source_row IS NULL OR source_row > 0),
  source_name TEXT,
  source_data_json TEXT,
  sku TEXT,
  brand TEXT,
  display_name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  availability TEXT NOT NULL DEFAULT 'ask_admin' CHECK(availability IN ('ask_admin','available','unavailable')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1 CHECK(version >= 1),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_products_sku_filled ON products(sku) WHERE sku IS NOT NULL AND trim(sku) <> '';
CREATE INDEX IF NOT EXISTS idx_products_public ON products(status, availability, category_id, sort_order, display_name);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(display_name);

CREATE TABLE IF NOT EXISTS sellable_options (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  source_price_column TEXT CHECK(source_price_column IN ('karton_pack','pcs') OR source_price_column IS NULL),
  sku TEXT,
  unit_label TEXT NOT NULL,
  pack_quantity INTEGER CHECK (pack_quantity IS NULL OR pack_quantity > 0),
  price_idr INTEGER NOT NULL CHECK (price_idr > 0),
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1 CHECK(version >= 1),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_sellable_source_per_product ON sellable_options(product_id,source_price_column) WHERE source_price_column IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_sellable_sku_filled ON sellable_options(sku) WHERE sku IS NOT NULL AND trim(sku) <> '';
CREATE INDEX IF NOT EXISTS idx_sellable_product ON sellable_options(product_id,active,sort_order);

CREATE TABLE IF NOT EXISTS import_batches (
  id TEXT PRIMARY KEY,
  created_by TEXT NOT NULL REFERENCES admin_users(id),
  source_filename TEXT NOT NULL,
  source_sha256 TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'preview' CHECK(status IN ('preview','committed','rejected','failed')),
  row_count INTEGER NOT NULL DEFAULT 0 CHECK(row_count >= 0),
  summary_json TEXT,
  error_message TEXT,
  committed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS import_rows (
  id TEXT PRIMARY KEY,
  import_batch_id TEXT NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
  source_row_number INTEGER NOT NULL,
  source_key TEXT,
  action TEXT NOT NULL CHECK(action IN ('create','update','unchanged','conflict','invalid')),
  before_json TEXT,
  after_json TEXT,
  errors_json TEXT,
  UNIQUE(import_batch_id,source_row_number)
);
CREATE INDEX IF NOT EXISTS idx_import_rows_batch ON import_rows(import_batch_id,action);

CREATE TABLE IF NOT EXISTS price_changes (
  id TEXT PRIMARY KEY,
  sellable_option_id TEXT NOT NULL REFERENCES sellable_options(id) ON DELETE RESTRICT,
  changed_by TEXT NOT NULL REFERENCES admin_users(id),
  import_batch_id TEXT REFERENCES import_batches(id) ON DELETE SET NULL,
  old_price_idr INTEGER NOT NULL CHECK(old_price_idr > 0),
  new_price_idr INTEGER NOT NULL CHECK(new_price_idr > 0),
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK(old_price_idr <> new_price_idr)
);
CREATE INDEX IF NOT EXISTS idx_price_changes_option ON price_changes(sellable_option_id,created_at);

CREATE TABLE IF NOT EXISTS image_candidates (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  source_page_url TEXT NOT NULL,
  image_url TEXT NOT NULL,
  license_url TEXT,
  rights_status TEXT NOT NULL DEFAULT 'unknown' CHECK(rights_status IN ('unknown','owned','permitted','licensed','restricted')),
  identity_status TEXT NOT NULL DEFAULT 'pending' CHECK(identity_status IN ('pending','matched','mismatched')),
  review_status TEXT NOT NULL DEFAULT 'pending' CHECK(review_status IN ('pending','approved','rejected')),
  identity_evidence_json TEXT,
  reviewer_note TEXT,
  checked_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_image_candidates_queue ON image_candidates(review_status,product_id);
CREATE TABLE IF NOT EXISTS image_assets (
  id TEXT PRIMARY KEY,
  storage_key TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  width INTEGER CHECK(width IS NULL OR width > 0),
  height INTEGER CHECK(height IS NULL OR height > 0),
  sha256 TEXT,
  source_page_url TEXT,
  attribution TEXT,
  license_url TEXT,
  rights_status TEXT NOT NULL CHECK(rights_status IN ('owned','permitted','licensed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS product_images (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  image_asset_id TEXT NOT NULL REFERENCES image_assets(id) ON DELETE RESTRICT,
  alt_text TEXT,
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK(is_primary IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(product_id,image_asset_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_one_primary_image_per_product ON product_images(product_id) WHERE is_primary = 1;

CREATE TABLE IF NOT EXISTS checkout_intents (
  id TEXT PRIMARY KEY,
  public_ref TEXT NOT NULL UNIQUE,
  idempotency_key TEXT NOT NULL UNIQUE,
  buyer_name TEXT NOT NULL CHECK(length(trim(buyer_name)) BETWEEN 2 AND 100),
  business_name TEXT CHECK(business_name IS NULL OR length(trim(business_name)) <= 120),
  subtotal_idr INTEGER NOT NULL CHECK(subtotal_idr >= 0),
  message_snapshot TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'created' CHECK(status IN ('created','converted','abandoned')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_checkout_intents_status ON checkout_intents(status,created_at);
CREATE TABLE IF NOT EXISTS checkout_intent_lines (
  id TEXT PRIMARY KEY,
  checkout_intent_id TEXT NOT NULL REFERENCES checkout_intents(id) ON DELETE RESTRICT,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  sellable_option_id TEXT REFERENCES sellable_options(id) ON DELETE SET NULL,
  line_position INTEGER NOT NULL,
  product_name_snapshot TEXT NOT NULL,
  unit_label_snapshot TEXT NOT NULL,
  qty INTEGER NOT NULL CHECK (qty BETWEEN 1 AND 99999),
  unit_price_idr INTEGER NOT NULL CHECK (unit_price_idr > 0),
  line_subtotal_idr INTEGER NOT NULL CHECK (line_subtotal_idr = qty * unit_price_idr),
  UNIQUE(checkout_intent_id,line_position)
);
CREATE INDEX IF NOT EXISTS idx_checkout_lines_intent ON checkout_intent_lines(checkout_intent_id);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  public_ref TEXT NOT NULL UNIQUE,
  checkout_intent_id TEXT UNIQUE REFERENCES checkout_intents(id) ON DELETE RESTRICT,
  buyer_name TEXT NOT NULL,
  business_name TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed','awaiting_payment','paid','preparing','completed','cancelled')),
  subtotal_idr INTEGER NOT NULL CHECK(subtotal_idr >= 0),
  shipping_fee_idr INTEGER CHECK(shipping_fee_idr IS NULL OR shipping_fee_idr >= 0),
  total_idr INTEGER CHECK(total_idr IS NULL OR total_idr >= 0),
  admin_note TEXT,
  created_by TEXT NOT NULL REFERENCES admin_users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  version INTEGER NOT NULL DEFAULT 1,
  CHECK((shipping_fee_idr IS NULL AND total_idr IS NULL) OR (shipping_fee_idr IS NOT NULL AND total_idr IS NOT NULL AND total_idr = subtotal_idr + shipping_fee_idr))
);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status,created_at);
CREATE TABLE IF NOT EXISTS order_lines (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  sellable_option_id TEXT REFERENCES sellable_options(id) ON DELETE SET NULL,
  line_position INTEGER NOT NULL,
  product_name_snapshot TEXT NOT NULL,
  unit_label_snapshot TEXT NOT NULL,
  qty INTEGER NOT NULL CHECK(qty BETWEEN 1 AND 99999),
  unit_price_idr INTEGER NOT NULL CHECK(unit_price_idr > 0),
  line_subtotal_idr INTEGER NOT NULL CHECK(line_subtotal_idr = qty * unit_price_idr),
  UNIQUE(order_id,line_position)
);
CREATE INDEX IF NOT EXISTS idx_order_lines_order ON order_lines(order_id);
CREATE TABLE IF NOT EXISTS order_events (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  actor_admin_user_id TEXT NOT NULL REFERENCES admin_users(id),
  event_type TEXT NOT NULL,
  previous_json TEXT,
  next_json TEXT,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_order_events_order ON order_events(order_id,created_at);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_admin_user_id TEXT REFERENCES admin_users(id),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT,
  request_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type,entity_id,created_at);

CREATE TABLE IF NOT EXISTS store_settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_by TEXT REFERENCES admin_users(id),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Do not seed an invented WhatsApp number, physical address, free-shipping policy,
-- supplier, admin password, or product description here.
