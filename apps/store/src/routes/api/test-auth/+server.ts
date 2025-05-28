import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getXataClient } from '$lib/config/xata';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

export const GET: RequestHandler = async () => {
  try {
    const xata = getXataClient();
    
    // Testar conexão listando usuários
    const users = await xata.db.users
      .select(['id', 'email', 'name'])
      .getMany({ pagination: { size: 5 } });
    
    return json({
      success: true,
      data: {
        message: 'Conexão com Xata OK',
        userCount: users.length,
        users: users.map(u => ({
          id: u.id,
          email: u.email,
          name: u.name
        }))
      }
    });
  } catch (error) {
    console.error('Erro ao testar Xata:', error);
    return json({
      success: false,
      error: {
        message: 'Erro ao conectar com Xata',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      }
    }, { status: 500 });
  }
};

export const POST: RequestHandler = async () => {
  try {
    const xata = getXataClient();
    
    // Gerar dados de teste
    const testEmail = `test_${Date.now()}@example.com`;
    const passwordHash = await bcrypt.hash('123456', 10);
    
    console.log('Tentando criar usuário:', { email: testEmail });
    
    // Criar usuário sem especificar ID
    const newUser = await xata.db.users.create({
      email: testEmail,
      password_hash: passwordHash,
      name: 'Teste Debug',
      role: 'customer',
      is_active: true,
      email_verified: false
    });
    
    console.log('Usuário criado:', newUser);
    
    return json({
      success: true,
      data: {
        message: 'Usuário de teste criado',
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name
        }
      }
    });
  } catch (error) {
    console.error('Erro detalhado ao criar usuário:', error);
    return json({
      success: false,
      error: {
        message: 'Erro ao criar usuário',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined
      }
    }, { status: 500 });
  }
}; 