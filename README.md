# 🛒 LastMart — Nigeria's Local Marketplace

A full-stack Nigerian e-commerce marketplace connecting local vendors with customers, featuring KYC verification, product vetting, paid ranking/advertising, LAMA AI recommendations, and a comprehensive admin control panel.

---

## ✅ Implemented Features

### 🔐 Authentication & Compliance
- **User registration** with mandatory T&C acceptance (stored in `terms_acceptances` table)
- **Role-based accounts:** customer, vendor, admin
- **JWT authentication** with 7-day tokens (cookie + Bearer header)
- **Suspended account blocking** — login rejects accounts with `is_suspended=1`
- **Home page redirect** — admin and vendor accounts are automatically redirected to their dashboards after sign-in; they do not see the shopping home UI

### 🪪 KYC / Identity Verification
- **Customer KYC:** NIN, BVN, ID card (front/back), selfie
- **Vendor KYC:** CAC document, TIN, business address, director ID, tax certificate, utility bill
- **Multi-step form** at `/verification` (shared page, role-aware)
- **Admin KYC review** at `/dashboard/admin/kyc` — approve/reject with reason
- **KYC status banner** on vendor dashboard — nudges vendors to complete verification
- **Automated notifications** on submission and on review decision

### 📦 Product Vetting
- **Vendor submits products for vetting** via the 🛡️ button on each product card at `/dashboard/vendor/products`
- **Vetting form collects:** availability proof URL, authenticity proof URL, supplier name/contact, product origin, certifications (NAFDAC, ISO, CE), warranty/return policy, and disclosures
- **Vetting badge** on product cards shows `Not Vetted` / `Pending` / `Approved` / `Rejected`
- **Admin product vetting review** at `/dashboard/admin/product-verification`
- **Admin products page** at `/dashboard/admin/products` — activate/deactivate, feature, quick-approve vetting, rank products

### 🔔 Notifications
- **Store visit:** Vendor is notified when a customer visits their store page (session-deduplicated per hour)
- **Add to cart:** Vendor is notified when a customer adds their product to cart (first add only)
- **New order:** Vendor + customer both notified on order placement
- **Order status updates:** Customer notified on every status change
- **Order ready:** Vendor notifies customer (and admin) when order is ready for pickup or delivery via `/api/ranking/notify-ready`
- **KYC decisions:** Vendor/customer notified on KYC approval or rejection
- **Product vetting decisions:** Vendor notified on approval/rejection
- **Ranking decisions:** Vendor notified when ranking is activated or rejected
- **Admin broadcasts:** Admin can send notifications to all users, a specific role, or an individual user

### 📈 Ranking & Advertising (Paid)
- **7 ranking packages**: Bronze, Silver, Gold, Platinum for vendors and products, plus Ad Boost
- **Vendor applies** at `/dashboard/vendor/ranking` — select package, choose product (for product ranking), submit payment reference
- **Admin manages applications** at `/dashboard/admin/rankings` — approve/reject with notes
- **LAMA recommendations:** Automatically identifies top-selling unranked vendors and products and recommends them for ranking
- **Active rankings** shown publicly in marketplace results (ordered by priority level)

### 🛡️ Admin Full Control
- **Vendor management** — approve, suspend, feature, view KYC status
- **Customer management** — suspend/unsuspend with reason, view orders and spend
- **Product management** — activate/deactivate, feature, rank, approve vetting
- **Order monitoring** — all orders across all vendors, update statuses
- **KYC review queue** — pending/approved/rejected filter
- **Product vetting queue** — review authenticity and availability documents
- **Ranking management** — approve/reject paid applications, view LAMA suggestions
- **Broadcast notifications** — message all users, vendors only, or customers only
- **Platform analytics** — revenue, orders, top vendors, category distribution
- **Store visit analytics** — most visited stores in last 30 days

### 🤖 LAMA AI
- **Startup analysis** — generates insights on launch
- **High-demand product/vendor detection** — feeds into ranking recommendations
- **Insights stored** in `lama_insights` table for admin review

---

## 🏗️ Architecture

| Layer | Technology | Port |
|-------|-----------|------|
| Frontend | Next.js 16 (App Router) + Tailwind CSS | 3000 |
| Backend | Express + TypeScript + ts-node-dev | 5000 |
| Database | SQLite (better-sqlite3) — shared file | — |
| Auth | JWT (cookie + Bearer) | — |
| Charts | Recharts | — |

---

## 🚀 Running Locally

See [LOCAL_SETUP.md](./LOCAL_SETUP.md) for full instructions.

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend  
npm run dev
```

Then open http://localhost:3000

---

## 📂 Key Pages

| URL | Description | Access |
|-----|-------------|--------|
| `/` | Home / marketplace landing | Customer (admin/vendor redirected) |
| `/marketplace` | Product & vendor browse | All |
| `/auth/register` | Registration with T&C | Public |
| `/verification` | KYC submission form | Customer, Vendor |
| `/terms` | Terms & Conditions | All |
| `/dashboard/admin` | Admin overview | Admin |
| `/dashboard/admin/vendors` | Vendor management | Admin |
| `/dashboard/admin/customers` | Customer management | Admin |
| `/dashboard/admin/products` | Product management | Admin |
| `/dashboard/admin/kyc` | KYC review | Admin |
| `/dashboard/admin/product-verification` | Product vetting | Admin |
| `/dashboard/admin/rankings` | Ranking/ad management | Admin |
| `/dashboard/admin/notifications` | Broadcast messages | Admin |
| `/dashboard/vendor` | Vendor dashboard | Vendor |
| `/dashboard/vendor/products` | Products + vetting submit | Vendor |
| `/dashboard/vendor/orders` | Orders + notify ready | Vendor |
| `/dashboard/vendor/ranking` | Apply for ranking/ads | Vendor |
| `/dashboard/vendor/analytics` | Vendor analytics | Vendor |
| `/dashboard/customer` | Customer dashboard | Customer |

---

## 🗄️ Database Schema Summary

Core tables: `users`, `vendors`, `categories`, `products`, `orders`, `order_items`, `cart_items`, `reviews`, `notifications`, `advertisements`, `transactions`, `payments`, `delivery_addresses`, `budget_plans`, `recurring_purchases`, `lama_insights`, `product_images`, `kyc_verifications`, `product_verifications`, `ranking_packages`, `vendor_rankings`, `store_visits`, `terms_acceptances`, `saved_vendors`

---

## 📋 Pending / Future Work

- [ ] Real payment gateway integration (Paystack/Flutterwave)
- [ ] File upload for KYC/vetting documents (currently URL-based)
- [ ] Real-time notifications via WebSockets or SSE
- [ ] Email notifications (SendGrid/Mailgun)
- [ ] Mobile app (React Native)
- [ ] More LAMA AI capabilities (price suggestions, demand forecasting)
- [ ] Multi-language support (Yoruba, Hausa, Igbo)
- [ ] Vendor store analytics (heat maps, conversion rates)
