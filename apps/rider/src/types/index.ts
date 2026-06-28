export interface User {
  id:    string;
  name:  string;
  email: string;
  role:  'rider';
  phone?: string;
}

export interface Delivery {
  id:              string;
  order_number:    string;
  customer_name:   string;
  customer_phone?: string;
  pickup_address:  string;
  delivery_address: string;
  total:           number;
  status:          string;
  distance?:       number;
  created_at:      string;
  accepted_at?:    string;
  delivered_at?:   string;
}

export interface Earnings {
  today:        number;
  this_week:    number;
  this_month:   number;
  total:        number;
  pending:      number;
  deliveries:   number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?:   T;
  message?: string;
  pagination?: { page: number; totalPages: number; total: number };
}
