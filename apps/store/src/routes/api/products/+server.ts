import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getXataClient } from '$lib/config/xata';
import { 
  normalizeSearchText, 
  extractSearchWords, 
  generateWordVariations,
  calculateRelevanceScore 
} from '$lib/utils/search';

export const GET: RequestHandler = async ({ url }) => {
  try {
    const xata = getXataClient();
    
    // Parâmetros de busca com validação
    const searchQuery = url.searchParams.get('q')?.trim() || '';
    const categories = url.searchParams.get('categoria')?.split(',').filter(Boolean) || [];
    const brands = url.searchParams.get('marca')?.split(',').filter(Boolean) || [];
    const tags = url.searchParams.get('tag')?.split(',').filter(Boolean) || [];
    const priceMin = url.searchParams.get('preco_min') ? Number(url.searchParams.get('preco_min')) : undefined;
    const priceMax = url.searchParams.get('preco_max') ? Number(url.searchParams.get('preco_max')) : undefined;
    const hasDiscount = url.searchParams.get('promocao') === 'true';
    const hasFreeShipping = url.searchParams.get('frete_gratis') === 'true';
    const inStock = url.searchParams.get('disponivel') !== 'false';
    const minRating = url.searchParams.get('avaliacao') ? Number(url.searchParams.get('avaliacao')) : undefined;
    const sortBy = url.searchParams.get('ordenar') || 'relevancia';
    const page = Math.max(1, Number(url.searchParams.get('pagina')) || 1);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('itens')) || 20));
    
    // Validar parâmetros
    if (priceMin !== undefined && priceMax !== undefined && priceMin > priceMax) {
      return json({
        success: false,
        error: { message: 'Preço mínimo não pode ser maior que o máximo' }
      }, { status: 400 });
    }
    
    // Construir filtros base
    const filters: any = {
      is_active: true
    };
    
    if (inStock) {
      filters.quantity = { $gt: 0 };
    }
    
    if (categories.length > 0) {
      filters.category_id = { $any: categories };
    }
    
    if (brands.length > 0) {
      filters.brand_id = { $any: brands };
    }
    
    if (priceMin !== undefined || priceMax !== undefined) {
      filters.price = {};
      if (priceMin !== undefined) filters.price.$gte = priceMin;
      if (priceMax !== undefined) filters.price.$lte = priceMax;
    }
    
    if (minRating) {
      filters.rating_average = { $gte: minRating };
    }
    
    if (hasDiscount) {
      filters.$all = [
        { original_price: { $exists: true } },
        { original_price: { $gt: 0 } },
        { price: { $lt: { $ref: 'original_price' } } }
      ];
    }
    
    // Processar busca por texto
    let searchWords: string[] = [];
    if (searchQuery) {
      // Extrair palavras relevantes (remove stop words)
      searchWords = extractSearchWords(searchQuery);
      
      if (searchWords.length > 0) {
        // Para cada palavra, criar condições com variações
        const wordConditions = searchWords.map(word => {
          const variations = generateWordVariations(word);
          
          // Criar condições OR para cada variação
          return {
            $any: variations.flatMap(variation => [
              { name: { $icontains: variation } },
              { description: { $icontains: variation } },
              { tags: { $includes: variation } }
            ])
          };
        });
        
        // Se múltiplas palavras, todas devem estar presentes
        if (wordConditions.length > 1) {
          // Combinar com filtros existentes se houver
          if (filters.$all) {
            filters.$all = [...filters.$all, ...wordConditions];
          } else {
            filters.$all = wordConditions;
          }
        } else {
          // Uma única palavra
          filters.$any = wordConditions[0].$any;
        }
      }
    }
    
    // Construir query
    let query = xata.db.products
      .filter(filters)
      .select(['*']);
    
    // Ordenação
    if (sortBy === 'relevancia' && searchWords.length > 0) {
      // Para relevância com busca, vamos buscar todos e ordenar depois
      // (limitado a 1000 produtos para performance)
      const allResults = await query.getMany({ pagination: { size: 1000 } });
      
      // Calcular scores e ordenar
      const scoredProducts = allResults.map(product => ({
        ...product,
        relevanceScore: calculateRelevanceScore(product, searchWords)
      }));
      
      scoredProducts.sort((a, b) => b.relevanceScore - a.relevanceScore);
      
      // Paginar manualmente
      const start = (page - 1) * limit;
      const paginatedProducts = scoredProducts.slice(start, start + limit);
      
      // Buscar imagens
      const productIds = paginatedProducts.map(p => p.id);
      const images = await fetchProductImages(xata, productIds);
      
      // Formatar produtos
      const products = formatProducts(paginatedProducts, images);
      
      // Buscar facetas em paralelo
      const [facets, totalCount] = await Promise.all([
        fetchFacets(xata, filters),
        xata.db.products.filter(filters).summarize({
          summaries: { count: { count: '*' } }
        }).then(r => r.summaries[0]?.count || 0)
      ]);
      
      return json({
        success: true,
        data: {
          products,
          totalCount,
          page,
          limit,
          facets
        }
      });
      
    } else {
      // Ordenação padrão
      switch (sortBy) {
        case 'menor-preco':
          query = query.sort('price', 'asc');
          break;
        case 'maior-preco':
          query = query.sort('price', 'desc');
          break;
        case 'mais-vendidos':
          query = query.sort('sales_count', 'desc');
          break;
        case 'melhor-avaliados':
          query = query.sort('rating_average', 'desc').sort('rating_count', 'desc');
          break;
        case 'lancamentos':
          query = query.sort('created_at', 'desc');
          break;
        default:
          query = query.sort('featured', 'desc').sort('sales_count', 'desc');
      }
      
      // Paginação
      const offset = (page - 1) * limit;
      const results = await query.getPaginated({
        pagination: { size: limit, offset }
      });
      
      // Buscar dados complementares em paralelo
      const [images, facets, totalCount] = await Promise.all([
        fetchProductImages(xata, results.records.map(p => p.id)),
        fetchFacets(xata, filters),
        xata.db.products.filter(filters).summarize({
          summaries: { count: { count: '*' } }
        }).then(r => r.summaries[0]?.count || 0)
      ]);
      
      // Formatar produtos
      const products = formatProducts(results.records, images);
      
      return json({
        success: true,
        data: {
          products,
          totalCount,
          page,
          limit,
          facets
        }
      });
    }
    
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    return json({
      success: false,
      error: { 
        message: 'Erro ao buscar produtos',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      }
    }, { status: 500 });
  }
};

// Funções auxiliares
async function fetchProductImages(xata: any, productIds: string[]) {
  if (productIds.length === 0) return {};
  
  const images = await xata.db.product_images
    .filter({ product_id: { $any: productIds } })
    .sort('display_order', 'asc')
    .getAll();
  
  // Agrupar por produto
  return images.reduce((acc: any, img: any) => {
    const productId = typeof img.product_id === 'string' ? img.product_id : img.product_id?.id || '';
    if (!acc[productId]) acc[productId] = [];
    acc[productId].push(img.image_url);
    return acc;
  }, {});
}

function formatProducts(products: any[], imagesByProduct: any) {
  return products.map(product => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    price: Number(product.price),
    original_price: product.original_price ? Number(product.original_price) : undefined,
    discount: product.original_price && product.price < product.original_price
      ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
      : undefined,
    images: imagesByProduct[product.id] || [],
    image: imagesByProduct[product.id]?.[0] || '',
    category_id: product.category_id,
    brand_id: product.brand_id,
    seller_id: product.seller_id,
    is_active: product.is_active,
    stock: product.quantity,
    rating: product.rating_average ? Number(product.rating_average) : undefined,
    reviews_count: product.rating_count,
    sold_count: product.sales_count,
    tags: product.tags || [],
    created_at: product.created_at,
    updated_at: product.updated_at,
    has_free_shipping: product.attributes?.free_shipping || false,
    is_featured: product.featured || false
  }));
}

async function fetchFacets(xata: any, baseFilters: any) {
  // Buscar categorias e marcas com contagem otimizada
  const [categoriesData, brandsData] = await Promise.all([
    xata.db.categories
      .filter({ is_active: true })
      .select(['id', 'name'])
      .getMany({ pagination: { size: 50 } }),
    xata.db.brands
      .filter({ is_active: true })
      .select(['id', 'name'])
      .getMany({ pagination: { size: 20 } })
  ]);
  
  // Contar produtos apenas para categorias/marcas retornadas
  const [categoryCountsMap, brandCountsMap] = await Promise.all([
    countProductsByField(xata, 'category_id', categoriesData.map(c => c.id)),
    countProductsByField(xata, 'brand_id', brandsData.map(b => b.id))
  ]);
  
  // Montar facetas com contagem
  const categories = categoriesData
    .map(cat => ({
      id: cat.id,
      name: cat.name,
      count: categoryCountsMap[cat.id] || 0
    }))
    .filter(c => c.count > 0)
    .sort((a, b) => b.count - a.count);
  
  const brands = brandsData
    .map(brand => ({
      id: brand.id,
      name: brand.name,
      count: brandCountsMap[brand.id] || 0
    }))
    .filter(b => b.count > 0)
    .sort((a, b) => b.count - a.count);
  
  return {
    categories,
    brands,
    priceRanges: [],
    tags: []
  };
}

async function countProductsByField(xata: any, field: string, values: string[]) {
  if (values.length === 0) return {};
  
  // Fazer contagens em paralelo
  const counts = await Promise.all(
    values.map(async value => {
      const count = await xata.db.products
        .filter({
          is_active: true,
          [field]: value
        })
        .summarize({
          summaries: { count: { count: '*' } }
        })
        .then((r: any) => r.summaries[0]?.count || 0);
      
      return { value, count };
    })
  );
  
  // Converter para mapa
  return counts.reduce((acc, { value, count }) => {
    acc[value] = count;
    return acc;
  }, {} as Record<string, number>);
} 