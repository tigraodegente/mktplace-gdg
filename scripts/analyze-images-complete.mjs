#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'

async function analyzeImagesComplete() {
  const connector = new DatabaseConnector({ forceConnection: true })
  
  try {
    await connector.connectNeon()
    
    console.log('🔍 ANÁLISE COMPLETA DAS IMAGENS DO BANCO DE DADOS')
    console.log('=' .repeat(70))
    console.log('')
    
    // 1. ESTATÍSTICAS GERAIS
    console.log('📊 ESTATÍSTICAS GERAIS:')
    
    const totalStats = await connector.queryNeon(`
      SELECT 
        COUNT(DISTINCT pi.product_id) as products_with_images,
        COUNT(*) as total_images,
        COUNT(CASE WHEN pi.url LIKE '%ovh.net%' THEN 1 END) as ovh_images,
        COUNT(CASE WHEN pi.url LIKE '%amazonaws.com%' THEN 1 END) as aws_images,
        COUNT(CASE WHEN pi.url NOT LIKE '%ovh.net%' AND pi.url NOT LIKE '%amazonaws.com%' THEN 1 END) as other_images
      FROM product_images pi
      JOIN products p ON p.id = pi.product_id
      WHERE p.is_active = true
    `)
    
    const stats = totalStats.rows[0]
    console.log(`   📦 Produtos com imagens: ${stats.products_with_images}`)
    console.log(`   🖼️  Total de imagens: ${stats.total_images}`)
    console.log(`   🔴 Imagens OVH: ${stats.ovh_images} (${((stats.ovh_images / stats.total_images) * 100).toFixed(1)}%)`)
    console.log(`   🟢 Imagens AWS: ${stats.aws_images} (${((stats.aws_images / stats.total_images) * 100).toFixed(1)}%)`)
    console.log(`   ⚪ Outras imagens: ${stats.other_images} (${((stats.other_images / stats.total_images) * 100).toFixed(1)}%)`)
    console.log('')
    
    // 2. PRODUTOS COM MISTURA DE ORIGENS
    console.log('⚠️  PRODUTOS COM MISTURA DE ORIGENS:')
    
    const mixedProducts = await connector.queryNeon(`
      WITH product_image_sources AS (
        SELECT 
          pi.product_id,
          p.name,
          p.sku,
          COUNT(CASE WHEN pi.url LIKE '%ovh.net%' THEN 1 END) as ovh_count,
          COUNT(CASE WHEN pi.url LIKE '%amazonaws.com%' THEN 1 END) as aws_count,
          COUNT(*) as total_images
        FROM product_images pi
        JOIN products p ON p.id = pi.product_id
        WHERE p.is_active = true
        GROUP BY pi.product_id, p.name, p.sku
      )
      SELECT *
      FROM product_image_sources
      WHERE ovh_count > 0 AND aws_count > 0
      ORDER BY total_images DESC
    `)
    
    if (mixedProducts.rows.length > 0) {
      console.log(`   📊 ${mixedProducts.rows.length} produtos com mistura de origens:`)
      mixedProducts.rows.forEach(product => {
        console.log(`      ${product.sku} - ${product.name}`)
        console.log(`         🔴 ${product.ovh_count} OVH | 🟢 ${product.aws_count} AWS | Total: ${product.total_images}`)
      })
    } else {
      console.log('   ✅ Nenhum produto com mistura de origens encontrado')
    }
    console.log('')
    
    // 3. PRODUTOS APENAS COM OVH
    console.log('🔴 PRODUTOS APENAS COM IMAGENS OVH:')
    
    const ovhOnlyProducts = await connector.queryNeon(`
      WITH product_image_sources AS (
        SELECT 
          pi.product_id,
          p.name,
          p.sku,
          p.price,
          COUNT(CASE WHEN pi.url LIKE '%ovh.net%' THEN 1 END) as ovh_count,
          COUNT(CASE WHEN pi.url LIKE '%amazonaws.com%' THEN 1 END) as aws_count,
          COUNT(*) as total_images
        FROM product_images pi
        JOIN products p ON p.id = pi.product_id
        WHERE p.is_active = true
        GROUP BY pi.product_id, p.name, p.sku, p.price
      )
      SELECT *
      FROM product_image_sources
      WHERE ovh_count > 0 AND aws_count = 0
      ORDER BY price DESC
      LIMIT 20
    `)
    
    console.log(`   📊 ${ovhOnlyProducts.rows.length} produtos (mostrando top 20 por preço):`)
    ovhOnlyProducts.rows.forEach((product, i) => {
      console.log(`   ${i+1}. ${product.sku} - R$ ${product.price} - ${product.total_images} imagens`)
      console.log(`      ${product.name.substring(0, 60)}${product.name.length > 60 ? '...' : ''}`)
    })
    console.log('')
    
    // 4. PRODUTOS APENAS COM AWS
    console.log('🟢 PRODUTOS APENAS COM IMAGENS AWS:')
    
    const awsOnlyProducts = await connector.queryNeon(`
      WITH product_image_sources AS (
        SELECT 
          pi.product_id,
          p.name,
          p.sku,
          p.price,
          COUNT(CASE WHEN pi.url LIKE '%ovh.net%' THEN 1 END) as ovh_count,
          COUNT(CASE WHEN pi.url LIKE '%amazonaws.com%' THEN 1 END) as aws_count,
          COUNT(*) as total_images
        FROM product_images pi
        JOIN products p ON p.id = pi.product_id
        WHERE p.is_active = true
        GROUP BY pi.product_id, p.name, p.sku, p.price
      )
      SELECT *
      FROM product_image_sources
      WHERE ovh_count = 0 AND aws_count > 0
      ORDER BY price DESC
      LIMIT 10
    `)
    
    console.log(`   📊 ${awsOnlyProducts.rows.length} produtos (mostrando top 10 por preço):`)
    awsOnlyProducts.rows.forEach((product, i) => {
      console.log(`   ${i+1}. ${product.sku} - R$ ${product.price} - ${product.total_images} imagens`)
      console.log(`      ${product.name.substring(0, 60)}${product.name.length > 60 ? '...' : ''}`)
    })
    console.log('')
    
    // 5. AMOSTRAS DE URLs
    console.log('📋 EXEMPLOS DE URLs:')
    
    console.log('   🔴 OVH (amostra):')
    const ovhSamples = await connector.queryNeon(`
      SELECT DISTINCT pi.url
      FROM product_images pi
      WHERE pi.url LIKE '%ovh.net%'
      LIMIT 3
    `)
    ovhSamples.rows.forEach(img => {
      console.log(`      ${img.url}`)
    })
    
    console.log('   🟢 AWS (amostra):')
    const awsSamples = await connector.queryNeon(`
      SELECT DISTINCT pi.url
      FROM product_images pi
      WHERE pi.url LIKE '%amazonaws.com%'
      LIMIT 3
    `)
    awsSamples.rows.forEach(img => {
      console.log(`      ${img.url}`)
    })
    console.log('')
    
    // 6. RECOMENDAÇÕES
    console.log('💡 RECOMENDAÇÕES:')
    console.log('')
    
    if (stats.ovh_images > 0) {
      console.log('   🎯 MIGRAÇÃO NECESSÁRIA:')
      console.log(`   • ${stats.ovh_images} imagens precisam ser migradas de OVH para AWS`)
      console.log(`   • ${mixedProducts.rows.length} produtos têm mistura de origens e precisam de normalização`)
      console.log('   • Priorizar produtos de maior valor comercial')
      console.log('')
      
      console.log('   🔧 SCRIPT SUGERIDO:')
      console.log('   1. Identificar todas as URLs OVH')
      console.log('   2. Fazer download das imagens')
      console.log('   3. Fazer upload para AWS S3')
      console.log('   4. Atualizar URLs no banco de dados')
      console.log('   5. Verificar se as imagens carregam corretamente')
    } else {
      console.log('   ✅ TUDO OK: Todas as imagens já estão na AWS!')
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await connector.disconnect()
  }
}

analyzeImagesComplete() 