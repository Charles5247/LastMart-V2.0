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
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { userRoles, kycStatuses, vendorStatuses, rankingLevel, productVerificationStatus, orderStatuses, deliveryModes, paymentMethods, paymentStatus, advertStatus, transactionType, transactionStatus, paymentGateways, budgetPeriods, lamaInsightType, lamaTargetRoles, kycIdTypes, businessType, productAvailability, productAuthenticity, rankingType, rankingStatus, rankingAdPlacement, userTCRoles, couponTypes, referralStatus,  } from './types';
import { IAdvertisement, IBudgetPlan, ICartItem, ICategory, ICoupon, IDeliveryAddress, ILamaInsight, INotification, IOrder, IOrderItem, IPayment, IProduct, IRecurringPurchase, IReview, ITransaction, IUser, IVendor } from './interface';

/** Absolute path to the SQLite database file. Uses DATABASE_PATH when provided. */
const DB_PATH = process.env.DATABASE_PATH
  ? path.resolve(process.cwd(), process.env.DATABASE_PATH)
  : path.join(__dirname, '../../..', 'lastmart.db');

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

    /* ── Coupon codes ─────────────────────────────────────────── */
    CREATE TABLE IF NOT EXISTS coupons (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL DEFAULT 'fixed',    -- 'fixed'|'percent'|'referral'
      value REAL NOT NULL,                   -- amount off or percent
      min_order REAL DEFAULT 0,
      max_uses INTEGER DEFAULT 0,            -- 0 = unlimited
      uses_count INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      expires_at TEXT,
      created_by TEXT,                       -- admin user_id
      description TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    /* ── Referral tracking ────────────────────────────────────── */
    CREATE TABLE IF NOT EXISTS referrals (
      id TEXT PRIMARY KEY,
      referrer_id TEXT NOT NULL,             -- user who shared the link
      referred_id TEXT,                      -- user who registered via link
      vendor_id TEXT,                        -- set if via vendor store URL
      coupon_id TEXT,                        -- coupon auto-generated for referred_id
      status TEXT DEFAULT 'pending',         -- 'pending'|'completed'
      reward_amount REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT,
      FOREIGN KEY (referrer_id) REFERENCES users(id),
      FOREIGN KEY (coupon_id) REFERENCES coupons(id)
    );

    /* ── Coupon usage log ─────────────────────────────────────── */
    CREATE TABLE IF NOT EXISTS coupon_uses (
      id TEXT PRIMARY KEY,
      coupon_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      order_id TEXT,
      discount_amount REAL NOT NULL,
      used_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (coupon_id) REFERENCES coupons(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    /* ── Vendor share links / QR tokens ──────────────────────── */
    CREATE TABLE IF NOT EXISTS vendor_share_links (
      id TEXT PRIMARY KEY,
      vendor_id TEXT NOT NULL UNIQUE,
      share_token TEXT UNIQUE NOT NULL,
      qr_data TEXT,                          -- base64 QR PNG cached
      scans INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
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
    `ALTER TABLE orders ADD COLUMN coupon_id TEXT`,
    `ALTER TABLE orders ADD COLUMN discount_amount REAL DEFAULT 0`,
    `ALTER TABLE users  ADD COLUMN referral_code TEXT`,
    `ALTER TABLE users  ADD COLUMN referred_by TEXT`,
    `ALTER TABLE vendors ADD COLUMN share_token TEXT`,
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


const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: userRoles, default: userRoles.CUSTOMER },
  avatar: String,
  phone: String,
  address: String,
  city: String,
  latitude: Number,
  longitude: Number,
  gps_enabled: { type: Boolean, default: false },
  preferred_currency: { type: String, default: 'NGN' },
  is_verified: { type: Boolean, default: false },
  verification_token: { type: Number, default: null },
  verification_expires_at: { type: Date, default: null },
  is_suspended: { type: Boolean, default: false },
  suspension_reason: String,
  kyc_status: { type: String, enum: kycStatuses, default: kycStatuses.NOT_SUBMITTED },
  terms_accepted: { type: Boolean, default: false },
  referral_code: String,
  referred_by: {type: mongoose.Schema.Types.ObjectId},
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })

const vendorSchema = new mongoose.Schema({
  user_id : {type: mongoose.Schema.Types.ObjectId, required: true, unique: true, ref: 'User'},
  store_name: { type: String, required: true },
  description: String,
  logo: String,
  banner: String,
  category: String,
  city: { type: String, required: true },
  address: String,
  latitude: Number,
  longitude: Number,
  phone: String,
  email: String,
  status: { type: String, enum: vendorStatuses, default: vendorStatuses.PENDING },
  is_featured: { type: Boolean, default: false },
  rating: { type: Number, default: 0 },
  total_reviews: { type: Number, default: 0 },
  total_sales: { type: Number, default: 0 },
  ad_balance: { type: Number, default: 0 },
  kyc_status: { type: String, enum: kycStatuses, default: kycStatuses.NOT_SUBMITTED },
  ranking_level: { type: String, enum: rankingLevel, default: rankingLevel.NONE },
  share_token: String,
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  icon: String,
  image: String,
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })

const productSchema = new mongoose.Schema({
  vendor_id : {type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Vendor'},
  category_id : {type: mongoose.Schema.Types.ObjectId, ref: 'Category'},
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  original_price: Number,
  images: [{type: String}],
  stock: { type: Number, default: 0 },
  unit: { type: String, default: 'piece' },
  is_active: { type: Boolean, default: true },
  is_featured: { type: Boolean, default: false },
  is_sponsored: { type: Boolean, default: false },
  rating: { type: Number, default: 0 },
  total_reviews: { type: Number, default: 0 },
  total_sales: { type: Number, default: 0 },
  tags: [{ type: String }],
  verification_status: { type: String, enum: productVerificationStatus, default: productVerificationStatus.PENDING },
  is_ranked: { type: Boolean, default: false },
  rank_expires_at: Date,
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })

const orderSchema = new mongoose.Schema({
  customer_id : {type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User'},
  vendor_id : {type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Vendor'},
  status: { type: String, enum: orderStatuses, default: orderStatuses.PENDING },
  total_amount: { type: Number, required: true },
  delivery_fee: { type: Number, default: 0 },
  delivery_address: { type: String, required: true },
  delivery_city: { type: String, required: true },
  delivery_lat: Number,
  delivery_lng: Number,
  delivery_mode: { type: String, enum: deliveryModes, default: deliveryModes.STANDARD },
  payment_method: { type: String, enum: paymentMethods, default: paymentMethods.CARD },
  payment_status: { type: String, enum: paymentStatus, default: paymentStatus.PENDING },
  notes: String,
  estimated_delivery: Date,
  actual_delivery: Date,
  tracking_updates: [{ type: String }],
  vendor_ready_notified: { type: Boolean, default: false },
  ready_for_pickup: { type: Boolean, default: false },
  ready_for_delivery: { type: Boolean, default: false },
  ready_notified_at: Date,
  coupon_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },
  discount_amount: { type: Number, default: 0 },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })

const orderItemSchema = new mongoose.Schema({
  order_id : {type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Order'},
  product_id : {type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Product'},
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  product_name: { type: String, required: true },
  product_image: String,
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })

const cartItemSchema = new mongoose.Schema({
  user_id : { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User', unique: true },
  product_id : { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Product', unique: true },
  quantity: { type: Number, required: true, default: 1 },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })

const reviewSchema = new mongoose.Schema({
  customer_id : { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  vendor_id : { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Vendor' },
  product_id : { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  order_id : { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: String,
  images: [{ type: String }]
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })

const notificationSchema = new mongoose.Schema({
  user_id : { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  type: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  data: { type: Object, default: {} },
  is_read: { type: Boolean, default: false },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })

const advertisementSchema = new mongoose.Schema({
  vendor_id : { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Vendor' },
  product_id : { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  type: { type: String, required: true },
  title: { type: String, required: true },
  description: String,
  image: String,
  budget: { type: Number, required: true },
  spent: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  impressions: { type: Number, default: 0 },
  status: { type: String, enum: advertStatus, default: advertStatus.ACTIVE },
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  target_city: String,
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })

const savedVendorSchema = new mongoose.Schema({
  user_id : { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User', unique: true},
  vendor_id : { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Vendor', unique: true},
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })

const transactionSchema = new mongoose.Schema({
  order_id : { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  user_id : { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  amount: { type: Number, required: true },
  type: { type: String, required: true, enum: transactionType },
  status: { type: String, enum: transactionStatus, default: transactionStatus.COMPLETED },
  payment_method: String,
  reference: String,
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })

const paymentSchema = new mongoose.Schema({
  order_id : { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  user_id : { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'NGN' },
  gateway: { type: String, required: true, enum: paymentGateways },
  gateway_ref: String,
  gateway_tx_id: String,
  method: { type: String, required: true, enum: paymentMethods },
  crypto_address: String,
  crypto_currency: String,
  crypto_amount: Number,
  crypto_rate: Number,
  giftcard_code: String,
  giftcard_pin: String,
  status: {type: String, enum: paymentStatus, default: paymentStatus.PENDING},
  metadata: { type: Object, default: {} },
  paid_at: Date,
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })

const deliveryAddressSchema = new mongoose.Schema({
  user_id : { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  label: { type: String, required: true },                     // 'Home'|'Work'|'Other'
  recipient_name: { type: String, required: true },
  recipient_phone: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  state: String,
  country: { type: String, default: 'Nigeria' },
  latitude: Number,
  longitude: Number,
  is_default: { type: Boolean, default: false },
  delivery_instructions: String
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })

const budgetPlanSchema = new mongoose.Schema({
  user_id : { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  name: { type: String, required: true },
  total_budget: { type: Number, required: true },
  spent: { type: Number, default: 0 },
  currency: { type: String, default: 'NGN' },
  period: { type: String, required: true, enum: budgetPeriods },
  start_date: { type: Date, required: true },
  end_date: Date,
  is_active: { type: Boolean, default: true },
  notes: String,
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })

const recurringPurchaseSchema = new mongoose.Schema({
  user_id : { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  budget_plan_id : { type: mongoose.Schema.Types.ObjectId, ref: 'BudgetPlan' },
  product_id : { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Product' }, 
  quantity: { type: Number, default: 1 },
  frequency: { type: String, required: true, enum: budgetPeriods },
  next_order_date: { type: Date, required: true },
  last_ordered_at: Date,
  delivery_address_id : { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryAddress' },
  is_active: { type: Boolean, default: true },
  auto_order: { type: Boolean, default: false },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })

const lamaInsightSchema = new mongoose.Schema({
  type: { type: String, required: true, enum: lamaInsightType },
  target_role: { type: String, required: true, enum: lamaTargetRoles },
  target_user_id: String,
  title: { type: String, required: true },
  body: { type: String, required: true },
  data: { type: Object, default: {} },
  is_read: { type: Boolean, default: false },
  expires_at: Date,
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })

const productImageSchema = new mongoose.Schema({
  vendor_id : { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Vendor' },
  product_id : { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  filename: { type: String, required: true },
  original_name: String,
  file_path: { type: String, required: true },
  file_size: Number,
  mime_type: String,
  is_validated: { type: Boolean, default: false },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })

const kycVerificationSchema = new mongoose.Schema({
  user_id : { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  type: { type: String, required: true, enum: ['customer_kyc', 'vendor_kyc'] },
  // Customer KYC fields
  bvn: String,
  nin: String,
  selfie_url: String,
  id_type: { type: String, enum: kycIdTypes },
  id_number: String,
  id_front_url: String,
  id_back_url: String,
  // Vendor-specific KYC fields
  business_name: String,
  business_reg_number: String,
  tin: String,
  business_type: { type: String, enum: businessType },
  business_address: String,
  cac_doc_url: String,
  tax_cert_url: String,
  utility_bill_url: String,
  director_id_url: String,
  // Status tracking
  status: { type: String, enum: kycStatuses, default: kycStatuses.NOT_SUBMITTED },
  reviewed_by: String,
  rejection_reason: String,
  submitted_at: { type: Date, default: Date.now },
  reviewed_at: Date,
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })

const productVerificationSchema = new mongoose.Schema({
  product_id : { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Product' },
  vendor_id : { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Vendor' },
  // Availability proof
  availability_status: { type: String, enum: productAvailability, default: productAvailability.PENDING },
  stock_proof_url: String,
  expected_restock_date: Date,
  // Authenticity proof
  authenticity_status: { type: String, enum: productAuthenticity, default: productAuthenticity.PENDING },
  brand_auth_doc_url: String,
  invoice_url: String,
  lab_cert_url: String,
  origin_doc_url: String,
  // Disclaimers acknowledged
  disclaimer_accepted: { type: Boolean, default: false },
  disclaimer_text: String,
  // Admin review
  reviewed_by: String,
  review_notes: String,
  status: { type: String, enum: productVerificationStatus, default: productVerificationStatus.PENDING },
  submitted_at: { type: Date, default: Date.now },
  reviewed_at: Date,
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })

const rankingPackageSchema = new mongoose.Schema({
  name: { type: String, required: true, enum: rankingLevel },
  type: { type: String, required: true, enum: rankingType },
  duration_days: { type: Number, required: true },
  price: { type: Number, required: true },
  features: { type: [String], default: [] },
  badge_icon: String,
  priority_level: { type: Number, default: 1 },
  is_active: { type: Boolean, default: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })

const vendorRankingSchema = new mongoose.Schema({
  vendor_id : { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Vendor' },
  product_id : { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  package_id : { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'RankingPackage' },
  type: { type: String, required: true, enum: rankingType },
  status: { type: String, enum: rankingStatus, default: rankingStatus.PENDING },
  start_date: Date,
  end_date: Date,
  amount_paid: Number,
  payment_reference: String,
  placement: { type: String, enum: rankingAdPlacement },
  admin_approved: { type: Boolean, default: false },
  approved_by: String,
  lama_recommended: { type: Boolean, default: false },
  notes: String,
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })

const storeVisitSchema = new mongoose.Schema({
  vendor_id : { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Vendor' },
  visitor_id : { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  visitor_name: String,
  session_id: String,
  ip_address: String,
  visited_at: { type: Date, default: Date.now },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })

const termsAcceptanceSchema = new mongoose.Schema({
  user_id : { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  version: { type: String, required: true, default: '1.0' },
  role: { type: String, required: true, enum: userTCRoles },
  accepted_at: { type: Date, default: Date.now },
  ip_address: String,
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  type: { type: String, required: true, enum: couponTypes, default: couponTypes.FIXED },
  value: { type: Number, required: true },
  min_order: { type: Number, default: 0 },
  max_uses: { type: Number, default: 0 },
  uses_count: { type: Number, default: 0 }, 
  is_active: { type: Boolean, default: true },
  expires_at: Date,
  created_by: String,
  description: String,
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })

const referralSchema = new mongoose.Schema({
  referrer_id : { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  referred_id : { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  vendor_id : { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  coupon_id : { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },
  status: { type: String, enum: referralStatus, default: referralStatus.PENDING },
  reward_amount: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
  completed_at: Date,
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })

const couponUseSchema = new mongoose.Schema({
  coupon_id : { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Coupon' },
  user_id : { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  order_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  discount_amount: { type: Number, required: true },
  used_at: { type: Date, default: Date.now },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })

const vendorShareLinkSchema = new mongoose.Schema({
  vendor_id : { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Vendor', unique: true },
  share_token: { type: String, required: true, unique: true },
  qr_data: String,
  scans: { type: Number, default: 0 },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })

userSchema.pre('save', async function(this: any) {
  if (this.isModified('password')){
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
})


const Users = mongoose.model<IUser>('User', userSchema);
const Vendors = mongoose.model<IVendor>('Vendor', vendorSchema);
const Categories = mongoose.model<ICategory>('Category', categorySchema);
const Products = mongoose.model<IProduct>('Product', productSchema);
const Orders = mongoose.model<IOrder>('Order', orderSchema);
const OrderItems = mongoose.model<IOrderItem>('OrderItem', orderItemSchema);
const CartItems = mongoose.model<ICartItem>('CartItem', cartItemSchema);
const Reviews = mongoose.model<IReview>('Review', reviewSchema);
const Notifications = mongoose.model<INotification>('Notification', notificationSchema);
const Advertisements = mongoose.model<IAdvertisement>('Advertisement', advertisementSchema);
const SavedVendors = mongoose.model('SavedVendor', savedVendorSchema);
const Transactions = mongoose.model<ITransaction>('Transaction', transactionSchema);
const Payments = mongoose.model<IPayment>('Payment', paymentSchema);
const DeliveryAddresses = mongoose.model<IDeliveryAddress>('DeliveryAddress', deliveryAddressSchema);
const BudgetPlans = mongoose.model<IBudgetPlan>('BudgetPlan', budgetPlanSchema);
const RecurringPurchases = mongoose.model<IRecurringPurchase>('RecurringPurchase', recurringPurchaseSchema);
const LamaInsights = mongoose.model<ILamaInsight>('LamaInsight', lamaInsightSchema);
const ProductImages = mongoose.model('ProductImage', productImageSchema);
const KYCVerifications = mongoose.model('KYCVerification', kycVerificationSchema);
const ProductVerifications = mongoose.model('ProductVerification', productVerificationSchema);
const RankingPackages = mongoose.model('RankingPackage', rankingPackageSchema);
const VendorRankings = mongoose.model('VendorRanking', vendorRankingSchema);
const StoreVisits = mongoose.model('StoreVisit', storeVisitSchema);
const TermsAcceptances = mongoose.model('TermsAcceptance', termsAcceptanceSchema);
const Coupons = mongoose.model<ICoupon>('Coupon', couponSchema);
const Referrals = mongoose.model('Referral', referralSchema);
const CouponUses = mongoose.model('CouponUse', couponUseSchema);
const VendorShareLinks = mongoose.model('VendorShareLink', vendorShareLinkSchema);


export {Users, Vendors, Categories, Products, Orders, OrderItems, CartItems, Reviews, Notifications, Advertisements, SavedVendors, Transactions, Payments, DeliveryAddresses, BudgetPlans, RecurringPurchases, LamaInsights, ProductImages, KYCVerifications, ProductVerifications, RankingPackages, VendorRankings, StoreVisits, TermsAcceptances, Coupons, Referrals, CouponUses, VendorShareLinks};



export default getDB;
