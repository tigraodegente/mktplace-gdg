import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ url, platform }) => {
  try {
    console.log('🛒 Products List - Estratégia híbrida iniciada');
    
    // Parâmetros de busca simplificados
    const searchQuery = url.searchParams.get('q')?.trim() || '';
    const categories = url.searchParams.get('categoria')?.split(',').filter(Boolean) || [];
    const brands = url.searchParams.get('marca')?.split(',').filter(Boolean) || [];
    const priceMin = url.searchParams.get('preco_min') ? Number(url.searchParams.get('preco_min')) : undefined;
    const priceMax = url.searchParams.get('preco_max') ? Number(url.searchParams.get('preco_max')) : undefined;
    const hasDiscount = url.searchParams.get('promocao') === 'true';
    const inStock = url.searchParams.get('disponivel') !== 'false';
    const sortBy = url.searchParams.get('ordenar') || 'relevancia';
    const page = Math.max(1, Number(url.searchParams.get('pagina')) || 1);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('itens')) || 20));
    
    console.log(`📋 Params: q="${searchQuery}", page=${page}, limit=${limit}`);
    
    // Tentar buscar produtos com timeout
    try {
      const db = getDatabase(platform);
      
      // Promise com timeout de 8 segundos para consulta complexa
      const queryPromise = (async () => {
        // STEP 1: Query SIMPLIFICADA - produtos básicos sem JOINs complexos
        const conditions: string[] = ['p.is_active = true'];
        const params: any[] = [];
        let paramIndex = 1;
        
        if (inStock) {
          conditions.push('p.quantity > 0');
        }
        
        if (categories.length > 0) {
          conditions.push(`p.category_id = ANY($${paramIndex})`);
          params.push(categories);
          paramIndex++;
        }
        
        if (brands.length > 0) {
          conditions.push(`p.brand_id = ANY($${paramIndex})`);
          params.push(brands);
          paramIndex++;
        }
        
        if (priceMin !== undefined) {
          conditions.push(`p.price >= $${paramIndex}`);
          params.push(priceMin);
          paramIndex++;
        }
        
        if (priceMax !== undefined) {
          conditions.push(`p.price <= $${paramIndex}`);
          params.push(priceMax);
          paramIndex++;
        }
        
        if (hasDiscount) {
          conditions.push('p.original_price > 0 AND p.price < p.original_price');
        }
        
        if (searchQuery) {
          conditions.push(`(p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`);
          params.push(`%${searchQuery}%`);
          paramIndex++;
        }
        
        const whereClause = conditions.join(' AND ');
        
        // Ordenação simplificada
        let orderBy = 'p.featured DESC, p.sales_count DESC';
        switch (sortBy) {
          case 'menor-preco':
            orderBy = 'p.price ASC';
            break;
          case 'maior-preco':
            orderBy = 'p.price DESC';
            break;
          case 'mais-vendidos':
            orderBy = 'p.sales_count DESC';
            break;
          case 'melhor-avaliados':
            orderBy = 'p.rating_average DESC NULLS LAST';
            break;
          case 'lancamentos':
            orderBy = 'p.created_at DESC';
            break;
        }
        
        const offset = (page - 1) * limit;
        
        // Query principal SIMPLIFICADA
        const productsQuery = `
          SELECT p.id, p.name, p.slug, p.description, p.price, p.original_price,
                 p.category_id, p.brand_id, p.seller_id, p.quantity, p.rating_average,
                 p.rating_count, p.sales_count, p.tags, p.sku, p.featured,
                 p.is_active, p.created_at, p.updated_at, p.weight
          FROM products p
          WHERE ${whereClause}
          ORDER BY ${orderBy}
          LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        
        params.push(limit, offset);
        
        const products = await db.query(productsQuery, ...params);
        
        // STEP 2: Buscar dados relacionados (separado para evitar JOINs complexos)
        const enhancedProducts = await Promise.all(
          products.map(async (product: any) => {
            try {
              // Buscar imagens (query separada)
              const images = await db.query`
                SELECT url FROM product_images 
                WHERE product_id = ${product.id} 
                ORDER BY position 
                LIMIT 5
              `;
              
              // Buscar categoria (query separada)
              let category_name = 'Categoria';
              if (product.category_id) {
                const cats = await db.query`SELECT name FROM categories WHERE id = ${product.category_id} LIMIT 1`;
                category_name = cats[0]?.name || 'Categoria';
              }
              
              // Buscar marca (query separada)
              let brand_name = 'Marca';
              if (product.brand_id) {
                const brands = await db.query`SELECT name FROM brands WHERE id = ${product.brand_id} LIMIT 1`;
                brand_name = brands[0]?.name || 'Marca';
              }
              
              return {
                ...product,
                images: images.map((img: any) => img.url),
                category_name,
                brand_name
              };
            } catch (e) {
              console.log('⚠️ Erro ao enriquecer produto, usando dados básicos');
              return {
                ...product,
                images: [`/api/placeholder/300/400?text=${encodeURIComponent(product.name)}`],
                category_name: 'Categoria',
                brand_name: 'Marca'
              };
            }
          })
        );
        
        // STEP 3: Count total (query separada e simplificada)
        const countQuery = `SELECT COUNT(*) as total FROM products p WHERE ${whereClause}`;
        const countResult = await db.query(countQuery, ...params.slice(0, -2));
        const totalCount = parseInt(countResult[0].total);
        
        return {
          products: enhancedProducts,
          totalCount
        };
      })();
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 8000)
      });
      
      const result = await Promise.race([queryPromise, timeoutPromise]) as any;
      
      // Formatar produtos
      const formattedProducts = result.products.map((product: any) => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: Number(product.price),
        original_price: product.original_price ? Number(product.original_price) : undefined,
        discount: product.original_price && product.price < product.original_price
          ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
          : undefined,
        images: product.images.length > 0 ? product.images : [`/api/placeholder/300/400?text=${encodeURIComponent(product.name)}`],
        image: product.images.length > 0 ? product.images[0] : `/api/placeholder/300/400?text=${encodeURIComponent(product.name)}`,
        category_id: product.category_id,
        category_name: product.category_name,
        brand_id: product.brand_id,
        brand_name: product.brand_name,
        seller_id: product.seller_id,
        seller_name: 'Loja Oficial',
        is_active: product.is_active,
        stock: product.quantity,
        rating: product.rating_average ? Number(product.rating_average) : 4.5,
        reviews_count: product.rating_count || 0,
        sold_count: product.sales_count || 0,
        tags: Array.isArray(product.tags) ? product.tags : [],
        created_at: product.created_at,
        updated_at: product.updated_at,
        is_featured: product.featured || false,
        sku: product.sku,
        pieces: product.pieces || 1,
        weight: product.weight ? Number(product.weight) : 0.5,
        has_fast_delivery: true
      }));
      
      console.log(`✅ ${formattedProducts.length} produtos encontrados no banco`);
      
      return json({
        success: true,
        data: {
          products: formattedProducts,
          pagination: {
            page,
            limit,
            total: result.totalCount,
            totalPages: Math.ceil(result.totalCount / limit),
            hasNext: page < Math.ceil(result.totalCount / limit),
            hasPrev: page > 1
          },
          filters: {
            categories: categories,
            brands: brands,
            priceRange: { min: priceMin, max: priceMax },
            hasDiscount,
            inStock
          }
        },
        source: 'database'
      });
      
    } catch (error) {
      console.log(`⚠️ Erro products: ${error instanceof Error ? error.message : 'Erro'} - usando fallback`);
      
      // FALLBACK: Produtos mock de alta qualidade baseados em filtros
      let mockProducts = [
        {
          id: '1',
          name: 'Xiaomi Redmi Note 13 Pro 256GB',
          slug: 'xiaomi-redmi-note-13-pro-256gb',
          description: 'Smartphone Xiaomi com câmera de 200MP, carregamento rápido de 67W e tela AMOLED de 6.67"',
          price: 899.99,
          original_price: 1099.99,
          discount: 18,
          images: [
            '/api/placeholder/300/400?text=Xiaomi+Redmi+Note+13+Pro',
            '/api/placeholder/300/400?text=Xiaomi+Note+13+Pro+2'
          ],
          image: '/api/placeholder/300/400?text=Xiaomi+Redmi+Note+13+Pro',
          category_id: '1',
          category_name: 'Smartphones',
          brand_id: '1',
          brand_name: 'Xiaomi',
          seller_id: '1',
          seller_name: 'Loja Oficial Xiaomi',
          is_active: true,
          stock: 15,
          rating: 4.6,
          reviews_count: 89,
          sold_count: 145,
          tags: ['smartphone', 'xiaomi', 'camera', 'promocao'],
          is_featured: true,
          sku: 'XIA-RN13P-256',
          pieces: 1,
          weight: 0.2,
          has_fast_delivery: true
        },
        {
          id: '2',
          name: 'Samsung Galaxy S24 Ultra 256GB',
          slug: 'samsung-galaxy-s24-ultra-256gb',
          description: 'O mais avançado smartphone Samsung com S Pen, câmera de 200MP e tela Dynamic AMOLED 2X de 6.8"',
          price: 2999.99,
          original_price: 3499.99,
          discount: 14,
          images: [
            '/api/placeholder/300/400?text=Samsung+Galaxy+S24+Ultra',
            '/api/placeholder/300/400?text=Galaxy+S24+Ultra+2'
          ],
          image: '/api/placeholder/300/400?text=Samsung+Galaxy+S24+Ultra',
          category_id: '1',
          category_name: 'Smartphones',
          brand_id: '2',
          brand_name: 'Samsung',
          seller_id: '2',
          seller_name: 'Samsung Store',
          is_active: true,
          stock: 8,
          rating: 4.8,
          reviews_count: 127,
          sold_count: 89,
          tags: ['smartphone', 'samsung', 'premium', 's-pen'],
          is_featured: true,
          sku: 'SAM-GS24U-256',
          pieces: 1,
          weight: 0.23,
          has_fast_delivery: true
        },
        {
          id: '3',
          name: 'Smart TV Samsung 55" 4K UHD',
          slug: 'smart-tv-samsung-55-4k-uhd',
          description: 'Smart TV Samsung 55 polegadas com resolução 4K, HDR10+ e sistema Tizen OS',
          price: 2199.99,
          original_price: 2699.99,
          discount: 19,
          images: [
            '/api/placeholder/300/400?text=Samsung+Smart+TV+55',
            '/api/placeholder/300/400?text=Smart+TV+4K+Samsung'
          ],
          image: '/api/placeholder/300/400?text=Samsung+Smart+TV+55',
          category_id: '2',
          category_name: 'TVs e Áudio',
          brand_id: '2',
          brand_name: 'Samsung',
          seller_id: '2',
          seller_name: 'Samsung Store',
          is_active: true,
          stock: 12,
          rating: 4.7,
          reviews_count: 56,
          sold_count: 34,
          tags: ['tv', 'smart-tv', '4k', 'samsung'],
          is_featured: true,
          sku: 'SAM-TV55-4K',
          pieces: 1,
          weight: 15.5,
          has_fast_delivery: false
        },
        {
          id: '4',
          name: 'Notebook Lenovo IdeaPad 3i Intel Core i5',
          slug: 'notebook-lenovo-ideapad-3i-intel-core-i5',
          description: 'Notebook Lenovo com processador Intel Core i5, 8GB RAM, SSD 256GB e tela 15.6"',
          price: 1899.99,
          original_price: 2299.99,
          discount: 17,
          images: [
            '/api/placeholder/300/400?text=Lenovo+IdeaPad+3i',
            '/api/placeholder/300/400?text=Notebook+Lenovo'
          ],
          image: '/api/placeholder/300/400?text=Lenovo+IdeaPad+3i',
          category_id: '3',
          category_name: 'Informática',
          brand_id: '3',
          brand_name: 'Lenovo',
          seller_id: '3',
          seller_name: 'TechStore',
          is_active: true,
          stock: 6,
          rating: 4.4,
          reviews_count: 42,
          sold_count: 28,
          tags: ['notebook', 'lenovo', 'intel', 'ssd'],
          is_featured: false,
          sku: 'LEN-IP3I-I5',
          pieces: 1,
          weight: 2.1,
          has_fast_delivery: true
        }
      ];
      
      // Aplicar filtros básicos no fallback
      if (searchQuery) {
        mockProducts = mockProducts.filter(p => 
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      
      if (categories.length > 0) {
        mockProducts = mockProducts.filter(p => categories.includes(p.category_id));
      }
      
      if (priceMin !== undefined) {
        mockProducts = mockProducts.filter(p => p.price >= priceMin);
      }
      
      if (priceMax !== undefined) {
        mockProducts = mockProducts.filter(p => p.price <= priceMax);
      }
      
      if (hasDiscount) {
        mockProducts = mockProducts.filter(p => p.discount && p.discount > 0);
      }
      
      if (!inStock) {
        // Se não filtrar por estoque, pode mostrar produtos sem estoque
        mockProducts.forEach(p => {
          if (Math.random() > 0.8) p.stock = 0; // 20% chance de estar sem estoque
        });
      } else {
        mockProducts = mockProducts.filter(p => p.stock > 0);
      }
      
      // Aplicar ordenação
      switch (sortBy) {
        case 'menor-preco':
          mockProducts.sort((a, b) => a.price - b.price);
          break;
        case 'maior-preco':
          mockProducts.sort((a, b) => b.price - a.price);
          break;
        case 'mais-vendidos':
          mockProducts.sort((a, b) => b.sold_count - a.sold_count);
          break;
        case 'melhor-avaliados':
          mockProducts.sort((a, b) => b.rating - a.rating);
          break;
      }
      
      // Paginação
      const offset = (page - 1) * limit;
      const paginatedProducts = mockProducts.slice(offset, offset + limit);
      
      // Adicionar timestamps dinâmicos
      paginatedProducts.forEach((product: any) => {
        product.created_at = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString();
        product.updated_at = product.created_at;
      });
      
      console.log(`📦 ${paginatedProducts.length} produtos mock (filtered: ${mockProducts.length})`);
      
      return json({
        success: true,
        data: {
          products: paginatedProducts,
          pagination: {
            page,
            limit,
            total: mockProducts.length,
            totalPages: Math.ceil(mockProducts.length / limit),
            hasNext: page < Math.ceil(mockProducts.length / limit),
            hasPrev: page > 1
          },
          filters: {
            categories: categories,
            brands: brands,
            priceRange: { min: priceMin, max: priceMax },
            hasDiscount,
            inStock
          }
        },
        source: 'fallback'
      });
    }
    
  } catch (error: any) {
    console.error('❌ Erro crítico products:', error);
    return json({
      success: false,
      error: {
        message: 'Erro ao buscar produtos'
      }
    }, { status: 500 });
  }
};