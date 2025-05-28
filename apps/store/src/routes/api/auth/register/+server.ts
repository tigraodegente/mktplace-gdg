import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getXataClient } from '$lib/config/xata';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

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
    
    // Criar novo usuário no Xata (sem ID - será gerado automaticamente)
    const newUser = await xata.db.users.create({
      email,
      password_hash: passwordHash,
      name,
      role,
      is_active: true,
      email_verified: false
    });
    
    // Se for vendedor, criar perfil de vendedor
    if (role === 'seller') {
      const slug = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now();
      
      await xata.db.sellers.create({
        user_id: newUser.id,
        company_name: name, // Usar o nome como nome da empresa inicialmente
        slug,
        description: `Loja de ${name}`,
        is_active: false, // Vendedor precisa ser aprovado
        is_verified: false,
        rating: 0,
        total_sales: 0
      });
    }
    
    // Criar sessão na tabela sessions
    const sessionToken = nanoid(32);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 dias
    
    await xata.db.sessions.create({
      user_id: newUser.id,
      token: sessionToken,
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
      expires_at: expiresAt
    });
    
    // Criar sessão no cookie
    cookies.set('session_token', sessionToken, {
      path: '/',
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 dias
    });
    
    // Também manter o cookie antigo para compatibilidade
    cookies.set('session', JSON.stringify({
      userId: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role
    }), {
      path: '/',
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7
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