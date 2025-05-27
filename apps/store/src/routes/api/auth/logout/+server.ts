import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
  // Remover cookie de sessão
  cookies.delete('session', { path: '/' });
  
  return json({
    success: true,
    message: 'Logout realizado com sucesso'
  });
}; 