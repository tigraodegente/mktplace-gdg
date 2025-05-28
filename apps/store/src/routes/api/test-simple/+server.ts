import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  return json({
    success: true,
    message: 'API funcionando!',
    timestamp: new Date().toISOString()
  });
}; 