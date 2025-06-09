import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

// Cache de produtos em memória (em produção usar Redis/Cloudflare KV)
const productCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export const load: PageServerLoad = async ({ params, fetch, platform }) => {
  const { slug } = params;
  
  try {
    console.log(`🔍 Loading product page for slug: ${slug}`);
  
  // Verificar cache
  const cached = productCache.get(slug);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      // Definir headers de cache (apenas se disponível - Cloudflare)
      if (platform && 'setHeaders' in platform && typeof (platform as any).setHeaders === 'function') {
        (platform as any).setHeaders({
      'cache-control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=86400'
    });
      }
    
    return {
      product: cached.data.product,
        relatedProducts: cached.data.relatedProducts,
        error: null,
        fallback: cached.data.fallback
    };
  }
  
    // Carregar produto com timeout e retry
    const productResponse = await fetch(`/api/products/${slug}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!productResponse.ok) {
      console.error(`❌ Product API failed: ${productResponse.status} ${productResponse.statusText}`);
      
      // Diferentes tratamentos baseados no status
      switch (productResponse.status) {
        case 404:
          throw error(404, 'Produto não encontrado');
        case 503:
          // Banco indisponível - retornar dados em cache ou erro amigável
          console.warn('⚠️ Banco indisponível, tentando cache...');
          return {
            product: null,
            relatedProducts: [],
            error: 'Serviço temporariamente indisponível. Tente novamente em alguns instantes.',
            fallback: true
          };
        default:
          throw error(500, 'Erro interno do servidor');
      }
    }
    
    const productData = await productResponse.json();
    
    if (!productData.success) {
      console.error('❌ Product API returned error:', productData.error);
      throw error(404, productData.error?.message || 'Produto não encontrado');
    }
    
    const product = productData.data;
    
    // Buscar produtos relacionados com fallback
    let relatedProducts = [];
    try {
      if (product.category_id) {
        const relatedResponse = await fetch(`/api/products?category=${product.category_id}&limit=4&exclude=${product.id}`, {
          headers: {
            'Accept': 'application/json'
          }
        });
        
        if (relatedResponse.ok) {
          const relatedData = await relatedResponse.json();
          if (relatedData.success) {
            relatedProducts = relatedData.data.products || [];
          }
        }
      }
    } catch (relatedError) {
      console.warn('⚠️ Erro ao buscar produtos relacionados, continuando sem eles:', relatedError);
      // Continuar sem produtos relacionados
    }
    
    console.log(`✅ Product loaded successfully: ${product.name}`);
    
    // Salvar no cache
    productCache.set(slug, {
      data: {
        product,
        relatedProducts,
        error: null,
        fallback: false
      },
      timestamp: Date.now()
    });
    
    // Limpar cache antigo
    if (productCache.size > 100) {
      const entries = Array.from(productCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      productCache.delete(entries[0][0]);
    }
    
    // Definir headers de cache (apenas se disponível - Cloudflare)
    if (platform && 'setHeaders' in platform && typeof (platform as any).setHeaders === 'function') {
      (platform as any).setHeaders({
      'cache-control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=86400'
    });
    }
    
    return {
      product,
      relatedProducts,
      error: null,
      fallback: false
    };
    
  } catch (err: any) {
    console.error('❌ Error in product page load:', err);
    
    // Se é um erro conhecido, re-throw
    if (err?.status) {
      throw err;
    }
    
    // Erro desconhecido - tratar como erro 500
    console.error('💥 Unexpected error:', err);
    throw error(500, 'Erro inesperado. Tente novamente em alguns instantes.');
  }
}; 