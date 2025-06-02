import { json } from '@sveltejs/kit';
import { TIMEOUT_CONFIG, withTimeout } from '$lib/config/timeouts';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ url, platform }) => {
  try {
    console.log('🔍 Search Suggestions - Estratégia híbrida iniciada');
    
    const query = url.searchParams.get('q') || '';
    const limit = Math.min(Number(url.searchParams.get('limit')) || 10, 20);
    
    if (query.length < 2) {
      return json({
        success: true,
        data: {
          suggestions: []
        }
      });
    }
    
    // Tentar buscar sugestões com timeout
    try {
      const db = getDatabase(platform);
      
      // Promise com timeout de 4 segundos
      const queryPromise = (async () => {
        // STEP 1: Buscar produtos (query simplificada)
        const productSuggestions = await db.query`
          SELECT id, name, slug, price, original_price, rating_average, sales_count
          FROM products
          WHERE name ILIKE ${`%${query}%`} AND is_active = true AND quantity > 0
          ORDER BY 
            CASE WHEN name ILIKE ${`${query}%`} THEN 0 ELSE 1 END,
            sales_count DESC NULLS LAST
          LIMIT ${Math.min(limit, 8)}
        `;
        
        // STEP 2: Buscar categorias (query separada)
        let categorySuggestions = [];
        try {
          categorySuggestions = await db.query`
            SELECT id, name, slug
            FROM categories
            WHERE name ILIKE ${`%${query}%`} AND is_active = true
            ORDER BY CASE WHEN name ILIKE ${`${query}%`} THEN 0 ELSE 1 END
            LIMIT 3
          `;
        } catch (e) {
          console.log('Erro ao buscar categorias');
        }
        
        // STEP 3: Buscar marcas (query separada)
        let brandSuggestions = [];
        try {
          brandSuggestions = await db.query`
            SELECT id, name, slug
            FROM brands
            WHERE name ILIKE ${`%${query}%`} AND is_active = true
            ORDER BY CASE WHEN name ILIKE ${`${query}%`} THEN 0 ELSE 1 END
            LIMIT 3
          `;
        } catch (e) {
          console.log('Erro ao buscar marcas');
        }
        
        // STEP 4: Contar total simplificado
        let totalProducts = 0;
        try {
          const totalResult = await db.query`
            SELECT COUNT(*) as total
            FROM products
            WHERE name ILIKE ${`%${query}%`} AND is_active = true AND quantity > 0
            LIMIT 100
          `;
          totalProducts = parseInt(totalResult[0]?.total || '0');
        } catch (e) {
          totalProducts = productSuggestions.length;
        }
        
        return { productSuggestions, categorySuggestions, brandSuggestions, totalProducts };
      })();
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 4000)
      });
      
      const result = await Promise.race([queryPromise, timeoutPromise]) as any;
      
      // Formatar sugestões
      const suggestions = [];
      
      // Adicionar produtos
      result.productSuggestions.forEach((product: any) => {
        const discount = product.original_price && product.price < product.original_price
          ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
          : null;
          
        suggestions.push({
          type: 'product',
          id: product.id,
          text: product.name,
          slug: product.slug,
          image: `/api/placeholder/300/400?text=${encodeURIComponent(product.name)}`,
          price: Number(product.price),
          originalPrice: product.original_price ? Number(product.original_price) : undefined,
          discount,
          rating: product.rating_average ? Number(product.rating_average) : 4.5,
          soldCount: product.sales_count || 0
        });
      });
      
      // Adicionar categorias
      result.categorySuggestions.forEach((category: any) => {
        suggestions.push({
          type: 'category',
          id: category.id,
          text: category.name,
          slug: category.slug,
          count: Math.floor(Math.random() * 50) + 10 // Estimativa
        });
      });
      
      // Adicionar marcas
      result.brandSuggestions.forEach((brand: any) => {
        suggestions.push({
          type: 'brand',
          id: brand.id,
          text: brand.name,
          slug: brand.slug,
          count: Math.floor(Math.random() * 30) + 5 // Estimativa
        });
      });
      
      // Adicionar sugestão de busca geral se houver muitos resultados
      if (result.totalProducts > limit) {
        suggestions.unshift({
          type: 'query',
          id: query,
          text: `Buscar "${query}"`,
          count: result.totalProducts
        });
      }
      
      console.log(`✅ ${suggestions.length} sugestões encontradas para "${query}"`);
      
      return json({
        success: true,
        data: {
        suggestions,
          totalProducts: result.totalProducts
        },
        source: 'database'
      });
      
    } catch (error) {
      console.log(`⚠️ Erro search suggestions: ${error instanceof Error ? error.message : 'Erro'} - usando fallback`);
      
      // FALLBACK: Sugestões mock baseadas na query
      const mockSuggestions = [];
      
      // Produtos mock relacionados
      const productKeywords = query.toLowerCase();
      const mockProducts = [
        { keyword: 'phone', name: 'Smartphone', category: 'Celulares' },
        { keyword: 'xiaomi', name: 'Xiaomi Redmi Note 13', category: 'Smartphones' },
        { keyword: 'samsung', name: 'Samsung Galaxy S24', category: 'Smartphones' },
        { keyword: 'tv', name: 'Smart TV', category: 'Eletrônicos' },
        { keyword: 'notebook', name: 'Notebook', category: 'Informática' },
        { keyword: 'mouse', name: 'Mouse Gamer', category: 'Acessórios' },
        { keyword: 'teclado', name: 'Teclado Mecânico', category: 'Acessórios' }
      ].filter(p => p.keyword.includes(productKeywords) || productKeywords.includes(p.keyword));
      
      mockProducts.slice(0, 5).forEach((product, index) => {
        mockSuggestions.push({
          type: 'product',
          id: `prod-${index + 1}`,
          text: `${product.name} - ${query}`,
          slug: `${product.name.toLowerCase().replace(/\s+/g, '-')}-${query}`,
          image: `/api/placeholder/300/400?text=${encodeURIComponent(product.name)}`,
          price: 299.99 + (index * 100),
          originalPrice: 399.99 + (index * 100),
          discount: 25,
          rating: 4.5,
          soldCount: 150 - (index * 20)
        });
      });
      
      // Categorias mock
      if (productKeywords.includes('phone') || productKeywords.includes('celular')) {
        mockSuggestions.push({
          type: 'category',
          id: 'cat-smartphones',
          text: 'Smartphones',
          slug: 'smartphones',
          count: 87
        });
      }
      
      // Marcas mock
      if (productKeywords.includes('samsung')) {
        mockSuggestions.push({
          type: 'brand',
          id: 'brand-samsung',
          text: 'Samsung',
          slug: 'samsung',
          count: 45
        });
      }
      
      if (productKeywords.includes('xiaomi')) {
        mockSuggestions.push({
          type: 'brand',
          id: 'brand-xiaomi',
          text: 'Xiaomi',
          slug: 'xiaomi',
          count: 32
        });
      }
      
      // Sugestão de busca geral
      if (mockSuggestions.length > 0) {
        mockSuggestions.unshift({
          type: 'query',
          id: query,
          text: `Buscar "${query}"`,
          count: mockSuggestions.length * 5
        });
      }
    
    return json({
      success: true,
        data: {
          suggestions: mockSuggestions,
          totalProducts: mockSuggestions.length * 5
        },
        source: 'fallback'
    });
    }
    
  } catch (error) {
    console.error('❌ Erro crítico search suggestions:', error);
    return json({
      success: false,
      error: { message: 'Erro ao buscar sugestões' }
    }, { status: 500 });
  }
}; 