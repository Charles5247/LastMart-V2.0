import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import getDB, { Users, Categories, Vendors, Products, Orders } from './db';
import {userRoles} from './types'
import mongoose from 'mongoose';





export async function seedDatabase() {
  const db = getDB();

  const existing = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (existing.count > 0) return;

  console.log('Seeding database...');

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

  const adminId = uuidv4();
  const adminPassword = await bcrypt.hash('admin123', 10);
  db.prepare(`INSERT INTO users (id, name, email, password, role, city) VALUES (?, ?, ?, ?, ?, ?)`).run(
    adminId, 'Admin User', 'admin@lastmart.com', adminPassword, 'admin', 'Lagos'
  );

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
      `${v.store} - Your trusted local ${v.cat.toLowerCase()} provider.`,
      v.cat, v.city, v.lat, v.lng, 'approved', Math.random() > 0.5 ? 1 : 0,
      (3.5 + Math.random() * 1.5).toFixed(1), Math.floor(20 + Math.random() * 80)
    );
    vendorIds.push(vendorId);
  }

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

  const productData = [
    { vendorIdx: 0, catName: 'Electronics', name: 'iPhone 15 Pro Max', desc: 'Latest Apple iPhone with A17 Pro chip', price: 850000, orig: 900000, stock: 15 },
    { vendorIdx: 0, catName: 'Electronics', name: 'Samsung Galaxy S24', desc: 'Samsung flagship with AI features', price: 650000, orig: 700000, stock: 20 },
    { vendorIdx: 0, catName: 'Electronics', name: 'MacBook Air M2', desc: 'Apple MacBook Air with M2 chip', price: 1200000, orig: 1350000, stock: 8 },
    { vendorIdx: 0, catName: 'Electronics', name: 'AirPods Pro 2nd Gen', desc: 'Active noise cancellation', price: 120000, orig: 140000, stock: 30 },
    { vendorIdx: 1, catName: 'Fashion', name: 'Ankara Print Dress', desc: 'Beautiful handcrafted Ankara fabric dress', price: 15000, orig: 18000, stock: 25 },
    { vendorIdx: 1, catName: 'Fashion', name: 'Designer Handbag', desc: 'Premium leather handbag', price: 45000, orig: 55000, stock: 12 },
    { vendorIdx: 1, catName: 'Fashion', name: "Men's Agbada Set", desc: 'Traditional Nigerian Agbada', price: 35000, orig: 40000, stock: 10 },
    { vendorIdx: 2, catName: 'Food & Groceries', name: 'Fresh Tomato (10kg)', desc: 'Farm fresh tomatoes', price: 8000, orig: 9000, stock: 50 },
    { vendorIdx: 2, catName: 'Food & Groceries', name: 'Rice (50kg bag)', desc: 'Premium long grain Nigerian rice', price: 45000, orig: 50000, stock: 100 },
    { vendorIdx: 2, catName: 'Food & Groceries', name: 'Palm Oil (25L)', desc: 'Pure red palm oil', price: 18000, orig: 20000, stock: 30 },
    { vendorIdx: 3, catName: 'Health & Beauty', name: 'Shea Butter (500g)', desc: '100% pure organic shea butter', price: 5000, orig: 6000, stock: 40 },
    { vendorIdx: 3, catName: 'Health & Beauty', name: 'Argan Oil Hair Treatment', desc: 'Premium argan oil', price: 8500, orig: 10000, stock: 35 },
    { vendorIdx: 4, catName: 'Sports & Fitness', name: 'Football (Size 5)', desc: 'FIFA approved professional football', price: 12000, orig: 15000, stock: 20 },
    { vendorIdx: 4, catName: 'Sports & Fitness', name: 'Gym Dumbbell Set', desc: 'Adjustable dumbbell set 5-30kg', price: 85000, orig: 95000, stock: 5 },
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

  const notifData = [
    { userId: customerIds[0], type: 'order_confirmed', title: 'Order Confirmed!', message: 'Your order #1001 has been confirmed.' },
    { userId: customerIds[0], type: 'order_shipped', title: 'Order Shipped!', message: 'Your order is on its way!' },
  ];
  for (const n of notifData) {
    db.prepare(`INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, ?, ?, ?)`).run(
      uuidv4(), n.userId, n.type, n.title, n.message
    );
  }

  db.prepare(`INSERT INTO advertisements (id, vendor_id, product_id, type, title, description, budget, start_date, end_date, target_city, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    uuidv4(), vendorIds[0], productIds[0], 'sponsored_product',
    'iPhone 15 Pro Max - Best Price in Lagos!',
    'Get the latest iPhone at the best price',
    50000, new Date().toISOString(), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    'Lagos', 'active'
  );

  db.prepare(`INSERT INTO saved_vendors (id, user_id, vendor_id) VALUES (?, ?, ?)`).run(
    uuidv4(), customerIds[0], vendorIds[0]
  );

  console.log('✅ Database seeded successfully!');
}

export async function seedNewDatabase() {
  const usersCount: number = (await Users.find({})).length;
  if (usersCount > 0) return;

  console.log('Seeding database...');

  // Creating product categories

  const categories = [
    { name: 'Electronics',  },
    { name: 'Fashion',  },
    { name: 'Food & Groceries',  },
    { name: 'Home & Living',  },
    { name: 'Health & Beauty',  },
    { name: 'Sports & Fitness',  },
    { name: 'Books & Stationery',  },
    { name: 'Toys & Games',  },
  ];

  for (const cat of categories) {
    const category = new Categories({ name: cat.name });
    await category.save();
  }

  // Creating admin

  const admin = new Users({
    name: 'Admin User',
    email: 'admin@lastmart.com',
    password: 'admin123',
    role: userRoles.ADMIN,
    city: 'Lagos',
  })
  await admin.save();

  // Creating vendors

  const vendors = [
    { name: 'Tunde Adeyemi', email: 'tunde@lastmart.com', city: 'Lagos', store: 'TechHub Lagos', cat: 'Electronics', lat: 6.5244, lng: 3.3792 },
    { name: 'Amaka Okonkwo', email: 'amaka@lastmart.com', city: 'Lagos', store: 'Amaka Fashion House', cat: 'Fashion', lat: 6.4698, lng: 3.5852 }, 
    { name: 'Emeka Nwosu', email: 'emeka@lastmart.com', city: 'Abuja', store: 'Emeka Groceries', cat: 'Food & Groceries', lat: 9.0579, lng: 7.4951 },
    { name: 'Fatima Musa', email: 'fatima@lastmart.com', city: 'Kano', store: 'Fatima Beauty Store', cat: 'Health & Beauty', lat: 12.0022, lng: 8.5920 },
    { name: 'Chidi Obi', email: 'chidi@lastmart.com', city: 'Lagos', store: 'Chidi Sports World', cat: 'Sports & Fitness', lat: 6.5227, lng: 3.6218 },
  ];
  const vendorsPassword = 'vendor123';

  for (const v of vendors) {
    const user = new Users({
      name: v.name,
      email: v.email,
      password: vendorsPassword,
      role: userRoles.VENDOR,
      city: v.city,
      latitude: v.lat,
      longitude: v.lng,
    })
    await user.save();

    const vendor = new Vendors({
      user_id: user._id,
      store_name: v.store,
      description: `${v.store} - Your trusted local ${v.cat.toLowerCase()} provider.`,
      category: v.cat,
      city: v.city,
      latitude: v.lat,
      longitude: v.lng,
      status: 'approved',
      is_featured: Math.random() > 0.5 ? true : false,
      rating: (3.5 + Math.random() * 1.5).toFixed(1), 
      total_reviews: Math.floor(20 + Math.random() * 80)
    })
    await vendor.save();
  }

  // Creating customers

  const customers = [
    { name: 'Bola Adewale', email: 'bola@example.com', city: 'Lagos', lat: 6.5244, lng: 3.3792 },
    { name: 'Ngozi Eze', email: 'ngozi@example.com', city: 'Abuja', lat: 9.0579, lng: 7.4951 },
  ];
  const customerPassword = 'customer123';

  for (const c of customers) {
    const customer = new Users({
      name: c.name,
      email: c.email,
      password: customerPassword,
      role: userRoles.CUSTOMER,
      city: c.city,
      latitude: c.lat,
      longitude: c.lng,      
    })
    await customer.save();
  }

  // Creating products

  const productData = [
    { vendorIdx: 0, catName: 'Electronics', name: 'iPhone 15 Pro Max', desc: 'Latest Apple iPhone with A17 Pro chip', price: 850000, orig: 900000, stock: 15 },
    { vendorIdx: 0, catName: 'Electronics', name: 'Samsung Galaxy S24', desc: 'Samsung flagship with AI features', price: 650000, orig: 700000, stock: 20 },
    { vendorIdx: 0, catName: 'Electronics', name: 'MacBook Air M2', desc: 'Apple MacBook Air with M2 chip', price: 1200000, orig: 1350000, stock: 8 },
    { vendorIdx: 0, catName: 'Electronics', name: 'AirPods Pro 2nd Gen', desc: 'Active noise cancellation', price: 120000, orig: 140000, stock: 30 },
    { vendorIdx: 1, catName: 'Fashion', name: 'Ankara Print Dress', desc: 'Beautiful handcrafted Ankara fabric dress', price: 15000, orig: 18000, stock: 25 },
    { vendorIdx: 1, catName: 'Fashion', name: 'Designer Handbag', desc: 'Premium leather handbag', price: 45000, orig: 55000, stock: 12 },
    { vendorIdx: 1, catName: 'Fashion', name: "Men's Agbada Set", desc: 'Traditional Nigerian Agbada', price: 35000, orig: 40000, stock: 10 },
    { vendorIdx: 2, catName: 'Food & Groceries', name: 'Fresh Tomato (10kg)', desc: 'Farm fresh tomatoes', price: 8000, orig: 9000, stock: 50 },
    { vendorIdx: 2, catName: 'Food & Groceries', name: 'Rice (50kg bag)', desc: 'Premium long grain Nigerian rice', price: 45000, orig: 50000, stock: 100 },
    { vendorIdx: 2, catName: 'Food & Groceries', name: 'Palm Oil (25L)', desc: 'Pure red palm oil', price: 18000, orig: 20000, stock: 30 },
    { vendorIdx: 3, catName: 'Health & Beauty', name: 'Shea Butter (500g)', desc: '100% pure organic shea butter', price: 5000, orig: 6000, stock: 40 },
    { vendorIdx: 3, catName: 'Health & Beauty', name: 'Argan Oil Hair Treatment', desc: 'Premium argan oil', price: 8500, orig: 10000, stock: 35 },
    { vendorIdx: 4, catName: 'Sports & Fitness', name: 'Football (Size 5)', desc: 'FIFA approved professional football', price: 12000, orig: 15000, stock: 20 },
    { vendorIdx: 4, catName: 'Sports & Fitness', name: 'Gym Dumbbell Set', desc: 'Adjustable dumbbell set 5-30kg', price: 85000, orig: 95000, stock: 5 },
  ];


  const savedCategories = await Categories.find({}) as any[];
  console.log(savedCategories);
  const catMap: Record<string, string> = {};
  for (const c of savedCategories) {
    const categoryName = typeof c.name === 'string' ? c.name : String(c.name);
    const categoryId = typeof c._id === 'string' ? c._id : String(c._id);
    catMap[categoryName] = categoryId;
  }

  const savedVendors = await Vendors.find({}) as any[];
  const vendorMap: Record<string, string> = {};
  for (const v of savedVendors) {
    const categoryName = typeof v.category === 'string' ? v.category : String(v.category);
    const vendorId = typeof v._id === 'string' ? v._id : String(v._id);
    vendorMap[categoryName] = vendorId;
  }

  for (const p of productData) {
    const id = uuidv4();
    const product = new Products({
      vendor_id: vendorMap[p.catName],
      category_id: catMap[p.catName],
      name: p.name,
      description: p.desc,
      price: p.price,
      original_price: p.orig,
      stock: p.stock,
      is_active: Math.random() > 0.5 ? true : false,
      is_featured: Math.random() > 0.5 ? true : false,
      rating: (3.5 + Math.random() * 1.5).toFixed(1),
      total_reviews: Math.floor(5 + Math.random() * 40),
      images: JSON.stringify([`https://picsum.photos/seed/${id}/400/400`])
    })
  }

  // Creating orders

  for (let i = 0; i < 5; i++) {
    const statuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    // const vendorIdx = Math.floor(Math.random() * savedVendors.length);
    // const prodIdx = Math.floor(Math.random() * productIds.length);

    // db.prepare(`INSERT INTO orders (id, customer_id, vendor_id, status, total_amount, delivery_fee, delivery_address, delivery_city, payment_method, payment_status, estimated_delivery) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    //   orderId, customerIds[0], vendorIds[vendorIdx], status,
    //   productData[prodIdx % productData.length].price + 500, 500,
    //   '23 Allen Avenue, Ikeja', 'Lagos', 'card', 'completed',
    //   new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
    // );
    // db.prepare(`INSERT INTO order_items (id, order_id, product_id, quantity, price, product_name) VALUES (?, ?, ?, ?, ?, ?)`).run(
    //   uuidv4(), orderId, productIds[prodIdx % productIds.length], 1,
    //   productData[prodIdx % productData.length].price,
    //   productData[prodIdx % productData.length].name
    // );


    // const order = new Orders({
    //   customer_id: 
    // })
  }

}

// Run if called directly
if (require.main === module) {
  mongoose.connect(process.env.MONGODB_LOCAL_URL || 'mongodb://localhost:27017/lastmart',{
    serverSelectionTimeoutMS: 20000,
    socketTimeoutMS: 30000
  })
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err));

  seedNewDatabase().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
}
