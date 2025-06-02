/// <reference lib="webworker" />

const CACHE_NAME = 'marketplace-v1';
const STATIC_CACHE = 'static-v1';
const IMAGE_CACHE = 'images-v1';
const API_CACHE = 'api-v1';

// Recursos essenciais para cache inicial
const ESSENTIAL_FILES = [
  '/',
  '/manifest.json',
  '/offline',
  // Adicionar arquivos CSS/JS principais após build
];

// Estratégias de cache por tipo de recurso
const CACHE_STRATEGIES = {
  // Cache First - para assets estáticos
  static: [
    /\.(?:css|js|woff2?|ttf|otf)$/,
    /\/_app\/immutable\//
  ],
  
  // Network First - para HTML e API
  networkFirst: [
    /\.html$/,
    /\/$/,
    /\/api\/(?!placeholder)/
  ],
  
  // Cache First com atualização em background
  staleWhileRevalidate: [
    /\/api\/categories/,
    /\/api\/products\/featured/,
    /\/placeholder\.jpg/
  ],
  
  // Cache only para imagens
  cacheOnly: [
    /\/api\/placeholder\//,
    /\.(?:png|jpg|jpeg|svg|gif|webp)$/
  ]
};

// Instalar Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ESSENTIAL_FILES).catch((error) => {
        console.warn('Failed to cache essential files:', error);
      });
    })
  );
  
  // Ativar imediatamente
  self.skipWaiting();
});

// Ativar e limpar caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== STATIC_CACHE && name !== IMAGE_CACHE && name !== API_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  
  // Assumir controle imediato
  self.clients.claim();
});

// Interceptar requisições
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignorar requisições não-GET
  if (request.method !== 'GET') return;
  
  // Ignorar extensões do Chrome
  if (url.protocol === 'chrome-extension:') return;
  
  // Ignorar hot reload do dev
  if (url.pathname.includes('__vite') || url.pathname.includes('@vite')) return;
  
  // Determinar estratégia de cache
  const strategy = getStrategy(url, request);
  
  switch (strategy) {
    case 'static':
      event.respondWith(cacheFirst(request, STATIC_CACHE));
      break;
      
    case 'networkFirst':
      event.respondWith(networkFirst(request, CACHE_NAME));
      break;
      
    case 'staleWhileRevalidate':
      event.respondWith(staleWhileRevalidate(request, API_CACHE));
      break;
      
    case 'cacheOnly':
      event.respondWith(cacheFirst(request, IMAGE_CACHE));
      break;
      
    default:
      // Network only (sem cache)
      return;
  }
});

// Estratégias de cache
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) return cached;
  
  try {
    const response = await fetch(request);
    
    // Só cachear respostas válidas
    if (response.ok && response.status === 200) {
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // Retornar página offline se disponível
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match('/offline');
      if (offlinePage) return offlinePage;
    }
    
    throw error;
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    
    if (cached) return cached;
    
    // Página offline para navegação
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match('/offline');
      if (offlinePage) return offlinePage;
    }
    
    throw error;
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  // Atualizar cache em background
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  });
  
  // Retornar cache se disponível, senão aguardar fetch
  return cached || fetchPromise;
}

// Determinar estratégia baseada na URL
function getStrategy(url, request) {
  const pathname = url.pathname;
  
  // Verificar cada padrão
  for (const [strategy, patterns] of Object.entries(CACHE_STRATEGIES)) {
    for (const pattern of patterns) {
      if (pattern.test(pathname)) {
        return strategy;
      }
    }
  }
  
  // API padrão - network first
  if (pathname.startsWith('/api/')) {
    return 'networkFirst';
  }
  
  return null;
}

// Mensagens do cliente
self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((names) => {
      names.forEach((name) => caches.delete(name));
    });
  }
});

// Background sync para ações offline
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-cart') {
    event.waitUntil(syncCart());
  }
});

async function syncCart() {
  // Implementar sincronização do carrinho quando voltar online
  console.log('Syncing cart data...');
} 