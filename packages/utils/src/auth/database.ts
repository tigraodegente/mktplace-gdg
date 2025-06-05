import { UserRole, type User, type AuthSession } from './auth-service';

export interface DatabaseEnv {
  DATABASE_URL?: string;
  NEON_DATABASE_URL?: string;
  // Para desenvolvimento local
  DB_HOST?: string;
  DB_PORT?: string;
  DB_NAME?: string;
  DB_USER?: string;
  DB_PASSWORD?: string;
}

/**
 * Interface para connection com banco de dados
 */
interface DatabaseConnection {
  query<T = any>(sql: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }>;
}

/**
 * Cria connection com Neon PostgreSQL via fetch API
 */
async function createNeonConnection(env: DatabaseEnv): Promise<DatabaseConnection> {
  const databaseUrl = env.NEON_DATABASE_URL || env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL ou NEON_DATABASE_URL é obrigatório');
  }

  return {
    async query<T = any>(sql: string, params: any[] = []): Promise<{ rows: T[]; rowCount: number }> {
      try {
        // Para Neon, usamos a fetch API com SQL direto
        const response = await fetch(`${databaseUrl}/sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.DATABASE_URL?.split('@')[0]?.split('//')[1] || ''}`
          },
          body: JSON.stringify({
            query: sql,
            params: params
          })
        });

        if (!response.ok) {
          throw new Error(`Database error: ${response.statusText}`);
        }

        const result = await response.json();
        return {
          rows: result.rows || [],
          rowCount: result.rowCount || 0
        };
      } catch (error) {
        console.error('Erro na query do banco:', error);
        throw error;
      }
    }
  };
}

/**
 * Cria connection com PostgreSQL local/cloud via HTTP
 */
async function createPostgresConnection(env: DatabaseEnv): Promise<DatabaseConnection> {
  // Para PostgreSQL via HTTP endpoint (ex: PostgREST, Supabase, etc)
  const baseUrl = env.DATABASE_URL;
  
  if (!baseUrl) {
    throw new Error('DATABASE_URL é obrigatório para PostgreSQL');
  }

  return {
    async query<T = any>(sql: string, params: any[] = []): Promise<{ rows: T[]; rowCount: number }> {
      try {
        // Implementação via endpoint HTTP
        const response = await fetch(`${baseUrl}/rpc/execute_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            sql_query: sql,
            parameters: params
          })
        });

        if (!response.ok) {
          throw new Error(`Database error: ${response.statusText}`);
        }

        const result = await response.json();
        return {
          rows: Array.isArray(result) ? result : [result],
          rowCount: Array.isArray(result) ? result.length : 1
        };
      } catch (error) {
        console.error('Erro na query PostgreSQL:', error);
        throw error;
      }
    }
  };
}

/**
 * Função principal para criar connection com o banco
 */
export async function createDatabaseConnection(env: DatabaseEnv): Promise<DatabaseConnection> {
  if (env.NEON_DATABASE_URL || (env.DATABASE_URL?.includes('neon'))) {
    return createNeonConnection(env);
  } else if (env.DATABASE_URL) {
    return createPostgresConnection(env);
  } else {
    throw new Error('Nenhuma configuração de banco de dados encontrada');
  }
}

/**
 * Buscar usuário por ID
 */
export async function getUserById(userId: string, env: DatabaseEnv): Promise<User | null> {
  try {
    const db = await createDatabaseConnection(env);
    
    const query = `
      SELECT 
        id,
        email,
        name,
        role,
        avatar_url,
        is_active,
        created_at,
        updated_at,
        last_login_at,
        email_verified
      FROM users 
      WHERE id = $1 AND is_active = true
    `;
    
    const result = await db.query<User>(query, [userId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0];
    
    // Converter role string para enum
    user.role = user.role as UserRole;
    
    return user;
  } catch (error) {
    console.error('Erro ao buscar usuário por ID:', error);
    return null;
  }
}

/**
 * Buscar usuário por email
 */
export async function getUserByEmail(email: string, env: DatabaseEnv): Promise<User | null> {
  try {
    const db = await createDatabaseConnection(env);
    
    const query = `
      SELECT 
        id,
        email,
        name,
        role,
        avatar_url,
        is_active,
        created_at,
        updated_at,
        last_login_at,
        email_verified,
        password_hash
      FROM users 
      WHERE email = $1 AND is_active = true
    `;
    
    const result = await db.query<User & { password_hash: string }>(query, [email.toLowerCase()]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0];
    user.role = user.role as UserRole;
    
    return user;
  } catch (error) {
    console.error('Erro ao buscar usuário por email:', error);
    return null;
  }
}

/**
 * Criar novo usuário
 */
export async function createUser(userData: {
  email: string;
  name: string;
  password_hash: string;
  role?: UserRole;
}, env: DatabaseEnv): Promise<User | null> {
  try {
    const db = await createDatabaseConnection(env);
    
    const query = `
      INSERT INTO users (
        email, name, password_hash, role, is_active, email_verified, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, true, false, NOW(), NOW()
      ) 
      RETURNING id, email, name, role, is_active, created_at, updated_at, email_verified
    `;
    
    const result = await db.query<User>(query, [
      userData.email.toLowerCase(),
      userData.name,
      userData.password_hash,
      userData.role || UserRole.CUSTOMER
    ]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0];
    user.role = user.role as UserRole;
    
    return user;
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    return null;
  }
}

/**
 * Atualizar último login do usuário
 */
export async function updateLastLogin(userId: string, env: DatabaseEnv): Promise<void> {
  try {
    const db = await createDatabaseConnection(env);
    
    const query = `
      UPDATE users 
      SET last_login_at = NOW(), updated_at = NOW()
      WHERE id = $1
    `;
    
    await db.query(query, [userId]);
  } catch (error) {
    console.error('Erro ao atualizar último login:', error);
  }
}

/**
 * Salvar sessão de autenticação
 */
export async function createAuthSession(sessionData: {
  user_id: string;
  session_id: string;
  access_token: string;
  refresh_token: string;
  ip_address: string;
  user_agent: string;
  expires_at: Date;
}, env: DatabaseEnv): Promise<AuthSession | null> {
  try {
    const db = await createDatabaseConnection(env);
    
    const query = `
      INSERT INTO auth_sessions (
        user_id, session_id, access_token, refresh_token, 
        ip_address, user_agent, expires_at, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, NOW()
      ) 
      RETURNING id, user_id, session_id, ip_address, user_agent, expires_at, created_at
    `;
    
    const result = await db.query<AuthSession>(query, [
      sessionData.user_id,
      sessionData.session_id,
      sessionData.access_token,
      sessionData.refresh_token,
      sessionData.ip_address,
      sessionData.user_agent,
      sessionData.expires_at
    ]);
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Erro ao criar sessão de auth:', error);
    return null;
  }
}

/**
 * Invalidar sessão
 */
export async function invalidateSession(sessionId: string, env: DatabaseEnv): Promise<void> {
  try {
    const db = await createDatabaseConnection(env);
    
    const query = `
      DELETE FROM auth_sessions 
      WHERE session_id = $1
    `;
    
    await db.query(query, [sessionId]);
  } catch (error) {
    console.error('Erro ao invalidar sessão:', error);
  }
}

/**
 * Limpar sessões expiradas
 */
export async function cleanExpiredSessions(env: DatabaseEnv): Promise<void> {
  try {
    const db = await createDatabaseConnection(env);
    
    const query = `
      DELETE FROM auth_sessions 
      WHERE expires_at < NOW()
    `;
    
    await db.query(query);
  } catch (error) {
    console.error('Erro ao limpar sessões expiradas:', error);
  }
}

/**
 * Script para criar tabelas necessárias
 */
export const createTablesSQL = `
-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'customer',
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP
);

-- Tabela de sessões de autenticação
CREATE TABLE IF NOT EXISTS auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id VARCHAR(255) UNIQUE NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_session_id ON auth_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at na tabela users
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
`;

/**
 * Função para executar migrations
 */
export async function runMigrations(env: DatabaseEnv): Promise<void> {
  try {
    const db = await createDatabaseConnection(env);
    
    console.log('🔄 Executando migrations do banco de dados...');
    
    // Executar o script de criação de tabelas
    await db.query(createTablesSQL);
    
    console.log('✅ Migrations executadas com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao executar migrations:', error);
    throw error;
  }
} 