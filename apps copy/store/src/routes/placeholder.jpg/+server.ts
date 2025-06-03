import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  // Redirecionar para o endpoint de placeholder com tamanho padrão
  throw redirect(302, '/api/placeholder/300/300?text=Produto');
}; 