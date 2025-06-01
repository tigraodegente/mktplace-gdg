import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';
import bcrypt from 'bcryptjs';

// GET - Verificar se token é válido
export const GET: RequestHandler = async ({ url, platform }) => {
  try {
    console.log('🔑 Reset Password GET - Estratégia híbrida iniciada');
    
    const token = url.searchParams.get('token');
    
    if (!token) {
      return json({
        success: false,
        error: { message: 'Token é obrigatório' }
      }, { status: 400 });
    }
    
    // Tentar verificar token com timeout
    try {
      const db = getDatabase(platform);
      
      // Promise com timeout de 3 segundos
      const queryPromise = (async () => {
        // Query simplificada para verificar token
        const resetRequests = await db.query`
          SELECT pr.id, pr.user_id, pr.expires_at, pr.used, u.email, u.name
          FROM password_resets pr
          JOIN users u ON pr.user_id = u.id
          WHERE pr.token = ${token}
          LIMIT 1
        `;
        
        const resetRequest = resetRequests[0];
        if (!resetRequest) {
          return {
            success: false,
            error: { message: 'Token inválido' },
            status: 400
          };
        }
        
        // Verificar se já foi usado
        if (resetRequest.used) {
          return {
            success: false,
            error: { message: 'Token já foi utilizado' },
            status: 400
          };
        }
        
        // Verificar se expirou
        if (new Date(resetRequest.expires_at) < new Date()) {
          return {
            success: false,
            error: { message: 'Token expirado' },
            status: 400
          };
        }
        
        return {
          success: true,
          data: {
            email: resetRequest.email,
            name: resetRequest.name
          }
        };
      })();
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 3000)
      });
      
      const result = await Promise.race([queryPromise, timeoutPromise]) as any;
      
      if (!result.success) {
        return json(result, { status: result.status || 500 });
      }
      
      console.log(`✅ Token válido para: ${result.data.email}`);
      
      return json({
        ...result,
        source: 'database'
      });
      
    } catch (error) {
      console.log(`⚠️ Erro reset token verification: ${error instanceof Error ? error.message : 'Erro'} - negando acesso`);
      
      // FALLBACK SEGURO: sempre negar token em caso de timeout
      return json({
        success: false,
        error: { message: 'Erro temporário na verificação. Tente novamente.' }
      }, { status: 503 });
    }
    
  } catch (error) {
    console.error('❌ Erro crítico reset GET:', error);
    return json({
      success: false,
      error: { message: 'Erro interno do servidor' }
    }, { status: 500 });
  }
};

// POST - Resetar senha
export const POST: RequestHandler = async ({ request, platform }) => {
  try {
    console.log('🔑 Reset Password POST - Estratégia híbrida iniciada');
    
    const { token, newPassword } = await request.json();
    
    // Validações
    if (!token || !newPassword) {
      return json({
        success: false,
        error: { message: 'Token e nova senha são obrigatórios' }
      }, { status: 400 });
    }
    
    if (newPassword.length < 6) {
      return json({
        success: false,
        error: { message: 'A senha deve ter pelo menos 6 caracteres' }
      }, { status: 400 });
    }
    
    // Tentar resetar senha com timeout
    try {
      const db = getDatabase(platform);
      
      // Promise com timeout de 6 segundos (bcrypt pode ser lento)
      const queryPromise = (async () => {
        // STEP 1: Verificar token
        const resetRequests = await db.query`
          SELECT id, user_id, expires_at, used
          FROM password_resets
          WHERE token = ${token}
          LIMIT 1
        `;
        
        const resetRequest = resetRequests[0];
        if (!resetRequest) {
          return {
            success: false,
            error: { message: 'Token inválido' },
            status: 400
          };
        }
        
        // Verificar se já foi usado
        if (resetRequest.used) {
          return {
            success: false,
            error: { message: 'Token já foi utilizado' },
            status: 400
          };
        }
        
        // Verificar se expirou
        if (new Date(resetRequest.expires_at) < new Date()) {
          return {
            success: false,
            error: { message: 'Token expirado. Solicite um novo reset de senha' },
            status: 400
          };
        }
        
        // STEP 2: Gerar hash da nova senha (pode ser lento)
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);
        
        // STEP 3: Operações críticas síncronas
        await db.query`
          UPDATE users 
          SET password_hash = ${passwordHash}, updated_at = NOW()
          WHERE id = ${resetRequest.user_id}
        `;
        
        await db.query`
          UPDATE password_resets 
          SET used = true
          WHERE id = ${resetRequest.id}
        `;
        
        // STEP 4: Cleanup async (invalidar sessões)
        setTimeout(async () => {
          try {
            await db.query`DELETE FROM sessions WHERE user_id = ${resetRequest.user_id}`;
          } catch (e) {
            console.log('Session cleanup async failed:', e);
          }
        }, 100);
        
        return {
          success: true,
          message: 'Senha alterada com sucesso. Faça login com a nova senha'
        };
      })();
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 6000)
      });
      
      const result = await Promise.race([queryPromise, timeoutPromise]) as any;
      
      if (!result.success) {
        return json(result, { status: result.status || 500 });
      }
      
      console.log('✅ Senha resetada com sucesso');
      
      return json({
        ...result,
        source: 'database'
      });
      
    } catch (error) {
      console.log(`⚠️ Erro reset password: ${error instanceof Error ? error.message : 'Erro'} - negando operação`);
      
      // FALLBACK SEGURO: sempre negar reset em caso de timeout
      // (melhor negar do que permitir reset sem verificar token)
      return json({
        success: false,
        error: { message: 'Erro temporário no servidor. Tente novamente em alguns instantes.' }
      }, { status: 503 });
    }
    
  } catch (error) {
    console.error('❌ Erro crítico reset POST:', error);
    return json({
      success: false,
      error: { message: 'Erro interno do servidor' }
    }, { status: 500 });
  }
}; 