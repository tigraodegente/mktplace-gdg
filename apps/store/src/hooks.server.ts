import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  // Headers de segurança e performance
  const response = await resolve(event, {
    preload: ({ type }) => type === 'font' || type === 'css'
  });

  // Headers otimizados para diferentes tipos de conteúdo
  const contentType = response.headers.get('content-type') || '';
  
  // Assets estáticos - cache longo
  if (event.url.pathname.match(/\.(js|css|woff2?|ttf|otf|png|jpg|jpeg|gif|svg|ico)$/)) {
    response.headers.set('cache-control', 'public, max-age=31536000, immutable');
    response.headers.set('vary', 'Accept-Encoding');
  }
  
  // HTML - cache curto com revalidação
  else if (contentType.includes('text/html')) {
    response.headers.set('cache-control', 'public, max-age=300, stale-while-revalidate=600');
    response.headers.set('vary', 'Accept-Encoding, Accept');
  }
  
  // API - cache baseado no endpoint
  else if (event.url.pathname.startsWith('/api/')) {
    if (event.url.pathname.includes('/products') || event.url.pathname.includes('/categories')) {
      response.headers.set('cache-control', 'public, max-age=300, stale-while-revalidate=60');
    } else {
      response.headers.set('cache-control', 'private, max-age=0, must-revalidate');
    }
    response.headers.set('vary', 'Accept-Encoding, Origin');
  }

  // Headers de segurança
  response.headers.set('x-frame-options', 'SAMEORIGIN');
  response.headers.set('x-content-type-options', 'nosniff');
  response.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  response.headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=()');
  
  // Habilitar compressão Brotli (Cloudflare faz automaticamente, mas podemos dar hints)
  response.headers.set('accept-encoding', 'br, gzip, deflate');

  return response;
}; 