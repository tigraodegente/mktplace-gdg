import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

// POST - Enriquecer produto ou campo específico
export const POST: RequestHandler = async ({ request, platform, locals }) => {
  try {
    const { productId, field, action } = await request.json();
    
    if (!productId) {
      return json({
        success: false,
        error: 'ID do produto é obrigatório'
      }, { status: 400 });
    }

    const db = getDatabase(platform);
    
    // Buscar produto atual
    const [product] = await db.query`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.id = ${productId}
    `;

    if (!product) {
      await db.close();
      return json({
        success: false,
        error: 'Produto não encontrado'
      }, { status: 404 });
    }

    let enrichmentResults: Record<string, any> = {};

    if (action === 'enrich_all') {
      // Enriquecer produto completo
      enrichmentResults = await enrichFullProduct(product);
    } else if (field) {
      // Enriquecer campo específico
      const result = await enrichField(field, product);
      enrichmentResults[field] = result;
    } else {
      await db.close();
      return json({
        success: false,
        error: 'Ação ou campo deve ser especificado'
      }, { status: 400 });
    }

    // Atualizar produto no banco
    if (Object.keys(enrichmentResults).length > 0) {
      await updateProductWithEnrichment(db, productId, enrichmentResults);
    }

    await db.close();

    return json({
      success: true,
      data: {
        enrichmentResults,
        message: action === 'enrich_all' 
          ? 'Produto enriquecido completamente' 
          : `Campo ${field} enriquecido com sucesso`
      }
    });

  } catch (error) {
    console.error('Error enriching product:', error);
    return json({
      success: false,
      error: 'Erro ao enriquecer produto'
    }, { status: 500 });
  }
};

// Enriquecer produto completo
async function enrichFullProduct(product: any): Promise<Record<string, any>> {
  const enrichmentResults: Record<string, any> = {};

  // Lista de campos para enriquecer - APENAS os que existem no banco Neon
  const fieldsToEnrich = [
    'name',                    // ✅ EXISTE
    'description',             // ✅ EXISTE  
    'category',               // ✅ EXISTE (category_id)
    'tags',                   // ✅ EXISTE
    'seo_title',              // ✅ EXISTE (meta_title)
    'seo_description',        // ✅ EXISTE (meta_description)
    'seo_keywords',           // ✅ EXISTE (meta_keywords)
    'technical_specifications' // ✅ EXISTE (specifications)
    
    // ❌ REMOVIDOS - Campos que NÃO EXISTEM no Neon:
    // 'short_description', 'variations', 'image_url', 'images', 
    // 'materials', 'care_instructions', 'warranty', 'age_group', 'safety_certifications'
  ];

  // Enriquecer cada campo
  for (const field of fieldsToEnrich) {
    try {
      const result = await enrichField(field, product);
      if (result.success) {
        enrichmentResults[field] = result;
      }
    } catch (error) {
      console.error(`Erro ao enriquecer campo ${field}:`, error);
    }
  }

  return enrichmentResults;
}

// Enriquecer um campo específico
async function enrichField(field: string, product: any): Promise<{ success: boolean; value?: any; source: string }> {
  // Primeiro tentar buscar no MongoDB (simulado por enquanto)
  const mongoResult = await tryMongoEnrichment(field, product);
  if (mongoResult.success) {
    return mongoResult;
  }

  // Se não encontrou no MongoDB, usar IA
  const aiResult = await tryAIEnrichment(field, product);
  return aiResult;
}

// Simular enriquecimento do MongoDB
async function tryMongoEnrichment(field: string, product: any): Promise<{ success: boolean; value?: any; source: string }> {
  // Simular dados do MongoDB baseados no SKU
  const mockMongoData: Record<string, any> = {
    '176223': {
      name: 'Kit Berço Amiguinhos Harry Potter - Premium',
      description: 'Kit de berço completo com tema Harry Potter, incluindo lençol, fronha e protetor. Confeccionado em 100% algodão com estampas encantadoras dos personagens.',
      short_description: 'Kit berço Harry Potter 100% algodão com lençol, fronha e protetor',
      category: 'casa-e-decoracao', // ID da categoria
      tags: ['kit berço', 'harry potter', 'algodão', 'bebê', 'enxoval infantil'],
      variations: [
        {
          id: '1',
          name: 'Tamanho',
          options: ['Berço (130x70cm)', 'Mini Berço (90x50cm)']
        },
        {
          id: '2', 
          name: 'Cor',
          options: ['Azul', 'Rosa', 'Neutro']
        }
      ],
      image_url: 'https://example.com/kit-berco-harry-potter-main.jpg',
      images: [
        'https://example.com/kit-berco-harry-potter-1.jpg',
        'https://example.com/kit-berco-harry-potter-2.jpg',
        'https://example.com/kit-berco-harry-potter-3.jpg',
        'https://example.com/kit-berco-harry-potter-detail.jpg'
      ],
      technical_specifications: JSON.stringify({
        material: '100% Algodão',
        dimensoes: '130x70cm',
        peso: '800g',
        cor: 'Azul/Branco',
        lavagem: 'Máquina 30°C'
      }),
      materials: 'Algodão',
      care_instructions: 'Lavar à máquina em água fria. Não usar alvejante. Secar à sombra.',
      warranty: '3 meses contra defeitos de fabricação',
      age_group: '0-3 anos',
      safety_certifications: 'INMETRO, OEKO-TEX Standard 100',
      seo_title: 'Kit Berço Harry Potter - Algodão Premium para Bebê',
      seo_description: 'Kit berço temático Harry Potter 100% algodão. Lençol, fronha e protetor com qualidade premium. Frete grátis.',
      seo_keywords: 'kit berço, harry potter, algodão, bebê, enxoval infantil, berço completo'
    },
    '194747': {
      name: 'Almofada Decorativa Unicórnio Mágico - 45x45cm',
      description: 'Almofada decorativa com estampa de unicórnio mágico, perfeita para quartos infantis. Tecido macio e enchimento antialérgico.',
      short_description: 'Almofada decorativa unicórnio 45x45cm com enchimento antialérgico',
      category: 'casa-e-decoracao',
      tags: ['almofada', 'unicórnio', 'decoração infantil', 'quarto criança', 'antialérgico'],
      variations: [
        {
          id: '1',
          name: 'Tamanho',
          options: ['45x45cm', '50x50cm', '60x60cm']
        },
        {
          id: '2',
          name: 'Estampa',
          options: ['Unicórnio Rosa', 'Unicórnio Azul', 'Unicórnio Arco-íris']
        }
      ],
      image_url: 'https://example.com/almofada-unicornio-main.jpg',
      images: [
        'https://example.com/almofada-unicornio-frente.jpg',
        'https://example.com/almofada-unicornio-verso.jpg',
        'https://example.com/almofada-unicornio-ambiente.jpg'
      ],
      technical_specifications: JSON.stringify({
        material: 'Poliéster',
        enchimento: 'Fibra siliconizada',
        dimensoes: '45x45cm',
        peso: '300g'
      }),
      materials: 'Poliéster, Fibra siliconizada antialérgica',
      care_instructions: 'Lavar à mão ou máquina em ciclo delicado. Não torcer.',
      warranty: '6 meses contra defeitos de fabricação',
      age_group: '3+ anos',
      safety_certifications: 'INMETRO',
      seo_title: 'Almofada Unicórnio Infantil - Decoração Quarto Criança',
      seo_description: 'Almofada decorativa unicórnio 45x45cm com enchimento antialérgico. Perfeita para quartos infantis. Compre online!',
      seo_keywords: 'almofada unicórnio, decoração infantil, quarto criança, almofada decorativa'
    }
  };

  const mongoProduct = mockMongoData[product.sku];
  if (mongoProduct && mongoProduct[field]) {
    return {
      success: true,
      value: mongoProduct[field],
      source: 'MongoDB (Temporário)'
    };
  }

  return { success: false, source: 'MongoDB' };
}

// Enriquecimento por IA
async function tryAIEnrichment(field: string, product: any): Promise<{ success: boolean; value?: any; source: string }> {
  // Simular resposta da IA baseada no produto
  const aiResponses: Record<string, any> = {
    name: `${product.name} - Premium`,
    
    description: `Este produto ${product.name} foi desenvolvido especialmente para proporcionar segurança, conforto e qualidade. Confeccionado com materiais premium e seguindo rigorosos padrões de qualidade, é a escolha perfeita para quem busca o melhor. O design atrativo e funcional garante durabilidade e satisfação.`,
    
    short_description: `${product.name} - Qualidade premium e segurança garantida`,
    
    category: 'geral', // Categoria padrão quando não conseguir determinar

    tags: [
      product.name.toLowerCase().split(' ')[0] || 'produto',
      'qualidade',
      'premium',
      product.category_name?.toLowerCase() || 'geral'
    ],

    variations: [
      {
        id: '1',
        name: 'Tamanho',
        options: ['P', 'M', 'G']
      },
      {
        id: '2',
        name: 'Cor',
        options: ['Branco', 'Preto', 'Colorido']
      }
    ],

    image_url: `https://placeholder.com/600x600/CCCCCC/FFFFFF?text=${encodeURIComponent(product.name)}`,

    images: [
      `https://placeholder.com/600x600/CCCCCC/FFFFFF?text=${encodeURIComponent(product.name)}-1`,
      `https://placeholder.com/600x600/CCCCCC/FFFFFF?text=${encodeURIComponent(product.name)}-2`,
      `https://placeholder.com/600x600/CCCCCC/FFFFFF?text=${encodeURIComponent(product.name)}-3`
    ],
    
    technical_specifications: JSON.stringify({
      material: 'Material de alta qualidade',
      peso: '500g (aproximado)',
      cor: 'Conforme imagem',
      garantia: '90 dias'
    }),
    
    materials: 'Materiais de alta qualidade, Tecido macio, Componentes seguros',
    
    care_instructions: 'Lavar conforme instruções da etiqueta. Manter em local seco e arejado. Evitar exposição direta ao sol.',
    
    warranty: '90 dias contra defeitos de fabricação',
    
    age_group: '3+ anos',
    
    safety_certifications: 'INMETRO',
    
    seo_title: `${product.name} - Comprar Online com Melhor Preço`,
    
    seo_description: `${product.name} com qualidade garantida. Compre online com segurança e receba em casa. Melhor preço e frete grátis.`,
    
    seo_keywords: `${product.name.toLowerCase()}, ${product.category_name?.toLowerCase() || 'produto'}, qualidade, comprar online, melhor preço`
  };

  const value = aiResponses[field];
  if (value !== undefined) {
    return {
      success: true,
      value,
      source: 'IA (Gerado)'
    };
  }

  return { success: false, source: 'IA' };
}

// Atualizar produto com dados enriquecidos
async function updateProductWithEnrichment(db: any, productId: string, enrichmentData: Record<string, any>) {
  const updateFields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  // Mapear campos de enriquecimento para campos que REALMENTE EXISTEM no banco Neon
  const fieldMappings: Record<string, string> = {
    name: 'name',                              // ✅ EXISTE
    description: 'description',                // ✅ EXISTE
    category: 'category_id',                   // ✅ EXISTE
    tags: 'tags',                             // ✅ EXISTE
    seo_title: 'meta_title',                  // ✅ EXISTE (mapeamento correto)
    seo_description: 'meta_description',       // ✅ EXISTE (mapeamento correto)
    seo_keywords: 'meta_keywords',            // ✅ EXISTE (mapeamento correto)
    technical_specifications: 'specifications' // ✅ EXISTE (mapeamento correto)
    
    // ❌ REMOVIDOS - Campos que NÃO EXISTEM no Neon:
    // short_description, variations, images, materials, care_instructions, 
    // warranty, age_group, safety_certifications, image_url
  };

  for (const [enrichField, dbField] of Object.entries(fieldMappings)) {
    if (enrichmentData[enrichField]?.success && enrichmentData[enrichField]?.value !== undefined) {
      updateFields.push(`${dbField} = $${paramIndex}`);
      
      // Processar valor conforme tipo
      let value = enrichmentData[enrichField].value;
      
      // Para campos específicos do Neon
      if (enrichField === 'tags' && Array.isArray(value)) {
        // tags no Neon é array PostgreSQL
        value = `{${value.join(',')}}`;
      } else if (enrichField === 'seo_keywords' && Array.isArray(value)) {
        // meta_keywords no Neon também é array
        value = `{${value.join(',')}}`;
      } else if (enrichField === 'technical_specifications' && typeof value === 'object') {
        // specifications no Neon é JSONB
        value = JSON.stringify(value);
      } else if (typeof value === 'object') {
        value = JSON.stringify(value);
      }
      
      values.push(value);
      paramIndex++;
    }
  }

  // Para variações, usar as tabelas relacionadas que JÁ EXISTEM
  if (enrichmentData.variations?.success && enrichmentData.variations?.value) {
    // TODO: Implementar salvamento nas tabelas product_variants e variant_option_values
    // Não salvar no campo variations porque não existe
    console.log('Variações devem ser salvas nas tabelas product_variants e variant_option_values');
  }

  if (updateFields.length > 0) {
    updateFields.push(`updated_at = NOW()`);
    
    const query = `
      UPDATE products 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
    `;
    
    values.push(productId);
    await db.query(query, values);
  }
} 