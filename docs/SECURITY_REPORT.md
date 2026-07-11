# LastMart v5.3.0 — Security Report

**Project**: LastMart Local Commerce Platform  
**Report Date**: 2026-06-27  
**Reviewer**: AI Developer (automated + manual review)  
**Standard**: OWASP Top 10 reference  
**Repository**: https://github.com/Charles5247/LastMart-V2.0

---

## Executive Summary

A security-focused review of the LastMart codebase identified **5 security vulnerabilities** of varying severity, all of which have been remediated in v5.3.0. The review covered authentication mechanisms, token handling, cookie security, API protection, and cross-origin resource policy.

Additionally, the v5.3.0 architectural split into role-isolated portals significantly improves the overall security posture by enforcing authentication boundaries at the application level.

**Security Risk Before Remediation: HIGH**  
**Security Risk After Remediation: LOW**

---

## Vulnerability Index

| ID      | Title                                                 | OWASP Category                  | Severity | Status   |
| ------- | ----------------------------------------------------- | ------------------------------- | -------- | -------- |
| SEC-001 | No brute-force protection on auth endpoints           | A07 — Identification Failures   | HIGH     | ✅ Fixed |
| SEC-002 | JWT cookie transmitted over plaintext HTTP            | A02 — Cryptographic Failures    | HIGH     | ✅ Fixed |
| SEC-003 | Cross-role token reuse possible (monolith)            | A01 — Broken Access Control     | HIGH     | ✅ Fixed |
| SEC-004 | Undocumented CORS configuration                       | A05 — Security Misconfiguration | MEDIUM   | ✅ Fixed |
| SEC-005 | Missing env var documentation (secrets exposure risk) | A05 — Security Misconfiguration | LOW      | ✅ Fixed |

---

## SEC-001: No Brute-Force Protection on Auth Endpoints

**OWASP Category**: A07:2021 — Identification and Authentication Failures  
**Severity**: HIGH  
**Affected Component**: `backend/src/routes/auth.ts`  
**Status**: ✅ Remediated

### Vulnerability Description

The `/api/auth/login` and `/api/auth/register` endpoints were completely unprotected against brute-force attacks. An attacker could make unlimited login attempts in rapid succession, enabling:

- **Credential stuffing** — trying large lists of username/password pairs
- **Password brute-forcing** — systematically trying passwords for a known email
- **Account enumeration** — using timing differences to determine if an email is registered

### Technical Detail

A rate limiter was defined but never applied:

```typescript
// backend/src/routes/auth.ts
import rateLimit from 'express-rate-limit';

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,                      // 5 attempts max
  message: 'Too many login attempts'
});

// BUG: limiter was NEVER passed to these routes
router.post('/login', async (req, res) => { ... });     // no protection
router.post('/register', async (req, res) => { ... });  // no protection
```

### Remediation

Applied the rate limiter as middleware to both routes:

```typescript
router.post('/login', registerLimiter, async (req, res) => { ... });
router.post('/register', registerLimiter, async (req, res) => { ... });
```

### Rate Limit Configuration

| Setting              | Value                          |
| -------------------- | ------------------------------ |
| Window               | 15 minutes                     |
| Max requests         | 5 per window                   |
| Response on exceeded | HTTP 429 Too Many Requests     |
| Headers              | `RateLimit-*` standard headers |

### Residual Risk

For production, consider:

- Separate, stricter limiter for `/login` (e.g., 3 attempts)
- Redis-backed rate limiter for multi-instance deployments (current in-memory limiter resets on server restart)
- CAPTCHA integration after 3 failed attempts

---

## SEC-002: JWT Cookie Transmitted Over Plaintext HTTP

**OWASP Category**: A02:2021 — Cryptographic Failures  
**Severity**: HIGH  
**Affected Component**: `backend/src/routes/auth.ts`  
**Status**: ✅ Remediated

### Vulnerability Description

The JWT authentication cookie was configured with `secure: false`, meaning browsers would send it over unencrypted HTTP connections in production. This exposes the token to:

- **Network eavesdropping** — anyone on the same network could capture the cookie
- **Man-in-the-middle attacks** — on public WiFi or compromised routers
- **Session hijacking** — stolen JWT allows impersonation of any user

### Technical Detail

```typescript
// backend/src/routes/auth.ts (BEFORE)
res.cookie("token", token, {
  httpOnly: true,
  secure: false, // ← CRITICAL: sends over HTTP in production
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
});
```

The `secure: false` flag explicitly disables the browser's protection that restricts cookie transmission to HTTPS only.

### Remediation

```typescript
// backend/src/routes/auth.ts (AFTER)
res.cookie("token", token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production", // ✅ HTTPS-only in production
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
});
```

### Cookie Security Posture (Post-Fix)

| Flag                        | Value          | Protects Against                      |
| --------------------------- | -------------- | ------------------------------------- |
| `httpOnly: true`            | ✅ Always      | XSS token theft via `document.cookie` |
| `secure: true` (production) | ✅ Conditional | Network eavesdropping                 |
| `sameSite: 'lax'`           | ✅ Always      | CSRF attacks                          |
| `maxAge: 7 days`            | ✅ Bounded     | Indefinite session persistence        |

### Dual Auth Architecture

LastMart implements dual authentication: JWT cookie (for SSR) + `Authorization: Bearer` header (for client-side API calls). Both mechanisms are now properly secured.

---

## SEC-003: Cross-Role Token Reuse (Monolithic Architecture)

**OWASP Category**: A01:2021 — Broken Access Control  
**Severity**: HIGH  
**Affected Component**: All frontend portals (pre-split)  
**Status**: ✅ Remediated (Phase 3)

### Vulnerability Description

In the original monolithic frontend, all four user roles (customer, vendor, rider, admin) were served by a single Next.js application. This created a cross-role token reuse vulnerability:

**Attack Scenario**:

1. An attacker has a valid **rider** JWT token
2. They store it manually under the `'auth_token'` localStorage key (which is the customer key)
3. They navigate to `/customer/dashboard`
4. The frontend reads `localStorage.getItem('auth_token')` — finds a valid JWT
5. The JWT signature is valid, but the `role` field says `'rider'`
6. Depending on how thoroughly each page checked the role, the rider might access customer-only pages

This was particularly risky for admin pages — a vendor or rider with a valid token could potentially reach admin UI if role checks were incomplete.

### Technical Detail

All roles used the same key convention:

```typescript
// Pre-v5.3.0 — all roles could set the same key
localStorage.setItem("auth_token", token);
// ↑ vendor, rider, admin all setting same key — tokens interchangeable
```

### Remediation

The architecture was split into 4 independent applications, each with:

1. **Isolated localStorage key** — physically separate
2. **Role guard on every page** — validates both token presence and role field
3. **Separate domain/port** — browser localStorage is origin-scoped

**Role-to-Key Mapping (v5.3.0)**:

| Portal   | App                        | localStorage Key    | Role Check            |
| -------- | -------------------------- | ------------------- | --------------------- |
| Customer | `src/` (port 3006)         | `auth_token`        | `role === 'customer'` |
| Vendor   | `apps/vendor/` (port 3001) | `vendor_auth_token` | `role === 'vendor'`   |
| Rider    | `apps/rider/` (port 3002)  | `rider_auth_token`  | `role === 'rider'`    |
| Admin    | `apps/admin/` (port 3003)  | `admin_auth_token`  | `role === 'admin'`    |

**Role guard implementation** (example from `apps/vendor/src/lib/auth.ts`):

```typescript
export function isVendorAuthenticated(): boolean {
  const token = getStoredToken(); // reads 'vendor_auth_token' only
  if (!token) return false;
  const user = decodeToken(token); // client-side decode (no sig verify)
  return user?.role === "vendor"; // strict role check
}
```

**Server-side verification** is still performed on every API call — the client-side check is a UX guard only.

### Important Note on Client-Side JWT Decoding

The frontend uses `decodeToken()` which **does not verify the JWT signature**. It only reads the payload. This is intentional — the signature verification is performed server-side on every API call. The client-side decode is used only to:

- Determine which portal to redirect to
- Show the correct user name/role in the UI
- Guard navigation before making API calls

An attacker with a forged JWT payload would be rejected by every protected API endpoint.

---

## SEC-004: Undocumented CORS Configuration

**OWASP Category**: A05:2021 — Security Misconfiguration  
**Severity**: MEDIUM  
**Affected Component**: `backend/src/server.ts`, `.env.example`  
**Status**: ✅ Remediated

### Vulnerability Description

The backend CORS configuration correctly supported multiple origins via `FRONTEND_URL.split(',')`, but this was undocumented. The `.env.example` showed only a single origin:

```env
# Before (in .env.example)
FRONTEND_URL=http://localhost:3006
```

A developer deploying the backend might set only one origin, blocking the other 3 portals entirely — or worse, set `FRONTEND_URL=*` to "fix" the issue, allowing any origin to make credentialed requests.

### The Wildcard CORS Risk

Setting `Access-Control-Allow-Origin: *` with `credentials: true` is a serious misconfiguration that would allow any malicious website to make authenticated requests on behalf of logged-in LastMart users.

### Remediation

`.env.example` updated with clear documentation:

```env
# Multi-origin CORS — comma-separated list (no spaces around commas)
FRONTEND_URL=http://localhost:3006,http://localhost:3001,http://localhost:3002,http://localhost:3003

# Production (update with actual Render.com URLs):
# FRONTEND_URL=https://lastmart.onrender.com,https://lastmart-vendor.onrender.com,https://lastmart-rider.onrender.com,https://lastmart-admin.onrender.com
```

### Backend CORS Implementation (verified correct)

```typescript
// backend/src/server.ts — already correct, no code change needed
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map((o) => o.trim())
  : ["http://localhost:3006"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);
```

---

## SEC-005: Secrets Exposure Risk — Missing Env Documentation

**OWASP Category**: A05:2021 — Security Misconfiguration  
**Severity**: LOW  
**Affected Component**: `.env.example`  
**Status**: ✅ Remediated

### Vulnerability Description

Several environment variables used for sensitive operations (payment processing, email, JWT signing) were absent from `.env.example`. This increased the risk that developers would:

1. Commit a `.env` file with real secrets (thinking it was the example file)
2. Use weak placeholder values in production
3. Not know which secrets need to be rotated after a breach

### Missing Variables (Before Fix)

- `PAYSTACK_SECRET_KEY` — payment processing (live transactions)
- `SENDGRID_API_KEY` / `SMTP_PASSWORD` — email authentication
- `NEXT_PUBLIC_VENDOR_URL` — vendor portal URL
- `NEXT_PUBLIC_RIDER_URL` — rider portal URL
- Multi-origin CORS format for `FRONTEND_URL`

### Remediation

`.env.example` comprehensively rewritten with:

- All variables documented
- Groups: Backend Core, Database, Auth, Email, Payments, Frontend Sub-Apps, CORS
- Comments explaining each variable's purpose
- `sync: false` pattern referenced for Render.com secrets

### .gitignore Verification

Confirmed `.gitignore` includes:

```
.env
.env.local
.env.production
```

The `.env.example` (without real values) is intentionally tracked in git.

---

## Security Architecture Overview (v5.3.0)

### Authentication Flow

```
Client Request
     │
     ├── Cookie: token (httpOnly, secure, sameSite=lax)
     │         └── For SSR pages
     │
     └── Header: Authorization: Bearer <jwt>
               └── For API calls

Backend Middleware
     │
     ├── verifyToken(req) — checks cookie OR Bearer header
     │         └── Verifies JWT signature with JWT_SECRET
     │
     └── Role check — req.user.role must match endpoint's required role
```

### Token Isolation Model

```
Browser Origin: https://lastmart.onrender.com
  localStorage: { 'auth_token': 'eyJ...' }    (customer JWT)

Browser Origin: https://lastmart-vendor.onrender.com
  localStorage: { 'vendor_auth_token': 'eyJ...' }   (vendor JWT)

Browser Origin: https://lastmart-rider.onrender.com
  localStorage: { 'rider_auth_token': 'eyJ...' }    (rider JWT)

Browser Origin: https://lastmart-admin.onrender.com
  localStorage: { 'admin_auth_token': 'eyJ...' }    (admin JWT)
```

Note: Browser security ensures localStorage is **origin-scoped** — each origin cannot access another origin's storage. The different token key names provide an additional layer of clarity and defense.

### Defense in Depth

| Layer         | Mechanism                  | Protects Against         |
| ------------- | -------------------------- | ------------------------ |
| L1 — Network  | HTTPS + secure cookies     | Eavesdropping            |
| L2 — Browser  | httpOnly cookies           | XSS                      |
| L3 — Browser  | sameSite: lax              | CSRF                     |
| L4 — Browser  | Origin-scoped localStorage | Cross-portal token theft |
| L5 — Frontend | Role guard on every page   | Wrong-role navigation    |
| L6 — Backend  | JWT signature verification | Token forgery            |
| L7 — Backend  | Role-based route guards    | Privilege escalation     |
| L8 — Backend  | Rate limiting              | Brute force              |
| L9 — Backend  | CORS allowlist             | Unauthorized origins     |

---

## Recommendations for Future Hardening

### High Priority

1. **Redis rate limiting** — Replace in-memory `express-rate-limit` store with Redis for multi-instance deployments (prevents limiter reset on deploy)
2. **JWT refresh tokens** — Implement short-lived access tokens (15 min) + long-lived refresh tokens stored in httpOnly cookies
3. **Account lockout** — After 10 failed attempts, temporarily lock account and send unlock email

### Medium Priority

4. **Content Security Policy** — Add `next.config.js` headers with strict CSP to prevent XSS
5. **Security headers** — Add `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`
6. **Input sanitization** — Audit all Express route handlers for SQL injection / XSS in SQLite queries

### Low Priority

7. **Dependency audit** — Run `npm audit` quarterly and update packages with known CVEs
8. **Secrets rotation procedure** — Document how to rotate `JWT_SECRET`, `PAYSTACK_SECRET_KEY` without downtime
9. **Logging** — Add structured security event logging (failed logins, role violations, rate limit hits)

---

## Compliance Notes

| Standard            | Requirement                   | Status                        |
| ------------------- | ----------------------------- | ----------------------------- |
| OWASP Top 10 (2021) | A01 Broken Access Control     | ✅ Addressed                  |
| OWASP Top 10 (2021) | A02 Cryptographic Failures    | ✅ Addressed                  |
| OWASP Top 10 (2021) | A05 Security Misconfiguration | ✅ Addressed                  |
| OWASP Top 10 (2021) | A07 Identification Failures   | ✅ Addressed                  |
| PCI DSS (basic)     | HTTPS for payment data        | ✅ Paystack handles PCI scope |
| GDPR (basic)        | Auth session security         | ✅ httpOnly + secure cookies  |

---

_See also: AUDIT_REPORT.md for full bug catalogue, ERROR_REPORT.md for detailed error records._
