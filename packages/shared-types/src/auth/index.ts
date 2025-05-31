export type UserRole = 'customer' | 'admin' | 'vendor';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  roles: UserRole[];
  status: 'active' | 'inactive' | 'pending';
  createdAt: string;
  updatedAt: string;
  
  // Dados específicos por role (sempre presentes se tiver o role)
  vendor?: VendorData;
  admin?: AdminData;
  customer?: CustomerData;
}

export interface VendorData {
  storeId: string;
  storeName: string;
  commission: number;
  verified: boolean;
}

export interface AdminData {
  permissions: AdminPermission[];
  level: 'super' | 'manager' | 'support';
}

export interface CustomerData {
  phone?: string;
  addresses: string[]; // IDs dos endereços
}

export type AdminPermission = 
  | 'users.read' | 'users.write' | 'users.delete'
  | 'products.read' | 'products.write' | 'products.delete'
  | 'orders.read' | 'orders.write' | 'orders.delete'
  | 'vendors.read' | 'vendors.write' | 'vendors.delete'
  | 'reports.read' | 'reports.export'
  | 'settings.read' | 'settings.write';

export interface AuthSession {
  user: AuthUser;
  token: string;
  expiresAt: string;
  currentRole: UserRole;
  availableApps: ('store' | 'admin' | 'vendor')[];
}

export interface AuthLoginRequest {
  email: string;
  password: string;
  requestedRole?: UserRole;
}

export interface AuthLoginResponse {
  success: boolean;
  session?: AuthSession;
  redirectTo?: string;
  error?: string;
  availableRoles?: UserRole[];
}

export interface RoleSwitchRequest {
  newRole: UserRole;
  targetApp: 'store' | 'admin' | 'vendor';
}

export interface AuthContext {
  user: AuthUser | null;
  currentRole: UserRole | null;
  availableRoles: UserRole[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: AuthLoginRequest) => Promise<AuthLoginResponse>;
  logout: () => Promise<void>;
  switchRole: (newRole: UserRole) => Promise<boolean>;
  refresh: () => Promise<void>;
} 