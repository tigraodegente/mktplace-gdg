// Configuração otimizada de cache
export const CACHE_CONFIG = {
  // Produtos em destaque - cache longo
  FEATURED_PRODUCTS: {
    ttl: 1800, // 30 minutos
    key: 'featured_products'
  },
  
  // Categorias - cache muito longo
  CATEGORIES: {
    ttl: 3600, // 1 hora
    key: 'categories_tree'
  },
  
  // Estatísticas da home - cache médio
  HOME_STATS: {
    ttl: 900, // 15 minutos
    key: 'home_stats'
  },
  
  // Busca de produtos - cache curto
  PRODUCT_SEARCH: {
    ttl: 300, // 5 minutos
    key: (params: string) => `search_${params}`
  },
  
  // Produto individual - cache médio
  PRODUCT_DETAIL: {
    ttl: 600, // 10 minutos
    key: (slug: string) => `product_${slug}`
  }
};

// Configuração de pre-loading
export const PRELOAD_CONFIG = {
  // Recursos para pre-carregar no app.html
  CRITICAL_RESOURCES: [
    '/api/categories/tree',
    '/api/products/featured?limit=8'
  ],
  
  // Recursos para pre-carregar no onMount
  SECONDARY_RESOURCES: [
    '/api/products?limit=20',
    '/api/products/popular'
  ]
};
