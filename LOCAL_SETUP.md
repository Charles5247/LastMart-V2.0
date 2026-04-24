# 🛒 LastMart – Local Setup Guide

LastMart is a full-stack Nigerian marketplace app with a **separated frontend (Next.js) and backend (Express/TypeScript)**. Run them in two separate terminals.

---

## 📁 Project Structure

```
lastmart/
├── src/                          ← Next.js 16 frontend (App Router)
│   ├── app/
│   │   ├── page.tsx              ← Home (auto-redirects admin/vendor)
│   │   ├── auth/                 ← Login, Register (with T&C acceptance)
│   │   ├── marketplace/          ← Product listings, vendor browse
│   │   ├── verification/         ← KYC submission page (customers & vendors)
│   │   ├── terms/                ← Terms & Conditions page
│   │   ├── dashboard/
│   │   │   ├── admin/            ← Admin-only pages
│   │   │   │   ├── page.tsx      ← Admin analytics overview
│   │   │   │   ├── vendors/      ← Manage & approve/suspend vendors
│   │   │   │   ├── customers/    ← Manage & suspend customers
│   │   │   │   ├── products/     ← All products (activate, feature, rank)
│   │   │   │   ├── orders/       ← Monitor all orders
│   │   │   │   ├── kyc/          ← Review KYC submissions (approve/reject)
│   │   │   │   ├── product-verification/ ← Review product vetting requests
│   │   │   │   ├── rankings/     ← Manage ranking/ad applications + LAMA recs
│   │   │   │   ├── notifications/ ← Broadcast notifications to users
│   │   │   │   └── analytics/    ← Platform analytics charts
│   │   │   ├── vendor/           ← Vendor-only pages
│   │   │   │   ├── page.tsx      ← Vendor dashboard (KYC banner + quick links)
│   │   │   │   ├── products/     ← Manage products + submit for vetting (🛡️)
│   │   │   │   ├── orders/       ← View orders + notify ready for pickup/delivery
│   │   │   │   ├── ranking/      ← Apply for paid ranking/ad packages
│   │   │   │   ├── analytics/    ← Vendor performance analytics
│   │   │   │   ├── inventory/    ← Stock management
│   │   │   │   └── ads/          ← Advertisement management
│   │   │   └── customer/         ← Customer dashboard
│   │   ├── product/              ← Product detail page
│   │   ├── vendor/               ← Public vendor store page (tracks visits)
│   │   ├── cart/, checkout/      ← Shopping flow
│   │   ├── payment/, delivery/   ← Payment & delivery
│   │   ├── lama/                 ← LAMA AI assistant
│   │   └── budget/               ← Budget planner
│   └── components/
│       ├── layout/Navbar.tsx     ← Responsive navbar (role-aware dashboard links)
│       ├── AppContext.tsx         ← Global state (user, cart, notifications, location)
│       └── ui/                   ← Shared UI components
│
├── backend/                      ← Express API (Port 5000)
│   ├── src/
│   │   ├── server.ts             ← Main server entry point
│   │   ├── lib/
│   │   │   ├── db.ts             ← SQLite singleton + full schema + migrations
│   │   │   └── auth.ts           ← JWT helpers (sign, verify, requireAuth)
│   │   └── routes/
│   │       ├── auth.ts           ← Login, Register (with T&C recording)
│   │       ├── vendors.ts        ← Vendor CRUD + store visit tracking + notifications
│   │       ├── products.ts       ← Product CRUD + featured/ranking
│   │       ├── cart.ts           ← Cart + vendor notification on add-to-cart
│   │       ├── orders.ts         ← Order flow + vendor/customer notifications
│   │       ├── verification.ts   ← KYC (vendor/customer), product vetting, T&C
│   │       ├── ranking.ts        ← Paid ranking packages + notify-ready + LAMA recs
│   │       ├── admin.ts          ← Full admin control (analytics, suspend, broadcast)
│   │       ├── notifications.ts  ← Read/mark notifications
│   │       ├── lama.ts           ← LAMA AI insights
│   │       ├── ads.ts            ← Advertisements
│   │       ├── categories.ts     ← Product categories
│   │       ├── reviews.ts        ← Product reviews
│   │       ├── users.ts          ← User profile management
│   │       ├── payment.ts        ← Payment gateway integration
│   │       ├── delivery.ts       ← Delivery address management
│   │       ├── budget.ts         ← Customer budgeting
│   │       └── upload.ts         ← File upload handling
│   ├── dist/                     ← Compiled JS (run: npm run build)
│   ├── package.json
│   ├── tsconfig.json
│   └── ecosystem.config.cjs      ← PM2 config (dev mode with ts-node-dev)
│
├── lastmart.db                   ← Shared SQLite database (DO NOT DELETE)
├── ecosystem.config.cjs          ← PM2 config for frontend (next start)
├── package.json                  ← Frontend deps
└── next.config.ts                ← Next.js config (API rewrites to :5000)
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm 9+

### Terminal 1 – Backend API (Port 5000)

```bash
cd lastmart/backend

# Install deps (first time only)
npm install

# Development mode (auto-reload on changes)
npm run dev

# OR production mode
npm run build
node dist/server.js
```

### Terminal 2 – Frontend (Port 3000)

```bash
cd lastmart

# Install deps (first time only)
npm install

# Development mode
npm run dev

# OR production build
npm run build
npm start
```

### Access the App
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000
- **API Health:** http://localhost:5000/health

---

## 🔑 Default Test Accounts

After seeding (`cat lastmart_seed.sql | sqlite3 lastmart.db`):

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@lastmart.ng | admin123 |
| Vendor | vendor@test.ng | vendor123 |
| Customer | customer@test.ng | customer123 |

---

## 🗄️ Database

The SQLite database (`lastmart.db`) is shared between frontend and backend. The schema is auto-created on first backend start via `initializeDB()` in `backend/src/lib/db.ts`.

**Key Tables:**
- `users` – all roles (customer, vendor, admin) with `is_suspended`, `kyc_status`, `terms_accepted`
- `vendors` – store profiles with `status`, `kyc_status`, `ranking_level`
- `products` – listings with `verification_status`, `is_ranked`, `is_featured`
- `kyc_verifications` – KYC submissions (ID docs, business docs)
- `product_verifications` – product vetting (availability + authenticity proofs)
- `vendor_rankings` – paid ranking/ad applications
- `ranking_packages` – available packages (Bronze/Silver/Gold/Platinum)
- `store_visits` – tracks every store page visit
- `notifications` – all in-app notifications
- `terms_acceptances` – T&C acceptance records
- `orders`, `order_items` – order management with `ready_for_pickup/delivery` flags
- `advertisements`, `lama_insights` – ads and LAMA AI

---

## 📡 API Overview

All API endpoints are proxied from Next.js (`/api/*` → `http://localhost:5000/api/*`).

| Namespace | Purpose |
|-----------|---------|
| `POST /api/auth/register` | Register with T&C acceptance |
| `POST /api/auth/login` | Login (blocks suspended accounts) |
| `GET/POST /api/verification/kyc` | Submit & check KYC status |
| `PUT /api/verification/kyc/:id` | Admin: approve/reject KYC |
| `POST /api/verification/product` | Vendor: submit product for vetting |
| `PUT /api/verification/product/:id` | Admin: approve/reject product vetting |
| `POST/GET /api/verification/terms` | Accept & check T&C |
| `GET /api/ranking/packages` | List paid ranking packages |
| `POST /api/ranking/apply` | Vendor: apply for ranking |
| `PUT /api/ranking/admin/:id` | Admin: approve/reject ranking |
| `GET /api/ranking/lama-recommendations` | LAMA: suggest what to rank |
| `POST /api/ranking/notify-ready` | Vendor: order ready for pickup/delivery |
| `GET /api/vendors/:id` | Public vendor store (tracks visit, notifies vendor) |
| `POST /api/cart` | Add to cart (notifies vendor) |
| `POST /api/orders` | Place order (notifies vendor + customer) |
| `GET /api/admin/analytics` | Full platform stats |
| `PUT /api/admin/customers/:id` | Suspend/unsuspend customer |
| `PUT /api/admin/vendors` | Approve/suspend vendor |
| `PUT /api/admin/products/:id` | Activate/feature/rank product |
| `POST /api/admin/notifications` | Broadcast to all/role/specific user |
| `GET /api/admin/store-visits` | Store visit analytics |

---

## 🔔 Notification Triggers

| Event | Who Gets Notified |
|-------|-------------------|
| Customer visits vendor store | Vendor |
| Customer adds product to cart | Vendor |
| Customer places order | Vendor + Customer |
| Vendor ships/updates order | Customer |
| Vendor marks order ready | Customer + Admin |
| KYC submitted | Admin |
| KYC approved/rejected | User |
| Product submitted for vetting | Admin |
| Product vetting result | Vendor |
| Ranking application submitted | Admin |
| Ranking approved/rejected | Vendor |
| Admin broadcast | All / Role / Specific user |
| Account suspended/restored | User |

---

## 👤 Role-Based Access

| Feature | Customer | Vendor | Admin |
|---------|----------|--------|-------|
| Home page / shopping | ✅ | ❌ (redirected) | ❌ (redirected) |
| Marketplace browsing | ✅ | ✅ | ✅ |
| Place orders / cart | ✅ | ❌ | ❌ |
| Vendor dashboard | ❌ | ✅ | ❌ |
| Admin dashboard | ❌ | ❌ | ✅ |
| KYC submission | ✅ | ✅ | ❌ |
| Product vetting submit | ❌ | ✅ | ❌ |
| Review KYC/vetting | ❌ | ❌ | ✅ |
| Ranking packages | ❌ | ✅ (apply) | ✅ (manage) |
| Suspend accounts | ❌ | ❌ | ✅ |
| Broadcast notifications | ❌ | ❌ | ✅ |

---

## 🛠️ PM2 Usage (Production-like)

```bash
# Start backend
cd backend && pm2 start ecosystem.config.cjs

# Start frontend (requires npm run build first)
npm run build && pm2 start ecosystem.config.cjs

# Monitor
pm2 list
pm2 logs lastmart-api --nostream
pm2 logs lastmart --nostream
```

---

## 🗝️ Environment Variables

**Backend** (`backend/.env` or system env):
```
PORT=5000
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

**Frontend** (`.env.local`):
```
NEXT_PUBLIC_API_URL=http://localhost:5000
```
