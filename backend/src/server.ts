import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';

// Routes
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import vendorRoutes from './routes/vendors';
import orderRoutes from './routes/orders';
import cartRoutes from './routes/cart';
import categoryRoutes from './routes/categories';
import reviewRoutes from './routes/reviews';
import notificationRoutes from './routes/notifications';
import userRoutes from './routes/users';
import adRoutes from './routes/ads';
import adminRoutes from './routes/admin';

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// ─── Middleware ───────────────────────────────────────────────────
app.use(cors({
  origin: [FRONTEND_URL, 'http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Health Check ─────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'LastMart API' });
});

// ─── API Routes ───────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ads', adRoutes);
app.use('/api/admin', adminRoutes);

// ─── Vendor Analytics (kept as separate route) ────────────────────
app.use('/api/vendors', vendorRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.path} not found` });
});

// ─── Error Handler ───────────────────────────────────────────────
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ success: false, error: err.message || 'Internal server error' });
});

// ─── Start ───────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 LastMart API Server running at http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   CORS allowed from: ${FRONTEND_URL}`);
  console.log(`\n📋 Available endpoints:`);
  console.log(`   POST   /api/auth/login`);
  console.log(`   POST   /api/auth/register`);
  console.log(`   GET    /api/products`);
  console.log(`   GET    /api/products/:id`);
  console.log(`   GET    /api/vendors`);
  console.log(`   GET    /api/vendors/:id`);
  console.log(`   GET    /api/orders`);
  console.log(`   GET    /api/categories`);
  console.log(`   GET    /api/cart`);
  console.log(`   GET    /api/notifications`);
  console.log(`   GET    /api/users/me`);
  console.log(`   GET    /api/admin/analytics`);
  console.log(`   GET    /api/admin/vendors\n`);
});

export default app;
