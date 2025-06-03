#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'

async function analyzeThreeProductsDetailed() {
  const connector = new DatabaseConnector({ forceConnection: true })
  
  try {
    await connector.connectNeon()
    
    console.log('🔍 ANÁLISE DETALHADA - 3 PRODUTOS REPRESENTATIVOS')
    console.log('=' .repeat(70))
    console.log('')
    
    // Selecionar 3 produtos enriquecidos de categorias diferentes
    console.log('📦 Selecionando 3 produtos de categorias diferentes...')
    const products = await connector.queryNeon(`
      WITH category_stats AS (
        SELECT 
          p.id, p.name, p.sku, p.slug, p.description, p.price, p.original_price, 
          p.quantity, p.category_id, c.name as category_name,
          p.meta_title, p.meta_description, p.rating_average, p.rating_count,
          ROW_NUMBER() OVER (PARTITION BY p.category_id ORDER BY p.price DESC) as rn
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.meta_title IS NOT NULL
          AND p.is_active = true
      )
      SELECT *
      FROM category_stats
      WHERE rn = 1  -- Primeiro de cada categoria
      ORDER BY price DESC
      LIMIT 3
    `)
    
    if (products.rows.length === 0) {
      console.log('❌ Nenhum produto enriquecido encontrado!')
      return
    }
    
    console.log('✅ Produtos selecionados para análise:')
    products.rows.forEach((product, i) => {
      console.log(`   ${i+1}. ${product.name}`)
      console.log(`      💰 Preço: R$ ${product.price}`)
      console.log(`      📂 Categoria: ${product.category_name || 'Sem categoria'}`)
      console.log(`      📦 SKU: ${product.sku}`)
      console.log('')
    })
    
    await analyzeProducts(connector, products.rows)
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await connector.disconnect()
  }
}

async function analyzeProducts(connector, products) {
  console.log('🔍 ANÁLISE DETALHADA DOS PRODUTOS:')
  console.log('=' .repeat(70))
  
  for (let i = 0; i < products.length; i++) {
    const product = products[i]
    
    console.log(`\n[${i+1}/3] ANALISANDO: ${product.name}`)
    console.log('-' .repeat(50))
    
    // 1. Verificar dados básicos
    console.log('📊 DADOS BÁSICOS:')
    console.log(`   ID: ${product.id}`)
    console.log(`   Nome: ${product.name}`)
    console.log(`   SKU: ${product.sku}`)
    console.log(`   Slug: ${product.slug}`)
    console.log(`   Preço: R$ ${product.price}`)
    console.log(`   Preço Original: ${product.original_price ? `R$ ${product.original_price}` : 'N/A'}`)
    console.log(`   Categoria: ${product.category_name}`)
    console.log(`   Estoque: ${product.quantity}`)
    console.log(`   Rating: ${product.rating_average || 'N/A'} (${product.rating_count || 0} avaliações)`)
    console.log('')
    
    // 2. Verificar dados SEO
    console.log('🔍 DADOS SEO:')
    console.log(`   Meta Title: ${product.meta_title || '❌ Não definido'}`)
    console.log(`   Meta Description: ${product.meta_description || '❌ Não definido'}`)
    console.log('')
    
    // 3. Verificar especificações técnicas
    const specs = await connector.queryNeon(`
      SELECT specifications, attributes
      FROM products
      WHERE id = $1
    `, [product.id])
    
    console.log('🔧 ESPECIFICAÇÕES:')
    if (specs.rows[0]?.specifications) {
      try {
        const specifications = JSON.parse(specs.rows[0].specifications)
        Object.entries(specifications).forEach(([key, value]) => {
          console.log(`   ${key}: ${value}`)
        })
      } catch (e) {
        console.log(`   Raw: ${specs.rows[0].specifications}`)
      }
    } else {
      console.log('   ❌ Nenhuma especificação encontrada')
    }
    console.log('')
    
    // 4. Verificar imagens DETALHADAMENTE
    const images = await connector.queryNeon(`
      SELECT url, position,
        CASE 
          WHEN url LIKE '%ovh.net%' THEN 'OVH'
          WHEN url LIKE '%amazonaws.com%' THEN 'AWS'
          ELSE 'OUTRO'
        END as source
      FROM product_images
      WHERE product_id = $1
      ORDER BY position
    `, [product.id])
    
    console.log('🖼️  IMAGENS:')
    if (images.rows.length > 0) {
      const ovhCount = images.rows.filter(img => img.source === 'OVH').length
      const awsCount = images.rows.filter(img => img.source === 'AWS').length
      
      console.log(`   📊 Total: ${images.rows.length} (🔴 OVH: ${ovhCount}, 🟢 AWS: ${awsCount})`)
      console.log('')
      
      images.rows.forEach((img, idx) => {
        const emoji = img.source === 'OVH' ? '🔴' : img.source === 'AWS' ? '🟢' : '⚪'
        console.log(`   ${idx+1}. ${emoji} [${img.source}] ${img.url}`)
      })
    } else {
      console.log('   ❌ Nenhuma imagem encontrada')
    }
    console.log('')
    
    // 5. Verificar variações DETALHADAMENTE
    const variants = await connector.queryNeon(`
      SELECT sku, price, original_price, quantity, is_active, created_at
      FROM product_variants
      WHERE product_id = $1
      ORDER BY created_at
    `, [product.id])
    
    console.log('🎨 VARIAÇÕES:')
    if (variants.rows.length > 0) {
      console.log(`   📊 Total: ${variants.rows.length} variações`)
      console.log('')
      
      variants.rows.forEach((variant, idx) => {
        const status = variant.is_active ? '✅' : '❌'
        const originalPrice = variant.original_price ? ` (Original: R$ ${variant.original_price})` : ''
        console.log(`   ${idx+1}. ${status} ${variant.sku}`)
        console.log(`      💰 R$ ${variant.price}${originalPrice}`)
        console.log(`      📦 Estoque: ${variant.quantity}`)
        console.log(`      📅 Criado: ${variant.created_at}`)
        console.log('')
      })
    } else {
      console.log('   ❌ Nenhuma variação encontrada')
    }
    console.log('')
    
    // 6. Verificar reviews DETALHADAMENTE
    const reviews = await connector.queryNeon(`
      SELECT 
        r.rating, 
        r.comment, 
        r.title,
        r.is_verified,
        r.helpful_count,
        r.created_at,
        COALESCE(u.name, u.email, 'Usuário Anônimo') as user_name
      FROM reviews r
      LEFT JOIN users u ON u.id = r.user_id
      WHERE r.product_id = $1
      ORDER BY r.created_at DESC
    `, [product.id])
    
    console.log('⭐ REVIEWS:')
    if (reviews.rows.length > 0) {
      const avgRating = reviews.rows.reduce((sum, r) => sum + r.rating, 0) / reviews.rows.length
      console.log(`   📊 Total: ${reviews.rows.length} reviews (Média: ${avgRating.toFixed(1)}⭐)`)
      console.log('')
      
      reviews.rows.forEach((review, idx) => {
        console.log(`   ${idx+1}. ${review.rating}⭐ por ${review.user_name}`)
        console.log(`      "${review.comment}"`)
        console.log(`      📅 ${review.created_at}`)
        console.log('')
      })
    } else {
      console.log('   ❌ Nenhuma review encontrada')
    }
    console.log('')
    
    // 7. Verificar como produto aparece na API
    console.log('🌐 TESTE DA API:')
    console.log(`   URL: http://localhost:5174/api/products/${product.slug}`)
    console.log(`   Frontend: http://localhost:5174/produto/${product.slug}`)
    console.log('')
  }
  
  // 8. Resumo geral
  console.log('📋 RESUMO GERAL:')
  console.log('=' .repeat(50))
  
  const totalImages = await connector.queryNeon(`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN url LIKE '%ovh.net%' THEN 1 END) as ovh_count,
      COUNT(CASE WHEN url LIKE '%amazonaws.com%' THEN 1 END) as aws_count
    FROM product_images pi
    JOIN products p ON p.id = pi.product_id
    WHERE p.id = ANY($1)
  `, [products.map(p => p.id)])
  
  const totalVariants = await connector.queryNeon(`
    SELECT COUNT(*) as total
    FROM product_variants pv
    JOIN products p ON p.id = pv.product_id
    WHERE p.id = ANY($1)
  `, [products.map(p => p.id)])
  
  const totalReviews = await connector.queryNeon(`
    SELECT COUNT(*) as total
    FROM reviews r
    JOIN products p ON p.id = r.product_id
    WHERE p.id = ANY($1)
  `, [products.map(p => p.id)])
  
  const imageStats = totalImages.rows[0]
  console.log(`🖼️  Imagens: ${imageStats.total} total (🔴 ${imageStats.ovh_count} OVH, 🟢 ${imageStats.aws_count} AWS)`)
  console.log(`🎨 Variações: ${totalVariants.rows[0].total}`)
  console.log(`⭐ Reviews: ${totalReviews.rows[0].total}`)
  console.log('')
  
  // 9. Recomendações
  console.log('💡 RECOMENDAÇÕES:')
  if (imageStats.ovh_count > 0) {
    console.log(`   🔴 PROBLEMA: ${imageStats.ovh_count} imagens ainda vêm da OVH`)
    console.log('   ✅ SOLUÇÃO: Migrar todas para AWS')
  }
  if (imageStats.aws_count > 0) {
    console.log(`   🟢 BOM: ${imageStats.aws_count} imagens já estão na AWS`)
  }
  console.log('')
  
  console.log('🚀 PRÓXIMOS PASSOS:')
  console.log('   1. Corrigir URLs das imagens para usar apenas AWS')
  console.log('   2. Testar variações no frontend')
  console.log('   3. Verificar se reviews aparecem corretamente')
  console.log('   4. Validar funcionamento completo')
}

analyzeThreeProductsDetailed() 