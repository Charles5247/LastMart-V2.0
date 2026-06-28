export interface User {
  id: string;
  name: string;
  email: string;
  role: 'vendor';
  avatar?: string;
  phone?: string;
  address?: string;
  city?: string;
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
  available_balance?: number;
  escrow_balance?: number;
  subscription_tier?: string;
  created_at: string;
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
  rating: number;
  total_reviews: number;
  total_sales: number;
  tags: string[];
  created_at: string;
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
  created_at: string;
  customer_name?: string;
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
