#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'

async function checkNeonProducts() {
  const connector = new DatabaseConnector({ forceConnection: true })
  
  try {
    console.log('🔍 Verificando produtos no Neon...\n')
    
    await connector.connectNeon()
    
    // Verificar produtos com slug vazio
    console.log('📊 Verificando produtos com slug vazio ou NULL:')
    const emptySlugResult = await connector.queryNeon(`
      SELECT id, sku, name, slug, created_at 
      FROM products 
      WHERE slug IS NULL OR slug = '' 
      ORDER BY created_at DESC 
      LIMIT 20
    `)
    
    console.log(`\nEncontrados ${emptySlugResult.rows.length} produtos com slug vazio:`)
    for (const product of emptySlugResult.rows) {
      console.log(`  - ID: ${product.id}, SKU: ${product.sku}, Nome: ${product.name || 'SEM NOME'}, Slug: "${product.slug}"`)
    }
    
    // Verificar total de produtos
    console.log('\n📊 Estatísticas gerais:')
    const statsResult = await connector.queryNeon(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN slug IS NULL OR slug = '' THEN 1 END) as empty_slugs,
        COUNT(CASE WHEN name IS NULL OR name = '' THEN 1 END) as empty_names,
        COUNT(DISTINCT slug) as unique_slugs,
        COUNT(CASE WHEN attributes->>'imported_from' = 'mongodb' THEN 1 END) as from_mongodb
      FROM products
    `)
    
    const stats = statsResult.rows[0]
    console.log(`  - Total de produtos: ${stats.total}`)
    console.log(`  - Produtos com slug vazio: ${stats.empty_slugs}`)
    console.log(`  - Produtos com nome vazio: ${stats.empty_names}`)
    console.log(`  - Slugs únicos: ${stats.unique_slugs}`)
    console.log(`  - Importados do MongoDB: ${stats.from_mongodb}`)
    
    // Verificar duplicatas de slug
    console.log('\n📊 Verificando slugs duplicados:')
    const duplicatesResult = await connector.queryNeon(`
      SELECT slug, COUNT(*) as count 
      FROM products 
      WHERE slug IS NOT NULL AND slug != ''
      GROUP BY slug 
      HAVING COUNT(*) > 1 
      ORDER BY count DESC 
      LIMIT 10
    `)
    
    if (duplicatesResult.rows.length > 0) {
      console.log('Slugs duplicados encontrados:')
      for (const dup of duplicatesResult.rows) {
        console.log(`  - "${dup.slug}": ${dup.count} produtos`)
      }
    } else {
      console.log('Nenhum slug duplicado encontrado!')
    }
    
    // Perguntar se deve limpar produtos problemáticos
    if (stats.empty_slugs > 0) {
      console.log('\n⚠️  ATENÇÃO: Existem produtos com slug vazio!')
      console.log('Isso está causando os erros de duplicação.')
      console.log('\nPara limpar, execute:')
      console.log('  node scripts/clean-neon-products.mjs')
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await connector.disconnect()
  }
}

checkNeonProducts() 