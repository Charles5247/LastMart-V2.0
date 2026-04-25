# LastMart 🛒 — Nigeria's Local Marketplace

> A full-stack local marketplace platform. Customers shop from vendors in their city and receive delivery within 48 hours.

**Live Stack**: Next.js 14 · Express.js · SQLite/PostgreSQL · Tailwind CSS v4 · TypeScript

---

## ✅ Features

| Module | Features |
|--------|---------|
| **Authentication** | JWT login/register, role-based access (admin, vendor, customer), Terms & Conditions acceptance |
| **Marketplace** | Product browsing, search, category filters, location-based vendor discovery |
| **Cart & Checkout** | Add to cart, quantity management, checkout flow |
| **Payment** | Paystack (card, bank transfer, USSD, mobile money), Flutterwave (card, M-Pesa, bank), demo mode |
| **KYC Verification** | Customer (NIN, BVN, ID, selfie) + Vendor (CAC, TIN, director ID, utility bill) |
| **Product Vetting** | Stock proof, brand authenticity, lab certs, NAFDAC, ISO, CE certification upload |
| **File Uploads** | Product images, KYC docs, vetting documents (local disk + Cloudinary ready) |
| **Real-time Notifications** | Server-Sent Events (SSE) — no WebSocket server needed |
| **Email Notifications** | SendGrid / SMTP / Nodemailer — order confirmation, KYC status, welcome email |
| **LAMA AI** | Price suggestions, demand forecasting, platform insights, trend analysis |
| **Ranking & Ads** | Bronze/Silver/Gold/Platinum vendor & product ranking, Ad Boost packages |
| **Analytics** | Revenue charts, store visit heatmap, conversion funnel, LAMA forecast |
| **Multi-language** | English, Yoruba (Yorùbá), Hausa, Igbo |
| **Admin Panel** | Manage vendors, customers, KYC, products, orders, notifications, analytics |
| **Mobile App** | React Native (Expo) scaffold for iOS + Android |

---

## 🏗️ Project Structure

```
lastmart/
├── src/                     # Next.js 14 frontend
│   ├── app/                 # App Router pages
│   │   ├── page.tsx         # Homepage
│   │   ├── marketplace/     # Marketplace browsing
│   │   ├── auth/            # Login & Register
│   │   ├── dashboard/
│   │   │   ├── admin/       # Admin dashboard
│   │   │   ├── vendor/      # Vendor dashboard
│   │   │   └── customer/    # Customer dashboard
│   │   ├── payment/         # Payment pages
│   │   ├── verification/    # KYC submission
│   │   └── terms/           # Terms & Conditions
│   ├── components/          # Shared UI components
│   │   ├── layout/Navbar.tsx
│   │   ├── AppContext.tsx   # Global state
│   │   └── LanguageSwitcher.tsx
│   ├── hooks/
│   │   └── useSSE.ts        # Real-time SSE hook
│   ├── lib/
│   │   ├── i18n.ts          # Internationalization
│   │   └── utils.ts
│   └── locales/             # Translation files (en, yo, ha, ig)
│
├── backend/                 # Express.js API server
│   └── src/
│       ├── server.ts        # Entry point (port 5000)
│       ├── lib/
│       │   ├── db.ts        # SQLite database + schema
│       │   ├── auth.ts      # JWT helpers
│       │   ├── email.ts     # Email service (SendGrid/SMTP)
│       │   └── sse.ts       # SSE manager
│       └── routes/          # API route handlers
│           ├── auth.ts, users.ts, vendors.ts, products.ts
│           ├── orders.ts, cart.ts, categories.ts, reviews.ts
│           ├── payment.ts   # Paystack + Flutterwave
│           ├── upload.ts    # File uploads (images, KYC docs)
│           ├── verification.ts # KYC + product vetting
│           ├── ranking.ts   # Ranking packages
│           ├── lama.ts      # AI: insights, price suggestions, forecasting
│           ├── notifications.ts
│           ├── admin.ts
│           ├── sse.ts       # Real-time SSE endpoint
│           └── budget.ts, delivery.ts, ads.ts
│
├── mobile/                  # React Native (Expo) app
│   ├── app/                 # Expo Router screens
│   ├── src/                 # Shared utilities
│   └── README.md            # Mobile setup guide
│
├── public/
│   └── uploads/             # Local file storage (dev)
│
├── DATABASE_SCHEMA.sql      # Full DB schema
├── package.json             # Frontend dependencies
├── next.config.js           # Next.js config + API proxy
└── ecosystem.config.cjs     # PM2 config
```

---

## 🚀 Quick Start (Development)

### Prerequisites
- Node.js 18+
- npm 9+

### 1. Clone & Install

```bash
git clone https://github.com/Charles5247/LastMart-V2.0.git
cd LastMart-V2.0

# Install all dependencies (frontend + backend)
npm run install:all
```

### 2. Environment Variables

**Frontend** — create `.env.local`:
```env
BACKEND_API_URL=http://localhost:5000
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_your_paystack_public_key
```

**Backend** — create `backend/.env`:
```env
# Server
PORT=5000
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Database (SQLite - default, no config needed)
DATABASE_PATH=../lastmart.db

# Database (PostgreSQL - for production)
# DATABASE_URL=postgresql://user:password@host:5432/lastmart

# Payment Gateways
PAYSTACK_SECRET_KEY=sk_test_your_paystack_secret_key
PAYSTACK_PUBLIC_KEY=pk_test_your_paystack_public_key
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST_your_flutterwave_key
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST_your_flutterwave_key
FLW_WEBHOOK_HASH=your_flutterwave_webhook_hash

# Email (choose one)
SENDGRID_API_KEY=SG.your_sendgrid_key
# OR SMTP:
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM_NAME=LastMart
EMAIL_FROM_ADDRESS=noreply@lastmart.com

# File Storage (optional - local disk is default)
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name

# AWS S3 (optional)
AWS_S3_BUCKET=your-bucket
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
```

### 3. Run Development Servers

```bash
# Run both frontend + backend together
npm run dev:all

# OR run separately:
npm run dev:backend    # Express API on http://localhost:5000
npm run dev:frontend   # Next.js on http://localhost:3000
```

### 4. Build for Production

```bash
# Build frontend
npm run build

# Build backend
npm run build:backend

# Start both
npm run start:backend  # Express on port 5000
npm run start          # Next.js on port 3000
```

---

## 🗄️ Database Strategy

### Development: SQLite (default)
No setup needed — the database (`lastmart.db`) is auto-created on first run.

```bash
# Seed test data
cd backend && npm run seed
```

### Production Option 1: PostgreSQL (Supabase / Neon / Railway)

1. Create a database at [supabase.com](https://supabase.com) or [neon.tech](https://neon.tech)
2. Set the connection URL:
   ```env
   DATABASE_URL=postgresql://user:password@host:5432/lastmart
   ```
3. Run the schema:
   ```bash
   # Copy DATABASE_SCHEMA.sql contents to your Supabase/Neon SQL editor
   # OR use psql:
   psql $DATABASE_URL < DATABASE_SCHEMA.sql
   ```
4. Update `backend/src/lib/db.ts` — switch from `better-sqlite3` to `pg`:
   ```bash
   cd backend && npm install pg @types/pg
   ```

### Production Option 2: MongoDB Atlas

1. Create a cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Install Mongoose:
   ```bash
   cd backend && npm install mongoose @types/mongoose
   ```
3. Set `MONGODB_URL=mongodb+srv://user:pass@cluster.mongodb.net/lastmart` in backend `.env`

### Production Option 3: PlanetScale (MySQL compatible)

```bash
cd backend && npm install mysql2
# Set DATABASE_URL=mysql://user:pass@host/lastmart
```

---

## 🌐 Deployment Guide

### Option A: Vercel (Frontend) + Railway (Backend) ⭐ Recommended

#### Frontend → Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy from project root
vercel

# Set environment variables in Vercel dashboard:
# BACKEND_API_URL=https://your-backend.railway.app
# NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_...
```

Or connect GitHub repo at [vercel.com](https://vercel.com) → Import Project → Set env vars.

**Vercel `vercel.json`** (create in root if needed):
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://your-backend.railway.app/api/:path*" }
  ]
}
```

#### Backend → Railway

```bash
# Install Railway CLI
npm install -g @railway/cli
railway login

# From the backend/ directory
cd backend
railway init
railway up

# Set all environment variables in Railway dashboard
```

Or connect GitHub repo at [railway.app](https://railway.app) → New Project → Deploy from GitHub → set root directory to `backend/`.

**`backend/Procfile`** (Railway uses this):
```
web: node dist/server.js
```

---

### Option B: Netlify (Frontend) + Render (Backend)

#### Frontend → Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli
netlify login

# Build and deploy
npm run build
netlify deploy --prod --dir .next
```

Create `netlify.toml` in root:
```toml
[build]
  command   = "npm run build"
  publish   = ".next"

[[redirects]]
  from   = "/api/*"
  to     = "https://your-backend.onrender.com/api/:splat"
  status = 200

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

Install plugin:
```bash
npm install -D @netlify/plugin-nextjs
```

#### Backend → Render

1. Go to [render.com](https://render.com) → New Web Service
2. Connect GitHub repo
3. Set:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. Add all environment variables

---

### Option C: DigitalOcean App Platform

```yaml
# .do/app.yaml
name: lastmart
services:
  - name: frontend
    github:
      repo: Charles5247/LastMart-V2.0
      branch: main
    build_command: npm run build
    run_command: npm start
    envs:
      - key: BACKEND_API_URL
        value: ${backend.PRIVATE_URL}
    http_port: 3000

  - name: backend
    github:
      repo: Charles5247/LastMart-V2.0
      branch: main
    source_dir: backend
    build_command: npm install && npm run build
    run_command: npm start
    http_port: 5000
```

---

### Option D: Self-Hosted (VPS - Ubuntu)

```bash
# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
npm install -g pm2

# Clone and setup
git clone https://github.com/Charles5247/LastMart-V2.0.git /var/www/lastmart
cd /var/www/lastmart

# Install dependencies
npm run install:all

# Build both
npm run build
npm run build:backend

# Start with PM2
pm2 start ecosystem.config.cjs        # Frontend
pm2 start backend/ecosystem.config.cjs # Backend
pm2 save && pm2 startup

# Setup Nginx reverse proxy
sudo apt install nginx
# /etc/nginx/sites-available/lastmart:
# server {
#   listen 80;
#   server_name yourdomain.com;
#   location / { proxy_pass http://localhost:3000; }
#   location /api { proxy_pass http://localhost:5000; }
# }
```

---

### Option E: Docker Compose

Create `docker-compose.yml` in root:
```yaml
version: '3.8'
services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports: ["3000:3000"]
    environment:
      - BACKEND_API_URL=http://backend:5000
    depends_on: [backend]

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports: ["5000:5000"]
    volumes:
      - ./lastmart.db:/app/lastmart.db
    environment:
      - PORT=5000
      - FRONTEND_URL=http://frontend:3000
      - JWT_SECRET=change_me_in_production
```

**`Dockerfile.frontend`**:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

**`backend/Dockerfile`**:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["node", "dist/server.js"]
```

```bash
docker-compose up -d
```

---

## 💳 Payment Gateway Setup

### Paystack
1. Sign up at [paystack.com](https://paystack.com)
2. Get API keys from Dashboard → Settings → API Keys
3. Set in backend `.env`:
   ```env
   PAYSTACK_SECRET_KEY=sk_test_xxxxx   # Use sk_live_ for production
   PAYSTACK_PUBLIC_KEY=pk_test_xxxxx   # Use pk_live_ for production
   ```
4. Add webhook URL in Paystack dashboard:
   `https://your-backend.com/api/payment/webhook/paystack`

### Flutterwave
1. Sign up at [flutterwave.com](https://flutterwave.com)
2. Get API keys from Dashboard → Settings → API
3. Set in backend `.env`:
   ```env
   FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST_xxxxx
   FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST_xxxxx
   FLW_WEBHOOK_HASH=your_webhook_hash
   ```
4. Add webhook URL: `https://your-backend.com/api/payment/webhook/flutterwave`

---

## 📧 Email Setup

### SendGrid (Recommended)
1. Sign up at [sendgrid.com](https://sendgrid.com)
2. Create API key with "Mail Send" permission
3. Set: `SENDGRID_API_KEY=SG.xxxxx`
4. Verify sender email in SendGrid

### Gmail SMTP (Quick start)
1. Enable 2FA on your Google account
2. Generate App Password: Google Account → Security → App Passwords
3. Set in `.env`:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your@gmail.com
   SMTP_PASS=your_16_char_app_password
   ```

---

## ☁️ File Storage Setup

### Cloudinary (Recommended for production)
1. Sign up at [cloudinary.com](https://cloudinary.com)
2. Get credentials from Dashboard
3. Set: `CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME`
4. Install: `cd backend && npm install cloudinary`

### AWS S3
```env
AWS_S3_BUCKET=lastmart-uploads
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=AKIAXXXXXXXX
AWS_SECRET_ACCESS_KEY=your_secret
```

---

## 🔔 Real-time Notifications (SSE)

The app uses **Server-Sent Events** — works on all hosting platforms (no WebSocket server needed).

Frontend integration:
```typescript
import { useSSE } from '@/hooks/useSSE';
import toast from 'react-hot-toast';

const { connected } = useSSE(token, {
  onEvent: (event) => {
    if (event.type === 'new_order')    toast.success('New order!');
    if (event.type === 'kyc_approved') toast.success('KYC Approved!');
  },
});
```

---

## 🌍 Multi-language Support

```typescript
import { useTranslation } from 'react-i18next';
import '@/lib/i18n'; // Initialize i18n

export default function MyComponent() {
  const { t, i18n } = useTranslation();
  return (
    <>
      <h1>{t('home.hero_title')}</h1>
      <button onClick={() => i18n.changeLanguage('yo')}>Yorùbá</button>
      <button onClick={() => i18n.changeLanguage('ha')}>Hausa</button>
      <button onClick={() => i18n.changeLanguage('ig')}>Igbo</button>
    </>
  );
}
```

Supported: **English** · **Yorùbá** · **Hausa** · **Igbo**

---

## 📱 Mobile App

See [`mobile/README.md`](./mobile/README.md) for full React Native (Expo) setup.

```bash
cd mobile
npm install
npx expo start
```

---

## 🔑 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login |
| GET | `/api/products` | List products |
| GET | `/api/vendors` | List vendors |
| POST | `/api/cart` | Add to cart |
| POST | `/api/orders` | Place order |
| POST | `/api/payment/initiate` | Start payment |
| POST | `/api/payment/verify` | Verify payment |
| POST | `/api/upload/kyc-document` | Upload KYC doc |
| GET | `/api/lama/price-suggestions` | AI price advice |
| GET | `/api/lama/demand-forecast` | Demand forecast |
| GET | `/api/sse` | SSE real-time stream |
| GET | `/api/admin/analytics` | Platform analytics |

Full API docs: See each route file in `backend/src/routes/`.

---

## 🛠️ Tech Stack

**Frontend**: Next.js 14, React 19, TypeScript, Tailwind CSS v4, Recharts, i18next  
**Backend**: Express.js, TypeScript, better-sqlite3, JWT, Multer, Nodemailer, Axios  
**Payment**: Paystack, Flutterwave  
**Storage**: Local disk / Cloudinary / AWS S3  
**Email**: SendGrid / SMTP / Nodemailer  
**Real-time**: Server-Sent Events (SSE)  
**Mobile**: React Native (Expo), Expo Router, SecureStore  
**AI**: LAMA (rule-based + OpenAI-compatible)  
**Deployment**: Vercel + Railway / Netlify + Render / Docker / VPS  

---

## 📋 Environment Variables Summary

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | ✅ | Secret for JWT signing |
| `PAYSTACK_SECRET_KEY` | For payments | Paystack API key |
| `FLUTTERWAVE_SECRET_KEY` | For payments | Flutterwave API key |
| `SENDGRID_API_KEY` | For emails | SendGrid key |
| `SMTP_HOST/USER/PASS` | For emails | SMTP config |
| `CLOUDINARY_URL` | For cloud uploads | Cloudinary URL |
| `DATABASE_URL` | For PostgreSQL | DB connection string |
| `FRONTEND_URL` | ✅ Backend | Frontend origin for CORS |

---

## 👤 Roles

| Role | Capabilities |
|------|-------------|
| **Admin** | Full platform control — manage vendors, KYC, orders, analytics, notifications |
| **Vendor** | Manage store, products, orders, KYC, ranking, analytics |
| **Customer** | Browse, cart, checkout, order tracking, KYC, budget planner |

---

## 📅 Status

- **Version**: 4.0.0
- **Platform**: Vercel + Railway (primary)
- **Last Updated**: April 2026

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Commit: `git commit -m 'feat: add my feature'`
4. Push: `git push origin feat/my-feature`
5. Open a Pull Request
