import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
  try {
    const { email, password } = await request.json();
    
    console.log(`🔐 Login attempt for: ${email}`);
    
    // Validar dados
    if (!email || !password) {
      return json({
        success: false,
        error: { message: 'Email e senha são obrigatórios' }
      }, { status: 400 });
    }
    
    // Tentar login com timeout
    try {
      const db = getDatabase(platform);
      
      // Promise com timeout de 5 segundos para login
      const queryPromise = (async () => {
        // STEP 1: Query simplificada - buscar usuário
        const users = await db.query`
          SELECT id, email, name, role, password_hash, is_active
          FROM users
          WHERE email = ${email}
          LIMIT 1
        `;
        
        const user = users[0];
        if (!user) {
          return {
            success: false,
            error: { message: 'Email ou senha inválidos' },
            status: 401
          };
        }
        
        // STEP 2: Verificar senha (bcrypt pode ser lento)
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!isValidPassword) {
          return {
            success: false,
            error: { message: 'Email ou senha inválidos' },
            status: 401
          };
        }
        
        // STEP 3: Verificar se usuário está ativo
        if (!user.is_active) {
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
        
        console.log(`🔑 Criando sessão síncrona para: ${user.email}`);
        
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
        
        console.log(`✅ Sessão criada no banco: ${sessionToken.substring(0, 8)}...`);
        
        // Update last_login async (não crítico)
        setTimeout(async () => {
          try {
            await db.query`
              UPDATE users 
              SET last_login_at = NOW()
              WHERE id = ${user.id}
            `;
          } catch (e) {
            console.log('Update last_login async failed:', e);
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
      })();
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 10000)
      });
      
      const result = await Promise.race([queryPromise, timeoutPromise]) as any;
      
      // Se houve erro, retornar com o status apropriado
      if (!result.success) {
        console.log(`❌ Login failed: ${result.error.message}`);
        return json({
          success: false,
          error: result.error
        }, { status: result.status || 500 });
      }
      
      console.log(`✅ Login success: ${result.user.email}`);
      
      // Configuração otimizada do cookie para remoto
      const isProduction = request.url.includes('.pages.dev') || 
                          request.url.includes('https://') ||
                          !request.url.includes('localhost');
      
      console.log(`🍪 Configurando cookie - Produção: ${isProduction}`);
      
      // Criar sessão no cookie com configuração específica para ambiente
      cookies.set('session_token', result.sessionToken!, {
        path: '/',
        httpOnly: true,
        secure: isProduction, // true apenas em produção real
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 dias
        domain: undefined // deixar o browser decidir
      });
      
      console.log(`🍪 Cookie configurado: session_token=${result.sessionToken!.substring(0, 8)}...`);
      
      return json({
        success: true,
        data: {
          user: result.user!
        },
        source: 'database'
      });
      
    } catch (error) {
      console.log(`⚠️ Login timeout/erro: ${error instanceof Error ? error.message : 'Erro'} - negando acesso`);
      
      // FALLBACK SEGURO: sempre negar login em caso de timeout
      // (nunca permitir acesso sem verificar senha)
      return json({
        success: false,
        error: { message: 'Erro ao processar login. Tente novamente.' }
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ Erro crítico login:', error);
    return json({
      success: false,
      error: { message: 'Erro ao processar login' }
    }, { status: 500 });
  }
}; 