import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  // Redirecionar para o arquivo HTML estático offline
  // Evita que caia na rota [slug] que faz query no banco
  return new Response(null, {
    status: 302,
    headers: {
      'Location': '/offline.html',
      'Cache-Control': 'no-cache'
    }
  });
}; 