import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { 
  searchProductsOptimized, 
  getOptimizedCategoryFacets,
  searchWithCursor,
  warmUpCache 
} from '$lib/services/optimizedSearchService';

// Aquecer cache ao iniciar
warmUpCache();

export const GET: RequestHandler = async ({ url, platform }) => {
  try {
    // Parâmetros de busca
    const searchQuery = url.searchParams.get('q')?.trim() || '';
    const cursor = url.searchParams.get('cursor');
    const page = Math.max(1, Number(url.searchParams.get('pagina')) || 1);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('itens')) || 20));
    
    // Filtros
    const filters = {
      categories: url.searchParams.get('categoria')?.split(',').filter(Boolean) || [],
      brands: url.searchParams.get('marca')?.split(',').filter(Boolean) || [],
      priceRange: url.searchParams.get('faixa_preco') || null,
      minRating: url.searchParams.get('avaliacao') ? Number(url.searchParams.get('avaliacao')) : null,
      hasDiscount: url.searchParams.get('promocao') === 'true',
      hasFreeShipping: url.searchParams.get('frete_gratis') === 'true',
      inStock: url.searchParams.get('disponivel') !== 'false'
    };
    
    // Usar paginação por cursor se disponível
    if (cursor && page === 1) {
      const result = await searchWithCursor(cursor, limit, filters, platform);
      
      return json({
        success: true,
        data: {
          products: result.items,
          nextCursor: result.nextCursor,
          hasMore: result.hasMore,
          page: 1,
          limit
        }
      });
    }
    
    // Busca otimizada normal
    const result = await searchProductsOptimized(
      searchQuery,
      filters,
      page,
      limit,
      platform
    );
    
    // Buscar facetas em paralelo
    const facets = await getOptimizedCategoryFacets(filters, platform);
    
    return json({
      success: true,
      data: {
        ...result,
        facets: {
          categories: facets,
          // Outras facetas podem ser adicionadas aqui
        }
      }
    });
    
  } catch (error) {
    console.error('Erro na busca otimizada:', error);
    return json({
      success: false,
      error: { 
        message: 'Erro ao buscar produtos',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      }
    }, { status: 500 });
  }
}; 