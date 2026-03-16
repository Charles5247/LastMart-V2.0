import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import getDB from './db';

export async function seedDatabase() {
  const db = getDB();

  // Check if already seeded
  const existing = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (existing.count > 0) return;

  console.log('Seeding database...');

  // Categories
  const categories = [
    { id: uuidv4(), name: 'Electronics', icon: '📱' },
    { id: uuidv4(), name: 'Fashion', icon: '👗' },
    { id: uuidv4(), name: 'Food & Groceries', icon: '🛒' },
    { id: uuidv4(), name: 'Home & Living', icon: '🏠' },
    { id: uuidv4(), name: 'Health & Beauty', icon: '💄' },
    { id: uuidv4(), name: 'Sports & Fitness', icon: '⚽' },
    { id: uuidv4(), name: 'Books & Stationery', icon: '📚' },
    { id: uuidv4(), name: 'Toys & Games', icon: '🎮' },
  ];

  const insertCategory = db.prepare('INSERT INTO categories (id, name, icon) VALUES (?, ?, ?)');
  for (const cat of categories) {
    insertCategory.run(cat.id, cat.name, cat.icon);
  }

  // Admin user
  const adminId = uuidv4();
  const adminPassword = await bcrypt.hash('admin123', 10);
  db.prepare(`INSERT INTO users (id, name, email, password, role, city) VALUES (?, ?, ?, ?, ?, ?)`).run(
    adminId, 'Admin User', 'admin@lastmart.com', adminPassword, 'admin', 'Lagos'
  );

  // Vendor users
  const vendors = [
    { name: 'Tunde Adeyemi', email: 'tunde@lastmart.com', city: 'Lagos', store: 'TechHub Lagos', cat: 'Electronics', lat: 6.5244, lng: 3.3792 },
    { name: 'Amaka Okonkwo', email: 'amaka@lastmart.com', city: 'Lagos', store: 'Amaka Fashion House', cat: 'Fashion', lat: 6.4698, lng: 3.5852 },
    { name: 'Emeka Nwosu', email: 'emeka@lastmart.com', city: 'Abuja', store: 'Emeka Groceries', cat: 'Food & Groceries', lat: 9.0579, lng: 7.4951 },
    { name: 'Fatima Musa', email: 'fatima@lastmart.com', city: 'Kano', store: 'Fatima Beauty Store', cat: 'Health & Beauty', lat: 12.0022, lng: 8.5920 },
    { name: 'Chidi Obi', email: 'chidi@lastmart.com', city: 'Lagos', store: 'Chidi Sports World', cat: 'Sports & Fitness', lat: 6.5227, lng: 3.6218 },
  ];

  const vendorIds: string[] = [];
  for (const v of vendors) {
    const userId = uuidv4();
    const vendorId = uuidv4();
    const password = await bcrypt.hash('vendor123', 10);
    
    db.prepare(`INSERT INTO users (id, name, email, password, role, city, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
      userId, v.name, v.email, password, 'vendor', v.city, v.lat, v.lng
    );

    db.prepare(`INSERT INTO vendors (id, user_id, store_name, description, category, city, latitude, longitude, status, is_featured, rating, total_reviews) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      vendorId, userId, v.store,
      `${v.store} - Your trusted local ${v.cat.toLowerCase()} provider. We offer quality products with fast delivery within 48 hours.`,
      v.cat, v.city, v.lat, v.lng, 'approved', Math.random() > 0.5 ? 1 : 0,
      (3.5 + Math.random() * 1.5).toFixed(1), Math.floor(20 + Math.random() * 80)
    );
    vendorIds.push(vendorId);
  }

  // Customer users
  const customers = [
    { name: 'Bola Adewale', email: 'bola@example.com', city: 'Lagos', lat: 6.5244, lng: 3.3792 },
    { name: 'Ngozi Eze', email: 'ngozi@example.com', city: 'Abuja', lat: 9.0579, lng: 7.4951 },
  ];
  
  const customerIds: string[] = [];
  for (const c of customers) {
    const id = uuidv4();
    const password = await bcrypt.hash('customer123', 10);
    db.prepare(`INSERT INTO users (id, name, email, password, role, city, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
      id, c.name, c.email, password, 'customer', c.city, c.lat, c.lng
    );
    customerIds.push(id);
  }

  // Products
  const productData = [
    { vendorIdx: 0, catName: 'Electronics', name: 'iPhone 15 Pro Max', desc: 'Latest Apple iPhone with A17 Pro chip, 48MP camera system', price: 850000, orig: 900000, stock: 15 },
    { vendorIdx: 0, catName: 'Electronics', name: 'Samsung Galaxy S24', desc: 'Samsung flagship with AI features and 200MP camera', price: 650000, orig: 700000, stock: 20 },
    { vendorIdx: 0, catName: 'Electronics', name: 'MacBook Air M2', desc: 'Apple MacBook Air with M2 chip, 8GB RAM, 256GB SSD', price: 1200000, orig: 1350000, stock: 8 },
    { vendorIdx: 0, catName: 'Electronics', name: 'AirPods Pro 2nd Gen', desc: 'Active noise cancellation, adaptive transparency', price: 120000, orig: 140000, stock: 30 },
    { vendorIdx: 1, catName: 'Fashion', name: 'Ankara Print Dress', desc: 'Beautiful handcrafted Ankara fabric dress, available in multiple sizes', price: 15000, orig: 18000, stock: 25 },
    { vendorIdx: 1, catName: 'Fashion', name: 'Designer Handbag', desc: 'Premium leather handbag, perfect for every occasion', price: 45000, orig: 55000, stock: 12 },
    { vendorIdx: 1, catName: 'Fashion', name: 'Men\'s Agbada Set', desc: 'Traditional Nigerian Agbada, tailor-made with quality fabric', price: 35000, orig: 40000, stock: 10 },
    { vendorIdx: 2, catName: 'Food & Groceries', name: 'Fresh Tomato (10kg)', desc: 'Farm fresh tomatoes, harvested daily', price: 8000, orig: 9000, stock: 50 },
    { vendorIdx: 2, catName: 'Food & Groceries', name: 'Rice (50kg bag)', desc: 'Premium grade long grain Nigerian rice', price: 45000, orig: 50000, stock: 100 },
    { vendorIdx: 2, catName: 'Food & Groceries', name: 'Palm Oil (25L)', desc: 'Pure red palm oil, unrefined and nutritious', price: 18000, orig: 20000, stock: 30 },
    { vendorIdx: 3, catName: 'Health & Beauty', name: 'Shea Butter (500g)', desc: '100% pure organic shea butter from Northern Nigeria', price: 5000, orig: 6000, stock: 40 },
    { vendorIdx: 3, catName: 'Health & Beauty', name: 'Argan Oil Hair Treatment', desc: 'Premium argan oil for hair and skin care', price: 8500, orig: 10000, stock: 35 },
    { vendorIdx: 4, catName: 'Sports & Fitness', name: 'Football (Size 5)', desc: 'FIFA approved professional football', price: 12000, orig: 15000, stock: 20 },
    { vendorIdx: 4, catName: 'Sports & Fitness', name: 'Gym Dumbbell Set', desc: 'Adjustable dumbbell set 5-30kg with rack', price: 85000, orig: 95000, stock: 5 },
  ];

  const catRows = db.prepare('SELECT * FROM categories').all() as any[];
  const catMap: Record<string, string> = {};
  for (const c of catRows) catMap[c.name] = c.id;

  const productIds: string[] = [];
  for (const p of productData) {
    const id = uuidv4();
    const catId = catMap[p.catName];
    db.prepare(`INSERT INTO products (id, vendor_id, category_id, name, description, price, original_price, stock, is_active, is_featured, rating, total_reviews, images) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`).run(
      id, vendorIds[p.vendorIdx], catId, p.name, p.desc, p.price, p.orig, p.stock,
      Math.random() > 0.5 ? 1 : 0,
      (3.5 + Math.random() * 1.5).toFixed(1),
      Math.floor(5 + Math.random() * 40),
      JSON.stringify([`https://picsum.photos/seed/${id}/400/400`])
    );
    productIds.push(id);
  }

  // Orders
  for (let i = 0; i < 5; i++) {
    const orderId = uuidv4();
    const statuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const vendorIdx = Math.floor(Math.random() * vendorIds.length);
    const prodIdx = Math.floor(Math.random() * productIds.length);

    db.prepare(`INSERT INTO orders (id, customer_id, vendor_id, status, total_amount, delivery_fee, delivery_address, delivery_city, payment_method, payment_status, estimated_delivery) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      orderId, customerIds[0], vendorIds[vendorIdx], status,
      productData[prodIdx % productData.length].price + 500, 500,
      '23 Allen Avenue, Ikeja', 'Lagos', 'card', 'completed',
      new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
    );

    db.prepare(`INSERT INTO order_items (id, order_id, product_id, quantity, price, product_name) VALUES (?, ?, ?, ?, ?, ?)`).run(
      uuidv4(), orderId, productIds[prodIdx % productIds.length], 1,
      productData[prodIdx % productData.length].price,
      productData[prodIdx % productData.length].name
    );
  }

  // Notifications
  const notifData = [
    { userId: customerIds[0], type: 'order_confirmed', title: 'Order Confirmed!', message: 'Your order #1001 has been confirmed and is being processed.' },
    { userId: customerIds[0], type: 'order_shipped', title: 'Order Shipped!', message: 'Your order is on its way! Expected delivery within 48 hours.' },
  ];
  
  for (const n of notifData) {
    db.prepare(`INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, ?, ?, ?)`).run(
      uuidv4(), n.userId, n.type, n.title, n.message
    );
  }

  // Advertisements
  db.prepare(`INSERT INTO advertisements (id, vendor_id, product_id, type, title, description, budget, start_date, end_date, target_city, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    uuidv4(), vendorIds[0], productIds[0], 'sponsored_product',
    'iPhone 15 Pro Max - Best Price in Lagos!',
    'Get the latest iPhone at the best price with free delivery',
    50000, new Date().toISOString(), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    'Lagos', 'active'
  );

  // Saved vendors
  db.prepare(`INSERT INTO saved_vendors (id, user_id, vendor_id) VALUES (?, ?, ?)`).run(
    uuidv4(), customerIds[0], vendorIds[0]
  );

  console.log('Database seeded successfully!');
}
