# LastMart v5.3.0 — Files Modified

**Project**: LastMart Local Commerce Platform  
**Version**: 5.3.0  
**Date**: 2026-06-27  
**Commit**: `0ad2f52` — feat: v5.3.0 — multi-frontend architecture + bug fixes

This document lists every file that was **modified** (pre-existing and changed) during the v5.3.0 restructuring. For files that were newly created, see FILES_CREATED.md.

---

## Summary

| Category                 | Files Modified |
| ------------------------ | -------------- |
| Customer frontend (src/) | 8              |
| Root configuration       | 4              |
| Backend                  | 2              |
| **Total**                | **14**         |

---

## Customer Frontend — `src/`

### 1. `src/app/layout.tsx`

**Phase**: Phase 2 (Bug Fix)  
**Change Type**: API compliance fix  
**Reason**: Deprecated viewport metadata bundled into `metadata` object

**What changed**:

- Separated `viewport` from `metadata` into independent named export
- Added `import type { Viewport }` from 'next'
- Removed `viewport` key from `metadata` object

**Before**:

```typescript
export const metadata: Metadata = {
  viewport: "width=device-width, initial-scale=1",
  title: "LastMart",
};
```

**After**:

```typescript
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "LastMart",
};
```

---

### 2. `src/app/globals.css`

**Phase**: Phase 2 (Bug Fix)  
**Change Type**: Missing CSS utility definitions  
**Reason**: Three utility classes referenced in JSX but not defined

**What changed**: Added `@layer utilities` block with:

- `.scrollbar-hide` — hides scrollbar on overflow containers
- `.h-25` — custom height (`6.25rem`)
- `.max-w-18` — custom max-width (`4.5rem`)

---

### 3. `src/components/auth/RegisterClient.tsx`

**Phase**: Phase 2 (Bug Fix)  
**Change Type**: Authentication bug fix  
**Reason**: Wrong localStorage key used after registration

**What changed**:

- Fixed `localStorage.setItem('token', ...)` → `localStorage.setItem('auth_token', ...)`
- Fixed post-registration redirect from `/dashboard/customer` → `/customer/dashboard`

---

### 4. `src/components/layout/Navbar.tsx`

**Phase**: Phase 2 (Bug Fix)  
**Change Type**: Routing fix  
**Reason**: Broken navigation link to rider dashboard

**What changed**:

- Fixed href `/dashboard/rider` → `/rider/dashboard` in rider navigation link

---

### 5. `src/components/layout/Footer.tsx`

**Phase**: Phase 2 (Bug Fix)  
**Change Type**: Routing fix  
**Reason**: Two broken links to customer order history

**What changed**:

- Fixed 2× `/dashboard/customer/orders` → `/customer/orders`

---

### 6. `src/app/checkout/page.tsx`

**Phase**: Phase 2 (Bug Fix)  
**Change Type**: Routing fix  
**Reason**: Post-checkout redirect leads to 404

**What changed**:

- Fixed 2× `router.push('/dashboard/customer/orders')` → `router.push('/customer/orders')`

---

### 7. `src/app/rider/kyc/page.tsx`

**Phase**: Phase 2 (Bug Fix)  
**Change Type**: Routing fix  
**Reason**: KYC completion redirect leads to 404

**What changed**:

- Fixed `router.push('/dashboard/rider')` → `router.push('/rider/dashboard')`

---

### 8. `src/components/home/HomeClient.tsx`

**Phase**: Phase 5 (Customer CTAs)  
**Change Type**: Feature addition  
**Reason**: Add prominent Vendor and Rider CTAs to customer homepage

**What changed**:

- Added `Store, Bike` to lucide-react import
- Added `VENDOR_URL` constant: `process.env.NEXT_PUBLIC_VENDOR_URL ?? 'https://lastmart-vendor.onrender.com'`
- Added `RIDER_URL` constant: `process.env.NEXT_PUBLIC_RIDER_URL ?? 'https://lastmart-rider.onrender.com'`
- Replaced single "Start Selling on LastMart" CTA with dual gradient card layout:
  - **Vendor card** (orange gradient): "Open Your Store" + "Vendor Login" buttons → `${VENDOR_URL}/auth/register`
  - **Rider card** (green gradient): "Start Delivering" + "Rider Login" buttons → `${RIDER_URL}/auth/register`

---

## Root Configuration

### 9. `package.json`

**Phase**: Phase 8 (Root Scripts)  
**Change Type**: Script additions, version update  
**Reason**: Add development and build scripts for new sub-apps

**What changed**:

- `"version"`: `"5.0.0"` → `"5.3.0"`
- Added `"dev:vendor"`: `"cd apps/vendor && npm run dev"`
- Added `"dev:rider"`: `"cd apps/rider && npm run dev"`
- Added `"dev:admin"`: `"cd apps/admin && npm run dev"`
- Updated `"dev:all"`: expanded from 2 processes to 5 (BACKEND, CUSTOMER, VENDOR, RIDER, ADMIN) using `concurrently`
- Added `"build:vendor"`, `"build:rider"`, `"build:admin"`
- Updated `"install:all"`: extended to install deps in `apps/vendor`, `apps/rider`, `apps/admin`

---

### 10. `.env.example`

**Phase**: Phase 4 (Backend CORS) + Phase 9 (Env Vars)  
**Change Type**: Documentation update  
**Reason**: Multi-origin CORS undocumented; new sub-app env vars missing

**What changed**:

- `FRONTEND_URL` updated to comma-separated 4-origin format with dev and prod examples
- Added `NEXT_PUBLIC_VENDOR_URL` for customer app CTA links
- Added `NEXT_PUBLIC_RIDER_URL` for customer app CTA links
- Added `BACKEND_URL` for sub-app proxy configuration
- Added `NEXT_PUBLIC_BACKEND_URL` for client-side references
- Added production URL comment block for all 4 frontend origins
- Added sub-app environment variable section

---

### 11. `README.md`

**Phase**: Phase 7 (README Rewrite)  
**Change Type**: Full rewrite (18,307 characters)  
**Reason**: Documentation was incomplete and didn't reflect new architecture

**What changed** (full rewrite — old content replaced entirely):

- Architecture overview with ASCII service diagram
- Live URLs table (all 5 services)
- Full project structure tree with all sub-apps
- Getting started guide for single service and all-5-services modes
- Environment variable reference tables (per service)
- Per-portal feature documentation (Customer / Vendor / Rider / Admin)
- Authentication & role isolation table (4 localStorage keys + role guards)
- Complete API endpoint reference
- Render.com deployment guide with step-by-step instructions
- Docker deployment section
- Manual VPS deployment section
- Root scripts reference table
- v5.3.0 changelog with all new features and bug fixes

---

### 12. `render.yaml`

**Phase**: Phase 6 (Deployment Configs)  
**Change Type**: Expanded from 1-service to 5-service configuration  
**Reason**: Original render.yaml covered only the backend

**What changed**:

- Added `lastmart-customer` web service (Next.js, port 3006)
- Added `lastmart-vendor` web service (rootDir: apps/vendor, port 3001)
- Added `lastmart-rider` web service (rootDir: apps/rider, port 3002)
- Added `lastmart-admin` web service (rootDir: apps/admin, port 3003)
- `lastmart-api` updated: added 1GB persistent disk for SQLite, `healthCheckPath: /api/health`
- All services: added `sync: false` for secret env vars (JWT_SECRET, PAYSTACK_SECRET_KEY, etc.)
- Build/start commands updated for standalone Next.js output

---

## Backend

### 13. `backend/src/server.ts`

**Phase**: Phase 2 (Bug Fix) — version string only  
**Change Type**: Minor update  
**Reason**: Version mismatch (was `5.2.0`)

**What changed**:

- Version string in health check response: `"5.2.0"` → `"5.3.0"`
- Note: CORS configuration was already correct (`FRONTEND_URL.split(',')`) — no change needed

---

### 14. `backend/src/routes/auth.ts`

**Phase**: Phase 2 (Bug Fixes — 2 separate issues)  
**Change Type**: Security fixes  
**Reason**: Insecure cookie + unapplied rate limiter

**What changed**:

- Cookie security fix: `secure: false` → `secure: process.env.NODE_ENV === 'production'`
- Rate limiter applied: added `registerLimiter` middleware to both `/login` and `/register` routes

---

## Previously Modified Files (Phase 1 — prior session)

The following files were modified in a prior session during the initial audit and bug-fix phase. They are included for completeness.

| File                                   | Phase   | Change                                                                    |
| -------------------------------------- | ------- | ------------------------------------------------------------------------- |
| `src/app/vendor/ranking/page.tsx`      | Phase 2 | Fixed redirect `/dashboard/vendor` → `/vendor/dashboard`                  |
| `src/app/vendor/verification/page.tsx` | Phase 2 | Fixed redirect `/dashboard/vendor` → `/vendor/dashboard`                  |
| `backend/package.json`                 | Phase 2 | Added missing deps: nodemailer, @sendgrid/mail, express-rate-limit, axios |
| `backend/package.json`                 | Phase 2 | Version `5.1.0` → `5.3.0`                                                 |

---

## Change Statistics

| Metric                | Count                                      |
| --------------------- | ------------------------------------------ |
| Total files modified  | 14                                         |
| Security fixes        | 3 (cookie, rate limiter, CORS docs)        |
| Routing fixes         | 7 individual route corrections             |
| Feature additions     | 2 (HomeClient CTAs, render.yaml expansion) |
| Documentation updates | 2 (README, .env.example)                   |
| Script additions      | 1 (package.json scripts)                   |
| Version bumps         | 3 files synced to 5.3.0                    |

---

_For newly created files, see FILES_CREATED.md._  
_For a detailed description of each bug and its fix, see ERROR_REPORT.md._
