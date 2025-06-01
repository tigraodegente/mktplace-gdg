import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';
import { nanoid } from 'nanoid';

export const POST: RequestHandler = async ({ request, platform }) => {
  try {
    console.log('🔑 Auth Forgot Password - Estratégia híbrida iniciada');
    
    const { email } = await request.json();
    
    // Validar email
    if (!email) {
      return json({
        success: false,
        error: { message: 'Email é obrigatório' }
      }, { status: 400 });
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return json({
        success: false,
        error: { message: 'Email inválido' }
      }, { status: 400 });
    }
    
    // Tentar processar recuperação com timeout
    try {
      const db = getDatabase(platform);
      
      // Promise com timeout de 4 segundos
      const queryPromise = (async () => {
        // STEP 1: Buscar usuário (query simples)
        const users = await db.query`
          SELECT id, email, name, status 
          FROM users 
          WHERE email = ${email}
          LIMIT 1
        `;
        
        const user = users[0];
        
        // Sempre retorna sucesso para não vazar informações
        if (!user || user.status !== 'active') {
          return {
            success: true,
            message: 'Se o email existir, você receberá as instruções de recuperação'
          };
        }
        
        // STEP 2: Gerar token de reset
        const resetToken = nanoid(64);
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1);
        
        // STEP 3: Operações críticas síncronas
        await db.query`
          INSERT INTO password_resets (user_id, token, expires_at)
          VALUES (${user.id}, ${resetToken}, ${expiresAt})
          ON CONFLICT (token) DO NOTHING
        `;
        
        // STEP 4: Operações não-críticas async
        setTimeout(async () => {
          try {
            // Invalidar tokens anteriores
            await db.query`
              UPDATE password_resets 
              SET used = true 
              WHERE user_id = ${user.id} AND used = false AND token != ${resetToken}
            `;
            
            // Adicionar email à fila
            const baseUrl = process.env.APP_URL || process.env.PUBLIC_APP_URL || 'http://localhost:5173';
            const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
            
            await db.query`
              INSERT INTO email_queue (to_email, to_name, subject, template, template_data)
              VALUES (
                ${user.email}, ${user.name}, 
                'Recuperação de senha - Marketplace GDG',
                'password_reset',
                ${JSON.stringify({
                  user_name: user.name,
                  reset_url: resetUrl,
                  expires_in: '1 hora'
                })}
              )
            `;
          } catch (e) {
            console.log('Email queue async failed:', e);
          }
        }, 100);
        
        // Log para desenvolvimento
        if (process.env.NODE_ENV === 'development') {
          const baseUrl = process.env.APP_URL || 'http://localhost:5173';
          const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
          console.log(`🔑 Token de reset para ${email}: ${resetToken}`);
          console.log(`🔗 Link: ${resetUrl}`);
          
          return {
            success: true,
            message: 'Se o email existir, você receberá as instruções de recuperação',
            resetToken,
            resetUrl
          };
        }
        
        return {
          success: true,
          message: 'Se o email existir, você receberá as instruções de recuperação'
        };
      })();
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 4000)
      });
      
      const result = await Promise.race([queryPromise, timeoutPromise]) as any;
      
      console.log(`✅ Forgot password OK para ${email}`);
      
      return json({
        ...result,
        source: 'database'
      });
      
    } catch (error) {
      console.log(`⚠️ Erro forgot-password: ${error instanceof Error ? error.message : 'Erro'} - usando fallback`);
      
      // FALLBACK SEGURO: sempre retornar sucesso (não vazar informações)
      return json({
        success: true,
        message: 'Se o email existir, você receberá as instruções de recuperação',
        source: 'fallback'
      });
    }
    
  } catch (error) {
    console.error('❌ Erro crítico forgot-password:', error);
    return json({
      success: false,
      error: { message: 'Erro interno do servidor' }
    }, { status: 500 });
  }
}; 