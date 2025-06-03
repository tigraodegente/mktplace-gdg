export type UserRole = 'customer' | 'admin' | 'vendor';
export type UserStatus = 'active' | 'inactive' | 'pending' | 'suspended';

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  phone?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  lastLoginIp?: string;
  
  // Permissões
  permissions: string[];
  customPermissions: string[];
  
  // Two Factor
  twoFactorEnabled: boolean;
  
  // Dados específicos por role
  vendor?: VendorData;
  admin?: AdminData;
  customer?: CustomerData;
}

export interface VendorData {
  sellerId: string;
  companyName: string;
  slug: string;
  logoUrl?: string;
  bannerUrl?: string;
  description?: string;
  rating: number;
  totalSales: number;
  commission: number;
  isVerified: boolean;
  isActive: boolean;
}

export interface AdminData {
  level: 'super' | 'manager' | 'support';
  department?: string;
  canCreateAdmins: boolean;
  canManagePermissions: boolean;
}

export interface CustomerData {
  phone?: string;
  addresses: string[]; // IDs dos endereços
  totalOrders: number;
  totalSpent: number;
  loyaltyPoints: number;
}

// Todas as permissões disponíveis no sistema
export type SystemPermission = 
  // Usuários
  | 'users.read' | 'users.write' | 'users.delete' 
  | 'users.manage_permissions' | 'users.create_admin'
  
  // Produtos
  | 'products.read' | 'products.write' | 'products.delete'
  | 'products.approve' | 'products.bulk_edit'
  
  // Pedidos
  | 'orders.read' | 'orders.write' | 'orders.cancel'
  | 'orders.fulfill' | 'orders.refund'
  
  // Vendedores
  | 'sellers.read' | 'sellers.write' | 'sellers.approve'
  | 'sellers.suspend' | 'sellers.commission'
  
  // Catálogo
  | 'categories.read' | 'categories.write'
  | 'brands.read' | 'brands.write'
  
  // Promoções
  | 'coupons.read' | 'coupons.write' | 'coupons.delete'
  
  // Relatórios
  | 'reports.read' | 'reports.export' | 'reports.financial'
  
  // Sistema
  | 'settings.read' | 'settings.write'
  | 'integrations.read' | 'integrations.write'
  
  // Financeiro
  | 'financial.read' | 'financial.write' | 'financial.payouts';

export interface PermissionCategory {
  key: string;
  name: string;
  description: string;
  permissions: Permission[];
}

export interface AuthSession {
  user: AuthUser;
  token: string;
  expiresAt: string;
  permissions: string[];
}

export interface AuthLoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthLoginResponse {
  success: boolean;
  session?: AuthSession;
  user?: AuthUser;
  redirectTo?: string;
  error?: string;
  requiresTwoFactor?: boolean;
  twoFactorToken?: string;
}

export interface TwoFactorRequest {
  token: string;
  code: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface UserCreateRequest {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
  status?: UserStatus;
  customPermissions?: string[];
  sendWelcomeEmail?: boolean;
  
  // Dados específicos por role
  vendorData?: Partial<VendorData>;
  adminData?: Partial<AdminData>;
  customerData?: Partial<CustomerData>;
}

export interface UserUpdateRequest {
  id: string;
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  phone?: string;
  status?: UserStatus;
  customPermissions?: string[];
  emailVerified?: boolean;
  
  // Dados específicos por role
  vendorData?: Partial<VendorData>;
  adminData?: Partial<AdminData>;
  customerData?: Partial<CustomerData>;
}

export interface UserListFilters {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  emailVerified?: boolean;
  twoFactorEnabled?: boolean;
  createdAfter?: string;
  createdBefore?: string;
  lastLoginAfter?: string;
  lastLoginBefore?: string;
}

export interface UserListResponse {
  users: AuthUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: {
    total: number;
    byRole: Record<UserRole, number>;
    byStatus: Record<UserStatus, number>;
    emailVerified: number;
    twoFactorEnabled: number;
    recentLogins: number;
  };
}

export interface PermissionCheckRequest {
  userId: string;
  permission: SystemPermission;
}

export interface PermissionCheckResponse {
  hasPermission: boolean;
  reason?: 'role' | 'custom' | 'none';
}

export interface BulkUserAction {
  userIds: string[];
  action: 'activate' | 'deactivate' | 'suspend' | 'delete' | 'verify_email' | 'reset_2fa';
  reason?: string;
}

export interface AuthContext {
  user: AuthUser | null;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: AuthLoginRequest) => Promise<AuthLoginResponse>;
  loginWithTwoFactor: (request: TwoFactorRequest) => Promise<AuthLoginResponse>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  hasPermission: (permission: SystemPermission) => boolean;
  hasAnyPermission: (permissions: SystemPermission[]) => boolean;
  hasAllPermissions: (permissions: SystemPermission[]) => boolean;
}

// Utility types para componentes
export interface RoleConfig {
  role: UserRole;
  label: string;
  description: string;
  color: string;
  icon: string;
  defaultPermissions: SystemPermission[];
}

export interface StatusConfig {
  status: UserStatus;
  label: string;
  description: string;
  color: string;
  icon: string;
  canLogin: boolean;
}

// Constantes exportadas
export const USER_ROLES: RoleConfig[] = [
  {
    role: 'customer',
    label: 'Cliente',
    description: 'Usuário que compra na plataforma',
    color: 'blue',
    icon: '👤',
    defaultPermissions: []
  },
  {
    role: 'vendor',
    label: 'Vendedor',
    description: 'Usuário que vende produtos na plataforma',
    color: 'orange',
    icon: '🏪',
    defaultPermissions: ['products.read', 'products.write', 'orders.read', 'orders.fulfill']
  },
  {
    role: 'admin',
    label: 'Administrador',
    description: 'Usuário com acesso administrativo',
    color: 'red',
    icon: '👨‍💼',
    defaultPermissions: [] // Admins têm todas as permissões
  }
];

export const USER_STATUSES: StatusConfig[] = [
  {
    status: 'active',
    label: 'Ativo',
    description: 'Usuário ativo e pode fazer login',
    color: 'green',
    icon: '✅',
    canLogin: true
  },
  {
    status: 'inactive',
    label: 'Inativo',
    description: 'Usuário inativo, não pode fazer login',
    color: 'gray',
    icon: '⭕',
    canLogin: false
  },
  {
    status: 'pending',
    label: 'Pendente',
    description: 'Aguardando verificação de email',
    color: 'yellow',
    icon: '⏳',
    canLogin: false
  },
  {
    status: 'suspended',
    label: 'Suspenso',
    description: 'Usuário suspenso por violação',
    color: 'red',
    icon: '🚫',
    canLogin: false
  }
]; 