#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'

async function analyzeCurrentStatus() {
  const connector = new DatabaseConnector({ forceConnection: true })
  
  try {
    await connector.connectNeon()
    
    console.log('📊 ANÁLISE COMPLETA DO STATUS ATUAL')
    console.log('=' .repeat(70))
    console.log('')
    
    // 1. STATUS GERAL DOS PRODUTOS
    console.log('🏪 STATUS GERAL DOS PRODUTOS:')
    const total = await connector.queryNeon(`
      SELECT COUNT(*) as count FROM products WHERE is_active = true
    `)
    console.log(`   Total de produtos ativos: ${total.rows[0].count}`)
    
    const enriched = await connector.queryNeon(`
      SELECT COUNT(*) as count FROM products WHERE meta_title IS NOT NULL
    `)
    console.log(`   Produtos enriquecidos: ${enriched.rows[0].count}`)
    
    const percentage = ((enriched.rows[0].count / total.rows[0].count) * 100).toFixed(1)
    console.log(`   Percentual enriquecido: ${percentage}%`)
    console.log('')
    
    // 2. ANÁLISE DE IMAGENS
    console.log('🖼️  ANÁLISE DE IMAGENS:')
    const withImages = await connector.queryNeon(`
      SELECT COUNT(DISTINCT p.id) as count 
      FROM products p 
      JOIN product_images pi ON p.id = pi.product_id 
      WHERE p.is_active = true
    `)
    console.log(`   Produtos com imagens: ${withImages.rows[0].count}`)
    
    const imagesBySource = await connector.queryNeon(`
      SELECT 
        CASE 
          WHEN url LIKE '%ovh.net%' THEN 'OVH'
          WHEN url LIKE '%amazonaws.com%' THEN 'AWS'
          ELSE 'OUTRO'
        END as source,
        COUNT(*) as count
      FROM product_images
      GROUP BY source
      ORDER BY count DESC
    `)
    
    console.log('   Imagens por origem:')
    imagesBySource.rows.forEach(row => {
      console.log(`     ${row.source}: ${row.count} imagens`)
    })
    
    const totalImages = imagesBySource.rows.reduce((sum, row) => sum + row.count, 0)
    console.log(`   Total de imagens: ${totalImages}`)
    console.log('')
    
    // 3. FUNCIONALIDADES AVANÇADAS
    console.log('🚀 FUNCIONALIDADES AVANÇADAS:')
    
    const withVariants = await connector.queryNeon(`
      SELECT COUNT(DISTINCT p.id) as count 
      FROM products p 
      JOIN product_variants pv ON p.id = pv.product_id 
      WHERE p.is_active = true
    `)
    console.log(`   Produtos com variações: ${withVariants.rows[0].count}`)
    
    const withReviews = await connector.queryNeon(`
      SELECT COUNT(DISTINCT p.id) as count 
      FROM products p 
      JOIN reviews r ON p.id = r.product_id 
      WHERE p.is_active = true
    `)
    console.log(`   Produtos com reviews: ${withReviews.rows[0].count}`)
    
    const withSpecs = await connector.queryNeon(`
      SELECT COUNT(*) as count 
      FROM products 
      WHERE specifications IS NOT NULL 
        AND specifications != 'null' 
        AND specifications != ''
        AND is_active = true
    `)
    console.log(`   Produtos com especificações: ${withSpecs.rows[0].count}`)
    console.log('')
    
    // 4. PRODUTOS CORRIGIDOS RECENTEMENTE
    console.log('✅ PRODUTOS CORRIGIDOS HOJE:')
    const recentlyFixed = await connector.queryNeon(`
      SELECT p.name, p.sku, 
        (SELECT COUNT(*) FROM product_images WHERE product_id = p.id) as image_count,
        (SELECT COUNT(*) FROM product_variants WHERE product_id = p.id) as variant_count,
        (SELECT COUNT(*) FROM reviews WHERE product_id = p.id) as review_count
      FROM products p
      WHERE p.sku IN ('176223', '194747', '167807', '155332')
      ORDER BY p.sku
    `)
    
    recentlyFixed.rows.forEach(product => {
      console.log(`   📦 ${product.name} (${product.sku}):`)
      console.log(`      🖼️  ${product.image_count} imagens`)
      console.log(`      🎨 ${product.variant_count} variações`)
      console.log(`      ⭐ ${product.review_count} reviews`)
      console.log('')
    })
    
    // 5. PRÓXIMOS PRODUTOS PRIORITÁRIOS
    console.log('🎯 PRODUTOS PRIORITÁRIOS (maior preço, sem enriquecimento):')
    const priority = await connector.queryNeon(`
      SELECT name, sku, price, quantity as stock
      FROM products
      WHERE meta_title IS NULL 
        AND is_active = true
        AND quantity > 0
      ORDER BY price DESC
      LIMIT 10
    `)
    
    priority.rows.forEach((product, i) => {
      console.log(`   ${i+1}. ${product.name} (${product.sku}) - R$ ${product.price}`)
    })
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await connector.disconnect()
  }
}

analyzeCurrentStatus() 