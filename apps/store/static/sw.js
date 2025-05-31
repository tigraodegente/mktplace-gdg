// Service Worker Marketplace GDG - Versão Otimizada
const CACHE_VERSION = 'v1.2.0';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;
const IMAGE_CACHE = `images-${CACHE_VERSION}`;

// URLs críticas para cache estático
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// APIs importantes para cache
const API_ENDPOINTS = [
  '/api/categories/tree',
  '/api/products/featured',
  '/api/products/popular'
];

// ===========================================
// INSTALAÇÃO DO SERVICE WORKER
// ===========================================
self.addEventListener('install', (event) => {
  console.log('📦 SW: Instalando service worker...');
  
  event.waitUntil(
    Promise.all([
      // Cache estático crítico
      caches.open(STATIC_CACHE).then(cache => {
        return cache.addAll(STATIC_ASSETS);
      }),
      
      // Pre-cache APIs importantes
      caches.open(API_CACHE).then(cache => {
        return Promise.allSettled(
          API_ENDPOINTS.map(url => 
            fetch(url).then(response => {
              if (response.ok) {
                return cache.put(url, response);
              }
            }).catch(() => {}) // Falhas silenciosas no pre-cache
          )
        );
      })
    ])
  );
  
  // Ativar imediatamente
  self.skipWaiting();
});

// ===========================================
// ATIVAÇÃO DO SERVICE WORKER
// ===========================================
self.addEventListener('activate', (event) => {
  console.log('🔄 SW: Ativando service worker...');
  
  event.waitUntil(
    Promise.all([
      // Limpar caches antigos
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== API_CACHE && 
                cacheName !== IMAGE_CACHE) {
              console.log('🗑️ SW: Removendo cache antigo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // Tomar controle de todas as abas
      self.clients.claim()
    ])
  );
});

// ===========================================
// INTERCEPTAÇÃO DE REQUESTS
// ===========================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignorar requests non-GET e de outros domínios
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }
  
  // Estratégias por tipo de conteúdo
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
  } else if (isImageRequest(request)) {
    event.respondWith(handleImageRequest(request));
  } else if (isStaticAsset(request)) {
    event.respondWith(handleStaticAsset(request));
  } else {
    event.respondWith(handlePageRequest(request));
  }
});

// ===========================================
// HANDLERS DE DIFERENTES TIPOS DE REQUEST
// ===========================================

// API Requests - Cache First com fallback
async function handleApiRequest(request) {
  const cache = await caches.open(API_CACHE);
  const cachedResponse = await cache.match(request);
  
  // Cache first para dados que mudam pouco
  if (cachedResponse && isLongCacheableApi(request.url)) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache apenas responses OK
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Fallback para cache em caso de erro de rede
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Resposta offline para APIs críticas
    return new Response(JSON.stringify({
      success: false,
      error: { message: 'Sem conexão', code: 'OFFLINE' }
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Imagens - Cache First com compressão
async function handleImageRequest(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Placeholder para imagens offline
    return new Response(`
      <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f3f4f6"/>
        <text x="50%" y="50%" text-anchor="middle" dy="0.3em" 
              font-family="Arial" font-size="18" fill="#9ca3af">
          Imagem indisponível
        </text>
      </svg>
    `, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-cache'
      }
    });
  }
}

// Assets Estáticos - Cache First
async function handleStaticAsset(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    return new Response('Asset não disponível offline', { status: 503 });
  }
}

// Páginas HTML - Network First com fallback
async function handlePageRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Buscar no cache
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Página offline
    return caches.match('/offline.html') || new Response(`
      <!DOCTYPE html>
      <html>
        <head><title>Offline - Marketplace GDG</title></head>
        <body>
          <h1>Você está offline</h1>
          <p>Verifique sua conexão e tente novamente.</p>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// ===========================================
// BACKGROUND SYNC
// ===========================================
self.addEventListener('sync', (event) => {
  console.log('🔄 SW: Background sync:', event.tag);
  
  if (event.tag === 'cart-sync') {
    event.waitUntil(syncCart());
  } else if (event.tag === 'analytics-sync') {
    event.waitUntil(syncAnalytics());
  }
});

async function syncCart() {
  try {
    // Sincronizar carrinho quando voltar online
    const cart = await getStoredCart();
    if (cart && cart.items.length > 0) {
      await fetch('/api/cart/sync', {
        method: 'POST',
        body: JSON.stringify(cart)
      });
    }
  } catch (error) {
    console.error('Erro ao sincronizar carrinho:', error);
  }
}

async function syncAnalytics() {
  try {
    // Enviar eventos analytics pendentes
    const pendingEvents = await getPendingAnalytics();
    for (const event of pendingEvents) {
      await fetch('/api/analytics', {
        method: 'POST',
        body: JSON.stringify(event)
      });
    }
    await clearPendingAnalytics();
  } catch (error) {
    console.error('Erro ao sincronizar analytics:', error);
  }
}

// ===========================================
// PUSH NOTIFICATIONS
// ===========================================
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    image: data.image,
    tag: data.tag || 'marketplace-notification',
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [],
    data: data.data || {}
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  const { notification, action } = event;
  const data = notification.data;
  
  notification.close();
  
  let url = '/';
  
  if (action === 'view') {
    url = data.url || '/';
  } else if (data.url) {
    url = data.url;
  }
  
  event.waitUntil(
    clients.openWindow(url)
  );
});

// ===========================================
// FUNÇÕES UTILITÁRIAS
// ===========================================
function isImageRequest(request) {
  return request.destination === 'image' || 
         /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(request.url);
}

function isStaticAsset(request) {
  return /\.(js|css|woff2?|ttf|otf)$/i.test(request.url);
}

function isLongCacheableApi(url) {
  return url.includes('/categories') || 
         url.includes('/products/featured') || 
         url.includes('/products/popular');
}

async function getStoredCart() {
  // Implementar recuperação do carrinho do IndexedDB
  return null;
}

async function getPendingAnalytics() {
  // Implementar recuperação de eventos analytics pendentes
  return [];
}

async function clearPendingAnalytics() {
  // Implementar limpeza de eventos enviados
}

// ===========================================
// LIMPEZA AUTOMÁTICA DE CACHE
// ===========================================
setInterval(() => {
  cleanupCaches();
}, 24 * 60 * 60 * 1000); // Diário

async function cleanupCaches() {
  const imageCache = await caches.open(IMAGE_CACHE);
  const keys = await imageCache.keys();
  
  // Manter apenas os últimos 100 imagens
  if (keys.length > 100) {
    const toDelete = keys.slice(100);
    await Promise.all(toDelete.map(key => imageCache.delete(key)));
  }
} 