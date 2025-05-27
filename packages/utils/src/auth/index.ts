// Sistema de autenticação para o marketplace
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { UserRole } from '@mktplace-gdg/xata-client';

// Tipos para autenticação
export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  sellerId?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Configurações
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';
const SALT_ROUNDS = 10;

/**
 * Hash de senha usando bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verifica senha contra hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Gera tokens JWT
 */
export function generateTokens(payload: JWTPayload): AuthTokens {
  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  const refreshToken = jwt.sign(
    { ...payload, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );

  // Calcula tempo de expiração em segundos
  const expiresIn = jwt.decode(accessToken) as any;
  const now = Math.floor(Date.now() / 1000);
  const expiresInSeconds = expiresIn.exp - now;

  return {
    accessToken,
    refreshToken,
    expiresIn: expiresInSeconds,
  };
}

/**
 * Verifica e decodifica token JWT
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload & { type?: string };
    
    // Remove campos extras do JWT
    const { iat, exp, type, ...payload } = decoded as any;
    
    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Verifica se o token é válido e não expirou
 */
export function isTokenValid(token: string): boolean {
  try {
    jwt.verify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extrai token do header Authorization
 */
export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
}

/**
 * Gera um código aleatório para verificação
 */
export function generateVerificationCode(length = 6): string {
  const chars = '0123456789';
  let code = '';
  
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return code;
}

/**
 * Gera um token seguro para reset de senha
 */
export function generateResetToken(): string {
  const buffer = new Uint8Array(32);
  crypto.getRandomValues(buffer);
  return Array.from(buffer, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Valida formato de email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida força da senha
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('A senha deve ter pelo menos 8 caracteres');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('A senha deve conter pelo menos uma letra maiúscula');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('A senha deve conter pelo menos uma letra minúscula');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('A senha deve conter pelo menos um número');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('A senha deve conter pelo menos um caractere especial');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitiza entrada do usuário
 */
export function sanitizeInput(input: string): string {
  return input.trim().toLowerCase();
}

/**
 * Verifica se o usuário tem permissão para acessar recurso
 */
export function hasPermission(userRole: UserRole, requiredRoles: UserRole[]): boolean {
  return requiredRoles.includes(userRole);
}

/**
 * Middleware helper para verificar autenticação
 */
export interface AuthenticatedRequest {
  user?: JWTPayload;
  headers: {
    authorization?: string;
    [key: string]: any;
  };
}

export function requireAuth(
  request: AuthenticatedRequest,
  requiredRoles?: UserRole[]
): { isValid: boolean; user?: JWTPayload; error?: string } {
  const token = extractTokenFromHeader(request.headers.authorization);
  
  if (!token) {
    return { isValid: false, error: 'Token não fornecido' };
  }
  
  const user = verifyToken(token);
  
  if (!user) {
    return { isValid: false, error: 'Token inválido ou expirado' };
  }
  
  if (requiredRoles && !hasPermission(user.role, requiredRoles)) {
    return { isValid: false, error: 'Permissão negada' };
  }
  
  return { isValid: true, user };
} 