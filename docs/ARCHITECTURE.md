# LastMart v5.3.0 — Architecture Document

**Project**: LastMart Local Commerce Platform  
**Version**: 5.3.0  
**Date**: 2026-06-27  
**Author**: AI Developer  

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [High-Level Architecture Diagram](#2-high-level-architecture-diagram)
3. [Service Inventory](#3-service-inventory)
4. [Frontend Architecture](#4-frontend-architecture)
5. [Backend Architecture](#5-backend-architecture)
6. [Database Architecture](#6-database-architecture)
7. [Authentication Architecture](#7-authentication-architecture)
8. [Network Architecture](#8-network-architecture)
9. [Deployment Architecture](#9-deployment-architecture)
10. [Data Flow Diagrams](#10-data-flow-diagrams)

---

## 1. System Overview

LastMart is a **local commerce platform** connecting customers, vendors, and delivery riders in a unified marketplace. It enables:

- **Customers** to browse local stores, place orders, and track deliveries
- **Vendors** to list products, manage orders, view analytics, and receive payouts
- **Riders** to accept delivery assignments, track earnings, and manage availability
- **Admins** to approve vendors/riders, manage users, and oversee platform operations

### Design Principles (v5.3.0)

1. **Role Isolation** — Each user role has its own independent frontend application with isolated authentication
2. **API-First Backend** — Single Express.js API serves all 4 frontend apps
3. **Standalone Deployment** — Each service deploys independently with its own container
4. **Security by Default** — HTTPS-only cookies, role-enforced routes, rate-limited auth
5. **Progressive Architecture** — SQLite for development, PostgreSQL-ready for production

---

## 2. High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         INTERNET / CDN                               │
└──────────┬────────────┬────────────┬────────────┬───────────────────┘
           │            │            │            │
           ▼            ▼            ▼            ▼
  ┌──────────────┐ ┌──────────┐ ┌─────────┐ ┌──────────┐
  │  Customer    │ │  Vendor  │ │  Rider  │ │  Admin   │
  │  Portal      │ │  Portal  │ │  Portal │ │  Portal  │
  │  Next.js 14  │ │ Next.js  │ │ Next.js │ │ Next.js  │
  │  Port: 3000  │ │  14      │ │  14     │ │  14      │
  │              │ │ Port:3001│ │ Port:   │ │ Port:    │
  │  lastmart    │ │ vendor.  │ │ 3002    │ │ 3003     │
  │  .onrender   │ │ onrender │ │ rider.  │ │ admin.   │
  │  .com        │ │ .com     │ │ onrender│ │ onrender │
  │              │ │          │ │ .com    │ │ .com     │
  │ auth_token   │ │ vendor_  │ │ rider_  │ │ admin_   │
  │ (localStorage│ │ auth_    │ │ auth_   │ │ auth_    │
  │ key)         │ │ token    │ │ token   │ │ token    │
  └──────┬───────┘ └────┬─────┘ └────┬────┘ └────┬─────┘
         │              │            │            │
         └──────────────┴────────────┴────────────┘
                                │
                    ┌───────────▼───────────┐
                    │    Express.js API      │
                    │    Backend             │
                    │    Port: 5000          │
                    │    lastmart-api.       │
                    │    onrender.com        │
                    │                        │
                    │  Multi-origin CORS     │
                    │  JWT Auth Middleware   │
                    │  Role-Based Guards     │
                    │  Rate Limiting         │
                    └───────────┬────────────┘
                                │
                    ┌───────────▼────────────┐
                    │    SQLite (dev)         │
                    │    PostgreSQL (prod)    │
                    │    /var/data/lastmart   │
                    └────────────────────────┘
```

---

## 3. Service Inventory

| Service | Technology | Port (dev) | URL (prod) | Role |
|---------|-----------|------------|------------|------|
| `lastmart-api` | Express.js + TypeScript | 5000 | `lastmart-api.onrender.com` | REST API + Auth |
| `lastmart-customer` | Next.js 14 | 3000 | `lastmart.onrender.com` | Customer shopping portal |
| `lastmart-vendor` | Next.js 14 | 3001 | `lastmart-vendor.onrender.com` | Vendor management portal |
| `lastmart-rider` | Next.js 14 | 3002 | `lastmart-rider.onrender.com` | Rider delivery portal |
| `lastmart-admin` | Next.js 14 | 3003 | `lastmart-admin.onrender.com` | Admin control panel |

---

## 4. Frontend Architecture

### 4.1 Monorepo Structure

```
/home/user/webapp/
├── src/                          ← Customer portal (root Next.js app)
│   ├── app/                      ← App Router pages
│   │   ├── layout.tsx            ← Root layout + metadata
│   │   ├── page.tsx              ← Homepage
│   │   ├── auth/                 ← Login/register
│   │   ├── customer/             ← Customer dashboard, orders, profile
│   │   ├── vendor/               ← (legacy vendor pages in customer app)
│   │   ├── rider/                ← (legacy rider pages in customer app)
│   │   └── checkout/             ← Checkout flow
│   ├── components/               ← Shared UI components
│   │   ├── home/HomeClient.tsx   ← Homepage with Vendor+Rider CTAs
│   │   ├── layout/Navbar.tsx     ← Customer navigation
│   │   └── layout/Footer.tsx     ← Customer footer
│   └── lib/                      ← Client utilities
│
├── apps/
│   ├── vendor/                   ← Vendor portal (independent Next.js app)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── auth/login/   ← Vendor login (orange theme)
│   │   │   │   ├── auth/register/← Store registration
│   │   │   │   ├── dashboard/    ← Revenue/orders stats + sidebar
│   │   │   │   ├── products/     ← Product CRUD + image management
│   │   │   │   ├── orders/       ← Order management + status updates
│   │   │   │   ├── analytics/    ← Revenue charts, top products
│   │   │   │   ├── payouts/      ← Balance + withdrawal requests
│   │   │   │   └── settings/     ← Store/account/bank/notifications
│   │   │   └── lib/
│   │   │       ├── auth.ts       ← vendor_auth_token, isVendorAuthenticated()
│   │   │       └── utils.ts      ← formatPrice, formatDate, getStatusColor
│   │   ├── package.json          ← name: lastmart-vendor, port 3001
│   │   ├── next.config.js        ← standalone + API proxy
│   │   ├── tsconfig.json
│   │   └── Dockerfile
│   │
│   ├── rider/                    ← Rider portal (independent Next.js app)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── auth/login/   ← Rider login (green theme)
│   │   │   │   ├── auth/register/← 2-step: personal + vehicle
│   │   │   │   ├── dashboard/    ← Availability toggle + order feed
│   │   │   │   ├── deliveries/   ← Delivery history + drawer
│   │   │   │   ├── earnings/     ← Earnings chart + history
│   │   │   │   └── settings/     ← Account/vehicle/bank/password
│   │   │   └── lib/
│   │   │       ├── auth.ts       ← rider_auth_token, isRiderAuthenticated()
│   │   │       └── utils.ts      ← getDistanceLabel + shared utils
│   │   ├── package.json          ← name: lastmart-rider, port 3002
│   │   ├── next.config.js
│   │   ├── tsconfig.json
│   │   └── Dockerfile
│   │
│   └── admin/                    ← Admin portal (independent Next.js app)
│       ├── src/
│       │   ├── app/
│       │   │   ├── auth/login/   ← Admin login (red theme)
│       │   │   ├── dashboard/    ← 6 stats + pending approvals queue
│       │   │   ├── users/        ← User management (suspend/activate)
│       │   │   ├── vendors/      ← Vendor approval + management
│       │   │   ├── riders/       ← Rider approval + management
│       │   │   └── orders/       ← Order oversight
│       │   └── lib/
│       │       └── auth.ts       ← admin_auth_token, isAdminAuthenticated()
│       ├── package.json          ← name: lastmart-admin, port 3003
│       ├── next.config.js
│       ├── tsconfig.json
│       └── Dockerfile
│
├── backend/                      ← Express.js API
│   ├── src/
│   │   ├── server.ts             ← App bootstrap, CORS, middleware
│   │   ├── routes/               ← auth, vendors, riders, orders, admin
│   │   ├── middleware/           ← verifyToken, requireRole
│   │   ├── services/             ← email, payment, upload
│   │   └── db/                   ← SQLite schema + queries
│   ├── package.json
│   └── Dockerfile
│
├── package.json                  ← Root scripts (dev:all, build:*, install:all)
├── render.yaml                   ← 5-service Render.com deployment
└── README.md                     ← Full documentation
```

### 4.2 Next.js 14 App Router Patterns

All four frontends use identical structural patterns:

**Page Protection Pattern**:
```typescript
// Every protected page
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isVendorAuthenticated, getStoredToken } from '@/lib/auth';

export default function ProtectedPage() {
  const router = useRouter();
  
  useEffect(() => {
    if (!isVendorAuthenticated()) {
      router.replace('/auth/login');
      return;
    }
    // fetch data...
  }, []);
}
```

**API Call Pattern**:
```typescript
const token = getStoredToken();
const response = await fetch('/api/endpoint', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

**Next.js Config (all sub-apps)**:
```javascript
// apps/*/next.config.js
const nextConfig = {
  output: 'standalone',  // Self-contained deployment
  async rewrites() {
    return [{
      source: '/api/:path*',
      destination: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/:path*`
    }];
  }
};
```

### 4.3 Tailwind CSS v4

All apps use Tailwind CSS v4 with the new import syntax:

```css
/* globals.css */
@import "tailwindcss";  /* v4 — replaces @tailwind directives */

@layer utilities {
  .scrollbar-hide { ... }
}
```

### 4.4 Portal Visual Identity

| Portal | Primary Color | Theme | Audience |
|--------|--------------|-------|----------|
| Customer | Blue (`#3b82f6`) | Vibrant, consumer | Public users |
| Vendor | Orange (`#f97316`) | Professional, business | Store owners |
| Rider | Green (`#10b981`) | Active, energetic | Delivery riders |
| Admin | Red (`#ef4444`) | Authoritative, control | Platform admins |

---

## 5. Backend Architecture

### 5.1 Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Runtime | Node.js | ≥18 |
| Framework | Express.js | 4.x |
| Language | TypeScript | 5.x |
| ORM/DB | better-sqlite3 | latest |
| Auth | jsonwebtoken | 9.x |
| Payments | Paystack (via axios) | API v1 |
| Email | Nodemailer / SendGrid | latest |
| Rate Limiting | express-rate-limit | 7.x |
| File Upload | Multer | 1.x |

### 5.2 Route Structure

```
/api/
├── /health                    ← Health check (no auth)
├── /auth/
│   ├── POST /register         ← Rate-limited, creates user + JWT
│   ├── POST /login            ← Rate-limited, returns JWT + cookie
│   ├── POST /logout           ← Clears cookie
│   ├── GET  /me               ← Returns current user (auth required)
│   ├── PUT  /profile          ← Update profile (auth required)
│   └── POST /change-password  ← Change password (auth required)
├── /vendors/
│   ├── GET  /me               ← Vendor's own store info
│   ├── PUT  /me               ← Update store details
│   ├── GET  /products         ← Vendor's product list
│   ├── POST /products         ← Create product
│   ├── PUT  /products/:id     ← Update product
│   ├── DELETE /products/:id   ← Delete product
│   ├── GET  /orders           ← Vendor's orders
│   ├── GET  /analytics        ← Revenue + metrics
│   ├── GET  /payouts          ← Payout history
│   ├── POST /request-payout   ← Request withdrawal
│   └── PUT  /bank-details     ← Update bank account
├── /riders/
│   ├── PUT  /availability     ← Toggle online/offline
│   ├── GET  /available-orders ← Feed of assignable orders
│   ├── POST /accept-delivery  ← Accept an order
│   ├── PUT  /delivery/:id/status ← Update delivery status
│   ├── GET  /earnings/history ← Earnings history
│   ├── PUT  /vehicle          ← Update vehicle info
│   └── PUT  /bank             ← Update bank details
├── /orders/
│   ├── POST /                 ← Create order (customer)
│   ├── GET  /:id              ← Get order details
│   ├── PUT  /:id/status       ← Update status (vendor/rider)
│   └── GET  /customer/me      ← Customer's order history
└── /admin/
    ├── GET  /users            ← All users
    ├── PUT  /users/:id/suspend    ← Suspend user
    ├── PUT  /users/:id/activate   ← Activate user
    ├── GET  /vendors              ← All vendors
    ├── PUT  /vendors/:id/approve  ← Approve vendor
    ├── PUT  /vendors/:id/reject   ← Reject vendor
    ├── GET  /riders               ← All riders
    ├── PUT  /riders/:id/approve   ← Approve rider
    └── GET  /orders               ← All orders (oversight)
```

### 5.3 Middleware Chain

```
Request
  │
  ▼
app.use(cors(...))          ← Multi-origin CORS validation
  │
  ▼
app.use(express.json())     ← Body parsing
  │
  ▼
app.use(helmet())           ← Security headers
  │
  ▼
Route Handler
  │
  ├─ Public routes (/auth/login, /auth/register, /health)
  │   └── [rate limiter] → handler
  │
  └─ Protected routes
      └── verifyToken() → requireRole(role) → handler
```

### 5.4 Authentication Middleware

```typescript
// verifyToken — checks Bearer header, then cookie
export function verifyToken(req, res, next) {
  let token = req.headers.authorization?.split(' ')[1];  // Bearer token
  if (!token) token = req.cookies?.token;                 // fallback to cookie
  
  if (!token) return res.status(401).json({ error: 'No token' });
  
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// requireRole — enforces role
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
```

---

## 6. Database Architecture

### 6.1 Technology

| Environment | Database | Mode |
|-------------|----------|------|
| Development | SQLite (better-sqlite3) | WAL mode — concurrent reads |
| Production | PostgreSQL (recommended) | Connection pool |

### 6.2 Core Entity Relationships

```
Users (id, email, password_hash, role, status, created_at)
  │
  ├── Vendors (user_id → Users.id, store_name, description, status, rating)
  │       │
  │       └── Products (vendor_id → Vendors.id, name, price, stock, status)
  │               │
  │               └── OrderItems (product_id → Products.id, quantity, price)
  │
  ├── Riders (user_id → Users.id, vehicle_type, availability, rating, earnings)
  │
  └── Orders (customer_id → Users.id, vendor_id → Vendors.id, rider_id → Riders.id)
          │
          ├── OrderItems (order_id → Orders.id, ...)
          └── Deliveries (order_id → Orders.id, rider_id → Riders.id, status)
```

### 6.3 Order Status State Machine

```
pending → confirmed → preparing → ready → picked_up → delivered
    │                                                        
    └─────────────────────→ cancelled (from any state)
```

### 6.4 Storage Configuration

- **Dev**: SQLite file at `./backend/data/lastmart.db`
- **Prod (Render.com)**: Persistent disk mounted at `/var/data`, SQLite at `/var/data/lastmart.db`
- **Prod (PostgreSQL)**: Set `DATABASE_URL` — backend switches adapter automatically

---

## 7. Authentication Architecture

### 7.1 Registration Flow

```
User fills form
     │
     ▼
POST /api/auth/register
  { email, password, name, role, ...roleSpecificFields }
     │
     ▼
Rate check (5 req/15min)
     │
     ▼
Hash password (bcrypt, 12 rounds)
     │
     ▼
Insert into Users table
     │
     ▼
Sign JWT { userId, email, role, exp: +7d }
     │
     ├── Set httpOnly cookie (secure in prod)
     └── Return { token, user } in JSON body
     │
     ▼
Frontend stores token in role-specific localStorage key
Frontend redirects to role-specific dashboard
```

### 7.2 Login Flow

```
POST /api/auth/login { email, password }
     │
     ▼
Rate check
     │
     ▼
Find user by email → bcrypt.compare(password, hash)
     │
     ▼
Sign JWT → Set cookie → Return token
     │
     ▼
Frontend: decodeToken() → check role → store in correct key
```

### 7.3 Role Guards — Token Key Mapping

```typescript
// Each portal's auth.ts has unique key
// apps/vendor/src/lib/auth.ts
const TOKEN_KEY = 'vendor_auth_token';

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function isVendorAuthenticated(): boolean {
  const token = getStoredToken();
  if (!token) return false;
  const user = decodeToken(token);
  return user?.role === 'vendor';  // strict role check
}
```

---

## 8. Network Architecture

### 8.1 API Proxy (Next.js → Backend)

All sub-apps proxy `/api/*` requests to the backend:

```
Browser
  │
  ▼
GET /api/vendors/products        ← request to Next.js app
  │
  ▼
Next.js rewrite rule
  └── destination: ${BACKEND_URL}/api/vendors/products
  │
  ▼
Express.js backend (port 5000)
  └── Response
```

This means:
- No CORS issues for same-origin API calls from browser perspective
- Backend URL is server-side only (not exposed to browser)
- Works identically in dev and production

### 8.2 CORS Configuration

```typescript
const allowedOrigins = process.env.FRONTEND_URL
  .split(',')
  .map(o => o.trim());
// = ['https://lastmart.onrender.com', 'https://lastmart-vendor.onrender.com', ...]

cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error('Not allowed by CORS'));
  },
  credentials: true  // required for cookie auth
})
```

### 8.3 Port Allocation

| Service | Port | Notes |
|---------|------|-------|
| Backend API | 5000 | Internal — not exposed directly |
| Customer app | 3000 | Public-facing |
| Vendor app | 3001 | Public-facing |
| Rider app | 3002 | Public-facing |
| Admin app | 3003 | Should be IP-restricted in production |

---

## 9. Deployment Architecture

### 9.1 Render.com (Primary)

All 5 services deploy to Render.com via `render.yaml`:

```yaml
services:
  - name: lastmart-api        # Express backend
    type: web
    buildCommand: cd backend && npm install && npm run build
    startCommand: cd backend && node dist/server.js
    disk:
      name: sqlite-data
      mountPath: /var/data
      sizeGB: 1
      
  - name: lastmart-customer   # Customer Next.js app
    type: web
    buildCommand: npm install && npx next build
    startCommand: node .next/standalone/server.js
    
  - name: lastmart-vendor     # Vendor Next.js app
    type: web
    rootDir: apps/vendor
    buildCommand: npm install && npx next build
    startCommand: node .next/standalone/server.js
    
  # ... rider, admin follow same pattern
```

### 9.2 Docker (Alternative / Self-hosted)

Each service has a multi-stage Dockerfile:

```dockerfile
# Stage 1: Dependencies
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Stage 2: Build
FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Runtime (minimal)
FROM node:18-alpine AS runner
WORKDIR /app
RUN addgroup -g 1001 nodejs && adduser -S nextjs -u 1001
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
USER nextjs
EXPOSE 3001
CMD ["node", "server.js"]
```

### 9.3 Development (All 5 Services Concurrently)

```bash
npm run dev:all
# Runs concurrently with labels:
# [BACKEND]  → cd backend && npm run dev (port 5000)
# [CUSTOMER] → npx next dev (port 3000)
# [VENDOR]   → cd apps/vendor && npm run dev (port 3001)
# [RIDER]    → cd apps/rider && npm run dev (port 3002)
# [ADMIN]    → cd apps/admin && npm run dev (port 3003)
```

---

## 10. Data Flow Diagrams

### 10.1 Customer Places an Order

```
Customer Browser (lastmart.onrender.com)
  │
  │  1. Browse products — GET /api/products?vendorId=X
  │  2. Add to cart (localStorage cart)
  │  3. Checkout — POST /api/orders { items, vendorId, address }
  │     Bearer: auth_token
  │
  ▼
Express Backend
  │  verifyToken() → role=customer ✓
  │  Create order record (status: pending)
  │  Send notification to vendor
  │
  ▼
Vendor Browser (lastmart-vendor.onrender.com)
  │  GET /api/vendors/orders (polling or websocket future)
  │  See new order → Click "Confirm"
  │  PUT /api/orders/:id/status { status: confirmed }
  │  Bearer: vendor_auth_token
  │
  ▼
Express Backend
  │  Update order status → Send notification to customer
  │
  ▼
Rider Browser (lastmart-rider.onrender.com)
  │  GET /api/riders/available-orders (dashboard feed)
  │  See ready order → Click "Accept"
  │  POST /api/riders/accept-delivery { orderId }
  │  Bearer: rider_auth_token
  │
  ▼
Express Backend
  │  Assign rider → Update order status: picked_up
  │  Create delivery record
  │
  ▼
Rider marks delivered → PUT /api/riders/delivery/:id/status { status: delivered }
Customer sees order status update in /customer/orders
```

### 10.2 Vendor Approval Flow

```
Vendor registers at lastmart-vendor.onrender.com/auth/register
  │  POST /api/auth/register { role: 'vendor', storeName, ... }
  │  Status: pending_approval
  │
  ▼
Admin sees in dashboard (lastmart-admin.onrender.com/dashboard)
  │  GET /api/admin/vendors?status=pending
  │  Approves → PUT /api/admin/vendors/:id/approve
  │  Bearer: admin_auth_token
  │
  ▼
Vendor receives approval email (via Nodemailer/SendGrid)
Vendor can now list products and receive orders
```

---

## Architecture Decision Records

### ADR-001: Split monolith into 4 independent Next.js apps

**Decision**: Create separate Next.js apps for each user role instead of using a single app with role-based route protection.

**Rationale**:
- Better security isolation (separate deployments, separate localStorage origins)
- Independent scaling per portal
- Smaller bundle sizes (no vendor/rider/admin code shipped to customers)
- Cleaner role-specific UX without conditional rendering
- Independent CI/CD pipelines possible

**Trade-offs**: More deployment complexity, shared components must be duplicated or extracted to a package.

### ADR-002: SQLite for development, PostgreSQL-ready for production

**Decision**: Use `better-sqlite3` for development with WAL mode; design queries to be compatible with PostgreSQL.

**Rationale**: SQLite requires zero infrastructure for development. WAL mode supports concurrent reads. Render.com persistent disk makes SQLite viable for small-scale production.

**Migration path**: When load grows, swap database adapter to `pg` and update queries (minimal changes since standard SQL is used).

### ADR-003: Dual auth (cookie + Bearer header)

**Decision**: Issue JWT as both httpOnly cookie and JSON response body.

**Rationale**: Cookie enables SSR authentication. Bearer header enables simple client-side API calls without CORS complexity. Both are verified server-side on every request.

### ADR-004: Client-side JWT decode (no signature verification on frontend)

**Decision**: Frontend decodes JWT payload without verifying signature.

**Rationale**: Signature verification requires the secret key — exposing it client-side would be a critical security flaw. The decode is used only for UX (display name, role-based UI). All access decisions are made server-side.

---

*See also: BACKEND_INTEGRATION_PLAN.md for API integration details, MIGRATION_PLAN.md for upgrade path.*
