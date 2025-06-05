import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

// Definir tipos localmente para evitar conflitos
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
  is_active: boolean;
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
  session_id: string;
  ip_address: string;
  user_agent: string;
  expires_at: string;
  created_at: string;
}

// Função de verificação de permissões simplificada
const ROLE_PERMISSIONS: Record<UserRole, { resource: string; actions: string[] }[]> = {
  [UserRole.CUSTOMER]: [
    { resource: 'orders', actions: ['read', 'create'] },
    { resource: 'profile', actions: ['read', 'update'] }
  ],
  [UserRole.VENDOR]: [
    { resource: 'products', actions: ['read', 'create', 'update'] },
    { resource: 'orders', actions: ['read', 'update'] }
  ],
  [UserRole.ADMIN]: [
    { resource: '*', actions: ['*'] }
  ],
  [UserRole.SUPER_ADMIN]: [
    { resource: '*', actions: ['*'] }
  ]
};

function hasPermission(userRole: UserRole, resource: string, action: string): boolean {
  const permissions = ROLE_PERMISSIONS[userRole];
  return permissions.some(p =>
    (p.resource === '*' || p.resource === resource) &&
    (p.actions.includes('*') || p.actions.includes(action))
  );
}

function hasAnyRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole);
}

export interface AuthConfig {
  jwtSecret: string;
  jwtExpiresIn?: string;
  refreshExpiresIn?: string;
  bcryptRounds?: number;
}

export class AuthService {
  private config: Required<AuthConfig>;

  constructor(config: AuthConfig) {
    this.config = {
      jwtSecret: config.jwtSecret,
      jwtExpiresIn: config.jwtExpiresIn || '15m',
      refreshExpiresIn: config.refreshExpiresIn || '7d',
      bcryptRounds: config.bcryptRounds || 12
    };

    if (!this.config.jwtSecret) {
      throw new Error('JWT Secret é obrigatório');
    }
  }

  // ============================
  // TOKEN GENERATION
  // ============================

  /**
   * Gera access token e refresh token para o usuário
   */
  generateTokens(user: User): { accessToken: string; refreshToken: string; expiresIn: number } {
    const now = Math.floor(Date.now() / 1000);
    const sessionId = crypto.randomUUID();

    // Access Token (curto)
    const accessPayload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId,
      iat: now,
      exp: now + this.parseExpiration(this.config.jwtExpiresIn),
      type: 'access'
    };

    // Refresh Token (longo)
    const refreshPayload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId,
      iat: now,
      exp: now + this.parseExpiration(this.config.refreshExpiresIn),
      type: 'refresh'
    };

    const accessToken = jwt.sign(accessPayload, this.config.jwtSecret);
    const refreshToken = jwt.sign(refreshPayload, this.config.jwtSecret);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseExpiration(this.config.jwtExpiresIn)
    };
  }

  /**
   * Converte string de tempo para segundos
   */
  private parseExpiration(timeStr: string): number {
    const match = timeStr.match(/^(\d+)([smhd])$/);
    if (!match) throw new Error(`Formato de tempo inválido: ${timeStr}`);

    const [, num, unit] = match;
    const value = parseInt(num);

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 60 * 60 * 24;
      default: throw new Error(`Unidade de tempo inválida: ${unit}`);
    }
  }

  // ============================
  // TOKEN VERIFICATION
  // ============================

  /**
   * Verifica e decodifica token JWT
   */
  verifyToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, this.config.jwtSecret) as JWTPayload;
      
      // Verificar se não expirou
      const now = Math.floor(Date.now() / 1000);
      if (decoded.exp <= now) {
        return null;
      }

      return decoded;
    } catch (error) {
      return null;
    }
  }

  /**
   * Verifica se token é válido
   */
  isTokenValid(token: string): boolean {
    return this.verifyToken(token) !== null;
  }

  /**
   * Extrai token do header Authorization
   */
  extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader) return null;
    
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    return authHeader;
  }

  // ============================
  // PASSWORD HANDLING
  // ============================

  /**
   * Hash da senha
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.config.bcryptRounds);
  }

  /**
   * Verifica senha
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // ============================
  // AUTHORIZATION
  // ============================

  /**
   * Verifica se usuário tem permissão para resource/action
   */
  checkPermission(userRole: UserRole, resource: string, action: string): boolean {
    return hasPermission(userRole, resource, action);
  }

  /**
   * Verifica se usuário tem pelo menos um dos roles
   */
  checkRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
    return hasAnyRole(userRole, allowedRoles);
  }

  /**
   * Middleware para verificar autenticação
   */
  requireAuth(requiredRoles?: UserRole[]) {
    return (request: any, user?: User) => {
      if (!user) {
        throw new AuthError('Usuário não autenticado', 'UNAUTHENTICATED', 401);
      }

      if (requiredRoles && !this.checkRole(user.role, requiredRoles)) {
        throw new AuthError('Acesso negado', 'FORBIDDEN', 403);
      }

      return user;
    };
  }

  /**
   * Middleware para verificar permissão específica
   */
  requirePermission(resource: string, action: string) {
    return (request: any, user?: User) => {
      if (!user) {
        throw new AuthError('Usuário não autenticado', 'UNAUTHENTICATED', 401);
      }

      if (!this.checkPermission(user.role, resource, action)) {
        throw new AuthError(`Sem permissão para ${action} em ${resource}`, 'FORBIDDEN', 403);
      }

      return user;
    };
  }

  /**
   * Refresh de token
   */
  async refreshTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number } | null> {
    const payload = this.verifyToken(refreshToken);
    
    if (!payload || payload.type !== 'refresh') {
      return null;
    }

    // Criar novo par de tokens
    const user = {
      id: payload.userId,
      email: payload.email,
      role: payload.role
    } as User;

    return this.generateTokens(user);
  }

  /**
   * Cria dados de sessão para salvar no banco
   */
  createSessionData(user: User, tokens: ReturnType<typeof this.generateTokens>, request: any) {
    const payload = this.verifyToken(tokens.accessToken);
    
    return {
      user_id: user.id,
      session_id: payload?.sessionId,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      ip_address: this.getClientIP(request),
      user_agent: this.getUserAgent(request),
      expires_at: new Date(Date.now() + (tokens.expiresIn * 1000))
    };
  }

  private getClientIP(request: any): string {
    return request.headers?.get?.('x-forwarded-for') || 
           request.headers?.get?.('x-real-ip') || 
           'unknown';
  }

  private getUserAgent(request: any): string {
    return request.headers?.get?.('user-agent') || 'unknown';
  }
}

export class AuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 401
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Cria instância do AuthService com configuração do ambiente
 */
export function createAuthService(config?: Partial<AuthConfig>): AuthService {
  const jwtSecret = config?.jwtSecret || 
                   process.env.JWT_SECRET || 
                   process.env.AUTH_SECRET;

  if (!jwtSecret) {
    throw new Error('JWT_SECRET ou AUTH_SECRET deve ser configurado');
  }

  return new AuthService({
    jwtSecret,
    jwtExpiresIn: config?.jwtExpiresIn || process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: config?.refreshExpiresIn || process.env.REFRESH_EXPIRES_IN || '7d',
    bcryptRounds: config?.bcryptRounds || parseInt(process.env.BCRYPT_ROUNDS || '12')
  });
}

/**
 * Cria instância singleton do AuthService (apenas se JWT_SECRET estiver configurado)
 * Para usar em desenvolvimento sem JWT_SECRET, use createAuthService() diretamente
 */
export function getAuthService(): AuthService | null {
  try {
    return createAuthService();
  } catch {
    return null;
  }
}

// Não criar instância singleton automaticamente para evitar erros durante imports
// Use getAuthService() ou createAuthService() conforme necessário 