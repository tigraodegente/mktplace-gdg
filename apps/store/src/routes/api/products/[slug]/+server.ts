import { json } from '@sveltejs/kit';
import { TIMEOUT_CONFIG, withTimeout } from '$lib/config/timeouts';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ params, platform }) => {
  try {
    const { slug } = params;
    
    console.log(`\n🛍️ ===== INÍCIO API PRODUTO [${slug}] =====`);
    console.log(`📋 Slug recebido: "${slug}"`);
    console.log(`🕐 Timestamp: ${new Date().toISOString()}`);
    
    // Tentar buscar dados reais do banco com timeout
    try {
      const db = getDatabase(platform);
      
      // Promise com timeout de 6 segundos (aumentado para incluir variações)
      const queryPromise = (async () => {
        // STEP 1: Query SIMPLIFICADA - apenas produto básico
        const products = await db.query`
          SELECT 
            p.id, p.name, p.slug, p.description, p.price, p.original_price,
            p.brand_id, p.seller_id, p.quantity, p.rating_average,
            p.rating_count, p.sales_count, p.tags, p.sku, p.weight, p.model,
            p.condition, p.has_free_shipping, p.delivery_days, p.featured,
            p.is_active, p.is_variant, p.created_at, p.updated_at, p.attributes, p.specifications
          FROM products p
          WHERE p.slug = ${slug} AND p.is_active = true
          LIMIT 1
        `;
        
        console.log(`🔍 Query produto executada. Resultados: ${products.length}`);
        
        if (products.length === 0) {
          console.log(`❌ Produto não encontrado para slug: ${slug}`);
          return null;
        }
        
        const product = products[0];
        console.log(`✅ Produto encontrado:`);
        console.log(`   ID: ${product.id}`);
        console.log(`   SKU: ${product.sku}`);
        console.log(`   Nome: ${product.name}`);
        console.log(`   É variação: ${product.is_variant}`);
        
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
          console.log(`🖼️  Imagens encontradas: ${images.length}`);
        } catch (e) {
          console.log('⚠️ Erro imagens, usando placeholder:', e);
        }
        
        // STEP 3: Buscar variações do produto
        console.log(`\n🔄 ===== INÍCIO PROCESSAMENTO VARIAÇÕES =====`);
        let variations: any[] = [];
        let mainProductData = product;
        
        try {
          // Se este produto é uma variação, precisamos buscar o produto principal e suas variações
          if (product.is_variant) {
            console.log(`🔄 Produto ${product.sku} é uma variação, buscando produto principal...`);
            
            // Buscar o produto principal
            const mainProductQuery = await db.query`
              SELECT p.id, p.name, p.slug, p.price, p.quantity, p.sku
              FROM products p
              INNER JOIN product_variants pv ON p.id = pv.product_id
              WHERE pv.sku = ${product.sku}
              LIMIT 1
            `;
            
            console.log(`📊 Query produto principal executada. Resultados: ${mainProductQuery.length}`);
            
            if (mainProductQuery.length > 0) {
              const mainProduct = mainProductQuery[0];
              console.log(`✅ Produto principal encontrado:`);
              console.log(`   Principal ID: ${mainProduct.id}`);
              console.log(`   Principal SKU: ${mainProduct.sku}`);
              console.log(`   Principal Nome: ${mainProduct.name}`);
              
              // Buscar todas as variações do produto principal
              console.log(`🔍 Buscando variações do produto principal ${mainProduct.id}...`);
              const variantRows = await db.query`
                SELECT 
                  pv.sku,
                  pv.price,
                  pv.original_price,
                  pv.quantity as stock,
                  pv.is_active,
                  pv.created_at,
                  p2.name as variant_name
                FROM product_variants pv
                INNER JOIN products p2 ON pv.sku = p2.sku
                WHERE pv.product_id = ${mainProduct.id} AND pv.is_active = true
                ORDER BY pv.created_at ASC
              `;
              
              console.log(`📊 Query variações executada. Resultados: ${variantRows.length}`);
              variantRows.forEach((v, idx) => {
                console.log(`   Variação ${idx + 1}: SKU ${v.sku} - ${v.variant_name} - R$ ${v.price}`);
              });
              
              // Incluir o produto principal também como uma opção
              console.log(`🏗️  Montando lista completa (principal + variações)...`);
              const allVariations = [
                {
                  sku: mainProduct.sku,
                  name: mainProduct.name,
                  price: mainProduct.price,
                  stock: mainProduct.quantity,
                  is_main: true
                },
                ...variantRows.map((v: any) => ({
                  sku: v.sku,
                  name: v.variant_name,
                  price: v.price,
                  stock: v.stock,
                  is_main: false
                }))
              ];
              
              console.log(`✅ Lista completa montada: ${allVariations.length} opções (1 principal + ${variantRows.length} variações)`);
              allVariations.forEach((v, idx) => {
                console.log(`   Opção ${idx + 1}: SKU ${v.sku} - ${v.name} - Principal: ${v.is_main}`);
              });
              
              // Buscar cores para todas as variações (incluindo principal)
              const allSkus = allVariations.map(v => v.sku);
              console.log(`🎨 Buscando cores para SKUs: [${allSkus.join(', ')}]`);
              const colorQuery = await db.query`
                SELECT 
                  p.sku,
                  pov.value as color
                FROM products p
                LEFT JOIN product_variants pv ON pv.sku = p.sku
                LEFT JOIN variant_option_values vov ON pv.id = vov.variant_id
                LEFT JOIN product_option_values pov ON vov.option_value_id = pov.id
                LEFT JOIN product_options po ON pov.option_id = po.id
                WHERE p.sku = ANY(${allSkus}) AND po.name = 'Cor'
              `;
              
              console.log(`📊 Query cores executada. Resultados: ${colorQuery.length}`);
              const colorMap = new Map();
              colorQuery.forEach((row: any) => {
                if (row.color) {
                  console.log(`   Cor encontrada: SKU ${row.sku} = ${row.color}`);
                  colorMap.set(row.sku, row.color);
                }
              });
              
              console.log(`🏗️  Montando estrutura final das variações...`);
              variations = allVariations.map((variant: any) => ({
                sku: variant.sku,
                name: variant.name,
                price: Number(variant.price),
                stock: variant.stock || 0,
                color: colorMap.get(variant.sku) || 'Padrão',
                is_main: variant.is_main,
                is_current: variant.sku === product.sku,
                images: images
              }));
              
              console.log(`✅ Estrutura final criada: ${variations.length} variações`);
              variations.forEach((v, idx) => {
                const current = v.is_current ? ' 👈 ATUAL' : '';
                const main = v.is_main ? ' (Principal)' : '';
                console.log(`   Final ${idx + 1}: SKU ${v.sku} - ${v.color} - R$ ${v.price}${main}${current}`);
              });
              
            }
          } else {
            // Produto principal - buscar suas variações normalmente
            console.log(`📦 Produto ${product.sku} é principal, buscando variações...`);
            
            const variantRows = await db.query`
              SELECT 
                pv.sku,
                pv.price,
                pv.original_price,
                pv.quantity as stock,
                pv.is_active,
                pv.created_at,
                p2.name as variant_name
              FROM product_variants pv
              INNER JOIN products p2 ON pv.sku = p2.sku
              WHERE pv.product_id = ${product.id} AND pv.is_active = true
              ORDER BY pv.created_at ASC
            `;
            
            if (variantRows.length > 0) {
              // Incluir o produto principal também como uma opção (mesma lógica da variação)
              console.log(`🏗️  Montando lista completa (principal + variações)...`);
              const allVariations = [
                {
                  sku: product.sku,
                  name: product.name,
                  price: product.price,
                  stock: product.quantity,
                  is_main: true
                },
                ...variantRows.map((v: any) => ({
                  sku: v.sku,
                  name: v.variant_name,
                  price: v.price,
                  stock: v.stock,
                  is_main: false
                }))
              ];
              
              console.log(`✅ Lista completa montada: ${allVariations.length} opções (1 principal + ${variantRows.length} variações)`);
              
              // Buscar cores para todas as variações (incluindo principal)
              const allSkus = allVariations.map(v => v.sku);
              console.log(`🎨 Buscando cores para SKUs: [${allSkus.join(', ')}]`);
              const colorQuery = await db.query`
                SELECT 
                  p.sku,
                  pov.value as color
                FROM products p
                LEFT JOIN product_variants pv ON pv.sku = p.sku
                LEFT JOIN variant_option_values vov ON pv.id = vov.variant_id
                LEFT JOIN product_option_values pov ON vov.option_value_id = pov.id
                LEFT JOIN product_options po ON pov.option_id = po.id
                WHERE p.sku = ANY(${allSkus}) AND po.name = 'Cor'
              `;
              
              console.log(`📊 Query cores executada. Resultados: ${colorQuery.length}`);
              const colorMap = new Map();
              colorQuery.forEach((row: any) => {
                if (row.color) {
                  console.log(`   Cor encontrada: SKU ${row.sku} = ${row.color}`);
                  colorMap.set(row.sku, row.color);
                }
              });
              
              console.log(`🏗️  Montando estrutura final das variações...`);
              variations = allVariations.map((variant: any) => ({
                sku: variant.sku,
                name: variant.name,
                price: Number(variant.price),
                stock: variant.stock || 0,
                color: colorMap.get(variant.sku) || 'Padrão',
                is_main: variant.is_main,
                is_current: variant.sku === product.sku,
                images: images
              }));
              
              console.log(`✅ Estrutura final criada: ${variations.length} variações`);
              variations.forEach((v, idx) => {
                const current = v.is_current ? ' 👈 ATUAL' : '';
                const main = v.is_main ? ' (Principal)' : '';
                console.log(`   Final ${idx + 1}: SKU ${v.sku} - ${v.color} - R$ ${v.price}${main}${current}`);
              });
              
              console.log(`✅ Encontradas ${variations.length} variações para produto principal`);
            }
          }
          
          // STEP 4: Buscar atributos/opções (mantido para compatibilidade)
          const productOptions = await db.query`
            SELECT 
              po.name as option_name,
              pov.value as option_value,
              po.id as option_id
            FROM product_options po
            INNER JOIN product_option_values pov ON pov.option_id = po.id
            ORDER BY po.name, pov.value
          `;
          
          // Nota: Variações já foram processadas acima na nova lógica
          
          console.log(`\n🔄 ===== FIM PROCESSAMENTO VARIAÇÕES =====`);
          console.log(`📊 Total de variações processadas: ${variations.length}`);
        } catch (e) {
          console.log('⚠️ Erro ao buscar variações:', e);
        }
        
        // STEP 5: Queries separadas para dados relacionados (evitar JOINs complexos)  
        let category_name = '', brand_name = '', seller_name = '';
        
        try {
          // Buscar categoria da tabela de relacionamento product_categories
            const categoryRelation = await db.query`
              SELECT c.name, c.id
              FROM product_categories pc
              INNER JOIN categories c ON c.id = pc.category_id
              WHERE pc.product_id = ${product.id} AND pc.is_primary = true
              LIMIT 1
            `;
            if (categoryRelation[0]) {
              category_name = categoryRelation[0].name;
            // Definir category_id para compatibilidade
              product.category_id = categoryRelation[0].id;
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
      
      console.log(`\n✅ ===== RESULTADO BANCO =====`);
      console.log(`📦 Produto: ${result.product.name}`);
      console.log(`🖼️  Imagens: ${result.images.length}`);
      console.log(`🔄 Variações antes da formatação: ${result.variations.length}`);
      
      // Formatar resposta com dados reais
      console.log(`\n🏗️  ===== FORMATANDO PRODUTO =====`);
      const formattedProduct = formatProduct(
        result.product, 
        result.images, 
        result.variations,
        result.category_name, 
        result.brand_name, 
        result.seller_name
      );
      
      console.log(`✅ Produto formatado:`);
      console.log(`   Nome: ${formattedProduct.name}`);
      console.log(`   SKU: ${formattedProduct.sku}`);
      console.log(`   Variações na resposta: ${formattedProduct.variations ? formattedProduct.variations.length : 'undefined'}`);
      if (formattedProduct.variations) {
        console.log(`   Variações detalhes:`, formattedProduct.variations.map(v => `${v.sku}:${v.color}`));
      }
      
      console.log(`\n🛍️ ===== RETORNANDO RESPOSTA =====`);
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
  console.log(`\n🔧 ===== INÍCIO formatProduct =====`);
  console.log(`📥 Parâmetros recebidos:`);
  console.log(`   Produto SKU: ${product.sku}`);
  console.log(`   Imagens: ${images.length}`);
  console.log(`   Variações: ${variations.length}`);
  console.log(`   Categoria: ${category_name}`);
  
  // Processar attributes e specifications
  let attributes = {};
  let specifications = {};
  
  try {
    if (product.attributes) {
      attributes = typeof product.attributes === 'string' ? JSON.parse(product.attributes) : product.attributes;
    }
  } catch (e) {
    console.warn('Erro ao parsear attributes:', e);
    attributes = {};
  }
  
  try {
    if (product.specifications) {
      specifications = typeof product.specifications === 'string' ? JSON.parse(product.specifications) : product.specifications;
    }
  } catch (e) {
    console.warn('Erro ao parsear specifications:', e);
    specifications = {};
  }


  
  const result = {
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
    // NOVO: Incluir atributos e especificações estruturados
    attributes: attributes,
    specifications: specifications
  };
  
  console.log(`\n🔧 ===== FIM formatProduct =====`);
  console.log(`📤 Retornando produto com:`);
  console.log(`   Nome: ${result.name}`);
  console.log(`   SKU: ${result.sku}`);
  console.log(`   Variações no resultado: ${result.variations?.length ?? 'undefined'}`);
  if (result.variations?.length) {
    console.log(`   Lista variações:`, result.variations?.map((v: any) => `${v.sku}:${v.color}`));
  }
  
  return result;
} 