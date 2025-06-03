#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'

async function checkProductCategories() {
  const connector = new DatabaseConnector({ forceConnection: true })
  
  try {
    await connector.connectNeon()
    
    console.log('🔍 ANALISANDO CATEGORIZAÇÃO DOS PRODUTOS\n')
    
    // 1. Produtos sem categoria
    const uncategorizedResult = await connector.queryNeon(`
      SELECT p.id, p.name, p.sku
      FROM products p
      LEFT JOIN product_categories pc ON p.id = pc.product_id
      WHERE pc.category_id IS NULL
      ORDER BY p.name
    `)
    
    console.log(`❌ PRODUTOS SEM CATEGORIA: ${uncategorizedResult.rows.length}`)
    if (uncategorizedResult.rows.length > 0) {
      console.log('Primeiros 10:')
      uncategorizedResult.rows.slice(0, 10).forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.name} (SKU: ${p.sku})`)
      })
      if (uncategorizedResult.rows.length > 10) {
        console.log(`   ... e mais ${uncategorizedResult.rows.length - 10} produtos`)
      }
    }
    
    // 2. Produtos com múltiplas categorias
    const multiCategoryResult = await connector.queryNeon(`
      SELECT p.id, p.name, p.sku, COUNT(pc.category_id) as category_count
      FROM products p
      JOIN product_categories pc ON p.id = pc.product_id
      GROUP BY p.id, p.name, p.sku
      HAVING COUNT(pc.category_id) > 1
      ORDER BY category_count DESC, p.name
    `)
    
    console.log(`\n📦 PRODUTOS COM MÚLTIPLAS CATEGORIAS: ${multiCategoryResult.rows.length}`)
    if (multiCategoryResult.rows.length > 0) {
      for (const p of multiCategoryResult.rows.slice(0, 5)) {
        const categories = await connector.queryNeon(`
          SELECT c.name 
          FROM categories c
          JOIN product_categories pc ON c.id = pc.category_id
          WHERE pc.product_id = $1
        `, [p.id])
        
        console.log(`   - ${p.name} (${p.category_count} categorias): ${categories.rows.map(c => c.name).join(', ')}`)
      }
      if (multiCategoryResult.rows.length > 5) {
        console.log(`   ... e mais ${multiCategoryResult.rows.length - 5} produtos`)
      }
    }
    
    // 3. Análise de categorias vazias
    const emptyCategoriesResult = await connector.queryNeon(`
      SELECT c.id, c.name, c.slug
      FROM categories c
      LEFT JOIN product_categories pc ON c.id = pc.category_id
      WHERE pc.product_id IS NULL
      ORDER BY c.name
    `)
    
    console.log(`\n📁 CATEGORIAS VAZIAS: ${emptyCategoriesResult.rows.length}`)
    if (emptyCategoriesResult.rows.length > 0) {
      emptyCategoriesResult.rows.forEach(c => {
        console.log(`   - ${c.name} (${c.slug})`)
      })
    }
    
    // 4. Verificar inconsistências (produtos com nome sugestivo mas categoria errada)
    console.log('\n🔍 POSSÍVEIS INCONSISTÊNCIAS:')
    
    // Almofadas
    const almofadasResult = await connector.queryNeon(`
      SELECT p.id, p.name, p.sku, 
             COALESCE(STRING_AGG(c.name, ', '), 'SEM CATEGORIA') as categories
      FROM products p
      LEFT JOIN product_categories pc ON p.id = pc.product_id
      LEFT JOIN categories c ON pc.category_id = c.id
      WHERE LOWER(p.name) LIKE '%almofada%'
      GROUP BY p.id, p.name, p.sku
    `)
    
    console.log(`\n🛏️  Produtos com "almofada" no nome: ${almofadasResult.rows.length}`)
    almofadasResult.rows.forEach(p => {
      if (!p.categories.toLowerCase().includes('almofada')) {
        console.log(`   ⚠️  ${p.name} está em: ${p.categories}`)
      }
    })
    
    // 5. Resumo por categoria
    const categoryStatsResult = await connector.queryNeon(`
      SELECT c.name as category_name, 
             COUNT(DISTINCT pc.product_id) as product_count,
             COUNT(DISTINCT CASE WHEN p.is_active = true THEN p.id END) as active_count,
             COUNT(DISTINCT CASE WHEN p.quantity > 0 THEN p.id END) as with_stock_count
      FROM categories c
      LEFT JOIN product_categories pc ON c.id = pc.category_id
      LEFT JOIN products p ON pc.product_id = p.id
      GROUP BY c.id, c.name
      ORDER BY product_count DESC
    `)
    
    console.log('\n📊 RESUMO POR CATEGORIA:')
    console.log('Categoria | Total | Ativos | Com Estoque')
    console.log('----------|-------|--------|------------')
    categoryStatsResult.rows.forEach(c => {
      console.log(`${c.category_name.padEnd(30)} | ${c.product_count.toString().padStart(5)} | ${c.active_count.toString().padStart(6)} | ${c.with_stock_count.toString().padStart(11)}`)
    })
    
    // 6. Total geral
    const totalResult = await connector.queryNeon('SELECT COUNT(*) as total FROM products')
    const categorizedResult = await connector.queryNeon(`
      SELECT COUNT(DISTINCT p.id) as total 
      FROM products p 
      JOIN product_categories pc ON p.id = pc.product_id
    `)
    
    console.log(`\n📈 RESUMO GERAL:`)
    console.log(`   Total de produtos: ${totalResult.rows[0].total}`)
    console.log(`   Produtos categorizados: ${categorizedResult.rows[0].total} (${Math.round(categorizedResult.rows[0].total / totalResult.rows[0].total * 100)}%)`)
    console.log(`   Produtos sem categoria: ${uncategorizedResult.rows.length} (${Math.round(uncategorizedResult.rows.length / totalResult.rows[0].total * 100)}%)`)
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await connector.disconnect()
  }
}

checkProductCategories() 