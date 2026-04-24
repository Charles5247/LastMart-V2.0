/**
 * ─── Database Module ──────────────────────────────────────────────────────────
 * Manages the SQLite database connection and schema initialization.
 * Uses better-sqlite3 for synchronous, high-performance SQLite access.
 *
 * The database file (lastmart.db) lives at the project root so both the
 * Next.js frontend (legacy routes) and this Express backend share the same data.
 *
 * Tables:
 *   users, vendors, categories, products, orders, order_items,
 *   cart_items, reviews, notifications, advertisements, saved_vendors,
 *   transactions, payments, delivery_addresses, budget_plans,
 *   recurring_purchases, lama_insights, product_images,
 *   kyc_verifications, product_verifications, ranking_packages,
 *   vendor_rankings, store_visits, terms_acceptances
 * ─────────────────────────────────────────────────────────────────────────────
 */

import Database from 'better-sqlite3';
import path from 'path';

/** Absolute path to the SQLite database file at the project root */
const DB_PATH = path.join(__dirname, '../../..', 'lastmart.db');

/** Singleton database instance – reused across all requests */
let db: Database.Database;

/**
 * Returns the singleton database instance, creating it on first call.
 * Also runs initializeDB() to ensure all tables/columns exist.
 */
export function getDB(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    // WAL mode: better concurrency for reads while a write is happening
    db.pragma('journal_mode = WAL');
    // Enforce foreign-key constraints (SQLite ignores them by default)
    db.pragma('foreign_keys = ON');
    initializeDB(db);
  }
  return db;
}

/**
 * Creates all required tables if they don't already exist.
 * Safe to run multiple times – uses IF NOT EXISTS / ADD COLUMN guards.
 */
function initializeDB(db: Database.Database) {
  db.exec(`
    /* ── Core user accounts ──────────────────────────────────── */
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer',   -- 'customer' | 'vendor' | 'admin'
      avatar TEXT,
      phone TEXT,
      address TEXT,
      city TEXT,
      latitude REAL,
      longitude REAL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    /* ── Vendor store profiles ───────────────────────────────── */
    CREATE TABLE IF NOT EXISTS vendors (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      store_name TEXT NOT NULL,
      description TEXT,
      logo TEXT,
      banner TEXT,
      category TEXT,
      city TEXT NOT NULL,
      address TEXT,
      latitude REAL,
      longitude REAL,
      phone TEXT,
      email TEXT,
      status TEXT DEFAULT 'pending',           -- 'pending' | 'approved' | 'suspended'
      is_featured INTEGER DEFAULT 0,
      rating REAL DEFAULT 0,
      total_reviews INTEGER DEFAULT 0,
      total_sales INTEGER DEFAULT 0,
      ad_balance REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    /* ── Product categories ──────────────────────────────────── */
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT,
      image TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    /* ── Product listings ────────────────────────────────────── */
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      vendor_id TEXT NOT NULL,
      category_id TEXT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      original_price REAL,
      images TEXT DEFAULT '[]',                -- JSON array of image paths/URLs
      stock INTEGER DEFAULT 0,
      unit TEXT DEFAULT 'piece',
      is_active INTEGER DEFAULT 1,
      is_featured INTEGER DEFAULT 0,
      is_sponsored INTEGER DEFAULT 0,
      rating REAL DEFAULT 0,
      total_reviews INTEGER DEFAULT 0,
      total_sales INTEGER DEFAULT 0,
      tags TEXT DEFAULT '[]',                  -- JSON array of tag strings
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    /* ── Customer orders ─────────────────────────────────────── */
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      vendor_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      total_amount REAL NOT NULL,
      delivery_fee REAL DEFAULT 0,
      delivery_address TEXT NOT NULL,
      delivery_city TEXT NOT NULL,
      delivery_lat REAL,
      delivery_lng REAL,
      delivery_mode TEXT DEFAULT 'standard',   -- 'standard' | 'express' | 'pickup'
      payment_method TEXT DEFAULT 'card',
      payment_status TEXT DEFAULT 'pending',
      notes TEXT,
      estimated_delivery TEXT,
      actual_delivery TEXT,
      tracking_updates TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES users(id),
      FOREIGN KEY (vendor_id) REFERENCES vendors(id)
    );

    /* ── Line items within an order ──────────────────────────── */
    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      product_name TEXT NOT NULL,
      product_image TEXT,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    /* ── Shopping cart (per-user) ─────────────────────────────── */
    CREATE TABLE IF NOT EXISTS cart_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, product_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    /* ── Product & vendor reviews ─────────────────────────────── */
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      vendor_id TEXT NOT NULL,
      product_id TEXT,
      order_id TEXT,
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      comment TEXT,
      images TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES users(id),
      FOREIGN KEY (vendor_id) REFERENCES vendors(id),
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    /* ── In-app notifications ─────────────────────────────────── */
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      data TEXT DEFAULT '{}',                  -- JSON payload (e.g. order_id)
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    /* ── Paid advertisements ──────────────────────────────────── */
    CREATE TABLE IF NOT EXISTS advertisements (
      id TEXT PRIMARY KEY,
      vendor_id TEXT NOT NULL,
      product_id TEXT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      image TEXT,
      budget REAL NOT NULL,
      spent REAL DEFAULT 0,
      clicks INTEGER DEFAULT 0,
      impressions INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      target_city TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (vendor_id) REFERENCES vendors(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    /* ── Vendors saved/followed by customers ─────────────────── */
    CREATE TABLE IF NOT EXISTS saved_vendors (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      vendor_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, vendor_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
    );

    /* ── Financial transaction log ───────────────────────────── */
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      order_id TEXT,
      user_id TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL,                      -- 'payment' | 'refund' | 'payout'
      status TEXT DEFAULT 'completed',
      payment_method TEXT,
      reference TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    /* ── Payment gateway records ──────────────────────────────── */
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      order_id TEXT,
      user_id TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'NGN',
      gateway TEXT NOT NULL,                   -- 'paystack'|'flutterwave'|'crypto'|'giftcard'
      gateway_ref TEXT,                        -- external reference from gateway
      gateway_tx_id TEXT,                      -- transaction ID from gateway
      method TEXT NOT NULL,                    -- 'card'|'bank_transfer'|'ussd'|'crypto'|'giftcard'
      crypto_address TEXT,                     -- wallet address (if crypto)
      crypto_currency TEXT,                    -- 'BTC'|'USDT'|'ETH' etc.
      crypto_amount REAL,                      -- amount in crypto
      crypto_rate REAL,                        -- exchange rate at time of payment
      giftcard_code TEXT,                      -- gift card code (if applicable)
      giftcard_pin TEXT,
      status TEXT DEFAULT 'pending',           -- 'pending'|'success'|'failed'|'cancelled'
      metadata TEXT DEFAULT '{}',              -- JSON – any extra gateway data
      paid_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    /* ── Saved delivery addresses per customer ───────────────── */
    CREATE TABLE IF NOT EXISTS delivery_addresses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      label TEXT NOT NULL,                     -- 'Home'|'Work'|'Other'
      recipient_name TEXT NOT NULL,
      recipient_phone TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT,
      country TEXT DEFAULT 'Nigeria',
      latitude REAL,
      longitude REAL,
      is_default INTEGER DEFAULT 0,
      delivery_instructions TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    /* ── Customer budget plans ────────────────────────────────── */
    CREATE TABLE IF NOT EXISTS budget_plans (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      total_budget REAL NOT NULL,
      spent REAL DEFAULT 0,
      currency TEXT DEFAULT 'NGN',
      period TEXT NOT NULL,                    -- 'daily'|'weekly'|'monthly'|'quarterly'
      start_date TEXT NOT NULL,
      end_date TEXT,
      is_active INTEGER DEFAULT 1,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    /* ── Recurring purchases linked to a budget plan ──────────── */
    CREATE TABLE IF NOT EXISTS recurring_purchases (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      budget_plan_id TEXT,
      product_id TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      frequency TEXT NOT NULL,                 -- 'daily'|'weekly'|'monthly'|'quarterly'
      next_order_date TEXT NOT NULL,
      last_ordered_at TEXT,
      delivery_address_id TEXT,
      is_active INTEGER DEFAULT 1,
      auto_order INTEGER DEFAULT 0,            -- 1 = auto-place order on next_order_date
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (budget_plan_id) REFERENCES budget_plans(id),
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (delivery_address_id) REFERENCES delivery_addresses(id)
    );

    /* ── LAMA AI agent insights & alerts ─────────────────────── */
    CREATE TABLE IF NOT EXISTS lama_insights (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,                      -- 'market_trend'|'admin_alert'|'recommendation'|'budget_alert'
      target_role TEXT NOT NULL,               -- 'admin'|'vendor'|'customer'|'all'
      target_user_id TEXT,                     -- NULL = broadcast to all of that role
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      data TEXT DEFAULT '{}',                  -- JSON: supporting data
      is_read INTEGER DEFAULT 0,
      expires_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    /* ── Uploaded product images (vendor uploads) ─────────────── */
    CREATE TABLE IF NOT EXISTS product_images (
      id TEXT PRIMARY KEY,
      vendor_id TEXT NOT NULL,
      product_id TEXT,
      filename TEXT NOT NULL,
      original_name TEXT,
      file_path TEXT NOT NULL,                 -- local path relative to /public/uploads/
      file_size INTEGER,                       -- bytes
      mime_type TEXT,
      is_validated INTEGER DEFAULT 0,          -- 1 = AI or admin validated
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (vendor_id) REFERENCES vendors(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    /* ── KYC / Identity verifications ────────────────────────── */
    CREATE TABLE IF NOT EXISTS kyc_verifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,                      -- 'customer_kyc' | 'vendor_kyc'
      -- Customer KYC fields
      bvn TEXT,                                -- Bank Verification Number
      nin TEXT,                                -- National ID Number
      selfie_url TEXT,                         -- selfie photo
      id_type TEXT,                            -- 'national_id'|'passport'|'drivers_license'|'voters_card'
      id_number TEXT,
      id_front_url TEXT,
      id_back_url TEXT,
      -- Vendor-specific KYC fields
      business_name TEXT,
      business_reg_number TEXT,               -- CAC registration number
      tin TEXT,                               -- Tax Identification Number
      business_type TEXT,                     -- 'sole_proprietorship'|'partnership'|'llc'|'corporation'
      business_address TEXT,
      cac_doc_url TEXT,                       -- CAC certificate
      tax_cert_url TEXT,                      -- Tax clearance certificate
      utility_bill_url TEXT,                  -- Proof of address
      director_id_url TEXT,                   -- Director's ID
      -- Status tracking
      status TEXT DEFAULT 'pending',          -- 'pending'|'under_review'|'approved'|'rejected'
      reviewed_by TEXT,                       -- admin user_id who reviewed
      rejection_reason TEXT,
      submitted_at TEXT DEFAULT (datetime('now')),
      reviewed_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    /* ── Product authenticity / availability vetting ─────────── */
    CREATE TABLE IF NOT EXISTS product_verifications (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      vendor_id TEXT NOT NULL,
      -- Availability proof
      availability_status TEXT DEFAULT 'pending', -- 'pending'|'in_stock'|'out_of_stock'|'pre_order'
      stock_proof_url TEXT,                   -- photo/video of actual stock
      expected_restock_date TEXT,
      -- Authenticity proof
      authenticity_status TEXT DEFAULT 'pending', -- 'pending'|'verified'|'disputed'|'rejected'
      brand_auth_doc_url TEXT,               -- brand authorization letter
      invoice_url TEXT,                      -- supplier invoice
      lab_cert_url TEXT,                     -- lab/quality certificate
      origin_doc_url TEXT,                   -- country of origin doc
      -- Disclaimers acknowledged
      disclaimer_accepted INTEGER DEFAULT 0,
      disclaimer_text TEXT,
      -- Admin review
      reviewed_by TEXT,
      review_notes TEXT,
      status TEXT DEFAULT 'pending',         -- 'pending'|'approved'|'rejected'
      submitted_at TEXT DEFAULT (datetime('now')),
      reviewed_at TEXT,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
    );

    /* ── Ranking / advertising packages ──────────────────────── */
    CREATE TABLE IF NOT EXISTS ranking_packages (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,                     -- 'Bronze'|'Silver'|'Gold'|'Platinum'
      type TEXT NOT NULL,                     -- 'vendor_ranking'|'product_ranking'|'ad_boost'
      duration_days INTEGER NOT NULL,
      price REAL NOT NULL,
      features TEXT DEFAULT '[]',            -- JSON array of feature descriptions
      badge_icon TEXT,
      priority_level INTEGER DEFAULT 1,      -- higher = more prominent placement
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    /* ── Active vendor/product rankings (paid) ────────────────── */
    CREATE TABLE IF NOT EXISTS vendor_rankings (
      id TEXT PRIMARY KEY,
      vendor_id TEXT NOT NULL,
      product_id TEXT,                       -- NULL = vendor-level ranking
      package_id TEXT NOT NULL,
      type TEXT NOT NULL,                    -- 'vendor_ranking'|'product_ranking'|'ad_boost'
      status TEXT DEFAULT 'pending_payment', -- 'pending_payment'|'active'|'expired'|'cancelled'
      start_date TEXT,
      end_date TEXT,
      amount_paid REAL,
      payment_reference TEXT,
      placement TEXT,                        -- 'homepage'|'category'|'search'|'all'
      admin_approved INTEGER DEFAULT 0,
      approved_by TEXT,                      -- admin user_id
      lama_recommended INTEGER DEFAULT 0,    -- 1 = LAMA recommended this
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (package_id) REFERENCES ranking_packages(id)
    );

    /* ── Store visit tracking ─────────────────────────────────── */
    CREATE TABLE IF NOT EXISTS store_visits (
      id TEXT PRIMARY KEY,
      vendor_id TEXT NOT NULL,
      visitor_id TEXT,                       -- NULL = anonymous
      visitor_name TEXT,
      session_id TEXT,
      ip_address TEXT,
      visited_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
    );

    /* ── Terms & Conditions acceptance log ───────────────────── */
    CREATE TABLE IF NOT EXISTS terms_acceptances (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      version TEXT NOT NULL DEFAULT '1.0',
      role TEXT NOT NULL,                    -- 'customer' | 'vendor'
      accepted_at TEXT DEFAULT (datetime('now')),
      ip_address TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  /* ── Migrations: safely add columns to existing tables ────── */
  const migrations = [
    `ALTER TABLE orders ADD COLUMN delivery_mode TEXT DEFAULT 'standard'`,
    `ALTER TABLE users  ADD COLUMN gps_enabled INTEGER DEFAULT 0`,
    `ALTER TABLE users  ADD COLUMN preferred_currency TEXT DEFAULT 'NGN'`,
    `ALTER TABLE users  ADD COLUMN is_suspended INTEGER DEFAULT 0`,
    `ALTER TABLE users  ADD COLUMN suspension_reason TEXT`,
    `ALTER TABLE users  ADD COLUMN kyc_status TEXT DEFAULT 'not_submitted'`,
    `ALTER TABLE users  ADD COLUMN terms_accepted INTEGER DEFAULT 0`,
    `ALTER TABLE vendors ADD COLUMN kyc_status TEXT DEFAULT 'not_submitted'`,
    `ALTER TABLE vendors ADD COLUMN ranking_level TEXT DEFAULT 'none'`,
    `ALTER TABLE products ADD COLUMN verification_status TEXT DEFAULT 'pending'`,
    `ALTER TABLE products ADD COLUMN is_ranked INTEGER DEFAULT 0`,
    `ALTER TABLE products ADD COLUMN rank_expires_at TEXT`,
    `ALTER TABLE orders ADD COLUMN vendor_ready_notified INTEGER DEFAULT 0`,
    `ALTER TABLE orders ADD COLUMN ready_for_pickup INTEGER DEFAULT 0`,
    `ALTER TABLE orders ADD COLUMN ready_for_delivery INTEGER DEFAULT 0`,
    `ALTER TABLE orders ADD COLUMN ready_notified_at TEXT`,
  ];
  for (const sql of migrations) {
    try { db.exec(sql); } catch { /* column already exists – ignore */ }
  }

  /* ── Seed default ranking packages if none exist ──────────── */
  const pkgCount = (db.prepare('SELECT COUNT(*) as c FROM ranking_packages').get() as any).c;
  if (pkgCount === 0) {
    const pkgs = [
      { id: 'pkg-bronze-vendor', name: 'Bronze Vendor', type: 'vendor_ranking', days: 7, price: 5000, priority: 1, badge: '🥉', features: JSON.stringify(['Featured in city listings', 'Bronze badge on store']) },
      { id: 'pkg-silver-vendor', name: 'Silver Vendor', type: 'vendor_ranking', days: 14, price: 10000, priority: 2, badge: '🥈', features: JSON.stringify(['Featured in category top', 'Silver badge', 'Priority search ranking']) },
      { id: 'pkg-gold-vendor', name: 'Gold Vendor', type: 'vendor_ranking', days: 30, price: 20000, priority: 3, badge: '🥇', features: JSON.stringify(['Homepage featured slot', 'Gold badge', 'Priority search', 'LAMA recommendation boost']) },
      { id: 'pkg-platinum-vendor', name: 'Platinum Vendor', type: 'vendor_ranking', days: 90, price: 50000, priority: 4, badge: '💎', features: JSON.stringify(['Top homepage slot', 'Platinum badge', 'All category priority', 'Dedicated LAMA promotion', 'Analytics dashboard']) },
      { id: 'pkg-bronze-product', name: 'Bronze Product Boost', type: 'product_ranking', days: 7, price: 2000, priority: 1, badge: '🥉', features: JSON.stringify(['Product in sponsored section', 'Bronze boost badge']) },
      { id: 'pkg-silver-product', name: 'Silver Product Boost', type: 'product_ranking', days: 14, price: 4000, priority: 2, badge: '🥈', features: JSON.stringify(['Category top product', 'Silver boost badge', 'Search priority']) },
      { id: 'pkg-gold-product', name: 'Gold Product Boost', type: 'product_ranking', days: 30, price: 8000, priority: 3, badge: '🥇', features: JSON.stringify(['Homepage featured product', 'Gold boost badge', 'All-section priority']) },
    ];
    const insertPkg = db.prepare(`INSERT OR IGNORE INTO ranking_packages (id, name, type, duration_days, price, priority_level, badge_icon, features) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const p of pkgs) {
      insertPkg.run(p.id, p.name, p.type, p.days, p.price, p.priority, p.badge, p.features);
    }
  }
}

export default getDB;
