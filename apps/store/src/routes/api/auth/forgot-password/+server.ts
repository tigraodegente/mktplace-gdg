import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';
import { nanoid } from 'nanoid';

export const POST: RequestHandler = async ({ request, platform }) => {
  try {
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
    
    const result = await withDatabase(platform, async (db) => {
      // Buscar usuário pelo email
      const user = await db.queryOne`
        SELECT id, email, name, is_active 
        FROM users 
        WHERE email = ${email}
      `;
      
      // Sempre retorna sucesso para não vazar informações
      if (!user || !user.is_active) {
        return {
          success: true,
          message: 'Se o email existir, você receberá as instruções de recuperação'
        };
      }
      
      // Gerar token de reset
      const resetToken = nanoid(64);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // Expira em 1 hora
      
      // Salvar token no banco (criar tabela se não existir)
      await db.execute`
        CREATE TABLE IF NOT EXISTS password_resets (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token VARCHAR(255) UNIQUE NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          used BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `;
      
      // Invalidar tokens anteriores
      await db.execute`
        UPDATE password_resets 
        SET used = true 
        WHERE user_id = ${user.id} AND used = false
      `;
      
      // Criar novo token
      await db.execute`
        INSERT INTO password_resets (user_id, token, expires_at)
        VALUES (${user.id}, ${resetToken}, ${expiresAt})
      `;
      
      // TODO: Em produção, enviar email aqui
      console.log(`🔑 Token de reset para ${email}: ${resetToken}`);
      console.log(`🔗 Link: http://localhost:5173/reset-password?token=${resetToken}`);
      
      return {
        success: true,
        message: 'Se o email existir, você receberá as instruções de recuperação',
        // Em desenvolvimento, retornar o token para facilitar testes
        ...(process.env.NODE_ENV === 'development' && { resetToken })
      };
    });
    
    return json(result);
    
  } catch (error) {
    console.error('Erro ao processar recuperação de senha:', error);
    return json({
      success: false,
      error: { message: 'Erro interno do servidor' }
    }, { status: 500 });
  }
}; 