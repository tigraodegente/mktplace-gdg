import { json } from '@sveltejs/kit';
import { TIMEOUT_CONFIG, withTimeout } from '$lib/config/timeouts';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
  try {
    console.log('📝 Auth Register - Estratégia híbrida iniciada');
    
    const { email, password, name, role = 'customer' } = await request.json();
    
    // Validar dados
    if (!email || !password || !name) {
      return json({
        success: false,
        error: { message: 'Todos os campos são obrigatórios' }
      }, { status: 400 });
    }
    
    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return json({
        success: false,
        error: { message: 'Email inválido' }
      }, { status: 400 });
    }
    
    // Validar senha (mínimo 6 caracteres)
    if (password.length < 6) {
      return json({
        success: false,
        error: { message: 'A senha deve ter pelo menos 6 caracteres' }
      }, { status: 400 });
    }
    
    // Tentar registrar usuário com timeout
    try {
      const db = getDatabase(platform);
      
      // Promise com timeout de 6 segundos para registro
      const queryPromise = (async () => {
        // STEP 1: Verificar se email já existe (query simples)
        const existingUsers = await db.query`
          SELECT id FROM users WHERE email = ${email} LIMIT 1
        `;
        
        if (existingUsers.length > 0) {
          throw new Error('Email já cadastrado');
        }
        
        // STEP 2: Criar hash da senha (pode ser lento)
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        
        // STEP 3: Criar usuário
        const newUsers = await db.query`
          INSERT INTO users (email, password_hash, name, role, status, email_verified)
          VALUES (${email}, ${passwordHash}, ${name}, ${role}, 'active', false)
          RETURNING id, email, name, role
        `;
        
        const newUser = newUsers[0];
        
        // STEP 4: Criar sessão
        const sessionToken = nanoid(32);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        
        await db.query`
          INSERT INTO sessions (user_id, token, ip_address, user_agent, expires_at)
          VALUES (
            ${newUser.id}, ${sessionToken}, 
            ${request.headers.get('x-forwarded-for') || 'unknown'},
            ${request.headers.get('user-agent') || 'unknown'},
            ${expiresAt}
          )
        `;
        
        // STEP 5: Criar perfil de vendedor async (se necessário)
        if (role === 'seller') {
          setTimeout(async () => {
            try {
              const slug = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now();
              await db.query`
                INSERT INTO sellers (user_id, company_name, slug, description, is_active, is_verified, rating, total_sales)
                VALUES (${newUser.id}, ${name}, ${slug}, ${`Loja de ${name}`}, false, false, 0, 0)
              `;
            } catch (e) {
              console.log('Seller profile creation async failed:', e);
            }
          }, 100);
        }
        
        return { user: newUser, sessionToken };
      })();
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 6000)
      });
      
      const result = await Promise.race([queryPromise, timeoutPromise]) as any;
      
      console.log(`✅ Register OK: ${result.user.email}`);
      
      // Criar sessão no cookie
      cookies.set('session_token', result.sessionToken, {
        path: '/',
        httpOnly: true,
        secure: import.meta.env.PROD,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7
      });
      
      return json({
        success: true,
        data: {
          user: result.user
        },
        source: 'database'
      });
      
    } catch (error) {
      console.log(`⚠️ Erro register: ${error instanceof Error ? error.message : 'Erro'}`);
      
      if (error instanceof Error && error.message === 'Email já cadastrado') {
        return json({
          success: false,
          error: { message: error.message }
        }, { status: 400 });
      }
      
      if (error instanceof Error && error.message === 'Timeout') {
        return json({
          success: false,
          error: { message: 'Erro temporário no servidor. Tente novamente em alguns instantes.' }
        }, { status: 503 });
      }
      
      return json({
        success: false,
        error: { message: 'Erro ao processar registro' }
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ Erro crítico register:', error);
    return json({
      success: false,
      error: { message: 'Erro ao processar registro' }
    }, { status: 500 });
  }
}; 