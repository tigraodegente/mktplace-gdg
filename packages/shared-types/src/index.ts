// ========================================
// SHARED TYPES - MARKETPLACE GDG
// Tipos centralizados para todo o sistema
// ========================================

// Auth & Users - Sistema completo
export * from './auth';

// API Responses & Common Types
export * from './api';

// Legacy types - remover gradualmente
// Manter apenas types específicos não duplicados
export type { CartItem, CartSummary } from './cart';
export type { IntegrationConfig } from './integrations';

// Auth types (sistema unificado)
export type { 
  AuthUser, 
  UserRole, 
  UserStatus,
  Permission,
  PermissionCategory,
  SystemPermission,
  AuthLoginRequest, 
  AuthLoginResponse,
  TwoFactorRequest,
  PasswordResetRequest,
  PasswordResetConfirm,
  UserCreateRequest,
  UserUpdateRequest,
  UserListFilters,
  UserListResponse,
  PermissionCheckRequest,
  PermissionCheckResponse,
  BulkUserAction,
  AuthSession, 
  AuthContext,
  VendorData,
  AdminData,
  CustomerData,
  RoleConfig,
  StatusConfig
} from './auth/index';

export { USER_ROLES, USER_STATUSES } from './auth/index';

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