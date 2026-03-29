# 🛒 LastMart – Local Setup Guide

LastMart is a full-stack Nigerian marketplace app with a **separated frontend and backend**. You run them in two separate terminals.

---

## 📁 Project Structure

```
lastmart/
├── src/                          ← Next.js frontend (pages, components)
│   ├── app/                      ← App Router pages
│   ├── components/               ← React components
│   └── lib/                      ← (legacy – not used when backend is separate)
├── backend/                      ← Express API server  ← NEW
│   ├── src/
│   │   ├── server.ts             ← Main Express entry point
│   │   ├── routes/               ← All API route handlers
│   │   │   ├── auth.ts
│   │   │   ├── products.ts
│   │   │   ├── vendors.ts
│   │   │   ├── orders.ts
│   │   │   ├── cart.ts
│   │   │   ├── categories.ts
│   │   │   ├── reviews.ts
│   │   │   ├── notifications.ts
│   │   │   ├── users.ts
│   │   │   ├── ads.ts
│   │   │   └── admin.ts
│   │   └── lib/
│   │       ├── db.ts             ← SQLite database helper
│   │       ├── auth.ts           ← JWT helpers (no Next.js deps)
│   │       ├── utils.ts          ← Utility functions
│   │       └── seed.ts           ← Database seeder
│   ├── package.json              ← Backend dependencies
│   ├── tsconfig.json
│   └── ecosystem.config.cjs      ← PM2 config for backend
├── lastmart.db                   ← SQLite database (shared)
├── package.json                  ← Frontend dependencies + dev scripts
├── next.config.ts                ← Proxies /api/* → backend :5000
├── ecosystem.config.cjs          ← PM2 config for frontend
└── LOCAL_SETUP.md                ← This file
```

---

## ⚡ Quick Start (Two Terminals)

### Prerequisites
- **Node.js** 18+ → https://nodejs.org
- **npm** 8+

### Step 1 – Install dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend && npm install && cd ..
```

Or run both at once:
```bash
npm run install:all
```

### Step 2 – Terminal 1: Start the Backend (Express API)

```bash
cd backend
npm run dev
```

You should see:
```
🚀 LastMart API Server running at http://localhost:5000
   Health: http://localhost:5000/health
```

> The first startup automatically seeds the database with demo data.

### Step 3 – Terminal 2: Start the Frontend (Next.js)

```bash
npm run dev:frontend
```

You should see:
```
▲ Next.js 16.1.6
   - Local:        http://localhost:3000
```

### Step 4 – Open the app

Visit **http://localhost:3000**

---

## 🔐 Demo Login Credentials

| Role     | Email                   | Password      |
|----------|-------------------------|---------------|
| Customer | bola@example.com        | customer123   |
| Customer | ngozi@example.com       | customer123   |
| Vendor   | tunde@lastmart.com      | vendor123     |
| Vendor   | amaka@lastmart.com      | vendor123     |
| Admin    | admin@lastmart.com      | admin123      |

---

## 🎯 One-Command Dev (Both Servers)

Run frontend + backend together with colored output:

```bash
npm run dev:all
```

This uses `concurrently` to start both servers simultaneously. Logs are color-coded:
- **Cyan** = Backend (Express :5000)
- **Magenta** = Frontend (Next.js :3000)

---

## 🌐 How the Proxy Works

Next.js proxies all `/api/*` requests to the Express backend:

```
Browser → http://localhost:3000/api/products
           ↓ (Next.js rewrite)
Express  → http://localhost:5000/api/products
           ↓ (SQLite query)
Response ← JSON data
```

This means the frontend always calls `/api/...` (same origin), and Next.js forwards them to the backend. No CORS issues in the browser.

---

## 📡 API Endpoints (Express Backend :5000)

| Method | Endpoint                    | Description              |
|--------|-----------------------------|--------------------------|
| GET    | /health                     | Health check             |
| POST   | /api/auth/login             | Login                    |
| POST   | /api/auth/register          | Register                 |
| GET    | /api/products               | List products            |
| GET    | /api/products/:id           | Product details          |
| POST   | /api/products               | Create product (vendor)  |
| GET    | /api/vendors                | List vendors             |
| GET    | /api/vendors/:id            | Vendor details           |
| GET    | /api/vendors/me/analytics   | Vendor analytics         |
| GET    | /api/orders                 | List orders              |
| POST   | /api/orders                 | Place order              |
| PUT    | /api/orders/:id             | Update order status      |
| GET    | /api/cart                   | Get cart                 |
| POST   | /api/cart                   | Add to cart              |
| PUT    | /api/cart                   | Update cart item         |
| DELETE | /api/cart                   | Remove from cart         |
| GET    | /api/categories             | List categories          |
| GET    | /api/reviews                | List reviews             |
| POST   | /api/reviews                | Post review              |
| GET    | /api/notifications          | Get notifications        |
| PUT    | /api/notifications          | Mark as read             |
| GET    | /api/users/me               | Get current user         |
| PUT    | /api/users/me               | Update profile           |
| GET    | /api/users/saved-vendors    | Saved vendors            |
| POST   | /api/users/saved-vendors    | Save vendor              |
| DELETE | /api/users/saved-vendors    | Unsave vendor            |
| GET    | /api/ads                    | List ads                 |
| POST   | /api/ads                    | Create ad (vendor)       |
| GET    | /api/admin/analytics        | Admin analytics          |
| GET    | /api/admin/vendors          | Admin vendor list        |
| PUT    | /api/admin/vendors          | Approve/suspend vendor   |

---

## 🗄️ Database

- **Type**: SQLite (`lastmart.db` in project root)
- **Shared** between frontend and backend
- **Auto-seeded** on first request to `/api/categories`

To reset the database:
```bash
rm lastmart.db
# Restart the backend – it will auto-seed
```

---

## 🔧 Environment Variables

### Frontend (`.env.local`)
```env
BACKEND_API_URL=http://localhost:5000
JWT_SECRET=lastmart-super-secret-key-2024
```

### Backend (`backend/.env`)
```env
PORT=5000
JWT_SECRET=lastmart-super-secret-key-2024
FRONTEND_URL=http://localhost:3000
```

Copy the example files:
```bash
cp .env.local.example .env.local
cp backend/.env.example backend/.env
```

---

## 🛠️ Troubleshooting

### Port already in use
```bash
# Kill port 3000 (frontend)
npx kill-port 3000

# Kill port 5000 (backend)
npx kill-port 5000
```

### Backend won't start
```bash
cd backend
npm install          # Ensure deps are installed
npm run dev          # Check for TypeScript errors
```

### Database errors
```bash
rm lastmart.db       # Delete and re-seed
cd backend && npm run dev
```

### API calls returning 404
Make sure the backend is running on port 5000 **before** the frontend starts. The Next.js dev server proxies requests in real time.

### `better-sqlite3` native module error
```bash
cd backend
npm rebuild better-sqlite3
```

---

## 📦 Tech Stack

| Layer     | Technology                    |
|-----------|-------------------------------|
| Frontend  | Next.js 16, React 19, TypeScript |
| Styling   | Tailwind CSS v4               |
| Backend   | Express.js, TypeScript        |
| Database  | SQLite (better-sqlite3)       |
| Auth      | JWT (jsonwebtoken + bcryptjs) |
| Dev Tools | ts-node-dev, concurrently     |
