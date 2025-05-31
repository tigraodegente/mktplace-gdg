import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  // Headers de segurança e performance otimizados
  const response = await resolve(event, {
    preload: ({ type, path }) => {
      // Preload crítico para fonts, CSS e recursos essenciais
      if (type === 'font') return true;
      if (type === 'css') return true;
      if (path?.includes('/api/categories')) return true;
      if (path?.includes('/api/products/featured')) return true;
      return false;
    }
  });

  // Headers otimizados por tipo de conteúdo
  const contentType = response.headers.get('content-type') || '';
  const pathname = event.url.pathname;
  
  // Assets estáticos - cache muito longo
  if (pathname.match(/\.(js|css|woff2?|ttf|otf|png|jpg|jpeg|gif|svg|ico|webp)$/)) {
    response.headers.set('cache-control', 'public, max-age=31536000, immutable');
    response.headers.set('vary', 'Accept-Encoding');
    
    // Compressão para assets
    if (pathname.match(/\.(js|css|svg)$/)) {
      response.headers.set('content-encoding', 'gzip');
    }
  }
  
  // HTML - cache inteligente
  else if (contentType.includes('text/html')) {
    if (pathname === '/' || pathname.startsWith('/produto/')) {
      // Páginas importantes - cache médio
      response.headers.set('cache-control', 'public, max-age=600, stale-while-revalidate=300');
    } else {
      // Outras páginas - cache curto
      response.headers.set('cache-control', 'public, max-age=300, stale-while-revalidate=600');
    }
    response.headers.set('vary', 'Accept-Encoding, Accept');
  }
  
  // APIs - cache específico por endpoint
  else if (pathname.startsWith('/api/')) {
    if (pathname.includes('/products/featured') || pathname.includes('/categories')) {
      // APIs de dados estáveis - cache longo
      response.headers.set('cache-control', 'public, max-age=1800, stale-while-revalidate=900');
    } else if (pathname.includes('/products') || pathname.includes('/search')) {
      // APIs de produtos - cache médio
      response.headers.set('cache-control', 'public, max-age=300, stale-while-revalidate=60');
    } else if (pathname.includes('/auth') || pathname.includes('/orders')) {
      // APIs sensíveis - sem cache
      response.headers.set('cache-control', 'private, max-age=0, must-revalidate');
    } else {
      // APIs gerais - cache curto
      response.headers.set('cache-control', 'public, max-age=120, stale-while-revalidate=60');
    }
    response.headers.set('vary', 'Accept-Encoding, Origin, Authorization');
  }

  // Headers de segurança
  response.headers.set('x-frame-options', 'SAMEORIGIN');
  response.headers.set('x-content-type-options', 'nosniff');
  response.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  response.headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('x-xss-protection', '1; mode=block');
  
  // Performance hints
  response.headers.set('accept-ch', 'DPR, Viewport-Width, Width');
  response.headers.set('critical-ch', 'DPR');
  
  // Preload hints para recursos críticos
  if (contentType.includes('text/html')) {
    response.headers.set('link', [
      '</api/categories/tree>; rel=preload; as=fetch; crossorigin',
      '</api/products/featured>; rel=preload; as=fetch; crossorigin',
      '<https://fonts.googleapis.com>; rel=preconnect',
      '<https://fonts.gstatic.com>; rel=preconnect; crossorigin'
    ].join(', '));
  }

  return response;
};
