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
    if (pathname.includes('/products') || pathname.includes('/categories')) {
      response.headers.set('cache-control', 'public, max-age=300, stale-while-revalidate=60');
    } else {
      response.headers.set('cache-control', 'private, max-age=0, must-revalidate');
    }
    response.headers.set('vary', 'Accept-Encoding, Origin');
  }

  // ========================================
  // HEADERS DE SEGURANÇA COMPLETOS
  // ========================================
  
  // Content Security Policy (CSP) - Proteção contra XSS
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://unpkg.com https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https: *.imgur.com *.cloudinary.com *.unsplash.com",
    "connect-src 'self' https://www.google-analytics.com https://api.marketplace-gdg.com https://vitals.vercel-analytics.com",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
    "block-all-mixed-content"
  ].join('; ');
  
  response.headers.set('content-security-policy', cspDirectives);
  
  // Strict Transport Security (HTTPS forçado)
  response.headers.set('strict-transport-security', 'max-age=63072000; includeSubDomains; preload');
  
  // Prevenção de clickjacking
  response.headers.set('x-frame-options', 'SAMEORIGIN');
  
  // Prevenção de MIME-type sniffing
  response.headers.set('x-content-type-options', 'nosniff');
  
  // Política de referrer
  response.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  
  // Política de permissões (Feature Policy)
  const permissionsPolicy = [
    'camera=()',
    'microphone=()',
    'geolocation=(self)',
    'payment=(self)',
    'usb=()',
    'magnetometer=()',
    'gyroscope=()',
    'speaker=(self)',
    'vibrate=(self)',
    'fullscreen=(self)',
    'sync-xhr=()'
  ].join(', ');
  
  response.headers.set('permissions-policy', permissionsPolicy);
  
  // Cross-Origin Embedder Policy
  response.headers.set('cross-origin-embedder-policy', 'require-corp');
  
  // Cross-Origin Opener Policy
  response.headers.set('cross-origin-opener-policy', 'same-origin');
  
  // Cross-Origin Resource Policy
  response.headers.set('cross-origin-resource-policy', 'same-origin');
  
  // Prevenção de XSS (backup para CSP)
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
