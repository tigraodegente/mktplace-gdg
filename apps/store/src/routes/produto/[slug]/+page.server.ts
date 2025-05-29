import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

// Cache de produtos em memória (em produção usar Redis/Cloudflare KV)
const productCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export const load: PageServerLoad = async ({ params, fetch, setHeaders }) => {
  const { slug } = params;
  
  // Verificar cache
  const cached = productCache.get(slug);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    // Definir headers de cache
    setHeaders({
      'cache-control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=86400'
    });
    
    return {
      product: cached.data.product,
      relatedProducts: cached.data.relatedProducts
    };
  }
  
  try {
    // Buscar produto
    const productResponse = await fetch(`/api/products/${slug}`);
    const productData = await productResponse.json();
    
    if (!productData.success) {
      throw error(404, 'Produto não encontrado');
    }
    
    // Buscar produtos relacionados em paralelo
    const relatedPromise = fetch(`/api/products?category=${productData.data.category_id}&limit=8`)
      .then(res => res.json())
      .catch(() => ({ success: false, data: { products: [] } }));
    
    const relatedData = await relatedPromise;
    
    const result = {
      product: productData.data,
      relatedProducts: relatedData.success 
        ? relatedData.data.products.filter((p: any) => p.slug !== slug)
        : []
    };
    
    // Salvar no cache
    productCache.set(slug, {
      data: result,
      timestamp: Date.now()
    });
    
    // Limpar cache antigo
    if (productCache.size > 100) {
      const entries = Array.from(productCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      productCache.delete(entries[0][0]);
    }
    
    // Definir headers de cache
    setHeaders({
      'cache-control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=86400'
    });
    
    return result;
  } catch (err) {
    console.error('Erro ao carregar produto:', err);
    throw error(500, 'Erro ao carregar produto');
  }
}; 