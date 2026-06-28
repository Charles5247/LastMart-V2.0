# LastMart v5.3.0 — Migration Plan

**Project**: LastMart Local Commerce Platform  
**Document Date**: 2026-06-27  
**Scope**: Migration from v5.2.x monolith → v5.3.0 multi-frontend architecture  
**Author**: AI Developer  

---

## Overview

This document describes the migration path from the previous LastMart monolithic architecture (single Next.js app + Express backend) to the v5.3.0 multi-frontend architecture (4 independent Next.js apps + Express backend).

It covers:
1. What changed architecturally
2. Breaking changes and their impact
3. Step-by-step migration for existing deployments
4. Database migration (none required for this version)
5. Future migration paths (SQLite → PostgreSQL)

---

## Part 1: v5.2.x → v5.3.0 Migration

### What Changed

| Area | v5.2.x | v5.3.0 |
|------|--------|--------|
| Frontend apps | 1 (monolith) | 4 (customer + vendor + rider + admin) |
| Vendor portal | Pages inside `src/app/vendor/` | `apps/vendor/` (separate Next.js app) |
| Rider portal | Pages inside `src/app/rider/` | `apps/rider/` (separate Next.js app) |
| Admin portal | Pages inside `src/app/admin/` | `apps/admin/` (separate Next.js app) |
| localStorage keys | `auth_token` (all roles — bug) | Role-isolated keys (4 separate keys) |
| Auth routes | Broken `/dashboard/{role}` | Correct `/{role}/dashboard` |
| Cookie security | `secure: false` | `secure: NODE_ENV === 'production'` |
| Rate limiting | Defined but unused | Applied to /login and /register |
| CORS | Single origin | Multi-origin (comma-separated) |
| Deployment | 1 Render service | 5 Render services |
| npm scripts | Limited | `dev:all`, `dev:vendor`, `build:*`, `install:all` |

---

### 1.1 Breaking Changes

#### BC-001: Vendor/Rider/Admin URLs Changed

**Impact**: MEDIUM — Bookmarked URLs and email links may break

| Old URL (monolith) | New URL (v5.3.0) |
|-------------------|-----------------|
| `lastmart.onrender.com/vendor/dashboard` | `lastmart-vendor.onrender.com/dashboard` |
| `lastmart.onrender.com/vendor/products` | `lastmart-vendor.onrender.com/products` |
| `lastmart.onrender.com/rider/dashboard` | `lastmart-rider.onrender.com/dashboard` |
| `lastmart.onrender.com/rider/deliveries` | `lastmart-rider.onrender.com/deliveries` |

**Mitigation**: Add redirects from old paths to new domains in customer app's `next.config.js`:
```javascript
async redirects() {
  return [
    {
      source: '/vendor/:path*',
      destination: 'https://lastmart-vendor.onrender.com/:path*',
      permanent: true  // 301
    },
    {
      source: '/rider/:path*',
      destination: 'https://lastmart-rider.onrender.com/:path*',
      permanent: true
    },
  ];
}
```

#### BC-002: localStorage Token Keys Changed

**Impact**: HIGH — Existing logged-in users will be logged out

**Old behavior** (bug): All roles stored under `auth_token`  
**New behavior**: Each role uses its own key

| Role | Old Key | New Key |
|------|---------|---------|
| Customer | `auth_token` | `auth_token` (unchanged) |
| Vendor | `auth_token` (bug) | `vendor_auth_token` |
| Rider | `auth_token` (bug) | `rider_auth_token` |
| Admin | `auth_token` (bug) | `admin_auth_token` |

**Effect**: Vendors, riders, and admins who were previously logged in will need to log in again after upgrading. **This is intentional** — the old shared key was a security vulnerability.

**User communication**: Send an email to all vendors/riders/admins notifying them that a one-time re-login is required after the upgrade.

#### BC-003: CORS Configuration Must Be Updated

**Impact**: HIGH — Backend will reject requests from new portal origins if not configured

**Required action**: Update `FRONTEND_URL` environment variable in backend:

```env
# Old (single origin)
FRONTEND_URL=https://lastmart.onrender.com

# New (all 4 origins)
FRONTEND_URL=https://lastmart.onrender.com,https://lastmart-vendor.onrender.com,https://lastmart-rider.onrender.com,https://lastmart-admin.onrender.com
```

---

### 1.2 Non-Breaking Changes

These changes are backward compatible and require no special migration steps:

- Cookie security fix (transparent to users)
- Rate limiter activation (users making normal requests unaffected)
- CSS fixes (visual improvements only)
- Version string synchronization (informational)
- Viewport metadata fix (no user-visible change)
- README rewrite (documentation only)

---

### 1.3 Step-by-Step Migration (Existing Render.com Deployment)

#### Pre-Migration Checklist

- [ ] Backup SQLite database: `cp /var/data/lastmart.db /var/data/lastmart.db.backup-$(date +%Y%m%d)`
- [ ] Note all current environment variable values
- [ ] Notify vendors/riders/admins of one-time re-login requirement
- [ ] Schedule maintenance window (estimated 15-30 min downtime)

#### Step 1: Update Backend Environment Variables

In Render.com dashboard → `lastmart-api` service → Environment:

```
FRONTEND_URL = https://lastmart.onrender.com,https://lastmart-vendor.onrender.com,https://lastmart-rider.onrender.com,https://lastmart-admin.onrender.com
```

#### Step 2: Deploy Updated Code

Push v5.3.0 code to main branch. Render.com auto-deploys.

Backend will restart and pick up new `FRONTEND_URL` immediately.

#### Step 3: Create New Render.com Services

Create 3 new Web Services in Render.com:

**lastmart-vendor**:
- Repository: `Charles5247/LastMart-V2.0`
- Root Directory: `apps/vendor`
- Build Command: `npm install --legacy-peer-deps && npx next build`
- Start Command: `node .next/standalone/server.js`
- Environment Variables:
  ```
  BACKEND_URL=https://lastmart-api.onrender.com
  NEXT_PUBLIC_BACKEND_URL=https://lastmart-api.onrender.com
  ```

**lastmart-rider**: (same pattern, root dir `apps/rider`)

**lastmart-admin**: (same pattern, root dir `apps/admin`)

#### Step 4: Verify All Services Are Live

```bash
# Health checks
curl https://lastmart-api.onrender.com/api/health
curl https://lastmart.onrender.com        # Customer
curl https://lastmart-vendor.onrender.com # Vendor
curl https://lastmart-rider.onrender.com  # Rider
curl https://lastmart-admin.onrender.com  # Admin
```

#### Step 5: Add URL Redirects to Customer App

Update root `next.config.js` to redirect old vendor/rider paths.

#### Step 6: Post-Migration Verification

- [ ] Customer can browse, register, login, place order
- [ ] Vendor can login, see products, manage orders
- [ ] Rider can login, see available orders, accept delivery
- [ ] Admin can login, see dashboard, approve/reject vendor
- [ ] CORS: API calls from all 4 origins succeed
- [ ] Rate limiting: Rapid login attempts return 429

---

## Part 2: Database Migration (SQLite → PostgreSQL)

### When to Migrate

Migrate to PostgreSQL when any of the following are true:
- Monthly active users exceed 1,000
- Concurrent database writes exceed ~50/second
- Multiple backend instances needed (horizontal scaling)
- Data size exceeds 5GB

### Migration Steps

#### Step 1: Export SQLite Data

```bash
# On the Render.com backend instance (via Shell)
cd /var/data
sqlite3 lastmart.db .dump > lastmart_dump.sql
```

#### Step 2: Create PostgreSQL Database

In Render.com: New → PostgreSQL → Create

Note the `DATABASE_URL` connection string.

#### Step 3: Convert SQL Dump

SQLite and PostgreSQL have minor syntax differences:

```bash
# Convert dump (most common differences)
sed -e 's/INTEGER PRIMARY KEY AUTOINCREMENT/SERIAL PRIMARY KEY/g' \
    -e 's/TEXT NOT NULL DEFAULT ""/TEXT NOT NULL DEFAULT '"'"''"'"'/g' \
    -e 's/DATETIME/TIMESTAMP/g' \
    lastmart_dump.sql > postgres_dump.sql
```

#### Step 4: Import to PostgreSQL

```bash
psql $DATABASE_URL < postgres_dump.sql
```

#### Step 5: Update Backend Code

In `backend/src/db/`:
- Add `pg` package: `npm install pg @types/pg`
- Swap `better-sqlite3` adapter for `pg` Pool
- Update connection code:

```typescript
// db/index.ts
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export const db = pool;
```

#### Step 6: Update Environment

```env
DATABASE_URL=postgres://user:password@host:5432/dbname
```

#### Step 7: Test and Deploy

---

## Part 3: Future Migration Paths

### v5.x → v6.0 (Planned Features)

| Feature | Migration Complexity | Notes |
|---------|---------------------|-------|
| Real-time notifications (WebSocket) | MEDIUM | Add Socket.io to backend; update all 4 frontends |
| Shared component library (`packages/ui/`) | MEDIUM | Extract common components from 4 apps into monorepo package |
| Redis caching | LOW | Add Redis service; wrap DB queries with cache layer |
| Image CDN (Cloudinary/S3) | LOW | Replace local multer upload with cloud SDK |
| PostgreSQL | LOW–MEDIUM | See Part 2 above |
| JWT refresh tokens | MEDIUM | Dual-token system; update all 4 auth.ts files |

### Shared Component Library (Recommended Next Step)

Currently, utility functions and some UI patterns are duplicated across the 4 apps. The recommended future step is:

```
/home/user/webapp/
├── packages/
│   ├── ui/           ← Shared React components
│   │   ├── Button.tsx
│   │   ├── Modal.tsx
│   │   └── StatusBadge.tsx
│   └── utils/        ← Shared TypeScript utilities
│       ├── auth.ts   ← Generic token decode
│       ├── format.ts ← formatPrice, formatDate
│       └── types.ts  ← Shared interfaces
├── apps/
│   ├── vendor/       ← imports from @lastmart/ui
│   ├── rider/
│   └── admin/
└── src/              ← Customer app
```

This requires converting to a proper monorepo with `npm workspaces` or `pnpm workspaces`.

---

## Rollback Plan

If v5.3.0 causes critical issues, rollback procedure:

### Fast Rollback (< 5 min)

1. In Render.com, find `lastmart-api` → Deploys → Previous deploy → Re-deploy
2. In Render.com, find `lastmart-customer` → Re-deploy previous version
3. Update `FRONTEND_URL` back to single origin
4. New vendor/rider/admin services can be suspended (not deleted)

### Data Rollback

No database schema changes were made in v5.3.0, so no data migration rollback is needed.

---

## Rollout Communication Template

**Subject**: LastMart Platform Upgrade — Action Required

> We're upgrading the LastMart platform to improve security and performance.
>
> **If you are a Vendor or Rider:**
> - Your portal has moved to a dedicated URL:
>   - Vendors: https://lastmart-vendor.onrender.com
>   - Riders: https://lastmart-rider.onrender.com
> - You will need to **log in once** after the upgrade (one-time re-login)
> - All your data, products, orders, and earnings are fully preserved
>
> **Upgrade date**: [DATE]  
> **Estimated downtime**: 15–30 minutes  
>
> Questions? Contact support@lastmart.com

---

*See also: ARCHITECTURE.md for architectural overview, BACKEND_INTEGRATION_PLAN.md for API details.*
