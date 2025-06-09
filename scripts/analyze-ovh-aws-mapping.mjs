#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'

/**
 * Script para analisar URLs OVH vs AWS e encontrar padrões de mapeamento
 */
async function analyzeOvhAwsMapping() {
  const connector = new DatabaseConnector({ forceConnection: true })
  
  try {
    console.log('🔍 ANALISANDO MAPEAMENTO OVH ↔ AWS\n')
    
    await connector.connectNeon()
    
    // 1. Verificar se existem produtos com URLs de ambos os tipos
    console.log('📊 ANALISANDO PRODUTOS COM MÚLTIPLAS IMAGENS...\n')
    
    const mixedProducts = await connector.queryNeon(`
      SELECT 
        p.id,
        p.name,
        p.sku,
        COUNT(*) as total_images,
        COUNT(CASE WHEN pi.url ~* 'ovh' THEN 1 END) as ovh_images,
        COUNT(CASE WHEN pi.url ~* 'amazonaws' THEN 1 END) as aws_images
      FROM products p
      JOIN product_images pi ON p.id = pi.product_id
      GROUP BY p.id, p.name, p.sku
      HAVING COUNT(CASE WHEN pi.url ~* 'ovh' THEN 1 END) > 0 
         AND COUNT(CASE WHEN pi.url ~* 'amazonaws' THEN 1 END) > 0
      ORDER BY total_images DESC
      LIMIT 10
    `)
    
    if (mixedProducts.rows.length > 0) {
      console.log('🔄 PRODUTOS COM URLs MISTAS (OVH + AWS):')
      mixedProducts.rows.forEach(row => {
        console.log(`   ${row.name} (SKU: ${row.sku})`)
        console.log(`     Total: ${row.total_images} | OVH: ${row.ovh_images} | AWS: ${row.aws_images}`)
      })
      console.log('')
      
      // Analisar URLs de um produto misto em detalhes
      const sampleProduct = mixedProducts.rows[0]
      console.log(`🔬 ANÁLISE DETALHADA: ${sampleProduct.name}\n`)
      
      const productUrls = await connector.queryNeon(`
        SELECT url, is_primary, position
        FROM product_images 
        WHERE product_id = $1 
        ORDER BY is_primary DESC, position ASC
      `, [sampleProduct.id])
      
      productUrls.rows.forEach((row, i) => {
        const type = row.url.includes('ovh') ? '🏢 OVH' : 
                    row.url.includes('amazonaws') ? '☁️  AWS' : '❓ Outro'
        const primary = row.is_primary ? ' (PRINCIPAL)' : ''
        console.log(`   ${i + 1}. ${type}${primary}:`)
        console.log(`      ${row.url}`)
        console.log('')
      })
    } else {
      console.log('❌ Não foram encontrados produtos com URLs mistas\n')
    }
    
    // 2. Analisar padrões de nomeação
    console.log('🧬 ANÁLISE DE PADRÕES DE NOMEAÇÃO:\n')
    
    // URLs OVH - exemplos
    const ovhSamples = await connector.queryNeon(`
      SELECT url, LENGTH(url) as url_length
      FROM product_images 
      WHERE url ~* 'ovh'
      ORDER BY RANDOM()
      LIMIT 5
    `)
    
    console.log('🏢 EXEMPLOS OVH:')
    ovhSamples.rows.forEach((row, i) => {
      const fileName = row.url.split('/').pop()
      console.log(`   ${i + 1}. Arquivo: ${fileName}`)
      console.log(`      URL completa: ${row.url}`)
      console.log(`      Tamanho: ${row.url_length} chars`)
      console.log('')
    })
    
    // URLs AWS - exemplos
    const awsSamples = await connector.queryNeon(`
      SELECT url, LENGTH(url) as url_length
      FROM product_images 
      WHERE url ~* 'amazonaws'
      ORDER BY RANDOM()
      LIMIT 5
    `)
    
    console.log('☁️  EXEMPLOS AWS:')
    awsSamples.rows.forEach((row, i) => {
      const fileName = row.url.split('/').pop()
      console.log(`   ${i + 1}. Arquivo: ${fileName}`)
      console.log(`      URL completa: ${row.url}`)
      console.log(`      Tamanho: ${row.url_length} chars`)
      console.log('')
    })
    
    // 3. Verificar se há correspondência por produto
    console.log('🔗 BUSCANDO CORRESPONDÊNCIAS POR PRODUTO...\n')
    
    const productsWithBoth = await connector.queryNeon(`
      SELECT 
        p.name,
        p.sku,
        ovh_urls.urls as ovh_urls,
        aws_urls.urls as aws_urls
      FROM products p
      LEFT JOIN (
        SELECT 
          product_id,
          ARRAY_AGG(url ORDER BY position) as urls
        FROM product_images 
        WHERE url ~* 'ovh'
        GROUP BY product_id
      ) ovh_urls ON p.id = ovh_urls.product_id
      LEFT JOIN (
        SELECT 
          product_id,
          ARRAY_AGG(url ORDER BY position) as urls
        FROM product_images 
        WHERE url ~* 'amazonaws'
        GROUP BY product_id
      ) aws_urls ON p.id = aws_urls.product_id
      WHERE ovh_urls.urls IS NOT NULL AND aws_urls.urls IS NOT NULL
      LIMIT 3
    `)
    
    if (productsWithBoth.rows.length > 0) {
      console.log('🎯 PRODUTOS COM AMBOS OS TIPOS:')
      productsWithBoth.rows.forEach((row, i) => {
        console.log(`\n   ${i + 1}. ${row.name} (${row.sku}):`)
        console.log('      🏢 OVH URLs:')
        row.ovh_urls.forEach(url => console.log(`         ${url}`))
        console.log('      ☁️  AWS URLs:')
        row.aws_urls.forEach(url => console.log(`         ${url}`))
      })
    }
    
    // 4. Estatísticas de migração
    console.log('\n📈 ESTATÍSTICAS DE MIGRAÇÃO:\n')
    
    const migrationStats = await connector.queryNeon(`
      SELECT 
        COUNT(DISTINCT p.id) as products_total,
        COUNT(DISTINCT CASE WHEN ovh_imgs.product_id IS NOT NULL THEN p.id END) as products_with_ovh,
        COUNT(DISTINCT CASE WHEN aws_imgs.product_id IS NOT NULL THEN p.id END) as products_with_aws,
        COUNT(DISTINCT CASE WHEN ovh_imgs.product_id IS NOT NULL AND aws_imgs.product_id IS NOT NULL THEN p.id END) as products_with_both
      FROM products p
      LEFT JOIN (SELECT DISTINCT product_id FROM product_images WHERE url ~* 'ovh') ovh_imgs ON p.id = ovh_imgs.product_id
      LEFT JOIN (SELECT DISTINCT product_id FROM product_images WHERE url ~* 'amazonaws') aws_imgs ON p.id = aws_imgs.product_id
    `)
    
    const stats = migrationStats.rows[0]
    console.log(`   📦 Total de produtos: ${stats.products_total}`)
    console.log(`   🏢 Produtos com imagens OVH: ${stats.products_with_ovh}`)
    console.log(`   ☁️  Produtos com imagens AWS: ${stats.products_with_aws}`)
    console.log(`   🔄 Produtos com ambos: ${stats.products_with_both}`)
    
    const migrationPercentage = ((parseInt(stats.products_with_aws) / parseInt(stats.products_total)) * 100).toFixed(1)
    console.log(`   📊 Migração AWS: ${migrationPercentage}%`)
    
    // 5. Recomendações
    console.log('\n💡 RECOMENDAÇÕES:\n')
    
    if (parseInt(stats.products_with_both) > 0) {
      console.log('   ✅ Existem produtos com ambos os tipos de URL')
      console.log('   🔍 Analisar correspondência manual para criar mapeamento')
    }
    
    if (parseInt(stats.products_with_aws) / parseInt(stats.products_total) < 0.5) {
      console.log('   ⚠️  Migração para AWS ainda em progresso (<50%)')
      console.log('   🚫 NÃO fazer conversão automática ainda')
      console.log('   💡 Manter URLs OVH funcionais até migração completa')
    } else {
      console.log('   ✅ Migração para AWS avançada (>50%)')
      console.log('   🔍 Investigar padrão de mapeamento')
    }
    
    console.log('\n🛠️  PRÓXIMOS PASSOS:')
    console.log('   1. Manter URLs OVH originais (funcionais)')
    console.log('   2. Novos produtos podem usar AWS se disponível')
    console.log('   3. Aguardar migração completa ou mapeamento')
    console.log('   4. Depois criar conversão baseada em mapeamento real')
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await connector.disconnect()
  }
}

// Executar
analyzeOvhAwsMapping() 