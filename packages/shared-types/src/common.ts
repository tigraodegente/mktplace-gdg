// Common Types - Tipos base usados em todo o sistema

export interface Result<T, E = Error> {
  success: boolean;
  data?: T;
  error?: E;
}

export interface ApiResponse<T> {
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
    timestamp?: string;
  };
}

export interface PaginationParams {
  page: number;
  limit: number;
  offset?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Status genéricos
export type Status = 'active' | 'inactive' | 'pending' | 'cancelled' | 'completed';

// Timestamps padrão
export interface TimestampFields {
  created_at: string;
  updated_at: string;
} 