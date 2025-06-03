import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';
import bcrypt from 'bcryptjs';

export const POST: RequestHandler = async ({ request, platform }) => {
  try {
    const { email, password } = await request.json();
    
    console.log(`🔍 Debug Auth - Testando: ${email}`);
    
    const db = getDatabase(platform);
    
    // Buscar usuário
    console.log('🔍 Buscando usuário...');
    const users = await db.query`
      SELECT id, email, name, role, password_hash, status
      FROM users
      WHERE email = ${email}
      LIMIT 1
    `;
    
    const user = users[0];
    console.log('📋 Usuário encontrado:', user ? { email: user.email, status: user.status } : 'nenhum');
    
    if (!user) {
      return json({
        success: false,
        debug: 'user_not_found',
        message: 'Usuário não encontrado'
      });
    }
    
    // Testar senha
    console.log('🔑 Testando senha...');
    const isValid = await bcrypt.compare(password, user.password_hash);
    console.log('🔑 Senha válida:', isValid);
    
    // Verificar status
    console.log('✅ Status do usuário:', user.status);
    
    return json({
      success: true,
      debug: {
        user_found: true,
        password_valid: isValid,
        user_status: user.status,
        user_active: user.status === 'active'
      },
      message: 'Debug completo'
    });
    
  } catch (error) {
    console.error('❌ Erro no debug:', error);
    return json({
      success: false,
      debug: 'error',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}; 