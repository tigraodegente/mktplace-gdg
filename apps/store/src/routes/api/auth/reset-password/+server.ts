import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';
import bcrypt from 'bcryptjs';

// GET - Verificar se token é válido
export const GET: RequestHandler = async ({ url, platform }) => {
  try {
    const token = url.searchParams.get('token');
    
    if (!token) {
      return json({
        success: false,
        error: { message: 'Token é obrigatório' }
      }, { status: 400 });
    }
    
    const result = await withDatabase(platform, async (db) => {
      // Buscar token no banco
      const resetRequest = await db.queryOne`
        SELECT 
          pr.id, pr.user_id, pr.expires_at, pr.used,
          u.email, u.name
        FROM password_resets pr
        JOIN users u ON pr.user_id = u.id
        WHERE pr.token = ${token}
      `;
      
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
    });
    
    if (!result.success) {
      return json(result, { status: result.status || 500 });
    }
    
    return json(result);
    
  } catch (error) {
    console.error('Erro ao verificar token de reset:', error);
    return json({
      success: false,
      error: { message: 'Erro interno do servidor' }
    }, { status: 500 });
  }
};

// POST - Resetar senha
export const POST: RequestHandler = async ({ request, platform }) => {
  try {
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
    
    const result = await withDatabase(platform, async (db) => {
      // Buscar token no banco
      const resetRequest = await db.queryOne`
        SELECT id, user_id, expires_at, used
        FROM password_resets
        WHERE token = ${token}
      `;
      
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
      
      // Gerar hash da nova senha
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(newPassword, salt);
      
      // Atualizar senha do usuário
      await db.execute`
        UPDATE users 
        SET password_hash = ${passwordHash}, updated_at = NOW()
        WHERE id = ${resetRequest.user_id}
      `;
      
      // Marcar token como usado
      await db.execute`
        UPDATE password_resets 
        SET used = true
        WHERE id = ${resetRequest.id}
      `;
      
      // Invalidar todas as sessões do usuário
      await db.execute`
        DELETE FROM sessions 
        WHERE user_id = ${resetRequest.user_id}
      `;
      
      return {
        success: true,
        message: 'Senha alterada com sucesso. Faça login com a nova senha'
      };
    });
    
    if (!result.success) {
      return json(result, { status: result.status || 500 });
    }
    
    return json(result);
    
  } catch (error) {
    console.error('Erro ao resetar senha:', error);
    return json({
      success: false,
      error: { message: 'Erro interno do servidor' }
    }, { status: 500 });
  }
}; 