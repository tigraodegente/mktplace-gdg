import { json } from '@sveltejs/kit';
import { TIMEOUT_CONFIG, withTimeout } from '$lib/config/timeouts';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

// Função de normalização simplificada
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .trim();
}

// Gerar variações simples
function generateSearchVariations(query: string): string[] {
  const normalized = normalizeText(query);
  const variations = new Set<string>([normalized, query.toLowerCase()]);
  
  // Variações comuns para português
  const accentVariations = normalized
    .replace(/a/g, '[aáàãâ]')
    .replace(/e/g, '[eéê]')
    .replace(/i/g, '[ií]')
    .replace(/o/g, '[oóôõ]')
    .replace(/u/g, '[uúü]')
    .replace(/c/g, '[cç]');
    
  variations.add(accentVariations);
  
  // Para fragmentos como "berc", adicionar completions
  if (normalized.endsWith('c') && normalized.length >= 3) {
    variations.add(normalized.slice(0, -1) + 'ç');
    variations.add(normalized.slice(0, -1) + 'ço');
  }
  
  return Array.from(variations).slice(0, 5);
}

export const GET: RequestHandler = async ({ url, platform }) => {
  try {
    console.log('🔍 Search Suggestions - Iniciada');
    
    const query = url.searchParams.get('q') || '';
    const limit = Math.min(Number(url.searchParams.get('limit')) || 10, 20);
    
    if (query.length < 2) {
      return json({
        success: true,
        data: { suggestions: [] }
      });
    }
    
    console.log(`🔍 Buscando sugestões para: "${query}"`);
    
    try {
      const db = getDatabase(platform);
      
      // STEP 1: Buscar produtos - usando a mesma lógica robusta da busca principal
      const productSuggestions = await db.query`
        SELECT id, name, slug, price, original_price, rating_average, sales_count
        FROM products
        WHERE (
          -- Busca original
          name ILIKE ${`%${query}%`} OR
          -- Busca normalizada robusta (mesma da busca principal)
          LOWER(TRANSLATE(name, 'áàãâäåæçéèêëíìîïñóòôõöøúùûüýÿ', 'aaaaaaaceeeeiiiinooooooouuuuyy')) 
          LIKE LOWER(TRANSLATE(${`%${query}%`}, 'áàãâäåæçéèêëíìîïñóòôõöøúùûüýÿ', 'aaaaaaaceeeeiiiinooooooouuuuyy'))
        )
        AND is_active = true 
        AND quantity > 0
        ORDER BY 
          CASE 
            WHEN LOWER(name) LIKE ${`${query.toLowerCase()}%`} THEN 0
            WHEN LOWER(name) LIKE ${`%${query.toLowerCase()}%`} THEN 1
            ELSE 2 
          END,
          sales_count DESC NULLS LAST
        LIMIT ${Math.min(limit, 8)}
      `;
      
      console.log(`🔍 Encontrados ${productSuggestions.length} produtos`);
      
      // STEP 2: Buscar categorias
      let categorySuggestions = [];
      try {
        categorySuggestions = await db.query`
          SELECT id, name, slug
          FROM categories
          WHERE (
            name ILIKE ${`%${query}%`} OR
            LOWER(TRANSLATE(name, 'áàãâäåæçéèêëíìîïñóòôõöøúùûüýÿ', 'aaaaaaaceeeeiiiinooooooouuuuyy')) 
            LIKE LOWER(TRANSLATE(${`%${query}%`}, 'áàãâäåæçéèêëíìîïñóòôõöøúùûüýÿ', 'aaaaaaaceeeeiiiinooooooouuuuyy'))
          )
          AND is_active = true
          ORDER BY CASE 
            WHEN LOWER(name) LIKE ${`${query.toLowerCase()}%`} THEN 0 
            ELSE 1 
          END
          LIMIT 3
        `;
      } catch (e) {
        console.log('Erro ao buscar categorias:', e);
      }
      
      // STEP 3: Buscar marcas
      let brandSuggestions = [];
      try {
        brandSuggestions = await db.query`
          SELECT id, name, slug
          FROM brands
          WHERE (
            name ILIKE ${`%${query}%`} OR
            LOWER(TRANSLATE(name, 'áàãâäåæçéèêëíìîïñóòôõöøúùûüýÿ', 'aaaaaaaceeeeiiiinooooooouuuuyy')) 
            LIKE LOWER(TRANSLATE(${`%${query}%`}, 'áàãâäåæçéèêëíìîïñóòôõöøúùûüýÿ', 'aaaaaaaceeeeiiiinooooooouuuuyy'))
          )
          AND is_active = true
          ORDER BY CASE 
            WHEN LOWER(name) LIKE ${`${query.toLowerCase()}%`} THEN 0 
            ELSE 1 
          END
          LIMIT 3
        `;
      } catch (e) {
        console.log('Erro ao buscar marcas:', e);
      }
      
      // STEP 4: Contar total
      let totalProducts = 0;
      try {
        const totalResult = await db.query`
          SELECT COUNT(*) as total
          FROM products
          WHERE (
            name ILIKE ${`%${query}%`} OR
            LOWER(TRANSLATE(name, 'áàãâäåæçéèêëíìîïñóòôõöøúùûüýÿ', 'aaaaaaaceeeeiiiinooooooouuuuyy')) 
            LIKE LOWER(TRANSLATE(${`%${query}%`}, 'áàãâäåæçéèêëíìîïñóòôõöøúùûüýÿ', 'aaaaaaaceeeeiiiinooooooouuuuyy'))
          )
          AND is_active = true 
          AND quantity > 0
        `;
        totalProducts = parseInt(totalResult[0]?.total || '0');
      } catch (e) {
        totalProducts = productSuggestions.length;
      }
      
      // Formatar sugestões
      const suggestions = [];
      
      // Buscar imagens em batch (mais eficiente)
      let productImages: any[] = [];
      if (productSuggestions.length > 0) {
        const productIds = productSuggestions.map((p: any) => p.id);
        productImages = await db.query`
          SELECT DISTINCT ON (product_id) product_id, url
          FROM product_images 
          WHERE product_id = ANY(${productIds})
          ORDER BY product_id, position ASC
        `;
      }
      
      // Mapear imagens
      const imageMap = new Map();
      productImages.forEach(img => {
        imageMap.set(img.product_id, img.url);
      });
      
      // Adicionar produtos
      productSuggestions.forEach((product: any) => {
        const discount = product.original_price && product.price < product.original_price
          ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
          : null;
          
        suggestions.push({
          type: 'product',
          id: product.id,
          text: product.name,
          slug: product.slug,
          image: imageMap.get(product.id) || null,
          price: Number(product.price),
          originalPrice: product.original_price ? Number(product.original_price) : undefined,
          discount,
          rating: product.rating_average ? Number(product.rating_average) : 4.5,
          soldCount: product.sales_count || 0
        });
      });
      
      // Adicionar categorias
      categorySuggestions.forEach((category: any) => {
        suggestions.push({
          type: 'category',
          id: category.id,
          text: category.name,
          slug: category.slug,
          count: 0 // Simplificado por enquanto
        });
      });
      
      // Adicionar marcas
      brandSuggestions.forEach((brand: any) => {
        suggestions.push({
          type: 'brand',
          id: brand.id,
          text: brand.name,
          slug: brand.slug,
          count: 0 // Simplificado por enquanto
        });
      });
      
      // Adicionar sugestão de busca geral se houver muitos resultados
      if (totalProducts > limit) {
        suggestions.unshift({
          type: 'query',
          id: query,
          text: `Buscar "${query}"`,
          count: totalProducts
        });
      }
      
      console.log(`✅ ${suggestions.length} sugestões encontradas para "${query}"`);
      
      return json({
        success: true,
        data: {
          suggestions,
          totalProducts
        },
        source: 'database'
      });
      
    } catch (error) {
      console.log(`⚠️ Erro search suggestions: ${error instanceof Error ? error.message : 'Erro'}`);
      
      return json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Não foi possível carregar as sugestões',
          details: 'Por favor, tente novamente em alguns instantes'
        }
      }, { status: 503 });
    }
    
  } catch (error) {
    console.error('❌ Erro crítico search suggestions:', error);
    return json({
      success: false,
      error: { message: 'Erro ao buscar sugestões' }
    }, { status: 500 });
  }
}; 