# LastMart — Local Commerce Platform

**Version 5.3.0** | Nigeria's hyper-local marketplace connecting customers, vendors, and riders.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Live URLs](#live-urls)
4. [Project Structure](#project-structure)
5. [Getting Started](#getting-started)
6. [Environment Variables](#environment-variables)
7. [Frontend Applications](#frontend-applications)
8. [Backend API](#backend-api)
9. [Authentication & Role Isolation](#authentication--role-isolation)
10. [Deployment](#deployment)
11. [Scripts Reference](#scripts-reference)
12. [Changelog](#changelog)

---

## Overview

LastMart is a full-stack local commerce platform built for Nigerian cities. It connects:

- **Customers** — browse vendors, buy products, track orders
- **Vendors** — manage stores, products, orders, and receive payouts
- **Riders** — accept delivery jobs, track earnings, manage availability
- **Admins** — approve vendors/riders, monitor the platform, handle escalations

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MULTI-FRONTEND ARCHITECTURE                  │
├──────────────────┬──────────────────┬──────────────────┬────────────┤
│  Customer App    │  Vendor Portal   │  Rider Portal    │  Admin     │
│  (Next.js 14)    │  (Next.js 14)    │  (Next.js 14)    │  Portal    │
│  Port 3006       │  Port 3001       │  Port 3002       │  Port 3003 │
├──────────────────┴──────────────────┴──────────────────┴────────────┤
│                    Shared Express.js Backend API                     │
│                         Port 5000                                    │
│              JWT Auth · SQLite/PostgreSQL · REST API                 │
└─────────────────────────────────────────────────────────────────────┘
```

Each frontend is a **standalone Next.js application** with:

- Its own `package.json`, `next.config.js`, `tsconfig.json`
- Role-isolated localStorage token key (prevents cross-role token reuse)
- Client-side JWT decode + server-side verification on every API call
- `robots: noindex` on all private portals (vendor, rider, admin)

---

## Live URLs

| Service              | URL                                          |
| -------------------- | -------------------------------------------- |
| Customer Marketplace | https://lastmart.onrender.com                |
| Vendor Portal        | https://lastmart-vendor.onrender.com         |
| Rider Portal         | https://lastmart-rider.onrender.com          |
| Admin Portal         | https://lastmart-admin.onrender.com          |
| Backend API          | https://lastmart-api.onrender.com            |
| API Health           | https://lastmart-api.onrender.com/api/health |

---

## Project Structure

```
lastmart/
├── src/                          # Customer frontend (Next.js 14)
│   ├── app/
│   │   ├── layout.tsx            # Root layout with Metadata + Viewport exports
│   │   ├── page.tsx              # SSR homepage → HomeClient
│   │   ├── globals.css           # Tailwind v4, design tokens, utility classes
│   │   ├── marketplace/          # Product & vendor browsing
│   │   ├── checkout/             # Cart → payment flow
│   │   ├── customer/             # Customer-specific pages
│   │   │   ├── orders/           # Order history
│   │   │   └── saved/            # Saved vendors
│   │   ├── vendor/               # Vendor-facing pages (within customer app)
│   │   │   ├── dashboard/        # Vendor dashboard
│   │   │   ├── verification/     # KYC verification flow
│   │   │   └── ranking/          # Vendor ranking info
│   │   ├── rider/                # Rider-facing pages (within customer app)
│   │   │   ├── dashboard/        # Rider dashboard
│   │   │   └── kyc/              # Rider KYC flow
│   │   └── admin/                # Admin-facing pages (within customer app)
│   │       └── dashboard/        # Admin dashboard
│   ├── components/
│   │   ├── AppContext.tsx         # Global auth state, notifications, cart
│   │   ├── auth/
│   │   │   └── RegisterClient.tsx # Registration flow (role-aware)
│   │   ├── home/
│   │   │   └── HomeClient.tsx     # Homepage with Vendor/Rider CTAs
│   │   ├── layout/
│   │   │   ├── Navbar.tsx
│   │   │   └── Footer.tsx
│   │   └── ui/                    # ProductCard, VendorCard, etc.
│   ├── lib/
│   │   ├── auth.ts                # JWT helpers (frontend)
│   │   └── utils.ts               # formatPrice, formatDate, etc.
│   └── types/
│       └── index.ts               # Shared TypeScript interfaces
│
├── apps/                          # Standalone role-specific frontends
│   ├── vendor/                    # Vendor Portal — port 3001
│   │   ├── package.json
│   │   ├── next.config.js
│   │   ├── tsconfig.json
│   │   ├── Dockerfile
│   │   └── src/
│   │       ├── app/
│   │       │   ├── auth/login/    # Vendor-only login (role-enforced)
│   │       │   ├── auth/register/ # Vendor registration
│   │       │   ├── dashboard/     # Overview, stats, recent orders
│   │       │   ├── products/      # Product CRUD with modal form
│   │       │   ├── orders/        # Order list + status management
│   │       │   ├── analytics/     # Revenue chart, top products
│   │       │   ├── payouts/       # Balance, withdrawal requests
│   │       │   └── settings/      # Store, account, bank, notifications
│   │       └── lib/
│   │           └── auth.ts        # vendor_auth_token key, role guard
│   │
│   ├── rider/                     # Rider Portal — port 3002
│   │   ├── package.json
│   │   ├── next.config.js
│   │   ├── tsconfig.json
│   │   ├── Dockerfile
│   │   └── src/
│   │       ├── app/
│   │       │   ├── auth/login/    # Rider-only login
│   │       │   ├── auth/register/ # 2-step rider registration
│   │       │   ├── dashboard/     # Availability toggle, pending orders
│   │       │   ├── deliveries/    # Delivery history + detail drawer
│   │       │   ├── earnings/      # Earnings chart + history table
│   │       │   └── settings/      # Account, vehicle, bank, password
│   │       └── lib/
│   │           └── auth.ts        # rider_auth_token key, role guard
│   │
│   └── admin/                     # Admin Portal — port 3003
│       ├── package.json
│       ├── next.config.js
│       ├── tsconfig.json
│       ├── Dockerfile
│       └── src/
│           ├── app/
│           │   ├── auth/login/    # Admin-only login
│           │   ├── dashboard/     # Platform stats + pending approvals
│           │   ├── users/         # User management
│           │   ├── vendors/       # Vendor approval/management
│           │   ├── riders/        # Rider approval/management
│           │   └── orders/        # Order oversight
│           └── lib/
│               └── auth.ts        # admin_auth_token key, role guard
│
├── backend/                       # Express.js + TypeScript API
│   ├── src/
│   │   ├── server.ts              # App bootstrap, CORS, middleware, routes
│   │   ├── routes/                # 20+ route files
│   │   │   ├── auth.ts            # Login, register, email verify, 2FA
│   │   │   ├── products.ts
│   │   │   ├── orders.ts
│   │   │   ├── vendors.ts
│   │   │   ├── riders.ts
│   │   │   ├── admin.ts
│   │   │   ├── payment.ts         # Paystack + Flutterwave
│   │   │   └── ...
│   │   └── lib/
│   │       ├── auth.ts            # JWT sign/verify, requireAuth middleware
│   │       ├── db.ts              # SQLite schema (30+ tables), WAL mode
│   │       ├── email.ts           # SendGrid / SMTP fallback
│   │       ├── rateLimiter.ts     # login, register, reset, verify limiters
│   │       └── seed.ts            # Admin + vendor + category seeding
│   ├── Dockerfile
│   └── package.json
│
├── render.yaml                    # Render.com: 5-service deployment config
├── .env.example                   # All required environment variables
├── next.config.js                 # Customer app: API proxy, standalone output
├── package.json                   # Root scripts including dev:vendor/rider/admin
└── README.md                      # This file
```

---

## Getting Started

### Prerequisites

- Node.js ≥ 20.0.0
- npm ≥ 10.0.0

### Quick Start (Customer + Backend)

```bash
# 1. Clone and install
git clone <repo-url>
cd lastmart
npm install --legacy-peer-deps
cd backend && npm install && cd ..

# 2. Configure environment
cp .env.example .env.local         # Customer frontend
cp .env.example backend/.env       # Backend

# 3. Start development (backend + customer frontend)
npm run dev:all
```

### Start All 5 Services

```bash
# Install all sub-app dependencies first
npm run install:all

# Start all 5 services concurrently
npm run dev:all
# → Backend:   http://localhost:5000
# → Customer:  http://localhost:3006
# → Vendor:    http://localhost:3001
# → Rider:     http://localhost:3002
# → Admin:     http://localhost:3003
```

### Start Individual Services

```bash
npm run dev:backend    # Express API  (port 5000)
npm run dev           # Customer app (port 3006)
npm run dev:vendor    # Vendor app   (port 3001)
npm run dev:rider     # Rider app    (port 3002)
npm run dev:admin     # Admin app    (port 3003)
```

---

## Environment Variables

Copy `.env.example` to `.env.local` (frontend) and `backend/.env` (backend).

### Customer Frontend (`/.env.local`)

| Variable                          | Description                       |
| --------------------------------- | --------------------------------- |
| `BACKEND_API_URL`                 | Express backend URL for API proxy |
| `NEXT_PUBLIC_SITE_URL`            | Canonical site URL for SEO        |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Paystack browser key              |
| `NEXT_PUBLIC_VENDOR_URL`          | Vendor portal URL (for CTAs)      |
| `NEXT_PUBLIC_RIDER_URL`           | Rider portal URL (for CTAs)       |
| `NEXT_PUBLIC_ADMIN_URL`           | Admin portal URL                  |
| `GOOGLE_SITE_VERIFICATION`        | Google Search Console code        |

### Sub-Apps (`apps/*/`)

Each sub-app needs a `.env.local` with:

```env
BACKEND_URL=http://localhost:5000
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_CUSTOMER_URL=http://localhost:3006
```

### Backend (`backend/.env`)

| Variable                                | Description                                  |
| --------------------------------------- | -------------------------------------------- |
| `PORT`                                  | Server port (default: 5000)                  |
| `JWT_SECRET`                            | Secret for signing JWTs (long random string) |
| `FRONTEND_URL`                          | Comma-separated list of allowed CORS origins |
| `DATABASE_PATH`                         | SQLite file path                             |
| `PAYSTACK_SECRET_KEY`                   | Paystack server-side key                     |
| `FLUTTERWAVE_SECRET_KEY`                | Flutterwave server-side key                  |
| `SENDGRID_API_KEY`                      | SendGrid email API key                       |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | SMTP fallback credentials                    |

---

## Frontend Applications

### Customer App (`/` — port 3006)

- Homepage with hero slider, featured products/vendors, and **Become a Vendor / Become a Rider** dual CTA section
- Marketplace with search, filter by city/category, vendor/product views
- Shopping cart (localStorage-persisted), checkout with Paystack/Flutterwave
- Order tracking, saved vendors, customer profile
- Role-based redirect: vendor → `/vendor/dashboard`, admin → `/admin/dashboard`

### Vendor Portal (`apps/vendor/` — port 3001)

- Standalone Next.js app — deploys independently
- Token stored as `vendor_auth_token` (isolated from all other roles)
- Login blocks non-vendor tokens with a clear error message
- Pages: Dashboard · Products (CRUD with modal) · Orders (status management) · Analytics (chart + top products) · Payouts (balance + withdrawals) · Settings (store, account, bank, notifications)

### Rider Portal (`apps/rider/` — port 3002)

- Token stored as `rider_auth_token`
- Online/Offline availability toggle
- Real-time available-order feed with one-tap accept
- Pages: Dashboard · Deliveries (history + detail drawer) · Earnings (chart + history) · Settings (account, vehicle, bank, password)

### Admin Portal (`apps/admin/` — port 3003)

- Token stored as `admin_auth_token`
- Restricted login — only `role === 'admin'` tokens accepted
- Platform overview: total users, vendors, riders, orders, revenue
- Pending approvals queue (vendors + riders) with approve/reject buttons
- Pages: Dashboard · Users · Vendors · Riders · Orders

---

## Backend API

**Base URL:** `http://localhost:5000/api`

### Auth Endpoints

| Method | Path                    | Description                           |
| ------ | ----------------------- | ------------------------------------- |
| POST   | `/auth/register`        | Register (customer/vendor/rider)      |
| POST   | `/auth/login`           | Login → returns JWT + httpOnly cookie |
| POST   | `/auth/logout`          | Clear auth cookie                     |
| GET    | `/auth/me`              | Get current user profile              |
| PUT    | `/auth/profile`         | Update profile                        |
| POST   | `/auth/change-password` | Change password                       |
| POST   | `/auth/forgot-password` | Send reset email                      |
| POST   | `/auth/reset-password`  | Reset with token                      |
| POST   | `/auth/verify-email`    | Verify email code                     |

### Key Resource Endpoints

| Prefix               | Description                           |
| -------------------- | ------------------------------------- |
| `/api/products`      | Product CRUD, search, categories      |
| `/api/vendors`       | Vendor profiles, analytics, payouts   |
| `/api/riders`        | Rider stats, deliveries, availability |
| `/api/orders`        | Order placement, status updates       |
| `/api/admin/*`       | Platform administration               |
| `/api/payment/*`     | Paystack/Flutterwave webhooks         |
| `/api/notifications` | SSE notification stream               |
| `/api/health`        | Health check → `{ version, status }`  |

### Rate Limiting

- `/api/auth/login` — 10 requests per 15 min per IP
- `/api/auth/register` — 10 requests per 15 min per IP

---

## Authentication & Role Isolation

### Token Storage (Per-Portal Isolation)

| Portal   | localStorage Key    | Role Guard             |
| -------- | ------------------- | ---------------------- |
| Customer | `auth_token`        | any authenticated user |
| Vendor   | `vendor_auth_token` | `role === 'vendor'`    |
| Rider    | `rider_auth_token`  | `role === 'rider'`     |
| Admin    | `admin_auth_token`  | `role === 'admin'`     |

### Security Model

1. **Client-side**: JWT decoded (no signature verification) to check role and expiry before rendering
2. **Server-side**: Every API call includes `Authorization: Bearer <token>` — backend verifies signature and role
3. **Cookie**: `httpOnly` cookie set on login for SSR requests (`secure: true` in production)
4. **Cross-portal isolation**: A vendor token stored in `vendor_auth_token` cannot be used to access the admin portal (different key + different role check)

---

## Deployment

### Render (Recommended)

The `render.yaml` in the repo root defines all 5 services. To deploy:

1. Connect your GitHub repo to [Render Dashboard](https://render.com)
2. Render auto-detects `render.yaml` and creates 5 services
3. Set secret environment variables in the Render dashboard:
   - `JWT_SECRET` (backend)
   - `PAYSTACK_SECRET_KEY` (backend)
   - `FLUTTERWAVE_SECRET_KEY` (backend)
   - `SENDGRID_API_KEY` (backend)
   - `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` (customer frontend)

### Docker

Each app has a multi-stage `Dockerfile` using Next.js standalone output:

```bash
# Build and run vendor portal
cd apps/vendor
docker build -t lastmart-vendor .
docker run -p 3001:3001 -e BACKEND_URL=http://localhost:5000 lastmart-vendor

# Build and run backend
cd backend
docker build -t lastmart-api .
docker run -p 5000:5000 -e JWT_SECRET=... lastmart-api
```

### Manual (VPS/Railway)

```bash
# Backend
cd backend && npm install && npm run build && node dist/server.js

# Customer
npm install --legacy-peer-deps && npm run build && npm start

# Vendor
cd apps/vendor && npm install --legacy-peer-deps && npm run build && npm start

# Rider
cd apps/rider && npm install --legacy-peer-deps && npm run build && npm start

# Admin
cd apps/admin && npm install --legacy-peer-deps && npm run build && npm start
```

---

## Scripts Reference

Run from the **root** directory:

| Script                  | Description                         |
| ----------------------- | ----------------------------------- |
| `npm run dev`           | Start customer frontend (port 3006) |
| `npm run dev:backend`   | Start Express backend (port 5000)   |
| `npm run dev:vendor`    | Start vendor portal (port 3001)     |
| `npm run dev:rider`     | Start rider portal (port 3002)      |
| `npm run dev:admin`     | Start admin portal (port 3003)      |
| `npm run dev:all`       | Start all 5 services concurrently   |
| `npm run build`         | Build customer frontend             |
| `npm run build:backend` | Compile backend TypeScript          |
| `npm run build:vendor`  | Build vendor portal                 |
| `npm run build:rider`   | Build rider portal                  |
| `npm run build:admin`   | Build admin portal                  |
| `npm run install:all`   | Install dependencies for all apps   |

---

## Changelog

### v5.3.0 (2026-06-27)

#### New Features

- **Multi-frontend architecture**: Split monolith into 4 independent Next.js apps under `apps/`
  - `apps/vendor/` — Vendor Portal (port 3001) with 7 pages
  - `apps/rider/` — Rider Portal (port 3002) with 6 pages
  - `apps/admin/` — Admin Portal (port 3003) with 6 pages
- **Role-isolated authentication**: Each portal uses a separate localStorage key and role guard
- **Become a Vendor / Become a Rider CTAs**: Dual CTA banner added to customer homepage with direct links to sub-app registration
- **Vendor Portal pages**: Products (CRUD modal), Orders (status management), Analytics (charts), Payouts (withdrawal requests), Settings (4 tabs)
- **Rider Portal pages**: Dashboard (availability toggle, order feed), Deliveries, Earnings (chart), Settings
- **Admin Portal**: Platform stats, pending approvals queue, approve/reject actions
- **Deployment configs**: `render.yaml` (5-service Render config), `Dockerfile` for each app
- **Multi-origin CORS**: `FRONTEND_URL` now accepts comma-separated list of all 4 frontend origins
- **Root scripts**: Added `dev:vendor`, `dev:rider`, `dev:admin`, `build:vendor`, `build:rider`, `build:admin`

#### Bug Fixes

- Fixed 10 broken redirect routes (`/dashboard/{role}` → `/{role}/dashboard`)
- Fixed wrong localStorage key in `RegisterClient.tsx` (`'token'` → `'auth_token'`)
- Fixed insecure cookie (`secure: false` → `secure: process.env.NODE_ENV === 'production'`)
- Fixed dead rate limiter imports — now applied to `/login` and `/register` routes
- Fixed missing CSS classes: `.scrollbar-hide`, `.h-25`, `.max-w-18`
- Fixed deprecated `viewport` in Next.js 14 metadata — separated as `export const viewport`

#### Security

- Rate limiting now enforced on auth routes
- Production cookies properly secured
- Role isolation prevents cross-portal token reuse

#### DevOps

- Synchronized version to `5.3.0` across `package.json`, backend health endpoint, startup log
- Added undocumented env vars to `.env.example`
- Backend TypeScript compilation fixed (installed missing: `nodemailer`, `@sendgrid/mail`, `express-rate-limit`, `axios`)

### v5.2.0

- Previous release — monolithic single-app architecture
