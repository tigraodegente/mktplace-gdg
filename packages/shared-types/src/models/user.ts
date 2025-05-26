export interface User {
  id: string;
  email: string;
  name: string;
  cpf?: string;
  phone?: string;
  role: 'customer' | 'seller' | 'admin';
  is_active: boolean;
  email_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UserCreateInput {
  email: string;
  name: string;
  password: string;
  cpf?: string;
  phone?: string;
  role?: 'customer' | 'seller' | 'admin';
}

export interface UserUpdateInput {
  name?: string;
  cpf?: string;
  phone?: string;
  email?: string;
}

export interface UserLoginInput {
  email: string;
  password: string;
}

export interface UserSession {
  user: User;
  token: string;
  refreshToken: string;
  expiresAt: Date;
} 