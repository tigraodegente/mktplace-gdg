import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

interface DatabaseUser {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  roles: string[];
  is_active: boolean;
  vendor_data?: any;
  admin_data?: any;
  customer_data?: any;
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    // Se o hash começa com $2b$, é bcrypt
    if (hash.startsWith('$2b$')) {
      return await bcrypt.compare(password, hash);
    }
    
    // Formato legado salt:hash (para compatibilidade)
    const [salt, storedHash] = hash.split(':');
    if (!salt || !storedHash) {
      console.warn('Formato de hash inválido detectado');
      return false;
    }
    
    const newHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return newHash === storedHash;
  } catch (error) {
    console.error('Erro na verificação de senha:', error);
    return false;
  }
}

function mapDbUserToAuthUser(dbUser: DatabaseUser) {
  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    roles: dbUser.roles,
    status: dbUser.is_active ? 'active' : 'inactive',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    vendor: dbUser.vendor_data ? {
      storeId: dbUser.vendor_data.storeId,
      storeName: dbUser.vendor_data.storeName,
      commission: dbUser.vendor_data.commission,
      verified: dbUser.vendor_data.verified
    } : undefined,
    admin: dbUser.admin_data ? {
      permissions: dbUser.admin_data.permissions,
      level: dbUser.admin_data.level
    } : undefined,
    customer: dbUser.customer_data ? {
      phone: dbUser.customer_data.phone,
      addresses: dbUser.customer_data.addresses || []
    } : undefined
  };
}

function determineDefaultRole(roles: string[], requestedRole?: string): string {
  if (requestedRole && roles.includes(requestedRole)) {
    return requestedRole;
  }
  
  // Prioridade: admin > vendor > customer
  if (roles.includes('admin')) return 'admin';
  if (roles.includes('vendor')) return 'vendor';
  return 'customer';
}

function getAvailableApps(roles: string[]) {
  const apps: string[] = [];
  
  if (roles.includes('customer')) apps.push('store');
  if (roles.includes('vendor')) apps.push('vendor');
  if (roles.includes('admin')) apps.push('admin');
  
  return apps;
}

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
  try {
    const body = await request.json();
    const { email, password, requestedRole } = body;
    
    if (!email || !password) {
      return json({
        success: false,
        error: 'Email e senha são obrigatórios'
      }, { status: 400 });
    }
    
    const db = getDatabase(platform);
    
    // Buscar usuário no banco
    const dbUser = await db.queryOne`
      SELECT 
        id, email, name, password_hash, roles, is_active,
        vendor_data, admin_data, customer_data
      FROM users 
      WHERE email = ${email.toLowerCase()}
        AND is_active = true
    ` as DatabaseUser;
    
    if (!dbUser) {
      return json({
        success: false,
        error: 'Email ou senha inválidos'
      }, { status: 401 });
    }
    
    // Verificar senha
    if (!await verifyPassword(password, dbUser.password_hash)) {
      return json({
        success: false,
        error: 'Email ou senha inválidos'
      }, { status: 401 });
    }
    
    // Mapear usuário do banco para AuthUser
    const user = mapDbUserToAuthUser(dbUser);
    
    // Se usuário tem múltiplos roles, verificar se precisa escolher
    if (user.roles.length > 1 && !requestedRole) {
      return json({
        success: false,
        availableRoles: user.roles,
        error: 'Usuário tem múltiplos perfis. Escolha como deseja acessar.'
      });
    }
    
    // Determinar role ativo
    const currentRole = determineDefaultRole(user.roles, requestedRole);
    const availableApps = getAvailableApps(user.roles);
    
    // Criar token de sessão
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias
    
    // Salvar sessão no banco
    await db.execute`
      INSERT INTO user_sessions_multi_role (
        user_id, token, active_role, available_apps, expires_at
      ) VALUES (
        ${user.id}, ${sessionToken}, ${currentRole}, ${availableApps}, ${expiresAt}
      )
      ON CONFLICT (token) DO UPDATE SET
        active_role = EXCLUDED.active_role,
        available_apps = EXCLUDED.available_apps,
        expires_at = EXCLUDED.expires_at,
        last_activity_at = NOW()
    `;
    
    // Definir cookie de sessão
    cookies.set('auth_session', sessionToken, {
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 dias em segundos
      httpOnly: true,
      secure: true,
      sameSite: 'lax'
    });
    
    // Atualizar último login
    await db.execute`
      UPDATE users 
      SET last_login_at = NOW() 
      WHERE id = ${user.id}
    `;
    
    // Determinar URL de redirecionamento
    const redirectUrls = {
      customer: '/',
      vendor: '/vendor/dashboard',
      admin: '/admin/dashboard'
    };
    
    return json({
      success: true,
      session: {
        user,
        token: sessionToken,
        expiresAt: expiresAt.toISOString(),
        currentRole,
        availableApps
      },
      redirectTo: redirectUrls[currentRole as keyof typeof redirectUrls],
      availableRoles: user.roles
    });
    
  } catch (error) {
    console.error('Erro no login:', error);
    return json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}; 