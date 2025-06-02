import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { logAuth, logOperation, logPerformance, logger } from '$lib/utils/logger';
import { queryWithTimeout } from '$lib/db/queryWithTimeout';
import { TIMEOUT_CONFIG } from '$lib/config/timeouts';

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
  const startTime = performance.now();
  
  try {
    const { email, password } = await request.json();
    
    // Configurar contexto do logger
    logger.setContext({ 
      operation: 'auth_login',
      requestId: nanoid(8)
    });
    
    logAuth('attempt', true, { email });
    
    // Validar dados
    if (!email || !password) {
      logAuth('validation_failed', false, { email, reason: 'missing_credentials' });
      return json({
        success: false,
        error: { message: 'Email e senha são obrigatórios' }
      }, { status: 400 });
    }
    
    // Executar login com timeout otimizado
    try {
      const db = getDatabase(platform);
      
      // Usar helper com timeout configurado
      const result = await queryWithTimeout(db, async (db) => {
        // STEP 1: Query simplificada - buscar usuário
        const users = await db.query`
          SELECT id, email, name, role, password_hash, is_active
          FROM users
          WHERE email = ${email}
          LIMIT 1
        `;
        
        const user = users[0];
        if (!user) {
          logAuth('user_not_found', false, { email });
          return {
            success: false,
            error: { message: 'Email ou senha inválidos' },
            status: 401
          };
        }
        
        // STEP 2: Verificar senha (bcrypt pode ser lento)
        const passwordStartTime = performance.now();
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        logPerformance('password_verification', passwordStartTime);
        
        if (!isValidPassword) {
          logAuth('invalid_password', false, { email, userId: user.id });
          return {
            success: false,
            error: { message: 'Email ou senha inválidos' },
            status: 401
          };
        }
        
        // STEP 3: Verificar se usuário está ativo
        if (!user.is_active) {
          logAuth('user_inactive', false, { email, userId: user.id });
          return {
            success: false,
            error: { message: 'Usuário inativo' },
            status: 403
          };
        }
        
        // STEP 4: Criar sessão SÍNCRONA (não async)
        const sessionToken = nanoid(32);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 dias
        
        logger.info('Creating user session', { 
          userId: user.id, 
          email: user.email,
          sessionId: sessionToken.substring(0, 8) + '...'
        });
        
        // Insert session SÍNCRONO - crítico para funcionar
        await db.query`
          INSERT INTO sessions (user_id, token, ip_address, user_agent, expires_at)
          VALUES (
            ${user.id},
            ${sessionToken},
            ${request.headers.get('x-forwarded-for') || 'unknown'},
            ${request.headers.get('user-agent') || 'unknown'},
            ${expiresAt}
          )
        `;
        
        logOperation(true, 'Session created in database', {
          userId: user.id,
          sessionId: sessionToken.substring(0, 8) + '...'
        });
        
        // Update last_login async (não crítico)
        setTimeout(async () => {
          try {
            await db.query`
              UPDATE users 
              SET last_login_at = NOW()
              WHERE id = ${user.id}
            `;
          } catch (e) {
            logger.warn('Update last_login async failed', { userId: user.id, error: e });
          }
        }, 100);
        
        return {
          success: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
          },
          sessionToken
        };
      }, {
        operation: 'auth/login',
        retryable: false // Não fazer retry em auth por segurança
      });
      
      // Se houve erro, retornar com o status apropriado
      if (!result.success) {
        logOperation(false, 'Login failed', { reason: result.error?.message });
        return json({
          success: false,
          error: result.error || { message: 'Erro desconhecido' }
        }, { status: result.status || 500 });
      }
      
      logAuth('success', true, { 
        email: result.user?.email || email,
        userId: result.user?.id || 'unknown',
        role: result.user?.role || 'unknown'
      });
      
      // Configuração otimizada do cookie para remoto
      const isProduction = request.url.includes('.pages.dev') || 
                          request.url.includes('https://') ||
                          !request.url.includes('localhost');
      
      logger.debug('Setting authentication cookie', { 
        isProduction, 
        url: request.url.substring(0, 50) + '...'
      });
      
      // Criar sessão no cookie com configuração específica para ambiente
      cookies.set('session_token', result.sessionToken!, {
        path: '/',
        httpOnly: true,
        secure: isProduction, // true apenas em produção real
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 dias
        domain: undefined // deixar o browser decidir
      });
      
      logger.debug('Authentication cookie set', {
        sessionId: result.sessionToken!.substring(0, 8) + '...',
        isProduction
      });
      
      logPerformance('complete_login', startTime);
      
      return json({
        success: true,
        data: {
          user: result.user!
        },
        source: 'database'
      });
      
    } catch (error) {
      logger.warn('Login timeout or database error - denying access', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        email,
        timeout: TIMEOUT_CONFIG.api.auth.login
      });
      
      // FALLBACK SEGURO: sempre negar login em caso de timeout
      // (nunca permitir acesso sem verificar senha)
      return json({
        success: false,
        error: { message: 'Erro ao processar login. Tente novamente.' }
      }, { status: 500 });
    }
    
  } catch (error) {
    logger.error('Critical login error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return json({
      success: false,
      error: { message: 'Erro ao processar login' }
    }, { status: 500 });
  } finally {
    // Limpar contexto do logger
    logger.clearContext();
  }
}; 