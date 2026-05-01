# LastMart 🛒 — Nigeria's Local Marketplace

> A full-stack local marketplace platform. Customers shop from vendors in their city and receive delivery within 48 hours.

**Stack**: Next.js 14 · Express.js · SQLite/PostgreSQL · Tailwind CSS v4 · TypeScript · React Native (Expo)  
**GitHub**: https://github.com/Charles5247/LastMart-V2.0

---

## ✅ Completed Features (v5.3)

| Module | Features |
|--------|---------|
| **Authentication** | JWT login/register, role-based access (admin, vendor, customer), Terms & Conditions, referral code on signup |
| **Marketplace** | Product browsing, search, category filters, location-based vendor discovery, store visit tracking |
| **Cart & Checkout** | Add to cart, quantity management, checkout flow, coupon/discount code at checkout |
| **Payment** | Paystack (card, bank transfer, USSD, mobile money), Flutterwave (card, M-Pesa, bank), demo mode |
| **KYC Verification** | Customer (NIN, BVN, ID, selfie) + Vendor (CAC, TIN, director ID, utility bill) |
| **Product Vetting** | Stock proof, brand authenticity, lab certs, NAFDAC, ISO, CE certification upload |
| **File Uploads** | Product images, KYC docs, vetting documents (local disk + Cloudinary ready) |
| **Real-time Notifications** | Server-Sent Events (SSE) — no WebSocket server needed |
| **Email Notifications** | SendGrid / SMTP / Nodemailer — order confirmation, KYC status, welcome email |
| **LAMA AI** | Price suggestions, demand forecasting, platform insights, trend analysis, budget-based product recommendations |
| **Ranking & Ads** | Bronze/Silver/Gold/Platinum vendor & product ranking, Ad Boost packages |
| **Analytics** | Revenue charts, store visit heatmap, conversion funnel, LAMA forecast |
| **Multi-language** | English, Yoruba (Yorùbá), Hausa, Igbo |
| **Admin Panel** | Manage vendors, customers, KYC, products, orders, notifications, analytics, coupon management |
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
│   │   │   │   ├── coupons/page.tsx      # ✨ Coupon management
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
│   │   │   │   ├── qr/page.tsx           # ✨ QR code & share link
│   │   │   │   ├── products/             # Manage products
│   │   │   │   ├── orders/               # View orders
│   │   │   │   ├── ranking/              # Apply for ranking packages
│   │   │   │   ├── analytics/            # Vendor performance
│   │   │   │   ├── inventory/            # Stock management
│   │   │   │   └── ads/                  # Advertisement management
│   │   │   └── customer/
│   │   │       ├── page.tsx              # Customer dashboard
│   │   │       ├── referrals/page.tsx    # ✨ Referral & coupon wallet
│   │   │       ├── orders/               # Order history
│   │   │       ├── saved/                # Saved vendors
│   │   │       └── settings/             # Profile settings
│   │   ├── product/         # Product detail page
│   │   ├── vendor/          # Public vendor store page
│   │   ├── payment/         # Payment pages
│   │   ├── verification/    # KYC submission page
│   │   └── terms/           # Terms & Conditions
│   ├── components/
│   │   ├── layout/Navbar.tsx      # Responsive navbar
│   │   ├── AppContext.tsx          # Global state
│   │   ├── ui/ProductCard.tsx      # Product card component
│   │   └── LanguageSwitcher.tsx
│   ├── hooks/
│   │   └── useSSE.ts              # Real-time SSE hook
│   ├── lib/
│   │   ├── i18n.ts                # Internationalization
│   │   └── utils.ts
│   └── locales/                   # Translation files (en, yo, ha, ig)
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
│           ├── auth.ts, products.ts, vendors.ts, orders.ts, cart.ts
│           ├── categories.ts, reviews.ts, users.ts, admin.ts
│           ├── payment.ts   # Paystack + Flutterwave
│           ├── upload.ts    # File uploads
│           ├── verification.ts  # KYC + product vetting
│           ├── ranking.ts   # Ranking packages
│           ├── lama.ts      # AI insights + budget recommendations
│           ├── notifications.ts, sse.ts, budget.ts, delivery.ts, ads.ts
│           ├── coupons.ts   # ✨ Coupons + referral system
│           └── qr.ts        # ✨ Vendor QR codes + share links
│
├── mobile/                  # React Native (Expo) app
│
├── Dockerfile               # Frontend multi-stage build (standalone)
├── backend/Dockerfile       # Backend multi-stage build
├── docker-compose.yml       # ✨ Full-stack Docker Compose
├── render.yaml              # ✨ Render Blueprint (frontend + backend)
├── railway.json             # ✨ Railway frontend config
├── nixpacks.toml            # ✨ Railway/Nixpacks frontend build
├── backend/railway.json     # ✨ Railway backend config
├── backend/nixpacks.toml    # ✨ Railway/Nixpacks backend build
├── backend/Procfile         # ✨ Render/Heroku process file
├── fly.toml                 # ✨ Fly.io frontend config
├── fly.backend.toml         # ✨ Fly.io backend config
├── vercel.json              # ✨ Vercel (frontend-only)
├── .vercelignore            # ✨ Excludes non-frontend files from Vercel
├── netlify.toml             # ✨ Netlify (frontend-only)
├── .env.example             # ✨ Environment variable template
├── ecosystem.config.cjs     # PM2 config for VPS/local
├── next.config.js           # Next.js config + API proxy + standalone output
├── package.json             # Frontend dependencies (engines: node>=20)
└── DATABASE_SCHEMA.sql      # Full DB schema reference
```

---

## 📅 Development Timeline

### Phase 1 — Foundation (March 2026)
- **March 14**: Scaffolded with Next.js 14, Tailwind v4, TypeScript; Express backend, SQLite, JWT
- **March 16**: Homepage, marketplace browsing, product listings
- **March 18**: Cart, checkout, order management

### Phase 2 — Core Features (Late March – Early April 2026)
- KYC verification system (customer + vendor documents)
- Product vetting with certification uploads
- Multi-language support: English, Yorùbá, Hausa, Igbo
- Admin panel, ranking & advertising packages, React Native scaffold

### Phase 3 — Advanced Features (April 22–24, 2026)
- Real payment gateways: Paystack + Flutterwave
- KYC file upload (NIN, BVN, CAC, TIN, photos, utility bills)
- Server-Sent Events (SSE) for real-time notifications
- Email system: SendGrid + Nodemailer
- LAMA AI: price suggestions, demand forecasting
- Vendor analytics, deployment documentation

### Phase 4 — UX & Engagement (April 25, 2026) `v5.0`
- Mobile responsiveness audit & fixes
- LAMA AI budget-based product recommendations
- Vendor QR code generator + shareable store URL
- Referral coupon system (0.5% auto-discount)
- Admin coupon management dashboard
- Customer referral dashboard

### Phase 5 — Vercel Fix (April 28, 2026) `v5.1`
- **Root cause**: `experimentalServices` in `vercel.json` does not support Express backends
- **Fix**: Clean Next.js-only `vercel.json`; `next.config.js` proxies `/api/*` to `BACKEND_API_URL`

### Phase 6 — Security CVE Fix (April 28, 2026) `v5.2`
- Upgraded `next` → `14.2.35` fixing CVE-2025-55184 and CVE-2025-67779
- Added `.npmrc` with `legacy-peer-deps=true` to unblock Railway security scan

### Phase 7 — Universal Deployment (May 1, 2026) `v5.3`
- Rewrote all deployment configs for universal hosting compatibility
- `Dockerfile` (frontend): multi-stage standalone build — works on Render, Railway, Fly.io, AWS, VPS
- `backend/Dockerfile`: multi-stage build with persistent `/data` volume
- `docker-compose.yml`: full-stack compose with health checks and named volumes
- `render.yaml`: Render Blueprint — one-click deploy both services
- `railway.json` + `nixpacks.toml`: Railway configs for frontend and backend
- `fly.toml` + `fly.backend.toml`: Fly.io configs for frontend and backend
- `netlify.toml`: Netlify config with Next.js plugin
- `ecosystem.config.cjs`: updated for standalone output
- `next.config.js`: `output: 'standalone'` always enabled
- `README.md`: complete deployment guide for every platform

---

## 🚀 Quick Start (Development)

### Prerequisites
- Node.js ≥ 20
- npm ≥ 10

### 1. Clone & Install

```bash
git clone https://github.com/Charles5247/LastMart-V2.0.git
cd LastMart-V2.0
npm run install:all
```

### 2. Environment Variables

**Frontend** — create `.env.local` in project root:
```env
BACKEND_API_URL=http://localhost:5000
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_your_paystack_public_key
```

**Backend** — create `backend/.env`:
```env
PORT=5000
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your-super-secret-jwt-key-change-in-production
DATABASE_PATH=../lastmart.db
PAYSTACK_SECRET_KEY=sk_test_your_paystack_secret_key
PAYSTACK_PUBLIC_KEY=pk_test_your_paystack_public_key
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST_your_flutterwave_key
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST_your_flutterwave_key
SENDGRID_API_KEY=SG.your_sendgrid_key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM_NAME=LastMart
EMAIL_FROM_ADDRESS=noreply@lastmart.com
```

### 3. Run Development Servers

```bash
# Run frontend + backend together
npm run dev:all

# OR separately
npm run dev:backend    # Express API  → http://localhost:5000
npm run dev:frontend   # Next.js      → http://localhost:3000
```

### 4. Seed Test Data

```bash
cd backend && npm run seed
```

---

## 🗄️ Database

**Development**: SQLite — auto-created as `lastmart.db` on first run, no config needed.

**Production**: Switch to PostgreSQL by setting `DATABASE_URL` in `backend/.env`:
```env
DATABASE_URL=postgresql://user:password@host:5432/lastmart
```
Then apply `DATABASE_SCHEMA.sql` via your PostgreSQL client.

---

## 🌐 Deployment Guide

> **Architecture overview**
>
> LastMart has two independent services:
> - **Frontend** (Next.js) — runs on Vercel / Netlify / Render / Railway / Fly.io / VPS
> - **Backend** (Express API) — runs on Railway / Render / Fly.io / Docker / VPS
>
> `next.config.js` sets `output: 'standalone'` and proxies all `/api/*` requests
> to `BACKEND_API_URL` at runtime, so every platform just needs that one env var set.
>
> ⚠️ **Do NOT deploy the backend to Vercel.** Vercel does not support:
> - Native Node.js add-ons (`better-sqlite3` requires native compilation)
> - Long-running processes (Express server)
> - `experimentalServices` for non-framework backends

---

### Option A: Vercel (Frontend) + Railway (Backend) ⭐ Recommended Free Tier

#### Step 1 — Deploy Backend on Railway

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Select `Charles5247/LastMart-V2.0`
3. Set **Root Directory** to `backend` in Railway settings
4. Railway auto-detects `backend/nixpacks.toml` and `backend/Procfile`
5. Set environment variables in the Railway dashboard:

   | Variable | Value |
   |----------|-------|
   | `NODE_ENV` | `production` |
   | `PORT` | `5000` |
   | `JWT_SECRET` | (generate a random 32-char string) |
   | `FRONTEND_URL` | `https://your-app.vercel.app` (set after Vercel deploys) |
   | `DATABASE_PATH` | `/app/data/lastmart.db` |
   | `PAYSTACK_SECRET_KEY` | `sk_live_...` |
   | `PAYSTACK_PUBLIC_KEY` | `pk_live_...` |
   | `SENDGRID_API_KEY` | `SG.xxx` (or SMTP vars) |

6. Copy the Railway public URL (e.g. `https://lastmart-backend.up.railway.app`)

#### Step 2 — Deploy Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project** → Import `LastMart-V2.0`
2. Vercel auto-detects Next.js and uses the included `vercel.json`
3. Set environment variables **before** clicking Deploy:

   | Variable | Value |
   |----------|-------|
   | `BACKEND_API_URL` | `https://lastmart-backend.up.railway.app` |
   | `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | `pk_live_...` |

4. Click **Deploy**

#### Step 3 — Update CORS on Backend

Go to Railway → backend service → Variables → update `FRONTEND_URL` to your Vercel URL.

> **`vercel.json` rules (do not modify):**
> - ❌ Do NOT add `experimentalServices`
> - ❌ Do NOT add a `"backend"` service entry
> - ✅ The included `vercel.json` is correct as-is

---

### Option B: Render (Frontend + Backend via Blueprint) ⭐ One-Click

Render can deploy both services from `render.yaml` automatically.

1. Go to [dashboard.render.com](https://dashboard.render.com) → **New** → **Blueprint**
2. Connect your GitHub repo `Charles5247/LastMart-V2.0`
3. Render reads `render.yaml` and creates both services
4. After both deploy, update:
   - `FRONTEND_URL` on the backend service → your Render frontend URL
   - `BACKEND_API_URL` on the frontend service → your Render backend URL
5. Set secret env vars (payment keys, email, JWT_SECRET) in the Render dashboard

**Manual Render setup** (if not using Blueprint):

**Backend:**
- New Web Service → Connect repo → Root Dir: `backend`
- Build: `npm install && npm run build`
- Start: `node dist/server.js`
- Add a **Disk** (1 GB) mounted at `/var/data` for SQLite

**Frontend:**
- New Web Service → Connect repo → Root Dir: (leave empty)
- Build: `npm install --legacy-peer-deps && npm run build`
- Start: `node .next/standalone/server.js`
- Env var: `BACKEND_API_URL=https://your-backend.onrender.com`

---

### Option C: Netlify (Frontend) + Render (Backend)

**Frontend → Netlify:**
1. Go to [app.netlify.com](https://app.netlify.com) → **Add new site** → Import from Git
2. Select `Charles5247/LastMart-V2.0`
3. Netlify auto-detects `netlify.toml` (build command + `@netlify/plugin-nextjs`)
4. Set env var: `BACKEND_API_URL=https://your-backend.onrender.com`
5. Deploy

**Backend → Render:** (same as Option B backend steps above)

> ⚠️ Netlify requires `@netlify/plugin-nextjs` for Next.js SSR support.
> Install it: `npm install -D @netlify/plugin-nextjs` then redeploy.

---

### Option D: Docker Compose (VPS / AWS EC2 / DigitalOcean)

Deploy both services together with a single command.

```bash
# 1. Clone repo on your server
git clone https://github.com/Charles5247/LastMart-V2.0.git /var/www/lastmart
cd /var/www/lastmart

# 2. Create .env from template
cp .env.example .env
nano .env   # fill in JWT_SECRET, payment keys, email settings, etc.

# 3. Build and start (first run takes ~5 minutes to build images)
docker compose up -d

# 4. Check services
docker compose ps
docker compose logs -f

# Services:
#   frontend → http://your-server:3000
#   backend  → http://your-server:5000 (internal only in production)
```

**With Nginx reverse proxy** (recommended for production):
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**Update images after a code change:**
```bash
git pull
docker compose build --no-cache
docker compose up -d
```

---

### Option E: VPS with PM2 (Ubuntu + Node.js)

```bash
# 1. Install Node.js 20 + PM2
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2

# 2. Clone and install
git clone https://github.com/Charles5247/LastMart-V2.0.git /var/www/lastmart
cd /var/www/lastmart
npm run install:all

# 3. Set env vars
cp .env.example .env && nano .env
cp backend/.env.example backend/.env && nano backend/.env

# 4. Build both apps
npm run build           # Next.js (creates .next/standalone/)
npm run build:backend   # Express TypeScript (creates backend/dist/)

# 5. Start with PM2
pm2 start ecosystem.config.cjs
pm2 save && pm2 startup  # auto-start on reboot

# 6. Check status
pm2 list
pm2 logs
```

---

### Option F: Fly.io (Frontend + Backend separately)

**Backend:**
```bash
fly launch --config fly.backend.toml
fly secrets set JWT_SECRET=your-secret FRONTEND_URL=https://lastmart-frontend.fly.dev
fly deploy --config fly.backend.toml
```

**Frontend:**
```bash
fly launch --config fly.toml
fly secrets set BACKEND_API_URL=https://lastmart-backend.fly.dev
fly deploy --config fly.toml
```

---

### Option G: AWS (Elastic Beanstalk / App Runner / ECS)

**App Runner (simplest):**
1. AWS Console → App Runner → Create service
2. Source: Container registry → ECR
3. Build and push Docker images:
   ```bash
   # Backend
   docker build -t lastmart-backend ./backend
   docker tag lastmart-backend:latest <account>.dkr.ecr.<region>.amazonaws.com/lastmart-backend
   docker push <account>.dkr.ecr.<region>.amazonaws.com/lastmart-backend

   # Frontend
   docker build -t lastmart-frontend --build-arg BACKEND_API_URL=https://your-backend.amazonaws.com .
   docker tag lastmart-frontend:latest <account>.dkr.ecr.<region>.amazonaws.com/lastmart-frontend
   docker push <account>.dkr.ecr.<region>.amazonaws.com/lastmart-frontend
   ```
4. Set env vars in App Runner configuration

**ECS (Fargate):** Use `docker-compose.yml` as a reference for task definitions.

---

## 🔑 Environment Variables Summary

| Variable | Where | Required | Description |
|----------|-------|----------|-------------|
| `BACKEND_API_URL` | Frontend | ✅ | Backend URL for API proxy (e.g. `https://xxx.railway.app`) |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Frontend | Payments | Paystack public key |
| `JWT_SECRET` | Backend | ✅ | Secret for JWT signing (32+ chars) |
| `FRONTEND_URL` | Backend | ✅ | Frontend origin for CORS |
| `DATABASE_PATH` | Backend | SQLite | Path to `.db` file |
| `DATABASE_URL` | Backend | PostgreSQL | PostgreSQL connection string |
| `PAYSTACK_SECRET_KEY` | Backend | Payments | Paystack secret key |
| `FLUTTERWAVE_SECRET_KEY` | Backend | Payments | Flutterwave secret key |
| `SENDGRID_API_KEY` | Backend | Emails | SendGrid key |
| `SMTP_HOST/USER/PASS` | Backend | Emails | SMTP config (Gmail etc.) |

---

## 💳 Payment Webhook URLs

| Gateway | Webhook URL |
|---------|------------|
| Paystack | `https://your-backend.com/api/payment/webhook/paystack` |
| Flutterwave | `https://your-backend.com/api/payment/webhook/flutterwave` |

---

## 🔑 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register (optional `?ref=code` for referral) |
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
| GET | `/api/health` | Backend health check |
| GET | `/api/sse` | Real-time SSE stream |
| GET | `/api/admin/analytics` | Platform analytics |

Full route docs: see each file in `backend/src/routes/`.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | Next.js 14, React 19, TypeScript, Tailwind CSS v4, Recharts, i18next |
| **Backend** | Express.js, TypeScript, better-sqlite3, JWT, Multer, Nodemailer, Axios |
| **Payment** | Paystack, Flutterwave |
| **Storage** | Local disk / Cloudinary / AWS S3 |
| **Email** | SendGrid / SMTP / Nodemailer |
| **Real-time** | Server-Sent Events (SSE) |
| **Mobile** | React Native (Expo), Expo Router, SecureStore |
| **AI** | LAMA (rule-based analytics engine) |
| **Deployment** | Vercel · Netlify · Render · Railway · Fly.io · Docker · AWS · VPS |

---

## 👤 Role Capabilities

| Role | Capabilities |
|------|-------------|
| **Admin** | Full platform control — manage vendors, KYC, orders, analytics, notifications, coupon management |
| **Vendor** | Manage store, products, orders, KYC, ranking, analytics, QR code + share link |
| **Customer** | Browse, cart, checkout, order tracking, KYC, budget planner, referral links + coupon wallet |

---

## 📋 Status

- **Version**: 5.3.0
- **Last Updated**: May 1, 2026
- **GitHub**: https://github.com/Charles5247/LastMart-V2.0
- **Supported Platforms**: Vercel, Netlify, Render, Railway, Fly.io, Docker, AWS, VPS

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Commit: `git commit -m 'feat: add my feature'`
4. Push: `git push origin feat/my-feature`
5. Open a Pull Request
