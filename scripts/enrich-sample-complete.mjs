#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'
import OpenAI from 'openai'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

dotenv.config({ path: path.join(rootDir, '.env.local') })

// Configuração para amostra completa
const config = {
  sampleSize: 50, // 50 produtos diversificados
  delayBetweenProducts: 3000, // 3 segundos entre produtos (mais tempo por ser completo)
  budgetLimit: 50, // Limite para a amostra
  model: 'gpt-4-turbo-preview'
}

let stats = {
  totalCost: 0,
  totalTokens: 0,
  processedProducts: 0,
  startTime: Date.now()
}

// Função para limpar resposta da IA
function cleanAIResponse(response) {
  return response
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .replace(/^\s*[\r\n]+/gm, '')
    .trim()
}

// Prompts para campos específicos
const prompts = {
  specifications: (product) => `
Crie especificações técnicas para "${product.name}" categoria "${product.category_name || 'Produto Infantil'}".

IMPORTANTE: Retorne APENAS um objeto JSON válido, sem markdown ou formatação extra.

Exemplo de resposta:
{
  "material": "100% Algodão",
  "idade_recomendada": "0-3 anos",
  "certificacoes": ["INMETRO"],
  "cuidados": ["Lavar à mão"],
  "origem": "Nacional",
  "garantia": "6 meses"
}`,

  productVariants: (product) => `
Crie 2-3 variantes para "${product.name}".

IMPORTANTE: Retorne APENAS um array JSON válido, sem markdown ou formatação extra.

Exemplo de resposta:
[
  {
    "name": "Rosa",
    "type": "color",
    "value": "Rosa",
    "price_adjustment": 0,
    "stock": 15
  },
  {
    "name": "Azul",
    "type": "color", 
    "value": "Azul",
    "price_adjustment": 5.00,
    "stock": 12
  }
]`,

  productReviews: (product) => `
Crie 3 reviews para "${product.name}" por mães/pais brasileiros.

IMPORTANTE: Retorne APENAS um array JSON válido, sem markdown ou formatação extra.

Exemplo de resposta:
[
  {
    "reviewer_name": "Ana Paula",
    "rating": 5,
    "title": "Adorei!",
    "comment": "Produto excelente, meu bebê adorou muito.",
    "verified_purchase": true,
    "helpful_votes": 3
  }
]`,

  productImages: (product) => `
Crie 4 URLs de imagens para "${product.name}" usando o SKU ${product.sku}.

Substitua "SKU" pelo número ${product.sku} nas URLs abaixo:

IMPORTANTE: Retorne APENAS um array JSON válido. Use o SKU ${product.sku} nas URLs.

[
  {
    "url": "https://gdg-images.s3.sa-east-1.amazonaws.com/fotos/${product.sku}/produto-principal.jpg",
    "alt": "${product.name}",
    "is_primary": true,
    "sort_order": 1
  },
  {
    "url": "https://gdg-images.s3.sa-east-1.amazonaws.com/fotos/${product.sku}/produto-detalhe.jpg", 
    "alt": "${product.name} - Detalhe",
    "is_primary": false,
    "sort_order": 2
  },
  {
    "url": "https://gdg-images.s3.sa-east-1.amazonaws.com/fotos/${product.sku}/produto-uso.jpg",
    "alt": "${product.name} - Em uso",
    "is_primary": false,
    "sort_order": 3
  },
  {
    "url": "https://gdg-images.s3.sa-east-1.amazonaws.com/fotos/${product.sku}/produto-embalagem.jpg",
    "alt": "${product.name} - Embalagem",
    "is_primary": false,
    "sort_order": 4
  }
]`,

  seoOptimization: (product) => `
Crie conteúdo SEO para "${product.name}":

IMPORTANTE: Retorne APENAS um objeto JSON válido, sem markdown ou formatação extra.

Exemplo de resposta:
{
  "meta_title": "título aqui",
  "meta_description": "descrição aqui",
  "short_description": "descrição curta aqui",
  "tags": ["tag1", "tag2"],
  "slug": "slug-otimizado"
}`
}

// Função para enriquecer produto completamente
async function enrichProductComplete(product, openai, connector) {
  console.log(`\n🚀 ENRIQUECIMENTO COMPLETO: ${product.name}`)
  console.log(`   📦 Categoria: ${product.category_name || 'Sem categoria'}`)
  console.log(`   💰 Preço: R$ ${product.price}`)
  
  const enrichedData = {
    product: {},
    variants: [],
    reviews: [],
    images: [],
    analytics: {}
  }
  
  let totalTokens = 0
  
  try {
    // 1. ENRIQUECIMENTO SEO E CONTEÚDO BÁSICO
    console.log('   📝 Gerando conteúdo SEO...')
    const seoResponse = await openai.chat.completions.create({
      model: config.model,
      messages: [{ role: 'user', content: prompts.seoOptimization(product) }],
      temperature: 0.7,
      max_tokens: 500
    })
    
    const seoData = JSON.parse(cleanAIResponse(seoResponse.choices[0].message.content))
    enrichedData.product = { ...enrichedData.product, ...seoData }
    totalTokens += seoResponse.usage.total_tokens
    
    // 2. ESPECIFICAÇÕES TÉCNICAS
    console.log('   🔧 Gerando especificações técnicas...')
    const specsResponse = await openai.chat.completions.create({
      model: config.model,
      messages: [{ role: 'user', content: prompts.specifications(product) }],
      temperature: 0.5,
      max_tokens: 400
    })
    
    const specsData = JSON.parse(cleanAIResponse(specsResponse.choices[0].message.content))
    enrichedData.product.specifications = specsData
    totalTokens += specsResponse.usage.total_tokens
    
    // 3. VARIANTES DO PRODUTO
    console.log('   🎨 Gerando variantes...')
    const variantsResponse = await openai.chat.completions.create({
      model: config.model,
      messages: [{ role: 'user', content: prompts.productVariants(product) }],
      temperature: 0.8,
      max_tokens: 400
    })
    
    enrichedData.variants = JSON.parse(cleanAIResponse(variantsResponse.choices[0].message.content))
    totalTokens += variantsResponse.usage.total_tokens
    
    // 4. REVIEWS REALÍSTICAS
    console.log('   ⭐ Gerando reviews...')
    const reviewsResponse = await openai.chat.completions.create({
      model: config.model,
      messages: [{ role: 'user', content: prompts.productReviews(product) }],
      temperature: 0.9,
      max_tokens: 600
    })
    
    enrichedData.reviews = JSON.parse(cleanAIResponse(reviewsResponse.choices[0].message.content))
    totalTokens += reviewsResponse.usage.total_tokens
    
    // 5. IMAGENS SUGERIDAS (gerar diretamente, não usar IA)
    console.log('   📸 Gerando URLs de imagens...')
    
    enrichedData.images = [
      {
        url: `https://gdg-images.s3.sa-east-1.amazonaws.com/fotos/${product.sku}/${product.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')}-1.jpg`,
        alt: product.name,
        is_primary: true,
        sort_order: 1
      },
      {
        url: `https://gdg-images.s3.sa-east-1.amazonaws.com/fotos/${product.sku}/${product.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')}-2.jpg`,
        alt: `${product.name} - Detalhe`,
        is_primary: false,
        sort_order: 2
      },
      {
        url: `https://gdg-images.s3.sa-east-1.amazonaws.com/fotos/${product.sku}/${product.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')}-3.jpg`,
        alt: `${product.name} - Em uso`,
        is_primary: false,
        sort_order: 3
      },
      {
        url: `https://gdg-images.s3.sa-east-1.amazonaws.com/fotos/${product.sku}/${product.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')}-4.jpg`,
        alt: `${product.name} - Embalagem`,
        is_primary: false,
        sort_order: 4
      }
    ]
    
    // Calcular custo
    const productCost = (totalTokens / 1000) * 0.04
    stats.totalCost += productCost
    stats.totalTokens += totalTokens
    
    console.log(`   ✅ IA concluída: ${totalTokens} tokens ($${productCost.toFixed(4)})`)
    
    // SALVAR NO BANCO
    console.log('   💾 Salvando no banco...')
    
    // 1. Atualizar produto principal
    await connector.queryNeon(`
      UPDATE products 
      SET 
        meta_title = $1,
        meta_description = $2,
        short_description = $3,
        tags = $4::text[],
        meta_keywords = $4::text[],
        specifications = $5::jsonb,
        slug = $6,
        updated_at = NOW()
      WHERE id = $7
    `, [
      enrichedData.product.meta_title,
      enrichedData.product.meta_description,
      enrichedData.product.short_description,
      enrichedData.product.tags,
      enrichedData.product.specifications,
      enrichedData.product.slug,
      product.id
    ])
    
    // 2. Inserir variantes (ajustando para estrutura real)
    for (const [index, variant] of enrichedData.variants.entries()) {
      await connector.queryNeon(`
        INSERT INTO product_variants (
          product_id, sku, price, quantity, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        ON CONFLICT (sku) DO NOTHING
      `, [
        product.id,
        `${product.sku}-${variant.value || variant.name || index + 1}`.replace(/\s+/g, '-'),
        parseFloat(product.price) + (variant.price_adjustment || 0),
        variant.stock || 10,
        true
      ])
    }
    
    // 3. Inserir reviews (criar usuário dummy se necessário)
    for (const review of enrichedData.reviews) {
      // Primeiro, criar ou buscar usuário dummy
      const userResult = await connector.queryNeon(`
        INSERT INTO users (id, name, email, password_hash, role, is_active, created_at, updated_at)
        VALUES (gen_random_uuid(), $1, $2, 'dummy_hash_123', 'customer', true, NOW(), NOW())
        ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
      `, [
        review.reviewer_name,
        `${review.reviewer_name.toLowerCase().replace(/\s+/g, '.')}@dummy.com`
      ])
      
      const userId = userResult.rows[0].id
      
      await connector.queryNeon(`
        INSERT INTO reviews (
          product_id, user_id, rating, title, comment, 
          is_verified, helpful_count, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        ON CONFLICT DO NOTHING
      `, [
        product.id,
        userId,
        review.rating,
        review.title,
        review.comment,
        review.verified_purchase || true,
        review.helpful_votes || 0
      ])
    }
    
    // 4. Inserir imagens (ajustando para estrutura real)
    for (const [index, image] of enrichedData.images.entries()) {
      await connector.queryNeon(`
        INSERT INTO product_images (
          product_id, url, alt_text, position, is_primary, created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT DO NOTHING
      `, [
        product.id,
        image.url,
        image.alt,
        index + 1,
        index === 0 // Primeira imagem é primária
      ])
    }
    
    // 5. Atualizar analytics
    const avgRating = enrichedData.reviews.reduce((sum, r) => sum + r.rating, 0) / enrichedData.reviews.length
    await connector.queryNeon(`
      UPDATE products 
      SET 
        rating_average = $1,
        rating_count = $2
      WHERE id = $3
    `, [avgRating.toFixed(1), enrichedData.reviews.length, product.id])
    
    console.log(`   ✅ Produto completamente enriquecido!`)
    console.log(`   📊 Adicionado: ${enrichedData.variants.length} variantes, ${enrichedData.reviews.length} reviews, ${enrichedData.images.length} imagens`)
    
    stats.processedProducts++
    return enrichedData
    
  } catch (error) {
    console.error(`   ❌ Erro: ${error.message}`)
    if (error.message.includes('JSON')) {
      console.error(`   📝 Resposta da IA que causou erro: ${error.response || 'N/A'}`)
    }
    throw error
  }
}

// Função principal
async function enrichSampleComplete() {
  console.log('🚀 ENRIQUECIMENTO COMPLETO - AMOSTRA DIVERSIFICADA\n')
  console.log('=' .repeat(70) + '\n')
  
  const connector = new DatabaseConnector({ forceConnection: true })
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  
  try {
    await connector.connectNeon()
    
    // Buscar produtos diversificados
    console.log('📦 Selecionando produtos diversificados...\n')
    
    const productsResult = await connector.queryNeon(`
      WITH category_samples AS (
        SELECT 
          p.id,
          p.name,
          p.sku,
          p.price,
          p.description,
          c.name as category_name,
          ROW_NUMBER() OVER (PARTITION BY COALESCE(p.category_id::text, 'no_category') ORDER BY p.price DESC) as rn
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.name IS NOT NULL 
          AND p.price IS NOT NULL
          AND p.meta_title IS NULL  -- Ainda não enriquecidos
      )
      SELECT *
      FROM category_samples
      WHERE rn <= 10  -- Até 10 produtos por categoria
      ORDER BY category_name NULLS LAST, price DESC
      LIMIT $1
    `, [config.sampleSize])
    
    const products = productsResult.rows
    
    if (products.length === 0) {
      console.log('❌ Nenhum produto encontrado para enriquecimento!')
      return
    }
    
    console.log(`✅ ${products.length} produtos selecionados:`)
    products.forEach((p, i) => {
      console.log(`   ${i+1}. ${p.name} (${p.category_name || 'Sem categoria'}) - R$ ${p.price}`)
    })
    
    const estimatedCost = products.length * 0.08 // ~$0.08 por produto completo
    console.log(`\n💰 Custo estimado: $${estimatedCost.toFixed(2)} (R$ ${(estimatedCost * 5).toFixed(2)})`)
    console.log('⏳ Tempo estimado: ~3-5 minutos')
    console.log('\nIniciando em 5 segundos... (Ctrl+C para cancelar)\n')
    
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    // Processar cada produto
    for (let i = 0; i < products.length; i++) {
      const product = products[i]
      
      console.log(`\n${'='.repeat(60)}`)
      console.log(`[${i + 1}/${products.length}] PROCESSANDO`)
      
      try {
        await enrichProductComplete(product, openai, connector)
        
        // Delay entre produtos
        if (i < products.length - 1) {
          console.log(`   ⏳ Aguardando ${config.delayBetweenProducts/1000}s...`)
          await new Promise(resolve => setTimeout(resolve, config.delayBetweenProducts))
        }
        
      } catch (error) {
        console.error(`   ❌ Falha no produto: ${error.message}`)
        continue
      }
    }
    
    // Relatório final
    const duration = (Date.now() - stats.startTime) / 1000
    console.log('\n' + '='.repeat(70))
    console.log('\n🎉 ENRIQUECIMENTO COMPLETO DA AMOSTRA CONCLUÍDO!\n')
    console.log('📊 ESTATÍSTICAS FINAIS:')
    console.log(`   ✅ Produtos processados: ${stats.processedProducts}`)
    console.log(`   💰 Custo total: $${stats.totalCost.toFixed(2)} (R$ ${(stats.totalCost * 5).toFixed(2)})`)
    console.log(`   📝 Tokens usados: ${stats.totalTokens.toLocaleString()}`)
    console.log(`   ⏱️  Tempo total: ${Math.floor(duration/60)}min ${Math.floor(duration%60)}s`)
    console.log(`   💵 Custo médio: $${(stats.totalCost / stats.processedProducts).toFixed(4)}/produto`)
    
    console.log('\n🔍 VALIDAÇÃO:')
    console.log('1. Verifique a qualidade dos dados gerados')
    console.log('2. Teste diferentes categorias e tipos de produto')
    console.log('3. Valide reviews, variantes e especificações')
    console.log('4. Após aprovação, execute para todos os produtos')
    
    console.log('\n✅ Amostra pronta para validação!')
    
  } catch (error) {
    console.error('❌ Erro geral:', error)
  } finally {
    await connector.disconnect()
  }
}

// Executar
enrichSampleComplete().catch(console.error) 