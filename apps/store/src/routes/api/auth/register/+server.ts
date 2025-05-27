import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getXataClient } from '$lib/xata';
import bcrypt from 'bcryptjs';

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
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
    
    // Verificar se email já existe no Xata
    const xata = getXataClient();
    const existingUser = await xata.db.users
      .filter({ email })
      .getFirst();
      
    if (existingUser) {
      return json({
        success: false,
        error: { message: 'Email já cadastrado' }
      }, { status: 400 });
    }
    
    // Criar hash da senha
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // Criar novo usuário no Xata
    const newUser = await xata.db.users.create({
      email,
      password_hash: passwordHash,
      name,
      role,
      is_active: true,
      email_verified: false,
      created_at: new Date().toISOString()
    });
    
    // Se for vendedor, criar perfil de vendedor
    if (role === 'seller') {
      await xata.db.sellers.create({
        user_id: newUser.id,
        name,
        email,
        slug: email.split('@')[0] + '-' + Date.now(),
        is_active: false, // Vendedor precisa ser aprovado
        commission_rate: 10, // Taxa padrão de 10%
        created_at: new Date().toISOString()
      });
    }
    
    // Criar sessão
    cookies.set('session', JSON.stringify({
      userId: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role
    }), {
      path: '/',
      httpOnly: true,
      secure: false, // mudar para true em produção
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 dias
    });
    
    return json({
      success: true,
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role
        }
      }
    });
    
  } catch (error) {
    console.error('Erro no registro:', error);
    return json({
      success: false,
      error: { message: 'Erro ao processar registro' }
    }, { status: 500 });
  }
}; 