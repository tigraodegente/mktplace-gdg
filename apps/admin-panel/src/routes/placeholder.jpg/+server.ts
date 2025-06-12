import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  // Redirecionar para o endpoint correto de placeholder
  throw redirect(302, '/api/placeholder/200/200?text=Imagem%20não%20encontrada');
}; 