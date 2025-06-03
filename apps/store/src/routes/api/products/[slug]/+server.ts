import { json } from '@sveltejs/kit';
import { TIMEOUT_CONFIG, withTimeout } from '$lib/config/timeouts';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ params, platform }) => {
  try {
    const { slug } = params;
    
    console.log(`🛍️ Product [${slug}] - Buscando produto com variações e atributos`);
    
    // Tentar buscar dados reais do banco com timeout
    try {
      const db = getDatabase(platform);
      
      // Promise com timeout de 6 segundos (aumentado para incluir variações)
      const queryPromise = (async () => {
        // STEP 1: Query SIMPLIFICADA - apenas produto básico
        const products = await db.query`
          SELECT 
            p.id, p.name, p.slug, p.description, p.price, p.original_price,
            p.category_id, p.brand_id, p.seller_id, p.quantity, p.rating_average,
            p.rating_count, p.sales_count, p.tags, p.sku, p.weight, p.model,
            p.condition, p.has_free_shipping, p.delivery_days, p.featured,
            p.is_active, p.created_at, p.updated_at, p.attributes
          FROM products p
          WHERE p.slug = ${slug} AND p.is_active = true
          LIMIT 1
        `;
        
        if (products.length === 0) {
          return null;
        }
        
        const product = products[0];
        
        // STEP 2: Query separada para imagens (evitar array_agg complexo)
        let images: string[] = [];
        try {
          const imageRows = await db.query`
            SELECT url FROM product_images 
            WHERE product_id = ${product.id} 
            ORDER BY position 
            LIMIT 10
          `;
          images = imageRows.map((row: any) => row.url);
        } catch (e) {
          console.log('⚠️ Erro imagens, usando placeholder');
        }
        
        // STEP 3: Buscar variações do produto
        let variations: any[] = [];
        try {
          const variantRows = await db.query`
            SELECT 
              pv.sku,
              pv.price,
              pv.original_price,
              pv.quantity as stock,
              pv.is_active,
              pv.created_at
            FROM product_variants pv
            WHERE pv.product_id = ${product.id} AND pv.is_active = true
            ORDER BY pv.created_at ASC
          `;
          
          // STEP 4: Buscar atributos/opções para cada variação
          const productOptions = await db.query`
            SELECT 
              po.name as option_name,
              pov.value as option_value,
              po.id as option_id
            FROM product_options po
            INNER JOIN product_option_values pov ON pov.option_id = po.id
            WHERE po.product_id = ${product.id}
            ORDER BY po.name, pov.value
          `;
          
          // Se há variações, mapear com atributos
          if (variantRows.length > 0) {
            variations = variantRows.map((variant: any, index: number) => {
              // Extrair atributos do SKU (formato: SKU-Atributo)
              const skuParts = variant.sku.split('-');
              const attributeFromSku = skuParts.length > 1 ? skuParts[1] : '';
              
              // Se temos opções na tabela product_options, usar elas
              if (productOptions.length > 0) {
                const optionsMap = new Map();
                productOptions.forEach((opt: any) => {
                  const optionName = opt.option_name.toLowerCase();
                  if (!optionsMap.has(optionName)) {
                    optionsMap.set(optionName, []);
                  }
                  optionsMap.get(optionName).push(opt.option_value);
                });
                
                const colors = optionsMap.get('cor') || optionsMap.get('color') || [];
                const sizes = optionsMap.get('tamanho') || optionsMap.get('size') || [];
                const styles = optionsMap.get('estilo') || optionsMap.get('style') || [];
                
                return {
                  sku: variant.sku,
                  price: Number(variant.price),
                  original_price: variant.original_price ? Number(variant.original_price) : undefined,
                  stock: variant.stock || 0,
                  color: colors[index] || (colors.includes(attributeFromSku) ? attributeFromSku : colors[0]) || undefined,
                  size: sizes[index] || (sizes.includes(attributeFromSku) ? attributeFromSku : sizes[0]) || undefined,
                  style: styles[index] || (styles.includes(attributeFromSku) ? attributeFromSku : styles[0]) || undefined,
                  images: images
                };
              } else {
                // Se não há opções formais, usar o SKU para determinar tipo/estilo
                // Para kit berço: Luxo, Econômica, Unicórnio são tipos de kit
                const variantType = attributeFromSku;
                
                // Mapear tipos comuns
                const isColor = /^(preto|branco|vermelho|azul|verde|amarelo|rosa|roxo|laranja|marrom|cinza|bege|navy|turquesa)$/i.test(variantType);
                const isSize = /^(pp|p|m|g|gg|pequeno|medio|grande|unico)$/i.test(variantType);
                
                return {
                  sku: variant.sku,
                  price: Number(variant.price),
                  original_price: variant.original_price ? Number(variant.original_price) : undefined,
                  stock: variant.stock || 0,
                  // Mapear inteligentemente baseado no nome do atributo
                  color: isColor ? variantType : undefined,
                  size: isSize ? variantType : undefined,
                  style: !isColor && !isSize ? variantType : undefined, // Se não é cor nem tamanho, é estilo/tipo
                  images: images
                };
              }
            });
          }
          
          console.log(`✅ Encontradas ${variations.length} variações para ${product.name}`);
        } catch (e) {
          console.log('⚠️ Erro ao buscar variações:', e);
        }
        
        // STEP 5: Queries separadas para dados relacionados (evitar JOINs complexos)  
        let category_name = '', brand_name = '', seller_name = '';
        
        try {
          if (product.category_id) {
            const cats = await db.query`SELECT name FROM categories WHERE id = ${product.category_id} LIMIT 1`;
            category_name = cats[0]?.name || '';
          }
          if (product.brand_id) {
            const brands = await db.query`SELECT name FROM brands WHERE id = ${product.brand_id} LIMIT 1`;
            brand_name = brands[0]?.name || '';
          }
          if (product.seller_id) {
            const sellers = await db.query`SELECT company_name FROM sellers WHERE id = ${product.seller_id} LIMIT 1`;
            seller_name = sellers[0]?.company_name || '';
          }
        } catch (e) {
          console.log('⚠️ Erro dados relacionados, usando padrões');
        }
        
        return {
          product,
          images,
          variations,
          category_name,
          brand_name,
          seller_name
        };
      })();
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 6000)
      });
      
      const result = await Promise.race([queryPromise, timeoutPromise]) as any;
      
      if (!result) {
        return json({
          success: false,
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: 'Produto não encontrado'
          }
        }, { status: 404 });
      }
      
      console.log(`✅ Banco OK: Produto ${result.product.name} carregado com ${result.variations.length} variações`);
      
      // Formatar resposta com dados reais
      const formattedProduct = formatProduct(
        result.product, 
        result.images, 
        result.variations,
        result.category_name, 
        result.brand_name, 
        result.seller_name
      );
      
      return json({
        success: true,
        data: formattedProduct,
        source: 'database'
      });
      
    } catch (error) {
      console.log(`⚠️ Banco timeout/erro: ${error instanceof Error ? error.message : 'Erro'}`);
      
      // Retornar erro ao invés de dados mockados
      return json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Não foi possível carregar o produto',
          details: 'Por favor, tente novamente em alguns instantes'
        }
      }, { status: 503 });
    }
    
  } catch (error) {
    console.error('❌ Erro ao buscar produto:', error);
    
    return json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Não foi possível carregar o produto',
        details: 'Por favor, tente novamente em alguns instantes'
      }
    }, { status: 503 });
  }
};

/**
 * Formatar produto com dados reais do banco incluindo variações
 */
function formatProduct(product: any, images: string[], variations: any[], category_name: string, brand_name: string, seller_name: string) {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    price: Number(product.price),
    original_price: product.original_price ? Number(product.original_price) : undefined,
    discount_percentage: product.original_price && product.price < product.original_price
      ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
      : undefined,
    images: images.length > 0 ? images : ['/api/placeholder/800/800'],
    image: images.length > 0 ? images[0] : '/api/placeholder/800/800',
    category_id: product.category_id,
    category_name: category_name || 'Categoria',
    brand_id: product.brand_id,
    brand_name: brand_name || 'Marca',
    seller_id: product.seller_id,
    seller_name: seller_name || 'Vendedor',
    is_active: product.is_active,
    stock: product.quantity,
    rating: product.rating_average ? Number(product.rating_average) : 4.5,
    reviews_count: product.rating_count || 0,
    sales_count: product.sales_count || 0,
    sold_count: product.sales_count || 0,
    tags: Array.isArray(product.tags) ? product.tags : [],
    created_at: product.created_at,
    updated_at: product.updated_at,
    is_featured: product.featured || false,
    sku: product.sku,
    weight: product.weight || 0.5,
    brand: brand_name || 'Marca',
    model: product.model,
    condition: product.condition || 'new',
    has_free_shipping: product.has_free_shipping !== false,
    delivery_days: product.delivery_days || 7,
    // NOVO: Incluir variações no formato esperado pelo frontend
    variations: variations.length > 0 ? variations : undefined,
    // NOVO: Incluir atributos estruturados
    attributes: product.attributes ? (typeof product.attributes === 'string' ? JSON.parse(product.attributes) : product.attributes) : undefined
  };
} 