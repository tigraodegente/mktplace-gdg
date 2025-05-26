export interface Seller {
  id: string;
  user_id: string;
  store_name: string;
  store_slug: string;
  description?: string;
  logo_url?: string;
  banner_url?: string;
  cnpj?: string;
  company_name?: string;
  phone: string;
  email: string;
  status: 'pending' | 'active' | 'suspended' | 'banned';
  commission_rate: number;
  rating?: number;
  total_sales: number;
  created_at: Date;
  updated_at: Date;
}

export interface SellerCreateInput {
  user_id: string;
  store_name: string;
  description?: string;
  logo_url?: string;
  banner_url?: string;
  cnpj?: string;
  company_name?: string;
  phone: string;
  email: string;
  commission_rate?: number;
}

export interface SellerUpdateInput {
  store_name?: string;
  description?: string;
  logo_url?: string;
  banner_url?: string;
  cnpj?: string;
  company_name?: string;
  phone?: string;
  email?: string;
  status?: 'pending' | 'active' | 'suspended' | 'banned';
  commission_rate?: number;
}

export interface SellerStats {
  total_products: number;
  total_orders: number;
  total_revenue: number;
  pending_orders: number;
  average_rating: number;
  total_reviews: number;
} 