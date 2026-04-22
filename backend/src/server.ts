/**
 * ─── LastMart Express API Server ──────────────────────────────────────────────
 * Entry point for the backend API server.
 *
 * Architecture:
 *   - Express + TypeScript on Node.js (runs separately from Next.js)
 *   - Shares the same lastmart.db SQLite file as the Next.js API routes
 *   - Listens on PORT 5000 (frontend proxy rewrites /api/* → localhost:5000)
 *
 * Registered route namespaces:
 *   /api/auth        – Login, register, JWT management
 *   /api/products    – Product CRUD + search + filters
 *   /api/vendors     – Vendor profiles + analytics
 *   /api/orders      – Order placement and tracking
 *   /api/cart        – Shopping cart management
 *   /api/categories  – Product categories
 *   /api/reviews     – Customer reviews
 *   /api/notifications – In-app notification inbox
 *   /api/users       – User profile, saved vendors
 *   /api/ads         – Advertisement management
 *   /api/admin       – Admin analytics + vendor management
 *   /api/payment     – Payment gateway (Paystack/Flutterwave/Crypto/GiftCard)
 *   /api/delivery    – Delivery addresses + delivery modes
 *   /api/budget      – Budget plans + recurring purchase scheduler
 *   /api/lama        – LAMA AI agent (insights, trends, recommendations)
 *   /api/upload      – Image uploads (vendor product images, 50 MB limit)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';

/* ─── Route imports ──────────────────────────────────────────────────────── */
import authRoutes         from './routes/auth';
import productRoutes      from './routes/products';
import vendorRoutes       from './routes/vendors';
import orderRoutes        from './routes/orders';
import cartRoutes         from './routes/cart';
import categoryRoutes     from './routes/categories';
import reviewRoutes       from './routes/reviews';
import notificationRoutes from './routes/notifications';
import userRoutes         from './routes/users';
import adRoutes           from './routes/ads';
import adminRoutes        from './routes/admin';
import paymentRoutes      from './routes/payment';
import deliveryRoutes     from './routes/delivery';
import budgetRoutes       from './routes/budget';
import lamaRoutes, { runLamaAnalysis } from './routes/lama';
import uploadRoutes       from './routes/upload';

const app          = express();
const PORT         = process.env.PORT         || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

/* ─── Middleware ─────────────────────────────────────────────────────────── */

/**
 * CORS: allow the Next.js frontend origin plus localhost variants.
 * Credentials=true lets auth cookies pass through in development.
 */
app.use(cors({
  origin: [FRONTEND_URL, 'http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
}));

/** Parse JSON bodies up to 50 MB (for base64 image previews in requests) */
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

/** Parse cookies (used for auth_token in httpOnly cookies) */
app.use(cookieParser());

/**
 * Serve uploaded images as static files.
 * Files are stored at <project-root>/public/uploads/
 * and served at /uploads/<filename>.
 */
const UPLOAD_DIR = path.join(__dirname, '../../../public/uploads');
app.use('/uploads', express.static(UPLOAD_DIR));

/* ─── Health Check ───────────────────────────────────────────────────────── */
/**
 * GET /health
 * Simple liveness probe used by PM2 and load-balancers.
 */
app.get('/health', (_req, res) => {
  res.json({
    status:    'ok',
    timestamp: new Date().toISOString(),
    service:   'LastMart API',
    version:   '2.0.0',
  });
});

/* ─── API Routes ─────────────────────────────────────────────────────────── */
app.use('/api/auth',          authRoutes);
app.use('/api/products',      productRoutes);
app.use('/api/vendors',       vendorRoutes);
app.use('/api/orders',        orderRoutes);
app.use('/api/cart',          cartRoutes);
app.use('/api/categories',    categoryRoutes);
app.use('/api/reviews',       reviewRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/ads',           adRoutes);
app.use('/api/admin',         adminRoutes);

/* ─── New feature routes ─────────────────────────────────────────────────── */
app.use('/api/payment',       paymentRoutes);   // Paystack/Flutterwave/Crypto/GiftCard
app.use('/api/delivery',      deliveryRoutes);  // Addresses + delivery modes
app.use('/api/budget',        budgetRoutes);    // Budget plans + recurring purchases
app.use('/api/lama',          lamaRoutes);      // LAMA AI agent
app.use('/api/upload',        uploadRoutes);    // Image uploads (50 MB limit)

/* ─── 404 Handler ────────────────────────────────────────────────────────── */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
  });
});

/* ─── Global Error Handler ───────────────────────────────────────────────── */
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server Error]', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

/* ─── Start Server ───────────────────────────────────────────────────────── */
app.listen(PORT, () => {
  console.log(`\n🚀 LastMart API Server v2.0 running at http://localhost:${PORT}`);
  console.log(`   Health:       http://localhost:${PORT}/health`);
  console.log(`   CORS origin:  ${FRONTEND_URL}`);
  console.log(`\n📋 API Namespaces:`);
  [
    'auth', 'products', 'vendors', 'orders', 'cart', 'categories',
    'reviews', 'notifications', 'users', 'ads', 'admin',
    'payment', 'delivery', 'budget', 'lama', 'upload',
  ].forEach(ns => console.log(`   /api/${ns}`));
  console.log();

  /* ─── Run LAMA initial analysis (deferred 5 s to let DB warm up) ───── */
  setTimeout(() => {
    try {
      const result = runLamaAnalysis();
      console.log(`🤖 LAMA: ${result.inserted} insights generated on startup`);
    } catch (e: any) {
      console.warn('⚠️  LAMA startup analysis skipped:', e.message);
    }
  }, 5000);
});

export default app;
