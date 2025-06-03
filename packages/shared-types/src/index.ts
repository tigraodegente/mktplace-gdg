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

// Tipos básicos existentes (manter compatibilidade)
export * from './user';
export * from './product';
export * from './cart';
export * from './address';

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

// Integrations
export * from './integrations'; 