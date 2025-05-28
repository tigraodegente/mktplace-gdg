import { Database } from '../index'
import crypto from 'crypto'

export interface User {
  id: string
  email: string
  name: string
  role: string
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface Session {
  id: string
  user_id: string
  token: string
  expires_at: Date
  created_at: Date
}

export class AuthService {
  constructor(private db: Database) {}
  
  // Criar hash de senha (simplificado para Cloudflare Workers)
  private async hashPassword(password: string): Promise<string> {
    // Em produção, use bcrypt ou argon2 via API externa
    const salt = crypto.randomBytes(16).toString('hex')
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
    return `${salt}:${hash}`
  }
  
  // Verificar senha
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    const [salt, originalHash] = hash.split(':')
    const newHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
    return newHash === originalHash
  }
  
  // Criar novo usuário
  async createUser(email: string, password: string, name: string): Promise<User | null> {
    try {
      const passwordHash = await this.hashPassword(password)
      
      const user = await this.db.queryOne<User>`
        INSERT INTO users (
          email, password_hash, name, role, is_active, 
          email_verified, created_at, updated_at
        )
        VALUES (
          ${email}, ${passwordHash}, ${name}, 'customer', true,
          false, NOW(), NOW()
        )
        RETURNING id, email, name, role, is_active, created_at, updated_at
      `
      
      return user
    } catch (error: any) {
      // Erro de email duplicado
      if (error.code === '23505') {
        return null
      }
      throw error
    }
  }
  
  // Validar credenciais
  async validateUser(email: string, password: string): Promise<User | null> {
    const result = await this.db.queryOne<User & { password_hash: string }>`
      SELECT id, email, password_hash, name, role, is_active, created_at, updated_at
      FROM users
      WHERE email = ${email} AND is_active = true
    `
    
    if (!result) return null
    
    const valid = await this.verifyPassword(password, result.password_hash)
    if (!valid) return null
    
    // Remover password_hash do retorno
    const { password_hash, ...user } = result
    return user
  }
  
  // Criar sessão
  async createSession(userId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex')
    
    await this.db.execute`
      INSERT INTO sessions (user_id, token, expires_at, created_at)
      VALUES (
        ${userId}, 
        ${token}, 
        NOW() + INTERVAL '7 days', 
        NOW()
      )
    `
    
    return token
  }
  
  // Validar sessão
  async validateSession(token: string): Promise<(Session & User) | null> {
    const session = await this.db.queryOne<Session & User>`
      SELECT 
        s.id as session_id,
        s.token,
        s.expires_at,
        s.created_at as session_created_at,
        u.id,
        u.email,
        u.name,
        u.role,
        u.is_active,
        u.created_at,
        u.updated_at
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ${token} 
        AND s.expires_at > NOW()
        AND u.is_active = true
    `
    
    return session
  }
  
  // Logout (deletar sessão)
  async deleteSession(token: string): Promise<void> {
    await this.db.execute`
      DELETE FROM sessions WHERE token = ${token}
    `
  }
  
  // Atualizar último login
  async updateLastLogin(userId: string): Promise<void> {
    await this.db.execute`
      UPDATE users 
      SET last_login_at = NOW(), updated_at = NOW()
      WHERE id = ${userId}
    `
  }
  
  // Buscar usuário por ID
  async getUserById(userId: string): Promise<User | null> {
    return await this.db.queryOne<User>`
      SELECT id, email, name, role, is_active, created_at, updated_at
      FROM users
      WHERE id = ${userId}
    `
  }
} 