// API Response Types - Padronização para todas as APIs

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
  field?: string; // Para erros de validação
}

export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  hasNext?: boolean;
  hasPrev?: boolean;
  timestamp?: string;
  source?: string;
}

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: ApiMeta & {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Search & Filters
export interface SearchParams {
  query?: string;
  filters?: Record<string, any>;
  sort?: string;
  order?: 'asc' | 'desc';
}

// Product API Types
export interface Product {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description?: string;
  short_description?: string;
  price: number;
  original_price?: number;
  cost?: number;
  currency: string;
  quantity: number;
  stock_location?: string;
  track_inventory: boolean;
  allow_backorder: boolean;
  
  // Dimensions
  weight?: number;
  height?: number;
  width?: number;
  length?: number;
  
  // Categorization
  category_id?: string;
  brand_id?: string;
  seller_id?: string;
  
  // Status
  status: 'draft' | 'published' | 'archived';
  is_active: boolean;
  featured: boolean;
  condition: 'new' | 'used' | 'refurbished';
  
  // SEO
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string[];
  
  // Additional data
  tags?: string[];
  attributes?: Record<string, any>;
  specifications?: Record<string, any>;
  images?: ProductImage[];
  variants?: ProductVariant[];
  
  // Analytics
  view_count: number;
  sales_count: number;
  rating_average?: number;
  rating_count: number;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  published_at?: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  alt?: string;
  position: number;
  is_primary: boolean;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  sku: string;
  price?: number;
  quantity: number;
  attributes: Record<string, string>;
  image_url?: string;
}

// Category API Types
export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parent_id?: string;
  image_url?: string;
  is_active: boolean;
  sort_order: number;
  seo_title?: string;
  seo_description?: string;
  created_at: string;
  updated_at: string;
  
  // Computed fields
  products_count?: number;
  children?: Category[];
  parent?: Category;
}

// Brand API Types
export interface Brand {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  website_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  
  // Computed fields
  products_count?: number;
}

// Order API Types
export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  fulfillment_status: FulfillmentStatus;
  
  // Amounts
  subtotal: number;
  tax_amount: number;
  shipping_amount: number;
  discount_amount: number;
  total: number;
  currency: string;
  
  // Customer info
  customer_email: string;
  customer_phone?: string;
  
  // Addresses
  billing_address: Address;
  shipping_address: Address;
  
  // Items
  items: OrderItem[];
  
  // Shipping
  shipping_method?: string;
  tracking_number?: string;
  estimated_delivery?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  shipped_at?: string;
  delivered_at?: string;
  
  // Notes
  customer_notes?: string;
  admin_notes?: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  
  // Product snapshot (at time of order)
  product_name: string;
  product_sku: string;
  product_image?: string;
  variant_attributes?: Record<string, string>;
}

export type OrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export type PaymentStatus = 
  | 'pending'
  | 'paid'
  | 'partially_paid'
  | 'failed'
  | 'refunded'
  | 'partially_refunded';

export type FulfillmentStatus = 
  | 'unfulfilled'
  | 'partially_fulfilled'
  | 'fulfilled'
  | 'shipped'
  | 'delivered';

// Analytics Types
export interface Analytics {
  period: string;
  metrics: AnalyticsMetrics;
  charts: AnalyticsChart[];
  comparisons?: AnalyticsComparison[];
}

export interface AnalyticsMetrics {
  revenue: number;
  orders: number;
  customers: number;
  products_sold: number;
  average_order_value: number;
  conversion_rate: number;
  growth_rate?: number;
}

export interface AnalyticsChart {
  type: 'line' | 'bar' | 'pie' | 'area';
  title: string;
  data: AnalyticsDataPoint[];
  labels?: string[];
}

export interface AnalyticsDataPoint {
  label: string;
  value: number;
  date?: string;
  percentage?: number;
}

export interface AnalyticsComparison {
  metric: string;
  current: number;
  previous: number;
  change: number;
  change_percentage: number;
}

// File Upload Types
export interface FileUpload {
  id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  url: string;
  path: string;
  uploaded_by: string;
  created_at: string;
}

// Notification Types
export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  is_read: boolean;
  created_at: string;
  read_at?: string;
}

export type NotificationType = 
  | 'order_created'
  | 'order_updated'
  | 'payment_received'
  | 'product_low_stock'
  | 'review_received'
  | 'system_announcement'
  | 'user_registered';

// Address (from auth.ts)
export interface Address {
  id: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipcode: string;
  country: string;
  is_default: boolean;
}

// Common validation schemas
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface BulkOperation<T> {
  success: boolean;
  processed: number;
  failed: number;
  errors: ValidationError[];
  results: T[];
} 