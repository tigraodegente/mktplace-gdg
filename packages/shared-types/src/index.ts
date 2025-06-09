// ========================================
// SHARED TYPES - MARKETPLACE GDG
// Tipos centralizados para todo o sistema
// ========================================

// Auth & Users
export * from './auth';

// API Responses  
export * from './api';

// Page Builder
export * from './page-builder';

// Legacy types
export type { CartItem, CartSummary } from './cart';

// Tipos de resposta da API
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    page?: number;
    total?: number;
    limit?: number;
  };
}

// Tipos de paginação
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

// Tipos de filtros genéricos
export interface FilterParams {
  search?: string;
  [key: string]: any;
}

export * from './page-builder'; 