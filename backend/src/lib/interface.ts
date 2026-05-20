import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends mongoose.Document {
  name: string;
  email: string;
  password: string;
  role: string;
  avatar?: string;
  phone?: string;
  address?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  gps_enabled: boolean;
  preferred_currency: string;
  is_verified: boolean,
  verification_token: number | null,
  verification_expires_at: Date | null,
  is_suspended: boolean;
  suspension_reason?: string;
  kyc_status: string;
  terms_accepted: boolean;
  referral_code?: string;
  referred_by?: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

export interface IVendor extends mongoose.Document {
  user_id: mongoose.Types.ObjectId;
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
  status: string;
  is_featured: boolean;
  rating: number;
  total_reviews: number;
  total_sales: number;
  ad_balance: number;
  kyc_status: string;
  ranking_level: string;
  share_token?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ICategory extends mongoose.Document {
  name: string;
  icon?: string;
  image?: string;
  created_at: Date;
  updated_at: Date;
}

export interface IProduct extends mongoose.Document {
  vendor_id: mongoose.Types.ObjectId;
  category_id?: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  price: number;
  original_price?: number;
  images: string[];
  stock: number;
  unit: string;
  is_active: boolean;
  is_featured: boolean;
  is_sponsored: boolean;
  rating: number;
  total_reviews: number;
  total_sales: number;
  tags: string[];
  verification_status: string;
  is_ranked: boolean;
  rank_expires_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface IOrder extends mongoose.Document {
  customer_id: mongoose.Types.ObjectId;
  vendor_id: mongoose.Types.ObjectId;
  status: string;
  total_amount: number;
  delivery_fee: number;
  delivery_address: string;
  delivery_city: string;
  delivery_lat?: number;
  delivery_lng?: number;
  delivery_mode: string;
  payment_method: string;
  payment_status: string;
  notes?: string;
  estimated_delivery?: Date;
  actual_delivery?: Date;
  tracking_updates: string[];
  vendor_ready_notified: boolean;
  ready_for_pickup: boolean;
  ready_for_delivery: boolean;
  ready_notified_at?: Date;
  coupon_id?: mongoose.Types.ObjectId;
  discount_amount: number;
  created_at: Date;
  updated_at: Date;
}

export interface IOrderItem extends mongoose.Document {
  order_id: mongoose.Types.ObjectId;
  product_id: mongoose.Types.ObjectId;
  quantity: number;
  price: number;
  product_name: string;
  product_image?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ICartItem extends mongoose.Document {
  user_id: mongoose.Types.ObjectId;
  product_id: mongoose.Types.ObjectId;
  quantity: number;
  created_at: Date;
  updated_at: Date;
}

export interface IReview extends mongoose.Document {
  customer_id: mongoose.Types.ObjectId;
  vendor_id: mongoose.Types.ObjectId;
  product_id?: mongoose.Types.ObjectId;
  order_id?: mongoose.Types.ObjectId;
  rating: number;
  comment?: string;
  images: string[];
  created_at: Date;
  updated_at: Date;
}

export interface INotification extends mongoose.Document {
  user_id: mongoose.Types.ObjectId;
  type: string;
  title: string;
  message: string;
  data: any;
  is_read: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface IAdvertisement extends mongoose.Document {
  vendor_id: mongoose.Types.ObjectId;
  product_id?: mongoose.Types.ObjectId;
  type: string;
  title: string;
  description?: string;
  image?: string;
  budget: number;
  spent: number;
  clicks: number;
  impressions: number;
  status: string;
  start_date: Date;
  end_date: Date;
  target_city?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ISavedVendor extends mongoose.Document {
  user_id: mongoose.Types.ObjectId;
  vendor_id: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

export interface ITransaction extends mongoose.Document {
  order_id?: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  amount: number;
  type: string;
  status: string;
  payment_method?: string;
  reference?: string;
  created_at: Date;
  updated_at: Date;
}

export interface IPayment extends mongoose.Document {
  order_id?: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  gateway: string;
  gateway_ref?: string;
  gateway_tx_id?: string;
  method: string;
  crypto_address?: string;
  crypto_currency?: string;
  crypto_amount?: number;
  crypto_rate?: number;
  giftcard_code?: string;
  giftcard_pin?: string;
  status: string;
  metadata: any;
  paid_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface IDeliveryAddress extends mongoose.Document {
  user_id: mongoose.Types.ObjectId;
  label: string;
  recipient_name: string;
  recipient_phone: string;
  address: string;
  city: string;
  state?: string;
  country: string;
  latitude?: number;
  longitude?: number;
  is_default: boolean;
  delivery_instructions?: string;
  created_at: Date;
  updated_at: Date;
}

export interface IBudgetPlan extends mongoose.Document {
  user_id: mongoose.Types.ObjectId;
  name: string;
  total_budget: number;
  spent: number;
  currency: string;
  period: string;
  start_date: Date;
  end_date?: Date;
  is_active: boolean;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface IRecurringPurchase extends mongoose.Document {
  user_id: mongoose.Types.ObjectId;
  budget_plan_id?: mongoose.Types.ObjectId;
  product_id: mongoose.Types.ObjectId;
  quantity: number;
  frequency: string;
  next_order_date: Date;
  last_ordered_at?: Date;
  delivery_address_id?: mongoose.Types.ObjectId;
  is_active: boolean;
  auto_order: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ILamaInsight extends mongoose.Document {
  type: string;
  target_role: string;
  target_user_id?: string;
  title: string;
  body: string;
  data: any;
  is_read: boolean;
  expires_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface ICoupon extends mongoose.Document {
  code: string;
  type: string;
  value: number;
  min_order: number;
  max_uses: number;
  uses_count: number;
  is_active: boolean;
  expires_at?: Date;
  created_by?: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
}
