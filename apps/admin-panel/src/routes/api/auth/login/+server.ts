import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAuthService, UserRole } from '@mktplace/utils/auth/auth-service';
import postgres from 'postgres';

// Tipos para login
interface LoginRequest {
  email: string;
  password: string;
  remember_me?: boolean;
}

interface LoginResponse {
  success: boolean;
  user: any;
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

const DATABASE_URL = 'postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-raspy-meadow-acds6p80-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

export const POST: RequestHandler = async ({ request, platform }) => {
  try {
    const body = await request.json() as LoginRequest;
    const { email, password, remember_me } = body;

    console.log(`🔑 Tentativa de login: ${email}`);

    // Validação básica
    if (!email || !password) {
      return json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email e senha são obrigatórios'
        }
      }, { status: 400 });
    }

    // Usar JWT_SECRET fixo para teste
    const jwtSecret = '4ce58f06bf47d72a061bf67c7d3304e998bf0d27c292dfbbe37dcc56c305aba88adf7b26dc22523401f51e3401a35dd9947be810af0cf62b2e24f11b4551c4c3';
    
    console.log(`🔐 JWT_SECRET configurado`);

    // Buscar usuário no banco usando postgres diretamente
    const sql = postgres(DATABASE_URL, { ssl: 'require' });
    
    try {
      const users = await sql`
        SELECT id, email, name, role, password_hash, is_active
        FROM users 
        WHERE email = ${email.toLowerCase()} AND is_active = true
      `;
      
      if (users.length === 0) {
        console.log(`❌ Usuário não encontrado: ${email}`);
        await sql.end();
        return json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Credenciais inválidas'
          }
        }, { status: 401 });
      }

      const user = users[0];
      console.log(`✅ Usuário encontrado: ${user.id} (${user.role})`);

      // Verificar senha
      const authService = createAuthService({ jwtSecret });

      const isValidPassword = await authService.verifyPassword(
        password, 
        user.password_hash
      );

      if (!isValidPassword) {
        console.log(`❌ Senha inválida para: ${email}`);
        await sql.end();
        return json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Credenciais inválidas'
          }
        }, { status: 401 });
      }

      console.log(`✅ Senha válida para: ${email}`);

      // Verificar se usuário tem acesso ao admin panel
      const allowedRoles = ['admin', 'super_admin'];
      if (!allowedRoles.includes(user.role)) {
        console.log(`❌ Role não permitido: ${user.role}`);
        await sql.end();
        return json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Acesso negado ao painel administrativo'
          }
        }, { status: 403 });
      }

      console.log(`✅ Role autorizado: ${user.role}`);

      // Gerar tokens
      const tokens = authService.generateTokens({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as UserRole,
        is_active: user.is_active
      });

      console.log(`✅ Tokens gerados para: ${email}`);

      // Atualizar último login
      try {
        await sql`
          UPDATE users 
          SET last_login_at = NOW(), updated_at = NOW()
          WHERE id = ${user.id}
        `;
        console.log(`✅ Último login atualizado para: ${email}`);
      } catch (loginError) {
        console.warn('⚠️  Erro ao atualizar último login:', loginError);
      }

      await sql.end();

      // Remover senha do response
      const { password_hash, ...userResponse } = user;

      const response: LoginResponse = {
        success: true,
        user: userResponse,
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_in: tokens.expiresIn
      };

      console.log(`🎉 Login bem-sucedido para: ${email}`);

      return json({
        success: true,
        data: response,
        meta: {
          timestamp: new Date().toISOString(),
          source: 'admin-panel'
        }
      });

    } catch (dbError) {
      await sql.end();
      throw dbError;
    }

  } catch (error) {
    console.error('❌ Erro no login:', error);
    
    return json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erro interno do servidor'
      }
    }, { status: 500 });
  }
}; 