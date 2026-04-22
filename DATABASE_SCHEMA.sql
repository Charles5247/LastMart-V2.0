-- =============================================================================
-- LastMart Database Schema  (v2.0 – April 2026)
-- =============================================================================
-- Primary runtime:  SQLite 3 via better-sqlite3 (file: lastmart.db)
-- Compatible with:  Supabase (PostgreSQL), PlanetScale (MySQL 8),
--                   Amazon RDS (PostgreSQL / MySQL), MongoDB Atlas,
--                   Neon (PostgreSQL), Turso (libSQL / SQLite-compatible)
--
-- Compatibility notes per section are marked [COMPAT].
-- To migrate to PostgreSQL: replace TEXT PRIMARY KEY with UUID PRIMARY KEY,
--   DEFAULT (datetime('now')) with DEFAULT NOW(), and INTEGER with BOOLEAN
--   where noted.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. USERS  ─ Core account records for all roles
-- ---------------------------------------------------------------------------
-- [COMPAT] TEXT PRIMARY KEY → UUID PRIMARY KEY DEFAULT gen_random_uuid()
-- [COMPAT] INTEGER 0/1 → BOOLEAN
CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,                         -- UUID v4
  name        TEXT    NOT NULL,
  email       TEXT    UNIQUE NOT NULL,
  password    TEXT    NOT NULL,                         -- bcrypt hash
  role        TEXT    NOT NULL DEFAULT 'customer',      -- 'customer'|'vendor'|'admin'
  avatar      TEXT,                                     -- URL or /uploads/<file>
  phone       TEXT,
  address     TEXT,
  city        TEXT,
  latitude    REAL,
  longitude   REAL,
  gps_enabled         INTEGER DEFAULT 0,               -- [COMPAT] BOOLEAN
  preferred_currency  TEXT    DEFAULT 'NGN',
  created_at  TEXT DEFAULT (datetime('now')),           -- [COMPAT] TIMESTAMPTZ DEFAULT NOW()
  updated_at  TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role  ON users(role);

-- ---------------------------------------------------------------------------
-- 2. VENDORS  ─ Store profiles (one per vendor user)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vendors (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL UNIQUE,
  store_name    TEXT NOT NULL,
  description   TEXT,
  logo          TEXT,
  banner        TEXT,
  category      TEXT,
  city          TEXT NOT NULL,
  address       TEXT,
  latitude      REAL,
  longitude     REAL,
  phone         TEXT,
  email         TEXT,
  status        TEXT DEFAULT 'pending',                 -- 'pending'|'approved'|'suspended'
  is_featured   INTEGER DEFAULT 0,                      -- [COMPAT] BOOLEAN
  rating        REAL    DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  total_sales   INTEGER DEFAULT 0,
  ad_balance    REAL    DEFAULT 0,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_vendors_city   ON vendors(city);
CREATE INDEX IF NOT EXISTS idx_vendors_status ON vendors(status);

-- ---------------------------------------------------------------------------
-- 3. CATEGORIES  ─ Product taxonomy
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  icon       TEXT,
  image      TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------------
-- 4. PRODUCTS  ─ Product catalogue
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id             TEXT PRIMARY KEY,
  vendor_id      TEXT NOT NULL,
  category_id    TEXT,
  name           TEXT NOT NULL,
  description    TEXT,
  price          REAL NOT NULL,
  original_price REAL,
  images         TEXT DEFAULT '[]',        -- JSON array of image URLs / paths
  stock          INTEGER DEFAULT 0,
  unit           TEXT    DEFAULT 'piece',
  is_active      INTEGER DEFAULT 1,        -- [COMPAT] BOOLEAN
  is_featured    INTEGER DEFAULT 0,
  is_sponsored   INTEGER DEFAULT 0,
  rating         REAL    DEFAULT 0,
  total_reviews  INTEGER DEFAULT 0,
  total_sales    INTEGER DEFAULT 0,
  tags           TEXT DEFAULT '[]',        -- JSON array
  created_at     TEXT DEFAULT (datetime('now')),
  updated_at     TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (vendor_id)   REFERENCES vendors(id)    ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);
CREATE INDEX IF NOT EXISTS idx_products_vendor    ON products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_products_category  ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active    ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_sponsored ON products(is_sponsored);

-- ---------------------------------------------------------------------------
-- 5. ORDERS  ─ Customer purchase orders
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id                TEXT PRIMARY KEY,
  customer_id       TEXT NOT NULL,
  vendor_id         TEXT NOT NULL,
  status            TEXT DEFAULT 'pending',    -- 'pending'|'confirmed'|'shipped'|'delivered'|'cancelled'
  total_amount      REAL NOT NULL,
  delivery_fee      REAL DEFAULT 0,
  delivery_address  TEXT NOT NULL,
  delivery_city     TEXT NOT NULL,
  delivery_lat      REAL,
  delivery_lng      REAL,
  delivery_mode     TEXT DEFAULT 'standard',   -- 'standard'|'express'|'overnight'|'scheduled'|'pickup'
  payment_method    TEXT DEFAULT 'card',
  payment_status    TEXT DEFAULT 'pending',    -- 'pending'|'completed'|'failed'|'refunded'
  notes             TEXT,
  estimated_delivery TEXT,
  actual_delivery    TEXT,
  tracking_updates   TEXT DEFAULT '[]',        -- JSON array of {status,message,timestamp}
  created_at         TEXT DEFAULT (datetime('now')),
  updated_at         TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (customer_id) REFERENCES users(id),
  FOREIGN KEY (vendor_id)   REFERENCES vendors(id)
);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_vendor   ON orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_orders_status   ON orders(status);

-- ---------------------------------------------------------------------------
-- 6. ORDER_ITEMS  ─ Line items within an order
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
  id            TEXT PRIMARY KEY,
  order_id      TEXT NOT NULL,
  product_id    TEXT NOT NULL,
  quantity      INTEGER NOT NULL,
  price         REAL    NOT NULL,
  product_name  TEXT    NOT NULL,
  product_image TEXT,
  FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);
CREATE INDEX IF NOT EXISTS idx_order_items_order   ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

-- ---------------------------------------------------------------------------
-- 7. CART_ITEMS  ─ Per-user shopping cart
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cart_items (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  product_id TEXT NOT NULL,
  quantity   INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, product_id),
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- 8. REVIEWS  ─ Product & vendor reviews
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reviews (
  id          TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  vendor_id   TEXT NOT NULL,
  product_id  TEXT,
  order_id    TEXT,
  rating      INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
  comment     TEXT,
  images      TEXT DEFAULT '[]',
  created_at  TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (customer_id) REFERENCES users(id),
  FOREIGN KEY (vendor_id)   REFERENCES vendors(id),
  FOREIGN KEY (product_id)  REFERENCES products(id),
  FOREIGN KEY (order_id)    REFERENCES orders(id)
);

-- ---------------------------------------------------------------------------
-- 9. NOTIFICATIONS  ─ In-app notification inbox
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  type       TEXT NOT NULL,   -- 'order_confirmed'|'order_shipped'|'payment_success'|'low_stock'…
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  data       TEXT DEFAULT '{}',    -- JSON payload (e.g. order_id, product_id)
  is_read    INTEGER DEFAULT 0,    -- [COMPAT] BOOLEAN
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

-- ---------------------------------------------------------------------------
-- 10. ADVERTISEMENTS  ─ Vendor-paid ads
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS advertisements (
  id          TEXT PRIMARY KEY,
  vendor_id   TEXT NOT NULL,
  product_id  TEXT,
  type        TEXT NOT NULL,   -- 'banner'|'featured_product'|'sponsored'
  title       TEXT NOT NULL,
  description TEXT,
  image       TEXT,
  budget      REAL NOT NULL,
  spent       REAL DEFAULT 0,
  clicks      INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  status      TEXT DEFAULT 'active',   -- 'active'|'paused'|'completed'
  start_date  TEXT NOT NULL,
  end_date    TEXT NOT NULL,
  target_city TEXT,
  created_at  TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (vendor_id)  REFERENCES vendors(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- ---------------------------------------------------------------------------
-- 11. SAVED_VENDORS  ─ Customer wishlists (followed vendors)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS saved_vendors (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  vendor_id  TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, vendor_id),
  FOREIGN KEY (user_id)   REFERENCES users(id)    ON DELETE CASCADE,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id)  ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- 12. TRANSACTIONS  ─ Financial transaction log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
  id             TEXT PRIMARY KEY,
  order_id       TEXT,
  user_id        TEXT NOT NULL,
  amount         REAL NOT NULL,
  type           TEXT NOT NULL,         -- 'payment'|'refund'|'payout'
  status         TEXT DEFAULT 'completed',
  payment_method TEXT,
  reference      TEXT,
  created_at     TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (user_id)  REFERENCES users(id)
);

-- ---------------------------------------------------------------------------
-- 13. PAYMENTS  ─ Payment gateway session records
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id              TEXT PRIMARY KEY,
  order_id        TEXT,
  user_id         TEXT NOT NULL,
  amount          REAL NOT NULL,
  currency        TEXT DEFAULT 'NGN',
  gateway         TEXT NOT NULL,        -- 'paystack'|'flutterwave'|'coingate'|'giftcard'
  gateway_ref     TEXT,                 -- External reference from gateway
  gateway_tx_id   TEXT,                 -- Transaction ID confirmed by gateway
  method          TEXT NOT NULL,        -- 'card'|'bank_transfer'|'ussd'|'crypto'|'giftcard'
  crypto_address  TEXT,                 -- Wallet address (crypto payments)
  crypto_currency TEXT,                 -- 'BTC'|'ETH'|'USDT'|'BNB'|'SOL'
  crypto_amount   REAL,                 -- Amount in crypto units
  crypto_rate     REAL,                 -- NGN/crypto exchange rate at time of payment
  giftcard_code   TEXT,                 -- Gift card code (if applicable)
  giftcard_pin    TEXT,                 -- Gift card PIN
  status          TEXT DEFAULT 'pending', -- 'pending'|'success'|'failed'|'cancelled'
  metadata        TEXT DEFAULT '{}',    -- JSON – any extra gateway-specific data
  paid_at         TEXT,
  created_at      TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (user_id)  REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_payments_user   ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- ---------------------------------------------------------------------------
-- 14. DELIVERY_ADDRESSES  ─ Saved delivery addresses per customer
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS delivery_addresses (
  id                    TEXT PRIMARY KEY,
  user_id               TEXT NOT NULL,
  label                 TEXT NOT NULL,          -- 'Home'|'Work'|'Other'
  recipient_name        TEXT NOT NULL,
  recipient_phone       TEXT NOT NULL,
  address               TEXT NOT NULL,
  city                  TEXT NOT NULL,
  state                 TEXT,
  country               TEXT DEFAULT 'Nigeria',
  latitude              REAL,
  longitude             REAL,
  is_default            INTEGER DEFAULT 0,      -- [COMPAT] BOOLEAN
  delivery_instructions TEXT,
  created_at            TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_delivery_addr_user ON delivery_addresses(user_id);

-- ---------------------------------------------------------------------------
-- 15. BUDGET_PLANS  ─ Customer shopping budget plans
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS budget_plans (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL,
  name         TEXT NOT NULL,
  total_budget REAL NOT NULL,
  spent        REAL DEFAULT 0,
  currency     TEXT DEFAULT 'NGN',
  period       TEXT NOT NULL,           -- 'daily'|'weekly'|'monthly'|'quarterly'
  start_date   TEXT NOT NULL,
  end_date     TEXT,
  is_active    INTEGER DEFAULT 1,       -- [COMPAT] BOOLEAN
  notes        TEXT,
  created_at   TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- 16. RECURRING_PURCHASES  ─ Scheduled recurring product orders
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recurring_purchases (
  id                  TEXT PRIMARY KEY,
  user_id             TEXT NOT NULL,
  budget_plan_id      TEXT,
  product_id          TEXT NOT NULL,
  quantity            INTEGER NOT NULL DEFAULT 1,
  frequency           TEXT NOT NULL,    -- 'daily'|'weekly'|'monthly'|'quarterly'
  next_order_date     TEXT NOT NULL,    -- ISO datetime of next auto-order
  last_ordered_at     TEXT,
  delivery_address_id TEXT,
  is_active           INTEGER DEFAULT 1,  -- [COMPAT] BOOLEAN
  auto_order          INTEGER DEFAULT 0,  -- 1 = auto-place order without user input
  created_at          TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id)             REFERENCES users(id)              ON DELETE CASCADE,
  FOREIGN KEY (budget_plan_id)      REFERENCES budget_plans(id),
  FOREIGN KEY (product_id)          REFERENCES products(id),
  FOREIGN KEY (delivery_address_id) REFERENCES delivery_addresses(id)
);
CREATE INDEX IF NOT EXISTS idx_recurring_next ON recurring_purchases(next_order_date);

-- ---------------------------------------------------------------------------
-- 17. LAMA_INSIGHTS  ─ AI agent–generated insights and alerts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lama_insights (
  id             TEXT PRIMARY KEY,
  type           TEXT NOT NULL,     -- 'market_trend'|'admin_alert'|'recommendation'|'budget_alert'
  target_role    TEXT NOT NULL,     -- 'admin'|'vendor'|'customer'|'all'
  target_user_id TEXT,              -- NULL = broadcast to all users of that role
  title          TEXT NOT NULL,
  body           TEXT NOT NULL,
  data           TEXT DEFAULT '{}', -- JSON: supporting facts / context
  is_read        INTEGER DEFAULT 0, -- [COMPAT] BOOLEAN
  expires_at     TEXT,
  created_at     TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_lama_role   ON lama_insights(target_role);
CREATE INDEX IF NOT EXISTS idx_lama_unread ON lama_insights(is_read);

-- ---------------------------------------------------------------------------
-- 18. PRODUCT_IMAGES  ─ Vendor-uploaded product images (50 MB max each)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_images (
  id            TEXT PRIMARY KEY,
  vendor_id     TEXT NOT NULL,
  product_id    TEXT,
  filename      TEXT NOT NULL,         -- UUID-based filename stored on disk
  original_name TEXT,                  -- Original filename from client
  file_path     TEXT NOT NULL,         -- Server-relative path: /uploads/<filename>
  file_size     INTEGER,               -- Bytes
  mime_type     TEXT,                  -- 'image/jpeg'|'image/png'|'image/webp'…
  is_validated  INTEGER DEFAULT 0,     -- 1 = admin/AI validated as matching product
  created_at    TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (vendor_id)  REFERENCES vendors(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- =============================================================================
-- END OF SCHEMA
-- =============================================================================

-- =============================================================================
-- MULTI-DATABASE COMPATIBILITY GUIDE
-- =============================================================================
--
-- ── Supabase (PostgreSQL) ────────────────────────────────────────────────────
--   1. Replace TEXT PRIMARY KEY with UUID PRIMARY KEY DEFAULT gen_random_uuid()
--   2. Replace TEXT DEFAULT (datetime('now')) with TIMESTAMPTZ DEFAULT NOW()
--   3. Replace INTEGER 0/1 booleans with BOOLEAN DEFAULT FALSE / DEFAULT TRUE
--   4. Replace JSON TEXT columns with JSONB for indexed JSON queries:
--        images TEXT DEFAULT '[]'  →  images JSONB DEFAULT '[]'
--   5. Enable Row Level Security (RLS) per table for auth.users integration
--   6. Use Supabase Realtime subscriptions for live notification updates
--
-- ── Amazon RDS / PlanetScale (MySQL 8) ──────────────────────────────────────
--   1. Replace TEXT PRIMARY KEY with VARCHAR(36) PRIMARY KEY
--   2. Replace CHECK constraints (not supported in MySQL < 8.0.16)
--   3. Replace datetime('now') with NOW()
--   4. Use JSON columns instead of TEXT for images / data
--   5. Add ENGINE=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
--
-- ── MongoDB Atlas ────────────────────────────────────────────────────────────
--   Schema maps to collections (documents):
--     users, vendors, categories, products, orders, payments, etc.
--   Embedded documents replace FK joins:
--     order_items → embedded array in orders
--     tracking_updates → embedded array in orders
--     images → embedded array in products
--   Indexes: Create with db.collection.createIndex({field:1}) in Atlas UI
--   Use Mongoose schemas to enforce types at the application layer
--
-- ── Turso / libSQL (SQLite-compatible, edge) ─────────────────────────────────
--   Schema is 100% compatible – copy this file as-is.
--   Replace better-sqlite3 with @libsql/client for remote connections:
--     const client = createClient({ url: 'libsql://...turso.io', authToken })
--   WAL mode: enabled by default on Turso
--
-- ── Neon (Serverless PostgreSQL) ─────────────────────────────────────────────
--   Same migration steps as Supabase (PostgreSQL).
--   Use neon serverless driver for edge functions:
--     import { neon } from '@neondatabase/serverless'
--
-- =============================================================================
