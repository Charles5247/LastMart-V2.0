# LastMart 🛒

**Nigeria's #1 Location-Based Marketplace** — Shop from local vendors and get delivery within 48 hours.

---

## 🌐 Live URL
- **App**: https://3000-iyefxljbdbxsb7a2wv12h-5185f4aa.sandbox.novita.ai
- **API Health**: https://3000-iyefxljbdbxsb7a2wv12h-5185f4aa.sandbox.novita.ai/api/categories

---

## ✅ Completed Features

### 🏠 Public Pages
- **Landing Page** – Hero section, featured products, top vendors, categories, stats, how-it-works, CTA
- **Marketplace** – Products & vendors listing with search, filters (city, category, price range), pagination
- **Vendor Store Page** – Store profile, product grid, reviews, save vendor
- **Product Detail** – Gallery, reviews, add-to-cart, related products
- **Login / Register** – JWT auth, role-based (customer/vendor/admin), demo quick-login buttons

### 👤 Customer Dashboard
- **Overview** – Cart with checkout, recent orders, quick stats
- **Orders** – Full order history with tracking timeline
- **Saved Vendors** – Favorited stores with unsave option
- **Account Settings** – Profile update (name, phone, city, address)

### 🏪 Vendor Dashboard
- **Overview** – Revenue chart, order stats, top products, recent orders
- **Products** – Create/edit/delete products with images, categories, stock
- **Inventory** – Stock management with inline editing and low-stock alerts
- **Orders** – View & update order status (pending → confirmed → shipped → delivered)
- **Analytics** – Sales charts, revenue trends, order breakdown
- **Ads** – Create sponsored product / featured vendor / banner ad campaigns

### 🔧 Admin Dashboard
- **Overview** – Platform-wide stats (users, vendors, orders, revenue), charts
- **Vendors** – Approve/suspend vendors, feature vendors, search & filter
- **Orders** – View all platform orders with status management
- **Analytics** – Revenue trends, category distribution, top vendors

---

## 🔑 Demo Accounts

| Role     | Email                  | Password     |
|----------|------------------------|--------------|
| Customer | bola@example.com       | customer123  |
| Vendor   | tunde@lastmart.com     | vendor123    |
| Admin    | admin@lastmart.com     | admin123     |

---

## 📁 Project Structure

```
webapp/
├── src/
│   ├── app/
│   │   ├── api/                    # All backend API routes
│   │   │   ├── auth/login|register
│   │   │   ├── products/[id]
│   │   │   ├── vendors/[id]|analytics
│   │   │   ├── orders/[id]
│   │   │   ├── cart/
│   │   │   ├── reviews/
│   │   │   ├── notifications/
│   │   │   ├── ads/
│   │   │   ├── categories/
│   │   │   ├── users/me|saved-vendors
│   │   │   └── admin/vendors|analytics
│   │   ├── auth/login|register     # Auth pages
│   │   ├── marketplace/            # Marketplace page
│   │   ├── product/[id]/           # Product detail
│   │   ├── vendor/[id]/            # Vendor store
│   │   ├── dashboard/
│   │   │   ├── customer/           # Customer dashboard + orders, saved, settings
│   │   │   ├── vendor/             # Vendor dashboard + products, inventory, orders, analytics, ads
│   │   │   └── admin/              # Admin dashboard + vendors, orders, analytics
│   │   ├── layout.tsx              # Root layout with providers
│   │   ├── page.tsx                # Landing page
│   │   └── globals.css
│   ├── components/
│   │   ├── AppContext.tsx          # Global state (auth, cart, notifications)
│   │   ├── layout/Navbar.tsx       # Sticky navbar with notifications
│   │   ├── layout/Footer.tsx
│   │   ├── ui/ProductCard.tsx      # Product card with add-to-cart
│   │   └── ui/VendorCard.tsx       # Vendor card with save
│   ├── lib/
│   │   ├── db.ts                   # SQLite setup + all table schemas
│   │   ├── auth.ts                 # JWT sign/verify/middleware
│   │   ├── seed.ts                 # Demo data seeder
│   │   └── utils.ts                # formatPrice, formatDate, distance calc
│   └── types/index.ts              # All TypeScript interfaces
├── ecosystem.config.cjs            # PM2 config
├── next.config.ts                  # Next.js config
├── lastmart.db                     # SQLite database (auto-created)
└── package.json
```

---

## 🗄️ Database Tables (SQLite)

| Table          | Purpose                                      |
|----------------|----------------------------------------------|
| users          | All users (customer / vendor / admin)        |
| vendors        | Vendor store profiles                        |
| categories     | Product categories                           |
| products       | Product listings with images, stock, pricing |
| orders         | Orders with tracking updates                 |
| order_items    | Items within each order                      |
| cart_items     | Active cart items per user                   |
| reviews        | Product & vendor reviews                     |
| notifications  | Real-time notifications per user             |
| advertisements | Vendor ad campaigns                          |
| saved_vendors  | Customer's favorited vendors                 |
| transactions   | Payment records                              |

---

## 🔌 API Endpoints

### Auth
- `POST /api/auth/register` – Register (customer/vendor)
- `POST /api/auth/login` – Login (returns JWT)

### Products
- `GET /api/products` – List with filters (city, category, search, price, featured, sponsored)
- `POST /api/products` – Create product (vendor only)
- `GET /api/products/[id]` – Product detail + reviews + related
- `PUT /api/products/[id]` – Update product
- `DELETE /api/products/[id]` – Soft delete

### Vendors
- `GET /api/vendors` – List vendors with location filtering
- `GET /api/vendors/[id]` – Vendor profile + products + reviews
- `PUT /api/vendors/[id]` – Update vendor
- `GET /api/vendors/analytics` – Vendor dashboard analytics (vendor only)

### Orders
- `GET /api/orders` – Orders (role-aware: customer sees own, vendor sees store's)
- `POST /api/orders` – Place order (creates per-vendor orders, sends notifications)
- `GET /api/orders/[id]` – Order detail with tracking
- `PUT /api/orders/[id]` – Update status (vendor/admin)

### Cart
- `GET /api/cart` – Get cart with product details
- `POST /api/cart` – Add item
- `PUT /api/cart` – Update quantity
- `DELETE /api/cart` – Remove item or clear cart

### Other
- `GET /api/categories` – All categories
- `GET|POST /api/reviews` – Reviews
- `GET|PUT /api/notifications` – Notifications
- `GET|POST /api/ads` – Advertisements
- `GET|PUT /api/users/me` – Profile
- `GET|POST|DELETE /api/users/saved-vendors` – Saved vendors
- `GET /api/admin/analytics` – Platform analytics (admin only)
- `GET|PUT /api/admin/vendors` – Manage vendors (admin only)

---

## 🚀 Local Setup

```bash
# 1. Install dependencies
npm install

# 2. Build
npm run build

# 3. Start (production)
npm start
# OR with PM2:
pm2 start ecosystem.config.cjs

# 4. Database auto-seeds on first API call
# Demo data includes vendors, products, orders, reviews
```

---

## 🛠 Tech Stack

| Layer        | Technology                           |
|--------------|--------------------------------------|
| Framework    | Next.js 16 (App Router + Turbopack) |
| Language     | TypeScript                           |
| Styling      | Tailwind CSS v4                      |
| Database     | SQLite via better-sqlite3            |
| Auth         | JWT (jsonwebtoken + bcryptjs)        |
| Charts       | Recharts                             |
| Icons        | Lucide React                         |
| Notifications| react-hot-toast                      |
| Process Mgr  | PM2                                  |

---

## 🎯 Key Features Implemented

- ✅ Location-based filtering (city-based vendor/product discovery)
- ✅ Distance sorting (Haversine formula for lat/lng)
- ✅ 48-hour delivery tracking with timeline
- ✅ Real-time notifications (new orders, low stock, status updates)
- ✅ Vendor advertisement system (sponsored products, featured vendors)
- ✅ Multi-vendor cart (separate orders per vendor)
- ✅ Role-based access control (customer / vendor / admin)
- ✅ Sales analytics with revenue charts
- ✅ Product reviews & ratings
- ✅ Save/favorite vendors
- ✅ Admin vendor approval workflow
- ✅ Responsive mobile-first design
- ✅ Smooth animations and card-based UI

---

*LastMart © 2024 – Nigeria's Fastest Local Marketplace*
