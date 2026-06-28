# LastMart v5.3.0 — Backend Integration Plan

**Project**: LastMart Local Commerce Platform  
**Document Date**: 2026-06-27  
**Scope**: Complete API reference for all 4 frontend portals integrating with the Express.js backend  
**Base URL**: `https://lastmart-api.onrender.com` (production) / `http://localhost:5000` (development)  
**Author**: AI Developer  

---

## Overview

The LastMart backend is a single Express.js REST API serving all 4 frontend portals. This document provides:

1. Authentication integration guide
2. Complete API endpoint reference per portal
3. Request/response schemas
4. Error handling conventions
5. Integration patterns and code examples

---

## 1. Authentication Integration

### 1.1 Token Acquisition

All portals acquire tokens through the same endpoints. The `role` field determines which portal the user belongs to.

**Endpoint**: `POST /api/auth/login`

```typescript
// Request
{
  "email": "vendor@example.com",
  "password": "secret123"
}

// Response 200
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 42,
    "email": "vendor@example.com",
    "name": "John's Store",
    "role": "vendor"
  }
}

// Also sets httpOnly cookie: token=eyJ...
```

**Rate limit**: 5 requests per 15 minutes per IP.

### 1.2 Token Storage per Portal

Each portal stores the token under a role-isolated key:

```typescript
// Customer portal (src/lib/auth.ts)
localStorage.setItem('auth_token', token);

// Vendor portal (apps/vendor/src/lib/auth.ts)
localStorage.setItem('vendor_auth_token', token);

// Rider portal (apps/rider/src/lib/auth.ts)
localStorage.setItem('rider_auth_token', token);

// Admin portal (apps/admin/src/lib/auth.ts)
localStorage.setItem('admin_auth_token', token);
```

### 1.3 Attaching Token to API Calls

All authenticated requests must include the Bearer token:

```typescript
// Standard authenticated fetch pattern (all portals)
const token = localStorage.getItem('vendor_auth_token'); // use correct key per portal

const response = await fetch('/api/vendors/me', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

if (response.status === 401) {
  // Token expired or invalid — redirect to login
  router.replace('/auth/login');
  return;
}
```

### 1.4 Token Structure (JWT Payload)

```typescript
interface JWTPayload {
  userId: number;
  email: string;
  role: 'customer' | 'vendor' | 'rider' | 'admin';
  iat: number;   // issued at (Unix timestamp)
  exp: number;   // expires at (Unix timestamp, +7 days)
}
```

Client-side decode (no signature verification — for UI only):
```typescript
function decodeToken(token: string): JWTPayload | null {
  try {
    const base64Payload = token.split('.')[1];
    return JSON.parse(atob(base64Payload));
  } catch {
    return null;
  }
}
```

### 1.5 Role Enforcement

Each portal enforces its required role on login:

```typescript
// After receiving token from /api/auth/login
const user = decodeToken(data.token);

if (user?.role !== 'vendor') {
  setError('Access denied. This portal is for vendors only.');
  return;
}

// Only store token if role matches
localStorage.setItem('vendor_auth_token', data.token);
router.push('/dashboard');
```

### 1.6 Error Response Format

All auth errors return consistent JSON:

```typescript
// 401 Unauthorized
{ "error": "No token provided" }
{ "error": "Invalid or expired token" }

// 403 Forbidden
{ "error": "Insufficient permissions" }
{ "error": "Too many login attempts, please try again later" }  // rate limit

// 422 Validation Error
{ "error": "Email and password are required" }
{ "error": "Email already in use" }
```

---

## 2. Shared Auth Endpoints

Available to all authenticated roles.

### POST /api/auth/register

**Rate-limited**: 5 per 15 min  
**Auth**: None

```typescript
// Request body
{
  "email": "string",
  "password": "string",        // min 8 chars
  "name": "string",
  "role": "customer" | "vendor" | "rider",
  "phone": "string",           // optional
  
  // Vendor-specific (role === 'vendor')
  "storeName": "string",
  "storeDescription": "string",
  "storeAddress": "string",
  "storePhone": "string",
  
  // Rider-specific (role === 'rider')
  "vehicleType": "bicycle" | "motorcycle" | "car" | "tricycle",
  "vehiclePlate": "string",
  "vehicleModel": "string"
}

// Response 201
{
  "token": "eyJ...",
  "user": { "id": number, "email": string, "name": string, "role": string }
}
```

### POST /api/auth/login

**Rate-limited**: 5 per 15 min  
**Auth**: None

```typescript
// Request
{ "email": string, "password": string }

// Response 200
{ "token": string, "user": UserObject }

// Response 401
{ "error": "Invalid email or password" }
```

### POST /api/auth/logout

**Auth**: Required

```typescript
// Response 200
{ "message": "Logged out successfully" }
// Also clears httpOnly cookie
```

### GET /api/auth/me

**Auth**: Required

```typescript
// Response 200
{
  "id": number,
  "email": string,
  "name": string,
  "role": string,
  "phone": string | null,
  "profileImage": string | null,
  "createdAt": string  // ISO 8601
}
```

### PUT /api/auth/profile

**Auth**: Required

```typescript
// Request
{ "name": string, "phone": string, "profileImage": string }

// Response 200
{ "user": UserObject, "message": "Profile updated" }
```

### POST /api/auth/change-password

**Auth**: Required

```typescript
// Request
{ "currentPassword": string, "newPassword": string }

// Response 200
{ "message": "Password changed successfully" }

// Response 400
{ "error": "Current password is incorrect" }
```

---

## 3. Customer Portal API

**Portal**: `lastmart.onrender.com`  
**Token Key**: `auth_token`  
**Required Role**: `customer`

### Products & Stores

#### GET /api/products

**Auth**: None (public)

```typescript
// Query params
?vendorId=number    // filter by store
&category=string    // filter by category
&search=string      // full-text search
&page=number        // pagination (default: 1)
&limit=number       // per page (default: 20)
&minPrice=number
&maxPrice=number

// Response 200
{
  "products": [{
    "id": number,
    "name": string,
    "description": string,
    "price": number,
    "images": string[],
    "stock": number,
    "category": string,
    "vendor": {
      "id": number,
      "storeName": string,
      "rating": number
    }
  }],
  "total": number,
  "page": number,
  "totalPages": number
}
```

#### GET /api/vendors (public store list)

```typescript
?search=string
&category=string
&page=number

// Response 200
{
  "vendors": [{
    "id": number,
    "storeName": string,
    "description": string,
    "storeAddress": string,
    "rating": number,
    "totalOrders": number,
    "logoUrl": string | null
  }],
  "total": number
}
```

### Orders

#### POST /api/orders

**Auth**: Customer

```typescript
// Request
{
  "vendorId": number,
  "items": [
    { "productId": number, "quantity": number }
  ],
  "deliveryAddress": string,
  "deliveryPhone": string,
  "notes": string           // optional
}

// Response 201
{
  "order": {
    "id": number,
    "status": "pending",
    "total": number,
    "items": OrderItem[],
    "createdAt": string
  }
}
```

#### GET /api/orders/customer/me

**Auth**: Customer

```typescript
?status=string    // filter by status
&page=number

// Response 200
{
  "orders": [{
    "id": number,
    "status": string,
    "total": number,
    "items": OrderItem[],
    "vendor": { "storeName": string },
    "rider": { "name": string } | null,
    "createdAt": string,
    "updatedAt": string
  }],
  "total": number,
  "page": number
}
```

#### GET /api/orders/:id

**Auth**: Customer (own orders only)

---

## 4. Vendor Portal API

**Portal**: `lastmart-vendor.onrender.com`  
**Token Key**: `vendor_auth_token`  
**Required Role**: `vendor`

### Store Info

#### GET /api/vendors/me

```typescript
// Response 200
{
  "id": number,
  "storeName": string,
  "description": string,
  "storeAddress": string,
  "storePhone": string,
  "logoUrl": string | null,
  "status": "pending_approval" | "active" | "suspended",
  "rating": number,
  "totalOrders": number,
  "totalRevenue": number
}
```

#### PUT /api/vendors/me

```typescript
// Request
{
  "storeName": string,
  "description": string,
  "storeAddress": string,
  "storePhone": string,
  "logoUrl": string
}

// Response 200
{ "vendor": VendorObject, "message": "Store updated" }
```

### Products

#### GET /api/vendors/products

```typescript
?search=string
&status=active|inactive
&page=number
&limit=number

// Response 200
{
  "products": [{
    "id": number,
    "name": string,
    "description": string,
    "price": number,
    "stock": number,
    "status": "active" | "inactive",
    "images": string[],
    "category": string,
    "createdAt": string
  }],
  "total": number,
  "page": number
}
```

#### POST /api/vendors/products

```typescript
// Request (multipart/form-data for images, or JSON with image URLs)
{
  "name": string,
  "description": string,
  "price": number,
  "stock": number,
  "category": string,
  "images": string[]   // array of URLs (after upload)
}

// Response 201
{ "product": ProductObject, "message": "Product created" }
```

#### PUT /api/vendors/products/:id

```typescript
// Request — same fields as POST, all optional
// Response 200
{ "product": ProductObject, "message": "Product updated" }
```

#### DELETE /api/vendors/products/:id

```typescript
// Response 200
{ "message": "Product deleted" }
```

### Orders

#### GET /api/vendors/orders

```typescript
?status=pending|confirmed|preparing|ready|picked_up|delivered|cancelled
&search=string       // search by order ID or customer name
&page=number

// Response 200
{
  "orders": [{
    "id": number,
    "status": string,
    "total": number,
    "customer": { "name": string, "phone": string },
    "items": OrderItem[],
    "deliveryAddress": string,
    "createdAt": string,
    "updatedAt": string
  }],
  "total": number,
  "page": number
}
```

#### PUT /api/orders/:id/status

```typescript
// Request
{ "status": "confirmed" | "preparing" | "ready" | "cancelled" }

// Response 200
{ "order": OrderObject, "message": "Order status updated" }
```

### Analytics

#### GET /api/vendors/analytics

```typescript
?period=7|30|90   // days

// Response 200
{
  "summary": {
    "totalRevenue": number,
    "totalOrders": number,
    "avgOrderValue": number,
    "avgRating": number
  },
  "dailyRevenue": [
    { "date": "2026-06-20", "revenue": number, "orders": number }
  ],
  "topProducts": [
    { "id": number, "name": string, "totalSold": number, "revenue": number }
  ],
  "statusDistribution": {
    "pending": number,
    "delivered": number,
    "cancelled": number,
    // ...
  }
}
```

### Payouts

#### GET /api/vendors/payouts

```typescript
// Response 200
{
  "balance": {
    "available": number,
    "pending": number,
    "totalPaid": number
  },
  "history": [{
    "id": number,
    "amount": number,
    "status": "pending" | "processing" | "completed" | "failed",
    "requestedAt": string,
    "processedAt": string | null,
    "bankName": string,
    "accountNumber": string
  }]
}
```

#### POST /api/vendors/request-payout

```typescript
// Request
{ "amount": number }   // must be ≤ available balance

// Response 201
{ "payout": PayoutObject, "message": "Payout request submitted" }

// Response 400
{ "error": "Insufficient available balance" }
```

#### PUT /api/vendors/bank-details

```typescript
// Request
{
  "bankName": string,
  "accountNumber": string,
  "accountName": string,
  "bankCode": string     // for Paystack bank codes
}

// Response 200
{ "message": "Bank details updated" }
```

---

## 5. Rider Portal API

**Portal**: `lastmart-rider.onrender.com`  
**Token Key**: `rider_auth_token`  
**Required Role**: `rider`

### Availability

#### PUT /api/riders/availability

```typescript
// Request
{ "available": boolean }

// Response 200
{ "available": boolean, "message": "Availability updated" }
```

### Deliveries

#### GET /api/riders/available-orders

```typescript
// Returns orders in 'ready' status with no assigned rider

// Response 200
{
  "orders": [{
    "id": number,
    "vendorName": string,
    "vendorAddress": string,
    "deliveryAddress": string,
    "total": number,
    "distance": number,     // km (if calculable)
    "estimatedTime": number // minutes
  }]
}
```

#### POST /api/riders/accept-delivery

```typescript
// Request
{ "orderId": number }

// Response 201
{ "delivery": DeliveryObject, "message": "Delivery accepted" }

// Response 409
{ "error": "Order already assigned to another rider" }
```

#### GET /api/riders/deliveries

```typescript
?status=active|completed|cancelled
&page=number

// Response 200
{
  "deliveries": [{
    "id": number,
    "orderId": number,
    "status": string,
    "pickupAddress": string,
    "deliveryAddress": string,
    "customerName": string,
    "customerPhone": string,
    "earnings": number,
    "createdAt": string,
    "completedAt": string | null
  }],
  "total": number
}
```

#### PUT /api/riders/delivery/:id/status

```typescript
// Request
{ "status": "picked_up" | "delivered" }

// Response 200
{ "delivery": DeliveryObject }
```

### Earnings

#### GET /api/riders/earnings

```typescript
?period=7|30|90

// Response 200
{
  "summary": {
    "periodEarnings": number,
    "totalEarnings": number,
    "totalDeliveries": number,
    "avgPerTrip": number
  },
  "dailyEarnings": [
    { "date": string, "earnings": number, "deliveries": number }
  ]
}
```

#### GET /api/riders/earnings/history

```typescript
?page=number
?limit=number

// Response 200
{
  "history": [{
    "id": number,
    "orderId": number,
    "amount": number,
    "date": string,
    "status": "credited" | "pending"
  }],
  "total": number
}
```

### Settings

#### PUT /api/riders/vehicle

```typescript
// Request
{
  "vehicleType": "bicycle" | "motorcycle" | "car" | "tricycle",
  "vehiclePlate": string,
  "vehicleModel": string,
  "vehicleColor": string
}

// Response 200
{ "message": "Vehicle updated" }
```

#### PUT /api/riders/bank

```typescript
// Request (same as vendor bank-details)
{ "bankName": string, "accountNumber": string, "accountName": string, "bankCode": string }
```

---

## 6. Admin Portal API

**Portal**: `lastmart-admin.onrender.com`  
**Token Key**: `admin_auth_token`  
**Required Role**: `admin`

### Dashboard

#### GET /api/admin/dashboard

```typescript
// Response 200
{
  "stats": {
    "totalUsers": number,
    "activeVendors": number,
    "activeRiders": number,
    "totalOrders": number,
    "totalRevenue": number,
    "pendingApprovals": number
  }
}
```

### User Management

#### GET /api/admin/users

```typescript
?role=customer|vendor|rider|admin
&status=active|suspended
&search=string
&page=number

// Response 200
{
  "users": [{
    "id": number,
    "email": string,
    "name": string,
    "role": string,
    "status": "active" | "suspended",
    "createdAt": string
  }],
  "total": number
}
```

#### PUT /api/admin/users/:id/suspend

```typescript
// Response 200
{ "message": "User suspended" }
```

#### PUT /api/admin/users/:id/activate

```typescript
// Response 200
{ "message": "User activated" }
```

### Vendor Management

#### GET /api/admin/vendors

```typescript
?status=pending_approval|active|suspended|rejected
&search=string
&page=number

// Response 200
{
  "vendors": [{
    "id": number,
    "storeName": string,
    "ownerName": string,
    "email": string,
    "status": string,
    "rating": number,
    "createdAt": string
  }],
  "total": number
}
```

#### PUT /api/admin/vendors/:id/approve

```typescript
// Response 200
{ "message": "Vendor approved" }
// Sends approval email to vendor
```

#### PUT /api/admin/vendors/:id/reject

```typescript
// Request (optional)
{ "reason": string }

// Response 200
{ "message": "Vendor rejected" }
```

#### PUT /api/admin/vendors/:id/suspend

```typescript
// Response 200
{ "message": "Vendor suspended" }
```

### Rider Management

#### GET /api/admin/riders

```typescript
?status=pending_approval|active|suspended
&search=string
&page=number
```

#### PUT /api/admin/riders/:id/approve

```typescript
// Response 200
{ "message": "Rider approved" }
```

### Order Oversight

#### GET /api/admin/orders

```typescript
?status=string
&search=string
&page=number
&from=ISO_DATE
&to=ISO_DATE
```

---

## 7. Error Handling Reference

### HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful GET, PUT |
| 201 | Created | Successful POST |
| 400 | Bad Request | Validation errors, business rule violations |
| 401 | Unauthorized | Missing/invalid/expired token |
| 403 | Forbidden | Valid token but insufficient role |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate email, already-assigned order |
| 422 | Unprocessable | Semantic validation error |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected backend error |

### Standard Error Response Shape

```typescript
// All errors follow this format
{
  "error": string,           // Human-readable message
  "code": string,            // Optional machine-readable code
  "details": object | null   // Optional validation details
}
```

### Frontend Error Handling Pattern

```typescript
async function apiCall(url: string, options: RequestInit) {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${getStoredToken()}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (res.status === 401) {
      clearStoredToken();
      router.replace('/auth/login');
      return;
    }

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Request failed');
    }

    return await res.json();
  } catch (err) {
    console.error('API error:', err);
    throw err;
  }
}
```

---

## 8. Health Check

#### GET /api/health

**Auth**: None

```typescript
// Response 200
{
  "status": "ok",
  "version": "5.3.0",
  "timestamp": "2026-06-27T12:00:00.000Z",
  "database": "connected"
}
```

Use for deployment health checks and monitoring.

---

## 9. Integration Checklist per Portal

### Customer Portal
- [ ] `getStoredToken()` reads `auth_token`
- [ ] Login/register redirects to `/customer/dashboard`
- [ ] `isAuthenticated()` checks `role === 'customer'`
- [ ] BACKEND_URL set in environment
- [ ] `/api/products` called without auth (public)
- [ ] `/api/orders` called with Bearer header

### Vendor Portal
- [ ] `getStoredToken()` reads `vendor_auth_token`
- [ ] Login enforces `role === 'vendor'` check
- [ ] All API calls include `Authorization: Bearer`
- [ ] 401 response triggers redirect to `/auth/login`
- [ ] Product create/edit uses correct endpoint
- [ ] Order status update uses `PUT /api/orders/:id/status`

### Rider Portal
- [ ] `getStoredToken()` reads `rider_auth_token`
- [ ] Login enforces `role === 'rider'` check
- [ ] Availability toggle calls `PUT /api/riders/availability`
- [ ] Accept delivery calls `POST /api/riders/accept-delivery`
- [ ] Mark delivered calls `PUT /api/riders/delivery/:id/status`

### Admin Portal
- [ ] `getStoredToken()` reads `admin_auth_token`
- [ ] Login enforces `role === 'admin'` check
- [ ] Approve endpoints use `PUT /api/admin/{type}/:id/approve`
- [ ] No public data access (all routes behind auth)

---

*See also: ARCHITECTURE.md for system overview, SECURITY_REPORT.md for auth security details.*
