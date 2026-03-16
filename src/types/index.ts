export interface User {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'vendor' | 'admin';
  avatar?: string;
  phone?: string;
  address?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
}

export interface Vendor {
  id: string;
  user_id: string;
  store_name: string;
  description?: string;
  logo?: string;
  banner?: string;
  category?: string;
  city: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  status: 'pending' | 'approved' | 'suspended';
  is_featured: number;
  rating: number;
  total_reviews: number;
  total_sales: number;
  ad_balance: number;
  created_at: string;
  distance?: number;
  user_name?: string;
  user_email?: string;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  image?: string;
}

export interface Product {
  id: string;
  vendor_id: string;
  category_id?: string;
  name: string;
  description?: string;
  price: number;
  original_price?: number;
  images: string[];
  stock: number;
  unit: string;
  is_active: number;
  is_featured: number;
  is_sponsored: number;
  rating: number;
  total_reviews: number;
  total_sales: number;
  tags: string[];
  created_at: string;
  vendor_name?: string;
  vendor_city?: string;
  vendor_status?: string;
  category_name?: string;
}

export interface Order {
  id: string;
  customer_id: string;
  vendor_id: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total_amount: number;
  delivery_fee: number;
  delivery_address: string;
  delivery_city: string;
  payment_method: string;
  payment_status: string;
  notes?: string;
  estimated_delivery?: string;
  actual_delivery?: string;
  tracking_updates: TrackingUpdate[];
  created_at: string;
  items?: OrderItem[];
  customer_name?: string;
  vendor_name?: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price: number;
  product_name: string;
  product_image?: string;
}

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  product?: Product;
}

export interface Review {
  id: string;
  customer_id: string;
  vendor_id: string;
  product_id?: string;
  order_id?: string;
  rating: number;
  comment?: string;
  images: string[];
  created_at: string;
  customer_name?: string;
  customer_avatar?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, any>;
  is_read: number;
  created_at: string;
}

export interface Advertisement {
  id: string;
  vendor_id: string;
  product_id?: string;
  type: 'sponsored_product' | 'featured_vendor' | 'banner';
  title: string;
  description?: string;
  image?: string;
  budget: number;
  spent: number;
  clicks: number;
  impressions: number;
  status: 'active' | 'paused' | 'completed' | 'pending';
  start_date: string;
  end_date: string;
  target_city?: string;
  created_at: string;
  vendor_name?: string;
  product_name?: string;
}

export interface TrackingUpdate {
  status: string;
  message: string;
  timestamp: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
