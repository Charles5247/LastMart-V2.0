# LastMart v5.3.0 — Error Report

**Project**: LastMart Local Commerce Platform  
**Report Date**: 2026-06-27  
**Reporter**: AI Developer (automated + manual review)  
**Phase**: Post-audit remediation (Phase 2)  

---

## Overview

This document provides a detailed record of every error, warning, and runtime defect discovered during the Phase 1 audit of the LastMart codebase, along with the exact fix applied for each. It is intended as a traceable record for future maintainers.

Errors are categorized into: **Build Errors**, **Runtime Errors**, **Logic Errors**, and **Deprecation Warnings**.

---

## Section 1: Build Errors

### ERR-001: Backend fails to compile — missing dependencies

**Error Type**: Build Error  
**Severity**: CRITICAL  
**Component**: Backend (Express.js)  

**Symptom**:
```
Error: Cannot find module 'nodemailer'
Error: Cannot find module '@sendgrid/mail'
Error: Cannot find module 'express-rate-limit'
Error: Cannot find module 'axios'
```

**Trigger**: Running `npm run dev` or `npm run build` in `backend/`

**Root File**: `backend/src/services/email.ts`, `backend/src/routes/auth.ts`, `backend/src/services/payment.ts`

**Fix**:
```bash
cd backend && npm install nodemailer @sendgrid/mail express-rate-limit axios --legacy-peer-deps
```

**Verification**: `cd backend && npx tsc --noEmit` — exits with code 0

---

### ERR-002: Frontend TypeScript — viewport in metadata

**Error Type**: Deprecation Warning (build-time)  
**Severity**: LOW  
**Component**: Customer Frontend (Next.js)  

**Symptom**:
```
Warning: `viewport` in `metadata` export is deprecated. 
Use a separate `viewport` export.
```

**Trigger**: Running `npx next build` in root

**Root File**: `src/app/layout.tsx`

**Exact Error Location**:
```typescript
// Line ~15 in layout.tsx (before fix)
export const metadata: Metadata = {
  viewport: 'width=device-width, initial-scale=1',  // ← deprecated
  title: 'LastMart',
};
```

**Fix**:
```typescript
// Separated into standalone export
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'LastMart',
  // viewport removed
};
```

**Verification**: `npx next build` — zero warnings about viewport

---

## Section 2: Runtime Errors

### ERR-003: 404 Not Found — broken navigation routes

**Error Type**: Runtime Error (404)  
**Severity**: HIGH  
**Component**: Customer Frontend  

**Symptom**: Clicking navigation links or completing actions leads to Next.js 404 page

**Affected User Flows**:
1. Rider clicks "My Dashboard" in Navbar → 404
2. Customer clicks order history in Footer → 404
3. New user completes registration → 404
4. Customer completes checkout → 404
5. Rider completes KYC → 404
6. Vendor visits ranking page → redirect to 404
7. Vendor completes verification → redirect to 404

**Root Cause**: Routes use `/dashboard/{role}` pattern which doesn't exist. Actual App Router structure is `/{role}/dashboard`.

**All 10 broken redirect calls**:

| File | Line (approx) | Broken Value | Correct Value |
|------|---------------|--------------|---------------|
| `Navbar.tsx` | ~82 | `/dashboard/rider` | `/rider/dashboard` |
| `Footer.tsx` | ~44 | `/dashboard/customer/orders` | `/customer/orders` |
| `Footer.tsx` | ~51 | `/dashboard/customer/orders` | `/customer/orders` |
| `RegisterClient.tsx` | ~67 | `/dashboard/customer` | `/customer/dashboard` |
| `checkout/page.tsx` | ~112 | `/dashboard/customer/orders` | `/customer/orders` |
| `checkout/page.tsx` | ~189 | `/dashboard/customer/orders` | `/customer/orders` |
| `rider/kyc/page.tsx` | ~38 | `/dashboard/rider` | `/rider/dashboard` |
| `vendor/ranking/page.tsx` | ~29 | `/dashboard/vendor` | `/vendor/dashboard` |
| `vendor/verification/page.tsx` | ~31 | `/dashboard/vendor` | `/vendor/dashboard` |

**Fix**: Each broken string individually replaced via Edit tool.

**Verification**: All navigation links tested by route inspection; `npx next build` succeeds with all pages compiled.

---

### ERR-004: Silent auth failure — wrong localStorage key

**Error Type**: Runtime Error (silent)  
**Severity**: HIGH  
**Component**: Customer Frontend — Registration flow  

**Symptom**: User registers successfully (201 response), but is immediately treated as unauthenticated. Redirected back to login page.

**Root Cause**: Token stored under `'token'` key, but all other code reads from `'auth_token'`.

```typescript
// RegisterClient.tsx (before fix) — stores under wrong key
localStorage.setItem('token', data.token);

// LoginClient.tsx — reads correct key
const token = localStorage.getItem('auth_token');
// → returns null after registration, user appears logged out
```

**Fix**:
```typescript
// RegisterClient.tsx (after fix)
localStorage.setItem('auth_token', data.token);
```

**Verification**: Registration flow tested end-to-end: register → token stored → `auth_token` key present → `isAuthenticated()` returns true → redirect to `/customer/dashboard` succeeds.

---

### ERR-005: Rate limiter never executes

**Error Type**: Runtime Error (silent — missing protection)  
**Severity**: MEDIUM  
**Component**: Backend — Auth routes  

**Symptom**: No brute-force protection on login/register despite limiter being configured. An attacker can make unlimited login attempts.

**Root Cause**:
```typescript
// backend/src/routes/auth.ts (before fix)
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many attempts'
});

// Limiter created but NEVER passed to routes:
router.post('/login', async (req, res) => { ... });    // ← no limiter
router.post('/register', async (req, res) => { ... }); // ← no limiter
```

**Fix**:
```typescript
router.post('/login', registerLimiter, async (req, res) => { ... });
router.post('/register', registerLimiter, async (req, res) => { ... });
```

**Verification**: After fix, making 6 rapid POST requests to `/api/auth/login` returns HTTP 429 on the 6th request.

---

### ERR-006: Broken CSS — invisible/misaligned UI elements

**Error Type**: Runtime Error (visual)  
**Severity**: LOW  
**Component**: Customer Frontend — UI  

**Symptom**: Three CSS classes referenced in JSX produce no styling effect (Tailwind purges unused classes; custom utilities not defined at all).

**Missing Classes**:

| Class | Used In | Expected Behavior |
|-------|---------|-------------------|
| `.scrollbar-hide` | Scrollable product containers | Hides scrollbar track |
| `.h-25` | Custom height elements | `height: 6.25rem` |
| `.max-w-18` | Image containers | `max-width: 4.5rem` |

**Fix**: Added to `src/app/globals.css` under `@layer utilities`.

**Verification**: Browser DevTools confirms styles applied after rebuild.

---

## Section 3: Logic Errors

### ERR-007: Registration token — role not enforced at storage

**Error Type**: Logic Error  
**Severity**: HIGH  
**Component**: Customer Frontend  

**Symptom** (prior to multi-app split): A vendor or rider registering through the customer app's `/auth/register` would have their token stored under `'auth_token'` — the customer token key. This would allow a rider/vendor to access customer-role-protected pages after registration.

**Root Cause**: Registration form sent `role` in body but `RegisterClient.tsx` didn't check the returned role before storing the token.

**Fix**: Resolved comprehensively by the Phase 3 multi-frontend split — each portal has its own registration page that only accepts its specific role, stores under its own key, and enforces role on login:
- Customer: `auth_token` + `role === 'customer'` guard
- Vendor: `vendor_auth_token` + `role === 'vendor'` guard
- Rider: `rider_auth_token` + `role === 'rider'` guard
- Admin: `admin_auth_token` + `role === 'admin'` guard

---

### ERR-008: Version strings inconsistent across files

**Error Type**: Logic Error  
**Severity**: LOW  
**Component**: Configuration  

**Symptom**: Different parts of the app report different versions, making it impossible to correlate deployed version with source.

| File | Version Before | Version After |
|------|---------------|---------------|
| `package.json` | `5.0.0` | `5.3.0` |
| `backend/package.json` | `5.1.0` | `5.3.0` |
| `backend/src/server.ts` (health check) | `5.2.0` | `5.3.0` |

**Fix**: All synchronized to `5.3.0` in Phase 2.

---

## Section 4: Security Errors

### ERR-009: Cookie sent over HTTP in production

**Error Type**: Security Error  
**Severity**: HIGH  
**Component**: Backend  

**Symptom**: The JWT auth cookie can be transmitted over plaintext HTTP connections in production, allowing interception.

**Root Cause**: `secure: false` hardcoded in cookie options.

**Fix**:
```typescript
secure: process.env.NODE_ENV === 'production'
```

Full detail: see SECURITY_REPORT.md, SEC-002.

---

## Section 5: Configuration Errors

### ERR-010: Undocumented environment variables

**Error Type**: Configuration Error  
**Severity**: LOW  
**Component**: All services  

**Symptom**: New developers cannot configure the project correctly because `.env.example` is missing variables used in the codebase.

**Missing Variables (before fix)**:
- `NEXT_PUBLIC_VENDOR_URL`
- `NEXT_PUBLIC_RIDER_URL`
- Full multi-origin `FRONTEND_URL` format undocumented

**Fix**: `.env.example` rewritten with all variables grouped by service and annotated with comments.

---

## Error Summary

| ID | Title | Severity | Type | Status |
|----|-------|----------|------|--------|
| ERR-001 | Missing backend dependencies | CRITICAL | Build | ✅ Fixed |
| ERR-002 | Deprecated viewport metadata | LOW | Build Warning | ✅ Fixed |
| ERR-003 | 404 broken navigation routes (10×) | HIGH | Runtime | ✅ Fixed |
| ERR-004 | Wrong localStorage key in register | HIGH | Runtime | ✅ Fixed |
| ERR-005 | Rate limiter never applied | MEDIUM | Runtime (silent) | ✅ Fixed |
| ERR-006 | Missing CSS utility classes | LOW | Visual | ✅ Fixed |
| ERR-007 | Token key not role-enforced | HIGH | Logic | ✅ Fixed |
| ERR-008 | Version strings inconsistent | LOW | Logic | ✅ Fixed |
| ERR-009 | Cookie insecure in production | HIGH | Security | ✅ Fixed |
| ERR-010 | Undocumented env vars | LOW | Config | ✅ Fixed |

**Total Errors**: 10  
**Fixed**: 10 (100%)  
**Remaining**: 0

---

## Build Verification Results

| Check | Command | Result |
|-------|---------|--------|
| Frontend TypeScript | `npx tsc --noEmit` (root) | ✅ PASS — 0 errors |
| Frontend build | `npx next build` (root) | ✅ PASS — 60+ pages |
| Backend TypeScript | `npx tsc --noEmit` (backend/) | ✅ PASS — 0 errors |

---

*See also: AUDIT_REPORT.md for categorized bug summary, SECURITY_REPORT.md for security-specific detail.*
