#!/usr/bin/env node

import OpenAI from 'openai'
import { DatabaseConnector } from './sync/utils/db-connector.mjs'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

async function enrichThreeProductsComplete() {
  const connector = new DatabaseConnector({ forceConnection: true })
  
  try {
    await connector.connectNeon()
    
    console.log('🚀 ENRIQUECIMENTO COMPLETO - 3 PRODUTOS DETALHADOS')
    console.log('=' .repeat(70))
    console.log('')
    
    // Selecionar 3 produtos de categorias diferentes
    console.log('📦 Selecionando 3 produtos de categorias diferentes...')
    const products = await connector.queryNeon(`
      WITH category_products AS (
        SELECT 
          p.*,
          c.name as category_name,
          ROW_NUMBER() OVER (PARTITION BY p.category_id ORDER BY p.price DESC) as rn
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.is_active = true 
          AND p.quantity > 0
          AND p.meta_title IS NULL  -- Produtos não enriquecidos ainda
      )
      SELECT 
        id, name, sku, slug, description, price, original_price, quantity,
        category_id, category_name
      FROM category_products
      WHERE rn = 1  -- Primeiro de cada categoria
      ORDER BY price DESC
      LIMIT 3
    `)
    
    if (products.rows.length === 0) {
      console.log('⚠️  Nenhum produto não-enriquecido encontrado. Vou usar produtos já enriquecidos.')
      
      // Pegar produtos já enriquecidos para demonstração
      const enrichedProducts = await connector.queryNeon(`
        SELECT 
          p.id, p.name, p.sku, p.slug, p.description, p.price, p.original_price, 
          p.quantity, p.category_id, c.name as category_name
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.meta_title IS NOT NULL
        ORDER BY p.price DESC
        LIMIT 3
      `)
      
      console.log('📋 PRODUTOS SELECIONADOS PARA ANÁLISE:')
      enrichedProducts.rows.forEach((product, i) => {
        console.log(`   ${i+1}. ${product.name}`)
        console.log(`      💰 Preço: R$ ${product.price}`)
        console.log(`      📂 Categoria: ${product.category_name || 'Sem categoria'}`)
        console.log(`      📦 SKU: ${product.sku}`)
        console.log('')
      })
      
      await analyzeProducts(connector, enrichedProducts.rows)
      
    } else {
      console.log('✅ Produtos selecionados para enriquecimento:')
      products.rows.forEach((product, i) => {
        console.log(`   ${i+1}. ${product.name}`)
        console.log(`      💰 Preço: R$ ${product.price}`)
        console.log(`      📂 Categoria: ${product.category_name || 'Sem categoria'}`)
        console.log(`      📦 SKU: ${product.sku}`)
        console.log('')
      })
      
      await enrichProducts(connector, products.rows)
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await connector.disconnect()
  }
}

async function analyzeProducts(connector, products) {
  console.log('🔍 ANÁLISE DETALHADA DOS PRODUTOS ENRIQUECIDOS:')
  console.log('=' .repeat(70))
  
  for (let i = 0; i < products.length; i++) {
    const product = products[i]
    
    console.log(`\n[${i+1}/3] ANALISANDO: ${product.name}`)
    console.log('-' .repeat(50))
    
    // 1. Verificar dados básicos
    console.log('📊 DADOS BÁSICOS:')
    console.log(`   Nome: ${product.name}`)
    console.log(`   SKU: ${product.sku}`)
    console.log(`   Slug: ${product.slug}`)
    console.log(`   Preço: R$ ${product.price}`)
    console.log(`   Categoria: ${product.category_name}`)
    console.log('')
    
    // 2. Verificar imagens
    const images = await connector.queryNeon(`
      SELECT url, position,
        CASE 
          WHEN url LIKE '%ovh.net%' THEN 'OVH ❌'
          WHEN url LIKE '%amazonaws.com%' THEN 'AWS ✅'
          ELSE 'OUTRO ⚠️'
        END as source
      FROM product_images
      WHERE product_id = $1
      ORDER BY position
    `, [product.id])
    
    console.log('🖼️  IMAGENS:')
    if (images.rows.length > 0) {
      images.rows.forEach((img, idx) => {
        console.log(`   ${idx+1}. [${img.source}] ${img.url}`)
      })
    } else {
      console.log('   ❌ Nenhuma imagem encontrada')
    }
    console.log('')
    
    // 3. Verificar variações
    const variants = await connector.queryNeon(`
      SELECT sku, price, quantity, is_active
      FROM product_variants
      WHERE product_id = $1
      ORDER BY created_at
    `, [product.id])
    
    console.log('🎨 VARIAÇÕES:')
    if (variants.rows.length > 0) {
      variants.rows.forEach((variant, idx) => {
        console.log(`   ${idx+1}. ${variant.sku} - R$ ${variant.price} (Estoque: ${variant.quantity})`)
      })
    } else {
      console.log('   ❌ Nenhuma variação encontrada')
    }
    console.log('')
    
    // 4. Verificar reviews
    const reviews = await connector.queryNeon(`
      SELECT rating, comment, user_name, created_at
      FROM reviews
      WHERE product_id = $1
      ORDER BY created_at DESC
      LIMIT 3
    `, [product.id])
    
    console.log('⭐ REVIEWS:')
    if (reviews.rows.length > 0) {
      reviews.rows.forEach((review, idx) => {
        console.log(`   ${idx+1}. ${review.rating}⭐ por ${review.user_name}`)
        console.log(`      "${review.comment}"`)
      })
    } else {
      console.log('   ❌ Nenhuma review encontrada')
    }
    console.log('')
    
    // 5. Verificar dados SEO
    const seoData = await connector.queryNeon(`
      SELECT meta_title, meta_description, meta_keywords
      FROM products
      WHERE id = $1
    `, [product.id])
    
    console.log('🔍 DADOS SEO:')
    const seo = seoData.rows[0]
    console.log(`   Meta Title: ${seo.meta_title || '❌ Não definido'}`)
    console.log(`   Meta Description: ${seo.meta_description || '❌ Não definido'}`)
    console.log(`   Meta Keywords: ${seo.meta_keywords || '❌ Não definido'}`)
    console.log('')
  }
}

async function enrichProducts(connector, products) {
  console.log('🚀 INICIANDO ENRIQUECIMENTO COMPLETO:')
  console.log('=' .repeat(70))
  
  for (let i = 0; i < products.length; i++) {
    const product = products[i]
    
    console.log(`\n[${i+1}/3] PROCESSANDO: ${product.name}`)
    console.log('-' .repeat(50))
    
    try {
      // 1. Gerar conteúdo com IA
      console.log('🤖 Gerando conteúdo com IA...')
      const aiContent = await generateAIContent(product)
      
      // 2. Salvar dados básicos do produto
      console.log('💾 Salvando dados básicos...')
      await saveProductData(connector, product, aiContent)
      
      // 3. Criar variações (apenas AWS)
      console.log('🎨 Criando variações...')
      await createVariations(connector, product, aiContent.variations)
      
      // 4. Adicionar imagens (apenas AWS)
      console.log('🖼️  Adicionando imagens...')
      await addImages(connector, product, aiContent.images)
      
      // 5. Criar reviews
      console.log('⭐ Criando reviews...')
      await createReviews(connector, product, aiContent.reviews)
      
      console.log('✅ Produto enriquecido completamente!')
      
    } catch (error) {
      console.error(`❌ Erro ao processar ${product.name}:`, error.message)
    }
  }
}

async function generateAIContent(product) {
  const prompt = `
Você é um especialista em e-commerce brasileiro. Crie conteúdo COMPLETO para este produto de bebê/infantil:

PRODUTO: ${product.name}
PREÇO: R$ ${product.price}
CATEGORIA: ${product.category_name}

Retorne um JSON válido com:

{
  "seo": {
    "title": "título SEO otimizado (60 chars)",
    "description": "meta description (150 chars)",
    "keywords": ["palavra1", "palavra2", "palavra3"]
  },
  "content": {
    "shortDescription": "descrição curta e persuasiva (2-3 frases)",
    "fullDescription": "descrição completa e detalhada"
  },
  "specifications": {
    "material": "material principal",
    "dimensions": "dimensões aproximadas",
    "weight": "peso em kg",
    "ageRange": "faixa etária recomendada",
    "care": "instruções de cuidado",
    "certifications": "certificações/selos"
  },
  "variations": [
    {
      "name": "nome da variação",
      "price": ${product.price * 0.9},
      "stock": 15
    },
    {
      "name": "segunda variação", 
      "price": ${product.price},
      "stock": 8
    },
    {
      "name": "terceira variação",
      "price": ${product.price * 1.1},
      "stock": 12
    }
  ],
  "images": [
    "fotos/${product.sku}/${product.slug}-1.jpg",
    "fotos/${product.sku}/${product.slug}-2.jpg", 
    "fotos/${product.sku}/${product.slug}-3.jpg",
    "fotos/${product.sku}/${product.slug}-4.jpg"
  ],
  "reviews": [
    {
      "userName": "Nome brasileiro realista",
      "rating": 5,
      "comment": "review detalhada e realista"
    },
    {
      "userName": "Outro nome brasileiro",
      "rating": 4,
      "comment": "review diferente"
    },
    {
      "userName": "Terceiro nome brasileiro",
      "rating": 5,
      "comment": "terceira review"
    }
  ]
}

Use linguagem brasileira, seja específico para produtos infantis e focado em pais/mães.
`

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 2000
  })

  const content = completion.choices[0].message.content
  
  // Limpar resposta da IA
  const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  
  try {
    return JSON.parse(cleanContent)
  } catch (error) {
    console.error('❌ Erro ao processar JSON da IA:', error.message)
    console.log('Resposta da IA:', cleanContent)
    throw error
  }
}

async function saveProductData(connector, product, content) {
  await connector.queryNeon(`
    UPDATE products SET
      meta_title = $1,
      meta_description = $2,
      meta_keywords = $3,
      short_description = $4,
      description = $5,
      specifications = $6,
      updated_at = NOW()
    WHERE id = $7
  `, [
    content.seo.title,
    content.seo.description,
    JSON.stringify(content.seo.keywords),
    content.content.shortDescription,
    content.content.fullDescription,
    JSON.stringify(content.specifications),
    product.id
  ])
}

async function createVariations(connector, product, variations) {
  // Primeiro, limpar variações existentes
  await connector.queryNeon(`DELETE FROM product_variants WHERE product_id = $1`, [product.id])
  
  for (const variant of variations) {
    const variantSku = `${product.sku}-${variant.name.replace(/\s+/g, '-')}`
    
    await connector.queryNeon(`
      INSERT INTO product_variants (product_id, sku, price, quantity, is_active, created_at)
      VALUES ($1, $2, $3, $4, true, NOW())
    `, [product.id, variantSku, variant.price, variant.stock])
  }
}

async function addImages(connector, product, imageNames) {
  // Primeiro, limpar imagens OVH existentes
  await connector.queryNeon(`DELETE FROM product_images WHERE product_id = $1`, [product.id])
  
  // Adicionar apenas imagens AWS
  for (let i = 0; i < imageNames.length; i++) {
    const awsUrl = `https://gdg-images.s3.sa-east-1.amazonaws.com/${imageNames[i]}`
    
    await connector.queryNeon(`
      INSERT INTO product_images (product_id, url, position, created_at)
      VALUES ($1, $2, $3, NOW())
    `, [product.id, awsUrl, i + 1])
  }
}

async function createReviews(connector, product, reviews) {
  // Primeiro, limpar reviews existentes
  await connector.queryNeon(`DELETE FROM reviews WHERE product_id = $1`, [product.id])
  
  for (const review of reviews) {
    await connector.queryNeon(`
      INSERT INTO reviews (product_id, user_name, rating, comment, created_at)
      VALUES ($1, $2, $3, $4, NOW())
    `, [product.id, review.userName, review.rating, review.comment])
  }
  
  // Atualizar rating médio do produto
  const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
  await connector.queryNeon(`
    UPDATE products SET
      rating_average = $1,
      rating_count = $2
    WHERE id = $3
  `, [avgRating, reviews.length, product.id])
}

enrichThreeProductsComplete() 