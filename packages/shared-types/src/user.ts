// Tipos relacionados a usuários

export interface User {
  id: string;
  email: string;
  name?: string;
  role: 'customer' | 'seller' | 'admin';
  created_at?: string;
  updated_at?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
} 