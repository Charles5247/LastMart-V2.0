# LastMart 🛒 — Nigeria's Local Marketplace

> A full-stack local marketplace platform. Customers shop from vendors in their city and receive delivery within 48 hours.

**Live Stack**: Next.js 14 · Express.js · SQLite/PostgreSQL · Tailwind CSS v4 · TypeScript · React Native (Expo)

**GitHub**: https://github.com/Charles5247/LastMart-V2.0

---

## ✅ Completed Features (v5.0)

| Module | Features |
|--------|---------|
| **Authentication** | JWT login/register, role-based access (admin, vendor, customer), Terms & Conditions acceptance, referral code on signup |
| **Marketplace** | Product browsing, search, category filters, location-based vendor discovery, store visit tracking |
| **Cart & Checkout** | Add to cart, quantity management, checkout flow, coupon/discount code at checkout |
| **Payment** | Paystack (card, bank transfer, USSD, mobile money), Flutterwave (card, M-Pesa, bank), demo mode |
| **KYC Verification** | Customer (NIN, BVN, ID, selfie) + Vendor (CAC, TIN, director ID, utility bill) |
| **Product Vetting** | Stock proof, brand authenticity, lab certs, NAFDAC, ISO, CE certification upload |
| **File Uploads** | Product images, KYC docs, vetting documents (local disk + Cloudinary ready) |
| **Real-time Notifications** | Server-Sent Events (SSE) — no WebSocket server needed |
| **Email Notifications** | SendGrid / SMTP / Nodemailer — order confirmation, KYC status, welcome email |
| **LAMA AI** | Price suggestions, demand forecasting, platform insights, trend analysis, **budget-based product recommendations** |
| **Ranking & Ads** | Bronze/Silver/Gold/Platinum vendor & product ranking, Ad Boost packages |
| **Analytics** | Revenue charts, store visit heatmap, conversion funnel, LAMA forecast |
| **Multi-language** | English, Yoruba (Yorùbá), Hausa, Igbo |
| **Admin Panel** | Manage vendors, customers, KYC, products, orders, notifications, analytics, **coupon code management** |
| **Vendor QR Codes** | Generate shareable QR + store URL; customers who visit via link get 0.5% coupon |
| **Referral System** | Auto-generated referral links, 0.5% discount for referred users, referral stats dashboard |
| **Coupon System** | Admin-created coupon codes (fixed/percent), usage tracking, auto-referral coupons |
| **Mobile App** | React Native (Expo) scaffold for iOS + Android |
| **Mobile Responsive** | All pages optimised for mobile, tablet, and desktop |

---

## 🏗️ Project Structure

```
lastmart/
├── src/                     # Next.js 14 frontend
│   ├── app/                 # App Router pages
│   │   ├── page.tsx         # Homepage
│   │   ├── marketplace/     # Marketplace browsing
│   │   ├── auth/            # Login & Register (with referral code support)
│   │   ├── lama/            # LAMA AI dashboard (budget recommendations)
│   │   ├── budget/          # Budget planner
│   │   ├── dashboard/
│   │   │   ├── admin/
│   │   │   │   ├── page.tsx              # Admin overview
│   │   │   │   ├── coupons/page.tsx      # ✨ Coupon management (NEW)
│   │   │   │   ├── vendors/              # Manage & approve/suspend vendors
│   │   │   │   ├── customers/            # Manage & suspend customers
│   │   │   │   ├── products/             # All products
│   │   │   │   ├── orders/               # Monitor all orders
│   │   │   │   ├── kyc/                  # Review KYC submissions
│   │   │   │   ├── product-verification/ # Product vetting
│   │   │   │   ├── rankings/             # Ranking/ad applications
│   │   │   │   ├── notifications/        # Broadcast notifications
│   │   │   │   └── analytics/            # Platform analytics
│   │   │   ├── vendor/
│   │   │   │   ├── page.tsx              # Vendor dashboard
│   │   │   │   ├── qr/page.tsx           # ✨ QR code & share link (NEW)
│   │   │   │   ├── products/             # Manage products
│   │   │   │   ├── orders/               # View orders
│   │   │   │   ├── ranking/              # Apply for ranking packages
│   │   │   │   ├── analytics/            # Vendor performance
│   │   │   │   ├── inventory/            # Stock management
│   │   │   │   └── ads/                  # Advertisement management
│   │   │   └── customer/
│   │   │       ├── page.tsx              # Customer dashboard
│   │   │       ├── referrals/page.tsx    # ✨ Referral & coupon wallet (NEW)
│   │   │       ├── orders/               # Order history
│   │   │       ├── saved/                # Saved vendors
│   │   │       └── settings/             # Profile settings
│   │   ├── product/         # Product detail page
│   │   ├── vendor/          # Public vendor store page
│   │   ├── payment/         # Payment pages
│   │   ├── verification/    # KYC submission page
│   │   └── terms/           # Terms & Conditions
│   ├── components/
│   │   ├── layout/Navbar.tsx     # Responsive navbar
│   │   ├── AppContext.tsx         # Global state
│   │   ├── ui/ProductCard.tsx     # Product card component
│   │   └── LanguageSwitcher.tsx
│   ├── hooks/
│   │   └── useSSE.ts             # Real-time SSE hook
│   ├── lib/
│   │   ├── i18n.ts               # Internationalization
│   │   └── utils.ts
│   └── locales/                  # Translation files (en, yo, ha, ig)
│
├── backend/                 # Express.js API server (Port 5000)
│   └── src/
│       ├── server.ts        # Entry point
│       ├── lib/
│       │   ├── db.ts        # SQLite database + full schema
│       │   ├── auth.ts      # JWT helpers
│       │   ├── email.ts     # Email service (SendGrid/SMTP)
│       │   └── sse.ts       # SSE manager
│       └── routes/
│           ├── auth.ts      # Login, register (with referral on signup)
│           ├── products.ts, vendors.ts, orders.ts, cart.ts
│           ├── categories.ts, reviews.ts, users.ts, admin.ts
│           ├── payment.ts   # Paystack + Flutterwave
│           ├── upload.ts    # File uploads
│           ├── verification.ts # KYC + product vetting
│           ├── ranking.ts   # Ranking packages
│           ├── lama.ts      # AI insights, price suggestions, budget recs
│           ├── notifications.ts, sse.ts
│           ├── budget.ts, delivery.ts, ads.ts
│           ├── coupons.ts   # ✨ Coupons + referral system (NEW)
│           └── qr.ts        # ✨ Vendor QR codes + share links (NEW)
│
├── mobile/                  # React Native (Expo) app
│
├── vercel.json              # ✨ Vercel deployment config (NEW)
├── .vercelignore            # ✨ Excludes backend from Vercel build (NEW)
├── package.json             # Frontend dependencies (engines: node>=20)
├── next.config.js           # Next.js config + API proxy
├── DATABASE_SCHEMA.sql      # Full DB schema reference
└── ecosystem.config.cjs     # PM2 config for local/VPS dev
```

---

## 📅 Development Timeline

### Phase 1 — Foundation (March 2026)
- **March 14**: Project scaffolded with Next.js 14, Tailwind v4, TypeScript
- **March 14**: Express.js backend, SQLite schema, JWT authentication
- **March 16**: Homepage, marketplace browsing, product listings
- **March 18**: Cart, checkout, order management
- Commit: `Initial commit`

### Phase 2 — Core Features (Late March – Early April 2026)
- **March 18 – April 22**: KYC verification system (customer + vendor documents)
- Product vetting with certification uploads
- Multi-language support: English, Yorùbá, Hausa, Igbo
- Vendor analytics, store visit tracking
- Admin panel (manage vendors, KYC, orders, notifications)
- Ranking & advertising packages (Bronze → Platinum)
- React Native (Expo) mobile app scaffold
- Commit: `v2.0`

### Phase 3 — Advanced Features (April 22–24, 2026)
- **April 22–23**: Real payment gateways — Paystack + Flutterwave integration
- KYC file upload (NIN, BVN, CAC, TIN, photos, utility bills)
- Server-Sent Events (SSE) for real-time push notifications
- Email system: SendGrid + Nodemailer (order, KYC, welcome emails)
- LAMA AI: price suggestions, demand forecasting, platform insights
- Vendor analytics dashboard with charts
- Deployment documentation (Vercel + Railway, Netlify + Render, Docker, VPS)
- Commits: `v3.0` (dcc062c), `v4.0` (d1552f4)

### Phase 4 — UX & Engagement (April 25, 2026)
- **April 25**: Mobile responsiveness audit & fixes across all screen sizes
- LAMA AI: budget-based product recommendation tab
- Vendor QR code generator + shareable store URL (`/dashboard/vendor/qr`)
- Referral coupon system — 0.5% auto-discount for referred users
- Admin coupon management (`/dashboard/admin/coupons`)
- Customer referral dashboard (`/dashboard/customer/referrals`)
- Navigation links added to all dashboards
- `vercel.json` created; `.vercelignore` excludes backend from Vercel build
- `engines` field added to `package.json` (node >=20, npm >=10)
- README updated with full development timeline
- Commit: `v5.0`

### Phase 5 — Vercel Deployment Fix (April 28, 2026)
- **Root cause**: Vercel's `experimentalServices` feature does **not** support Express/Node.js backends. Adding a `"backend"` service entry causes *"no framework could be detected"* error because Vercel only recognises specific frontend frameworks (Next.js, Remix, etc.) in that feature.
- **Fix**: Reverted `vercel.json` to a clean Next.js-only config. Vercel deploys the frontend only; `next.config.js` proxies `/api/*` requests to `BACKEND_API_URL` (set as an env var pointing to Railway/Render) at runtime — no backend code ever runs on Vercel.
- **`.vercelignore`**: Removed `backend/` from the ignore list (it was causing confusion); only non-essential runtime files are ignored.
- README updated with explicit `vercel.json` rules, architecture warning, and Railway setup guide
- Commit: `v5.1`

### Phase 6 — Security CVE Fix + Railway Unblock (April 28, 2026)
- **Root cause**: Railway's security scanner blocked deployment because `package-lock.json` pinned `next@14.2.29`, which contains two HIGH severity CVEs:
  - `CVE-2025-55184` — https://github.com/vercel/next.js/security/advisories/GHSA-mwv6-3258-q52c
  - `CVE-2025-67779` — https://github.com/vercel/next.js/security/advisories/GHSA-5j59-xgg2-r9c4
- **Fix 1**: Upgraded `next` from `^14.2.29` → `^14.2.35` (patched release). Both CVEs cleared. `package-lock.json` regenerated.
- **Fix 2**: Added `.npmrc` at repo root with `legacy-peer-deps=true` to resolve peer dependency conflict between `eslint@^9` and `eslint-config-next@14.2.x` (which requires `eslint@^7 || ^8`). Without this, Railway's `npm install` step would fail after the security scan passes.
- Build verified locally with `next build` — exit 0, all pages compiled.
- Commit: `v5.2`

---

## 🚀 Quick Start (Development)

### Prerequisites
- Node.js ≥ 20
- npm ≥ 10

### 1. Clone & Install

```bash
git clone https://github.com/Charles5247/LastMart-V2.0.git
cd LastMart-V2.0

# Install all dependencies (frontend + backend)
npm run install:all
```

### 2. Environment Variables

**Frontend** — create `.env.local` in project root:
```env
BACKEND_API_URL=http://localhost:5000
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_your_paystack_public_key
```

**Backend** — create `backend/.env`:
```env
# Server
PORT=5000
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Database (SQLite - default, no config needed)
DATABASE_PATH=../lastmart.db

# Payment Gateways
PAYSTACK_SECRET_KEY=sk_test_your_paystack_secret_key
PAYSTACK_PUBLIC_KEY=pk_test_your_paystack_public_key
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST_your_flutterwave_key
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST_your_flutterwave_key
FLW_WEBHOOK_HASH=your_flutterwave_webhook_hash

# Email (choose one)
SENDGRID_API_KEY=SG.your_sendgrid_key
# OR SMTP:
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM_NAME=LastMart
EMAIL_FROM_ADDRESS=noreply@lastmart.com

# File Storage (optional - local disk is default)
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
```

### 3. Run Development Servers

```bash
# Run both frontend + backend together
npm run dev:all

# OR run separately:
npm run dev:backend    # Express API on http://localhost:5000
npm run dev:frontend   # Next.js on http://localhost:3000
```

### 4. Build for Production

```bash
# Build frontend
npm run build

# Build backend
npm run build:backend

# Start both
npm run start:backend  # Express on port 5000
npm run start          # Next.js on port 3000
```

---

## 🗄️ Database

**Development**: SQLite (auto-created as `lastmart.db` on first run — no setup needed)

```bash
# Seed test data
cd backend && npm run seed
```

**Production**: PostgreSQL (Supabase / Neon / Railway) — set `DATABASE_URL` in backend `.env` and run `DATABASE_SCHEMA.sql`.

---

## 🌐 Deployment Guide

> ⚠️ **Architecture note — why the backend cannot run on Vercel:**
> LastMart uses `better-sqlite3` (native binary) and a persistent Express server.
> Vercel's serverless runtime does **not** support native Node.js add-ons or long-running
> processes. Attempting to deploy the backend on Vercel (e.g. via `experimentalServices`)
> will always fail with *"no framework could be detected"* or native module errors.
> **The only correct approach is to deploy frontend and backend separately.**
>
> `next.config.js` already proxies all `/api/*` requests to `BACKEND_API_URL` at runtime,
> so the frontend on Vercel talks to the backend on Railway/Render/VPS transparently.

---

### Option A: Vercel (Frontend) + Railway (Backend) ⭐ Recommended

#### Frontend → Vercel

1. Connect your GitHub repo at [vercel.com](https://vercel.com) → Import → `LastMart-V2.0`
2. Vercel auto-detects Next.js and uses the included `vercel.json`.
3. Set these environment variables in the Vercel dashboard **before** deploying:
   | Variable | Value |
   |----------|-------|
   | `BACKEND_API_URL` | `https://your-backend.railway.app` |
   | `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | `pk_live_...` |
4. Click **Deploy** — done.

> **Important `vercel.json` rules:**
> - Do **not** add `experimentalServices` — Vercel cannot detect/run the Express backend.
> - Do **not** add a `"backend"` service entry — it will always error.
> - The included `vercel.json` is correct as-is; do not modify it.

```json
{
  "version": 2,
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install --legacy-peer-deps",
  "env": {
    "BACKEND_API_URL": "@backend_api_url"
  },
  "build": {
    "env": {
      "BACKEND_API_URL": "@backend_api_url"
    }
  }
}
```

#### Backend → Railway

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Select `LastMart-V2.0` and set the **root directory** to `backend`
3. Railway auto-detects the `Procfile` and runs `node dist/server.js`
4. Set all environment variables in the Railway dashboard (see env table below)
5. Copy the Railway public URL → paste it as `BACKEND_API_URL` in your Vercel project

**`backend/Procfile`** (already committed — Railway reads this automatically):
```
web: node dist/server.js
```

**Railway build settings** (set in dashboard):
```
Root Directory : backend
Build Command  : npm install && npm run build
Start Command  : npm start
```

---

### Option B: Netlify (Frontend) + Render (Backend)

**Frontend `netlify.toml`**:
```toml
[build]
  command = "npm run build"
  publish = ".next"

[[redirects]]
  from   = "/api/*"
  to     = "https://your-backend.onrender.com/api/:splat"
  status = 200

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

**Backend → Render**: New Web Service → root dir `backend` → build `npm install && npm run build` → start `npm start`.

---

### Option C: VPS (Ubuntu + PM2)

```bash
git clone https://github.com/Charles5247/LastMart-V2.0.git /var/www/lastmart
cd /var/www/lastmart
npm run install:all
npm run build && npm run build:backend
pm2 start ecosystem.config.cjs
pm2 save && pm2 startup
```

---

## 💳 Payment Setup

| Gateway | Webhook URL |
|---------|------------|
| Paystack | `https://your-backend.com/api/payment/webhook/paystack` |
| Flutterwave | `https://your-backend.com/api/payment/webhook/flutterwave` |

---

## 🔑 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register (optional `ref` query for referral) |
| POST | `/api/auth/login` | Login |
| GET | `/api/products` | List products |
| GET | `/api/vendors` | List vendors |
| POST | `/api/cart` | Add to cart |
| POST | `/api/orders` | Place order |
| POST | `/api/payment/initiate` | Start payment |
| POST | `/api/payment/verify` | Verify payment |
| POST | `/api/upload/kyc-document` | Upload KYC doc |
| GET | `/api/lama/price-suggestions` | AI price advice |
| GET | `/api/lama/demand-forecast` | Demand forecast |
| GET | `/api/lama/recommend?budget=5000` | Budget-based product recs |
| GET | `/api/coupons/validate/:code` | Validate coupon |
| POST | `/api/coupons/referral/generate` | Generate referral link |
| GET | `/api/qr/vendor/:id` | Get vendor QR + share link |
| GET | `/api/sse` | Real-time SSE stream |
| GET | `/api/admin/analytics` | Platform analytics |

Full route docs: see each file in `backend/src/routes/`.

---

## 🛠️ Tech Stack

**Frontend**: Next.js 14, React 19, TypeScript, Tailwind CSS v4, Recharts, i18next  
**Backend**: Express.js, TypeScript, better-sqlite3, JWT, Multer, Nodemailer, Axios  
**Payment**: Paystack, Flutterwave  
**Storage**: Local disk / Cloudinary / AWS S3  
**Email**: SendGrid / SMTP / Nodemailer  
**Real-time**: Server-Sent Events (SSE)  
**Mobile**: React Native (Expo), Expo Router, SecureStore  
**AI**: LAMA (rule-based analytics engine)  
**Deployment**: Vercel + Railway / Netlify + Render / Docker / VPS  

---

## 👤 Role Capabilities

| Role | Capabilities |
|------|-------------|
| **Admin** | Full platform control — manage vendors, KYC, orders, analytics, notifications, **coupon management** |
| **Vendor** | Manage store, products, orders, KYC, ranking, analytics, **QR code + share link** |
| **Customer** | Browse, cart, checkout, order tracking, KYC, budget planner, **referral links + coupon wallet** |

---

## 📋 Environment Variables Summary

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | ✅ | Secret for JWT signing |
| `PAYSTACK_SECRET_KEY` | Payments | Paystack API key |
| `FLUTTERWAVE_SECRET_KEY` | Payments | Flutterwave API key |
| `SENDGRID_API_KEY` | Emails | SendGrid key |
| `SMTP_HOST/USER/PASS` | Emails | SMTP config |
| `CLOUDINARY_URL` | Cloud uploads | Cloudinary URL |
| `DATABASE_URL` | PostgreSQL | DB connection string |
| `FRONTEND_URL` | ✅ Backend | Frontend origin for CORS |
| `BACKEND_API_URL` | ✅ Frontend | Backend URL for API proxy |

---

## 📅 Status

- **Version**: 5.2.0
- **Last Updated**: April 28, 2026
- **GitHub**: https://github.com/Charles5247/LastMart-V2.0
- **Recommended Deployment**: Vercel (frontend) + Railway (backend)

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Commit: `git commit -m 'feat: add my feature'`
4. Push: `git push origin feat/my-feature`
5. Open a Pull Request
