// Tipos de autenticação
export enum UserRole {
  CUSTOMER = 'customer',
  VENDOR = 'vendor',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin'
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
  email_verified: boolean;
  
  // Role-specific data
  vendor_data?: VendorData;
  admin_data?: AdminData;
  customer_data?: CustomerData;
}

export interface VendorData {
  store_id?: string;
  store_name?: string;
  commission_rate?: number;
  verified: boolean;
  business_document?: string;
}

export interface AdminData {
  permissions: string[];
  level: 'admin' | 'super_admin';
  department?: string;
}

export interface CustomerData {
  phone?: string;
  addresses: Address[];
  preferences?: CustomerPreferences;
}

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

export interface CustomerPreferences {
  newsletter: boolean;
  sms_notifications: boolean;
  language: string;
  currency: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  sessionId: string;
  iat: number;
  exp: number;
  type: 'access' | 'refresh';
}

export interface AuthSession {
  id: string;
  user_id: string;
  token: string;
  refresh_token?: string;
  ip_address: string;
  user_agent: string;
  expires_at: string;
  created_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  remember_me?: boolean;
  requested_role?: UserRole;
}

export interface LoginResponse {
  success: boolean;
  user?: User;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  available_roles?: UserRole[];
  error?: string;
}

export interface Permission {
  resource: string;
  actions: string[];
}

// Sistema de permissões por role
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.CUSTOMER]: [
    { resource: 'orders', actions: ['read', 'create'] },
    { resource: 'profile', actions: ['read', 'update'] },
    { resource: 'addresses', actions: ['read', 'create', 'update', 'delete'] },
    { resource: 'wishlists', actions: ['read', 'create', 'update', 'delete'] },
    { resource: 'reviews', actions: ['read', 'create', 'update'] }
  ],
  [UserRole.VENDOR]: [
    { resource: 'products', actions: ['read', 'create', 'update'] },
    { resource: 'orders', actions: ['read', 'update'] },
    { resource: 'analytics', actions: ['read'] },
    { resource: 'inventory', actions: ['read', 'update'] },
    { resource: 'profile', actions: ['read', 'update'] },
    { resource: 'store', actions: ['read', 'update'] }
  ],
  [UserRole.ADMIN]: [
    { resource: 'users', actions: ['read', 'create', 'update', 'delete'] },
    { resource: 'products', actions: ['read', 'create', 'update', 'delete'] },
    { resource: 'orders', actions: ['read', 'update', 'delete'] },
    { resource: 'categories', actions: ['read', 'create', 'update', 'delete'] },
    { resource: 'brands', actions: ['read', 'create', 'update', 'delete'] },
    { resource: 'analytics', actions: ['read'] },
    { resource: 'settings', actions: ['read', 'update'] },
    { resource: 'vendors', actions: ['read', 'create', 'update', 'delete'] }
  ],
  [UserRole.SUPER_ADMIN]: [
    { resource: '*', actions: ['*'] } // Acesso total
  ]
};

// Função para verificar permissões
export function hasPermission(
  userRole: UserRole,
  resource: string,
  action: string
): boolean {
  const permissions = ROLE_PERMISSIONS[userRole];
  return permissions.some(p =>
    (p.resource === '*' || p.resource === resource) &&
    (p.actions.includes('*') || p.actions.includes(action))
  );
}

// Função para verificar se usuário tem pelo menos um dos roles
export function hasAnyRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole);
}

// Função para verificar se role é hierarquicamente superior
export function isRoleHigherThan(userRole: UserRole, targetRole: UserRole): boolean {
  const hierarchy = {
    [UserRole.CUSTOMER]: 0,
    [UserRole.VENDOR]: 1,
    [UserRole.ADMIN]: 2,
    [UserRole.SUPER_ADMIN]: 3
  };
  
  return hierarchy[userRole] >= hierarchy[targetRole];
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'customer' | 'seller' | 'admin';
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role?: 'customer' | 'seller';
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
  refreshToken: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  token: string;
  refreshToken: string;
} 