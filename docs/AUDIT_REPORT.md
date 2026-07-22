# LastMart v5.3.0 — Audit Report

**Project**: LastMart Local Commerce Platform  
**Audit Date**: 2026-06-27  
**Auditor**: AI Developer (automated + manual review)  
**Scope**: Full repository — frontend, backend, configuration, infrastructure  
**Repository**: https://github.com/Charles5247/LastMart-V2.0  

---

## Executive Summary

A comprehensive audit of the LastMart codebase was conducted across all layers of the stack — Express.js backend, Next.js 14 customer frontend, configuration files, environment management, and deployment infrastructure. The audit identified **10 distinct bug categories** spanning security, routing, authentication, dependency management, and developer experience.

All 10 categories were remediated in Phase 2 of the restructuring effort. Additionally, the monolithic frontend architecture was identified as a structural risk (single app serving 4 different user roles) and addressed in Phase 3 via a multi-frontend split.

**Overall Risk Rating at Time of Audit: HIGH**  
**Overall Risk Rating Post-Remediation: LOW**

---

## Audit Methodology

### Approach
1. **Static Analysis** — TypeScript compiler (`tsc --noEmit`) run against frontend and backend independently
2. **Route Mapping** — All `redirect()` calls cross-referenced against actual `app/` directory routes
3. **Authentication Flow Review** — localStorage keys, cookie configuration, JWT handling
4. **Dependency Audit** — `package.json` imports cross-checked against installed packages and import statements
5. **Configuration Review** — `.env.example`, `next.config.js`, `server.ts` CORS, metadata exports
6. **CSS Class Audit** — All Tailwind classes used in JSX cross-checked against `globals.css` custom definitions
7. **Security Review** — Cookie flags, rate limiting, CORS policy, token isolation

### Files Inspected
- `backend/src/server.ts` — CORS, rate limiting, middleware
- `backend/src/routes/auth.ts` — Login/register endpoints, cookie handling
- `backend/package.json` — Backend dependencies
- `src/app/layout.tsx` — Viewport metadata
- `src/components/auth/RegisterClient.tsx` — localStorage key usage
- `src/components/layout/Navbar.tsx` — Navigation links
- `src/components/layout/Footer.tsx` — Footer links
- `src/app/checkout/page.tsx` — Post-checkout redirects
- `src/app/rider/kyc/page.tsx` — KYC completion redirect
- `src/app/vendor/ranking/page.tsx` — Ranking page redirect
- `src/app/vendor/verification/page.tsx` — Verification redirect
- `src/app/globals.css` — Custom CSS class definitions
- `.env.example` — Environment variable documentation

---

## Bug Category 1: Missing Backend Dependencies

**Severity**: CRITICAL  
**Category**: Dependency Management  
**Status**: ✅ FIXED

### Description
The backend `package.json` listed packages in `dependencies` that were used in import statements but not installed in `node_modules`. This caused the backend to fail to compile and run.

### Affected Packages
| Package | Used In | Was Present |
|---------|---------|-------------|
| `nodemailer` | `backend/src/services/email.ts` | ❌ Missing |
| `@sendgrid/mail` | `backend/src/services/email.ts` | ❌ Missing |
| `express-rate-limit` | `backend/src/routes/auth.ts` | ❌ Missing |
| `axios` | `backend/src/services/payment.ts` | ❌ Missing |

### Root Cause
Packages were added to `package.json` manually without running `npm install`, or `node_modules` was deleted/not committed and never restored.

### Fix Applied
```bash
cd backend && npm install nodemailer @sendgrid/mail express-rate-limit axios --legacy-peer-deps
```

---

## Bug Category 2: Broken Redirect Routes (10 occurrences)

**Severity**: HIGH  
**Category**: Routing  
**Status**: ✅ FIXED

### Description
Ten separate `redirect()` calls referenced routes in the format `/dashboard/{role}` which do not exist in the Next.js App Router directory structure. The actual routes follow the pattern `/{role}/dashboard`.

### Affected Files and Routes

| File | Broken Route | Correct Route |
|------|-------------|---------------|
| `src/components/layout/Navbar.tsx` | `/dashboard/rider` | `/rider/dashboard` |
| `src/components/layout/Footer.tsx` | `/dashboard/customer/orders` (×2) | `/customer/orders` |
| `src/components/auth/RegisterClient.tsx` | `/dashboard/customer` | `/customer/dashboard` |
| `src/app/checkout/page.tsx` | `/dashboard/customer/orders` (×2) | `/customer/orders` |
| `src/app/rider/kyc/page.tsx` | `/dashboard/rider` | `/rider/dashboard` |
| `src/app/vendor/ranking/page.tsx` | `/dashboard/vendor` | `/vendor/dashboard` |
| `src/app/vendor/verification/page.tsx` | `/dashboard/vendor` | `/vendor/dashboard` |

### Root Cause
Routes were written with an assumed `/dashboard/{role}` convention that was never implemented. The actual file structure uses `/{role}/dashboard`.

### Fix Applied
All 10 occurrences were individually corrected using exact string replacement.

---

## Bug Category 3: Wrong localStorage Key

**Severity**: HIGH  
**Category**: Authentication  
**Status**: ✅ FIXED

### Description
`RegisterClient.tsx` stored the JWT token under the key `'token'` after successful registration, while the rest of the application (login flow, API calls, auth guards) expected the key `'auth_token'`. This caused users who registered to be immediately treated as unauthenticated.

### Affected File
`src/components/auth/RegisterClient.tsx` — line storing token after registration

### Root Cause
The token storage was implemented independently of the login flow without checking the established key convention.

### Fix Applied
```typescript
// Before
localStorage.setItem('token', data.token);

// After
localStorage.setItem('auth_token', data.token);
```

---

## Bug Category 4: Insecure Cookie Configuration

**Severity**: HIGH  
**Category**: Security  
**Status**: ✅ FIXED

### Description
The JWT cookie set by `backend/src/routes/auth.ts` had `secure: false` hardcoded. This means the cookie would be sent over plain HTTP in production, making it vulnerable to interception.

### Affected File
`backend/src/routes/auth.ts` — `res.cookie()` call

### Root Cause
Hardcoded value — likely set to `false` during local development and never updated for production.

### Fix Applied
```typescript
// Before
res.cookie('token', token, {
  httpOnly: true,
  secure: false,   // ← INSECURE
  sameSite: 'lax'
});

// After
res.cookie('token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',  // ← SECURE
  sameSite: 'lax'
});
```

---

## Bug Category 5: Dead Rate Limiters

**Severity**: MEDIUM  
**Category**: Security  
**Status**: ✅ FIXED

### Description
`express-rate-limit` was imported and a `registerLimiter` middleware was created in `backend/src/routes/auth.ts`, but it was never applied to any route. This meant login and registration endpoints had no brute-force protection.

### Affected File
`backend/src/routes/auth.ts`

### Root Cause
The rate limiter was created but the middleware was not passed to the route definitions. Likely a forgotten TODO.

### Fix Applied
```typescript
// Before
router.post('/login', async (req, res) => { ... });
router.post('/register', async (req, res) => { ... });

// After
router.post('/login', registerLimiter, async (req, res) => { ... });
router.post('/register', registerLimiter, async (req, res) => { ... });
```

---

## Bug Category 6: Missing CSS Classes

**Severity**: LOW  
**Category**: UI / Styling  
**Status**: ✅ FIXED

### Description
Three CSS utility classes were used in JSX components but not defined in `src/app/globals.css`, resulting in broken layouts:
- `.scrollbar-hide` — used on scrollable containers to hide scrollbar
- `.h-25` — custom height utility
- `.max-w-18` — custom max-width utility

### Root Cause
Custom utilities were referenced without being added to the global stylesheet. Tailwind v4 does not generate arbitrary values for classes like `.h-25` unless they follow the exact `h-[value]` syntax.

### Fix Applied
Added to `src/app/globals.css`:
```css
@layer utilities {
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  .h-25 {
    height: 6.25rem;
  }
  .max-w-18 {
    max-width: 4.5rem;
  }
}
```

---

## Bug Category 7: Deprecated Viewport Metadata

**Severity**: LOW  
**Category**: Next.js Compliance  
**Status**: ✅ FIXED

### Description
`src/app/layout.tsx` exported `viewport` configuration as part of the `metadata` object. In Next.js 14, the `viewport` configuration must be exported as a separate named export of type `Viewport`. Bundling it in `metadata` produces a build warning and will be unsupported in future versions.

### Affected File
`src/app/layout.tsx`

### Root Cause
Code written for an older Next.js version where viewport was part of metadata.

### Fix Applied
```typescript
// Added separate export
import type { Metadata, Viewport } from 'next';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  // viewport config removed from here
  title: 'LastMart',
  // ...
};
```

---

## Bug Category 8: Version Mismatch

**Severity**: LOW  
**Category**: Configuration  
**Status**: ✅ FIXED

### Description
The application version string was inconsistent across files — some reported `5.0.0`, others `5.1.0`, and the backend health endpoint returned `5.2.0`. This caused confusion in deployment tracking.

### Affected Files
- `package.json` — `"version"` field
- `backend/package.json` — `"version"` field
- `backend/src/server.ts` — version in health check response

### Fix Applied
All version strings synchronized to `5.3.0`.

---

## Bug Category 9: Undocumented Environment Variables

**Severity**: LOW  
**Category**: Developer Experience  
**Status**: ✅ FIXED

### Description
`.env.example` was missing several environment variables that were actively used in the codebase:
- `NEXT_PUBLIC_VENDOR_URL` — vendor portal URL for CTA links
- `NEXT_PUBLIC_RIDER_URL` — rider portal URL for CTA links
- Multi-origin `FRONTEND_URL` format was undocumented

### Fix Applied
`.env.example` updated with all variables, grouped by service, with comments explaining multi-origin CORS format.

---

## Bug Category 10: Monolithic Frontend Architecture

**Severity**: HIGH (Structural)  
**Category**: Architecture  
**Status**: ✅ FIXED (Phase 3)

### Description
A single Next.js application served all four user roles (customer, vendor, rider, admin). This created several problems:
1. **Security**: All role-specific pages included in same bundle, increasing attack surface
2. **Deployment**: Cannot independently scale or deploy different portals
3. **Token isolation**: No enforcement of role-specific localStorage keys at app boundary
4. **Bundle size**: All role UIs included in every user's download

### Fix Applied
Split into 4 independent Next.js 14 applications under `apps/`:
- `apps/vendor/` — Vendor portal (port 3001, `vendor_auth_token`)
- `apps/rider/` — Rider portal (port 3002, `rider_auth_token`)
- `apps/admin/` — Admin portal (port 3003, `admin_auth_token`)
- Root `src/` — Customer portal (port 3000, `auth_token`)

Each sub-app has its own role guard, localStorage key, and Dockerfile.

---

## Summary Table

| # | Category | Severity | Files Affected | Status |
|---|----------|----------|----------------|--------|
| 1 | Missing backend dependencies | CRITICAL | `backend/package.json` | ✅ Fixed |
| 2 | Broken redirect routes (10×) | HIGH | 7 files | ✅ Fixed |
| 3 | Wrong localStorage key | HIGH | `RegisterClient.tsx` | ✅ Fixed |
| 4 | Insecure cookie (`secure: false`) | HIGH | `routes/auth.ts` | ✅ Fixed |
| 5 | Dead rate limiters | MEDIUM | `routes/auth.ts` | ✅ Fixed |
| 6 | Missing CSS classes (3×) | LOW | `globals.css` | ✅ Fixed |
| 7 | Deprecated viewport metadata | LOW | `layout.tsx` | ✅ Fixed |
| 8 | Version mismatch | LOW | 3 files | ✅ Fixed |
| 9 | Undocumented env vars | LOW | `.env.example` | ✅ Fixed |
| 10 | Monolithic frontend architecture | HIGH | All frontend | ✅ Fixed |

**Total bugs identified**: 10 categories (covering ~25 individual instances)  
**Total bugs fixed**: 10/10 (100%)  
**Remaining open issues**: 0

---

## Post-Remediation Risk Assessment

| Area | Pre-Audit | Post-Remediation |
|------|-----------|-----------------|
| Backend security | HIGH | LOW |
| Authentication | HIGH | LOW |
| Routing correctness | HIGH | LOW |
| Frontend architecture | HIGH | LOW |
| Configuration | MEDIUM | LOW |
| Developer experience | MEDIUM | LOW |
| **Overall** | **HIGH** | **LOW** |

---

*Audit conducted as part of LastMart v5.3.0 restructuring. See also: ERROR_REPORT.md, SECURITY_REPORT.md.*
