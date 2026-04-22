# LastMart — Full-Stack E-Commerce Platform

> A feature-rich Nigerian marketplace with Express API backend, Next.js frontend,
> AI-powered agent (LAMA), multi-gateway payments, GPS location, recurring purchases,
> and complete delivery management.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Feature List](#3-feature-list)
4. [Prerequisites](#4-prerequisites)
5. [Quick Start](#5-quick-start)
6. [Environment Variables](#6-environment-variables)
7. [Running in Development](#7-running-in-development)
8. [Running in Production (PM2)](#8-running-in-production-pm2)
9. [API Reference](#9-api-reference)
10. [Payment Gateway Guide](#10-payment-gateway-guide)
11. [LAMA AI Agent](#11-lama-ai-agent)
12. [Data Model & Database](#12-data-model--database)
13. [Image Uploads](#13-image-uploads)
14. [GPS Location](#14-gps-location)
15. [Deployment](#15-deployment)
16. [Troubleshooting](#16-troubleshooting)
17. [Credentials for Testing](#17-credentials-for-testing)

---

## 1. Project Overview

LastMart is a multi-vendor e-commerce marketplace targeted at Nigerian consumers.

| Dimension   | Detail |
|-------------|--------|
| Frontend    | Next.js 16 (App Router) + Tailwind CSS v4 |
| Backend     | Express 4 + TypeScript (ts-node-dev) |
| Database    | SQLite 3 via `better-sqlite3` (shared file: `lastmart.db`) |
| Auth        | JWT (jsonwebtoken) stored in localStorage + httpOnly cookies |
| Payments    | Paystack · Flutterwave · CoinGate (BTC/ETH/USDT/BNB/SOL) · Gift Cards |
| AI Agent    | LAMA — rule-based with OpenAI/Gemini plug-in points |
| Ports       | Frontend → **3000** · Backend API → **5000** |

---

## 2. Architecture

```
┌───────────────────────────────────────────────────────┐
│  Browser / Client                                     │
│  React (Next.js)  →  /api/*  proxy  →  Express :5000 │
└───────────────────────────────────────────────────────┘
               │                         │
        ┌──────┘                         └──────┐
        ▼                                       ▼
  Next.js :3000                         Express :5000
  (UI + SSR)                            (All API logic)
        │                                       │
        └──────────── lastmart.db ──────────────┘
                        SQLite 3
```

### Key Design Decisions
- **Proxy approach**: `next.config.ts` rewrites `/api/*` to `http://localhost:5000/api/*`.
  The frontend never talks directly to the DB; all business logic lives in the backend.
- **Shared DB file**: Both servers resolve `lastmart.db` to the project root using
  `path.join(__dirname, '../../..', 'lastmart.db')` in `backend/src/lib/db.ts`.
- **Offline-first**: The app runs entirely on localhost. Payment gateways simulate
  success without network calls (swap the `DEMO` blocks for real API calls in production).

---

## 3. Feature List

### Core E-Commerce
- [x] Multi-vendor marketplace with vendor profiles and product listings
- [x] Customer, Vendor, and Admin roles with separate dashboards
- [x] Product search, filtering by city / category / price range / sponsored
- [x] Shopping cart (add, update quantity, remove, clear)
- [x] Order management with status tracking and delivery updates

### Payment Gateway (new in v2.0)
- [x] **Paystack** — Card, Bank Transfer, USSD, Mobile Money
- [x] **Flutterwave** — Card, M-Pesa
- [x] **Crypto** — Bitcoin (BTC), Ethereum (ETH), USDT, BNB, Solana (SOL) via CoinGate
- [x] **Gift Cards** — Amazon, Steam, iTunes/App Store, Google Play, LastMart
- [x] Webhook handler for Paystack `charge.success` events
- [x] Full payment verification flow with order status updates

### GPS & Location (new in v2.0)
- [x] Browser Geolocation API with Nominatim (OpenStreetMap) reverse-geocoding
- [x] 20 Nigerian city presets in the LocationPicker dropdown
- [x] Manual city override — saves to localStorage, survives refresh
- [x] Location context passed to marketplace filters automatically

### Delivery (new in v2.0)
- [x] Saved delivery address book (label: Home/Work/Other, multiple per user)
- [x] Default address auto-selected at checkout
- [x] 5 delivery modes: Standard (₦500) · Express (₦1,500) · Overnight (₦2,000) · Scheduled (₦800) · Store Pickup (Free)
- [x] GPS auto-fill for city in address form

### Budget & Recurring Purchases (new in v2.0)
- [x] Budget plans with daily / weekly / monthly / quarterly periods
- [x] Spend tracking with visual progress bars and 80%+ budget alerts
- [x] Recurring purchase scheduler (schedule any product at any frequency)
- [x] Manual trigger ("Order now") for scheduled purchases
- [x] Auto-order flag for fully hands-off recurring orders

### Product Image Uploads (new in v2.0)
- [x] Drag-and-drop ImageUploader component for vendors
- [x] Up to 10 images per product, 50 MB max each
- [x] JPEG / PNG / WebP / AVIF / GIF accepted
- [x] UUID-renamed filenames to prevent collisions
- [x] Served as static files from `/uploads/<filename>`

### LAMA AI Agent (new in v2.0)
- [x] Platform health summary → admin daily
- [x] Pending vendor approvals alerts → admin
- [x] Low stock alerts → each affected vendor
- [x] Top-selling product trends → all users
- [x] Category demand surge detection → admin
- [x] Budget overrun alerts (≥ 80% spent) → each customer
- [x] Recurring purchase reminders → each customer
- [x] Personalized product/vendor recommendations within budget
- [x] Admin can trigger full analysis cycle on demand
- [x] Plug-in stubs for OpenAI / Gemini real API calls

### Admin
- [x] Platform analytics (revenue, orders, user counts, daily trends)
- [x] Vendor management (approve / suspend / feature)
- [x] LAMA dashboard with live stats and issue list

### Vendor
- [x] Product CRUD with image upload (50 MB)
- [x] Inventory management with low-stock warning
- [x] Order fulfillment and status updates
- [x] Analytics (revenue, top products, orders by status)
- [x] Advertisement management

---

## 4. Prerequisites

| Requirement       | Version |
|-------------------|---------|
| Node.js           | ≥ 18    |
| npm               | ≥ 9     |
| (Optional) PM2    | ≥ 5.3   |

> The database file (`lastmart.db`) is created automatically on first run.

---

## 5. Quick Start

```bash
# 1. Clone / extract the project
cd /home/user/webapp

# 2. Install root (frontend) dependencies
npm install

# 3. Install backend dependencies
cd backend && npm install && cd ..

# 4. Start BOTH servers in one command
npm run dev:all
# → Frontend at http://localhost:3000
# → Backend at  http://localhost:5000
```

The database is auto-created and seeded with demo data on the first API call.

---

## 6. Environment Variables

### Frontend — `.env.local` (project root)
```env
BACKEND_API_URL=http://localhost:5000   # Express API base URL
JWT_SECRET=lastmart-super-secret-key    # Must match backend
```

### Backend — `backend/.env` (or set in ecosystem.config.cjs)
```env
NODE_ENV=development
PORT=5000
JWT_SECRET=lastmart-super-secret-key

# ── Payment Gateways ────────────────────────────────────
PAYSTACK_SECRET_KEY=sk_test_your_paystack_key
FLUTTERWAVE_SECRET=FLWSECK_TEST_your_key
COINGATE_API_KEY=your_coingate_key
COINGATE_ENV=sandbox    # 'sandbox' for testing, 'live' for production

# ── CORS ───────────────────────────────────────────────
FRONTEND_URL=http://localhost:3000
```

---

## 7. Running in Development

### Option A: Two Terminals
```bash
# Terminal 1 — Backend API (port 5000)
cd /home/user/webapp/backend
npm run dev        # uses ts-node-dev with hot-reload

# Terminal 2 — Frontend (port 3000)
cd /home/user/webapp
npm run dev:frontend   # Next.js with turbopack
```

### Option B: Single Command (concurrently)
```bash
cd /home/user/webapp
npm run dev:all    # starts both backend and frontend in parallel
```

### Option C: PM2 (recommended for sandbox)
```bash
# Root ecosystem config — starts both processes
pm2 start /home/user/webapp/ecosystem.config.cjs

# Alternatively start each separately:
pm2 start /home/user/webapp/backend/ecosystem.config.cjs   # API
pm2 start /home/user/webapp/ecosystem.config.cjs           # Frontend

pm2 logs        # watch logs
pm2 status      # health check
```

---

## 8. Running in Production (PM2)

```bash
# 1. Build frontend
cd /home/user/webapp && npm run build

# 2. Start both with PM2
pm2 start ecosystem.config.cjs
# Starts Next.js on :3000 and Express API on :5000

# 3. Save PM2 config for auto-restart on reboot
pm2 save
pm2 startup
```

---

## 9. API Reference

All endpoints are accessible via the frontend proxy at `http://localhost:3000/api/*`
or directly at `http://localhost:5000/api/*`.

### Auth
| Method | Path                    | Description           |
|--------|-------------------------|-----------------------|
| POST   | `/api/auth/login`       | Login, returns JWT    |
| POST   | `/api/auth/register`    | Register new user     |

### Products
| Method | Path                    | Description                     |
|--------|-------------------------|---------------------------------|
| GET    | `/api/products`         | List products (paginated, filters) |
| POST   | `/api/products`         | Create product (vendor)         |
| GET    | `/api/products/:id`     | Get product details             |
| PUT    | `/api/products/:id`     | Update product (vendor/admin)   |
| DELETE | `/api/products/:id`     | Soft-delete (vendor/admin)      |

### Vendors
| Method | Path                          | Description              |
|--------|-------------------------------|--------------------------|
| GET    | `/api/vendors`                | List vendors (filters)   |
| POST   | `/api/vendors`                | Update vendor profile    |
| GET    | `/api/vendors/:id`            | Vendor details           |
| GET    | `/api/vendors/analytics`      | Vendor stats (auth)      |

### Orders, Cart, Categories, Reviews, Notifications, Users
Standard CRUD — see source files in `backend/src/routes/`.

### Payment (new)
| Method | Path                       | Description                    |
|--------|----------------------------|--------------------------------|
| GET    | `/api/payment/methods`     | List payment methods (public)  |
| POST   | `/api/payment/initiate`    | Start payment session          |
| POST   | `/api/payment/verify`      | Verify completed payment       |
| POST   | `/api/payment/giftcard`    | Redeem gift card               |
| POST   | `/api/payment/webhook`     | Receive gateway webhooks       |
| GET    | `/api/payment/:id`         | Fetch payment record           |

### Delivery (new)
| Method | Path                                    | Description         |
|--------|-----------------------------------------|---------------------|
| GET    | `/api/delivery/modes`                   | List delivery modes |
| GET    | `/api/delivery/addresses`               | User's saved addrs  |
| POST   | `/api/delivery/addresses`               | Add new address     |
| PUT    | `/api/delivery/addresses/:id`           | Edit address        |
| PUT    | `/api/delivery/addresses/:id/default`   | Set as default      |
| DELETE | `/api/delivery/addresses/:id`           | Delete address      |

### Budget & Recurring (new)
| Method | Path                                 | Description              |
|--------|--------------------------------------|--------------------------|
| GET    | `/api/budget/plans`                  | List budget plans        |
| POST   | `/api/budget/plans`                  | Create plan              |
| PUT    | `/api/budget/plans/:id`              | Update plan              |
| DELETE | `/api/budget/plans/:id`              | Delete plan              |
| GET    | `/api/budget/recurring`              | List recurring purchases |
| POST   | `/api/budget/recurring`              | Schedule purchase        |
| PUT    | `/api/budget/recurring/:id`          | Update schedule          |
| DELETE | `/api/budget/recurring/:id`          | Cancel schedule          |
| POST   | `/api/budget/recurring/:id/trigger`  | Order now                |

### LAMA AI (new)
| Method | Path                        | Description               |
|--------|-----------------------------|---------------------------|
| GET    | `/api/lama/insights`        | Get role-specific insights|
| GET    | `/api/lama/dashboard`       | Admin dashboard (admin)   |
| GET    | `/api/lama/recommend`       | Budget recommendations    |
| GET    | `/api/lama/trends`          | Market trend data         |
| POST   | `/api/lama/run`             | Trigger analysis (admin)  |
| PUT    | `/api/lama/insights/:id/read` | Mark insight read       |

### Upload (new)
| Method | Path                   | Description            |
|--------|------------------------|------------------------|
| POST   | `/api/upload/image`    | Upload 1–10 images (vendor) |
| GET    | `/api/upload/images`   | List vendor's images   |
| DELETE | `/api/upload/:id`      | Delete image           |

---

## 10. Payment Gateway Guide

The payment system works offline using demo mode (no real API calls). To go live:

### Paystack
1. Sign up at [paystack.com](https://paystack.com) → Settings → API Keys
2. Set `PAYSTACK_SECRET_KEY=sk_live_…` in backend environment
3. Register webhook URL: `https://your-domain.com/api/payment/webhook`
4. Uncomment the real fetch calls in `backend/src/routes/payment.ts` (marked `/* Production … */`)

### Flutterwave
1. Sign up at [flutterwave.com](https://flutterwave.com) → API Settings
2. Set `FLUTTERWAVE_SECRET=FLWSECK_TEST_…`
3. Uncomment production code in `payment.ts`

### CoinGate (Crypto)
1. Create account at [coingate.com](https://coingate.com)
2. Set `COINGATE_API_KEY=…` and `COINGATE_ENV=live`
3. Swap demo wallet addresses with real CoinGate order API

### Gift Cards
Connect to a gift card exchange API (CardPool, GiftDeals, CardCash).
Replace the demo validation block in `router.post('/giftcard', …)`.

---

## 11. LAMA AI Agent

LAMA runs locally without any API keys. To upgrade to LLM-generated insights:

```typescript
// In backend/src/routes/lama.ts – replace generateInsight() body:

async function generateInsight(type: string, context: Record<string, any>): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are LAMA, the LastMart AI agent. Generate concise, actionable insights.' },
        { role: 'user', content: `Insight type: ${type}. Data: ${JSON.stringify(context)}. Keep under 60 words.` },
      ],
      max_tokens: 100,
    }),
  });
  const data = await response.json();
  return data.choices[0].message.content;
}
```

---

## 12. Data Model & Database

The full annotated schema is in **`DATABASE_SCHEMA.sql`** (18 tables, all indexes, compatibility notes).

### Tables at a glance
| Table                | Purpose                                |
|----------------------|----------------------------------------|
| `users`              | Accounts (customer / vendor / admin)   |
| `vendors`            | Store profiles                         |
| `categories`         | Product taxonomy (8 default)           |
| `products`           | Product listings                       |
| `orders`             | Purchase orders                        |
| `order_items`        | Order line items                       |
| `cart_items`         | Active shopping cart                   |
| `reviews`            | Product and vendor reviews             |
| `notifications`      | In-app inbox                           |
| `advertisements`     | Vendor-paid ads                        |
| `saved_vendors`      | Customer wishlists                     |
| `transactions`       | Financial transaction log              |
| `payments`           | Gateway payment sessions (v2.0)        |
| `delivery_addresses` | Saved delivery addresses (v2.0)        |
| `budget_plans`       | Shopping budgets (v2.0)                |
| `recurring_purchases`| Scheduled repeat orders (v2.0)         |
| `lama_insights`      | AI agent insights (v2.0)               |
| `product_images`     | Vendor-uploaded images (v2.0)          |

### Database path
Both frontend (Next.js API routes) and backend (Express) resolve:
```
/home/user/webapp/lastmart.db
```

### Migrating to another database
See `DATABASE_SCHEMA.sql` → section "MULTI-DATABASE COMPATIBILITY GUIDE".

---

## 13. Image Uploads

- **Endpoint**: `POST /api/upload/image` (form-data field: `images`)
- **Auth**: Vendor JWT required
- **Max file size**: 50 MB per file
- **Allowed types**: JPEG, PNG, WebP, AVIF, GIF
- **Max files**: 10 per request
- **Storage**: `public/uploads/<uuid>.<ext>` at project root
- **Public URL**: `/uploads/<uuid>.<ext>` (served as static file by Express)

**Frontend component**: `src/components/vendor/ImageUploader.tsx`
- Drag-and-drop or click-to-browse
- Instant preview thumbnails
- Upload progress states (uploading / success / error)
- Remove button per image

---

## 14. GPS Location

Location detection uses the browser's native Geolocation API:

1. **Startup**: tries GPS silently (no prompt) on first visit if no saved location.
2. **Nominatim**: reverse-geocodes lat/lng → city name using OpenStreetMap (no API key).
3. **Manual**: LocationPicker dropdown in the Navbar shows 20 Nigerian cities.
4. **Custom**: user can type any city name not in the preset list.
5. **Persistence**: chosen location saved as JSON in `localStorage['lastmart_location']`.

The location context (`city`, `lat`, `lng`) is available via `useApp().location` everywhere in the React tree.

---

## 15. Deployment

### Local (development)
See [Quick Start](#5-quick-start).

### Production VPS
```bash
# 1. Build frontend
npm run build

# 2. Start PM2 (starts both frontend :3000 + backend :5000)
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup   # enable auto-restart on server reboot

# 3. Nginx reverse proxy (recommended):
#    / → http://localhost:3000 (Next.js)
#    All /api/* calls are handled by Next.js proxy → localhost:5000
```

### Cloudflare / CDN
The Next.js frontend can be exported as a static site (`next export`), but
the Express backend must stay on a server (VPS, Render, Railway, Fly.io, etc.).

---

## 16. Troubleshooting

| Problem | Fix |
|---------|-----|
| `lastmart.db` not found | Run any API call first – `initializeDB()` auto-creates it |
| Port 3000 in use | `fuser -k 3000/tcp && pm2 start ecosystem.config.cjs` |
| Port 5000 in use | `fuser -k 5000/tcp && pm2 start backend/ecosystem.config.cjs` |
| Build fails (TypeScript) | `npx tsc --noEmit` to see errors |
| Images not serving | Check `public/uploads/` exists and Express static middleware is mounted |
| JWT errors | Ensure `JWT_SECRET` is identical in both `.env.local` and `backend/.env` |
| LAMA insights empty | Login as admin → `/lama` → click "Run Analysis" |

---

## 17. Credentials for Testing

| Role     | Email                      | Password  |
|----------|----------------------------|-----------|
| Admin    | admin@lastmart.com         | admin123  |
| Vendor 1 | techstore@lastmart.com     | vendor123 |
| Vendor 2 | fashionhub@lastmart.com    | vendor123 |
| Vendor 3 | freshfarm@lastmart.com     | vendor123 |
| Vendor 4 | homestyle@lastmart.com     | vendor123 |
| Vendor 5 | sportszone@lastmart.com    | vendor123 |
| Customer 1| bola@lastmart.com         | customer123|
| Customer 2| ngozi@lastmart.com        | customer123|

> All passwords are bcrypt-hashed. The seeder runs automatically on first DB access.

---

*Last updated: April 2026 — LastMart v2.0*
