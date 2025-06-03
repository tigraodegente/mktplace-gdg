#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'

async function analyzeAllCategories() {
  const connector = new DatabaseConnector({ forceConnection: true })
  
  try {
    await connector.connectNeon()
    
    console.log('📊 ANÁLISE DETALHADA DE TODAS AS CATEGORIAS\n')
    console.log('=' .repeat(80) + '\n')
    
    // Buscar todas as categorias ordenadas por quantidade de produtos
    const categoriesResult = await connector.queryNeon(`
      SELECT 
        c.id,
        c.name,
        c.slug,
        c.parent_id,
        COUNT(DISTINCT pc.product_id) as total_products,
        COUNT(DISTINCT CASE WHEN p.is_active = true THEN p.id END) as active_products,
        COUNT(DISTINCT CASE WHEN p.quantity > 0 THEN p.id END) as with_stock,
        COUNT(DISTINCT CASE WHEN p.is_active = true AND p.quantity > 0 THEN p.id END) as visible_frontend,
        AVG(p.price) as avg_price,
        MIN(p.price) as min_price,
        MAX(p.price) as max_price
      FROM categories c
      LEFT JOIN product_categories pc ON c.id = pc.category_id
      LEFT JOIN products p ON pc.product_id = p.id
      GROUP BY c.id, c.name, c.slug, c.parent_id
      ORDER BY total_products DESC, c.name
    `)
    
    let totalCategories = 0
    let categoriesWithProducts = 0
    let emptyCategories = 0
    
    for (const category of categoriesResult.rows) {
      totalCategories++
      
      if (category.total_products > 0) {
        categoriesWithProducts++
        
        console.log(`📁 ${category.name.toUpperCase()} (${category.slug})`)
        console.log(`   └─ Total: ${category.total_products} produtos`)
        console.log(`   └─ Ativos: ${category.active_products} (${Math.round(category.active_products / category.total_products * 100)}%)`)
        console.log(`   └─ Com estoque: ${category.with_stock} (${Math.round(category.with_stock / category.total_products * 100)}%)`)
        console.log(`   └─ Visíveis no site: ${category.visible_frontend} (${Math.round(category.visible_frontend / category.total_products * 100)}%)`)
        
        if (category.avg_price) {
          console.log(`   └─ Preços: R$ ${parseFloat(category.min_price).toFixed(2)} - R$ ${parseFloat(category.max_price).toFixed(2)} (média: R$ ${parseFloat(category.avg_price).toFixed(2)})`)
        }
        
        // Verificar problemas
        const problems = []
        if (category.active_products < category.total_products) {
          problems.push(`${category.total_products - category.active_products} inativos`)
        }
        if (category.with_stock < category.active_products) {
          problems.push(`${category.active_products - category.with_stock} sem estoque`)
        }
        
        if (problems.length > 0) {
          console.log(`   └─ ⚠️  Problemas: ${problems.join(', ')}`)
        }
        
        // Verificar se é subcategoria
        if (category.parent_id) {
          const parentResult = await connector.queryNeon(
            'SELECT name FROM categories WHERE id = $1',
            [category.parent_id]
          )
          if (parentResult.rows.length > 0) {
            console.log(`   └─ 📂 Subcategoria de: ${parentResult.rows[0].name}`)
          }
        }
        
        console.log('')
      } else {
        emptyCategories++
      }
    }
    
    // Listar categorias vazias
    console.log('\n' + '=' .repeat(80))
    console.log('\n📁 CATEGORIAS VAZIAS (sem produtos):\n')
    
    const emptyCategoriesList = categoriesResult.rows.filter(c => c.total_products === 0)
    emptyCategoriesList.forEach(c => {
      console.log(`   ❌ ${c.name} (${c.slug})`)
    })
    
    // Produtos sem categoria
    console.log('\n' + '=' .repeat(80))
    console.log('\n❓ PRODUTOS SEM CATEGORIA:\n')
    
    const uncategorizedResult = await connector.queryNeon(`
      SELECT p.name, p.sku, p.price, p.quantity, p.is_active
      FROM products p
      LEFT JOIN product_categories pc ON p.id = pc.product_id
      WHERE pc.category_id IS NULL
      ORDER BY p.name
    `)
    
    if (uncategorizedResult.rows.length > 0) {
      console.log(`Total: ${uncategorizedResult.rows.length} produtos\n`)
      uncategorizedResult.rows.forEach((p, i) => {
        const status = []
        if (!p.is_active) status.push('inativo')
        if (p.quantity === 0) status.push('sem estoque')
        
        console.log(`   ${i + 1}. ${p.name}`)
        console.log(`      SKU: ${p.sku} | R$ ${p.price} | Estoque: ${p.quantity} ${status.length > 0 ? '| ⚠️  ' + status.join(', ') : ''}`)
      })
    }
    
    // Resumo final
    console.log('\n' + '=' .repeat(80))
    console.log('\n📈 RESUMO FINAL:\n')
    console.log(`   Total de categorias: ${totalCategories}`)
    console.log(`   Categorias com produtos: ${categoriesWithProducts} (${Math.round(categoriesWithProducts / totalCategories * 100)}%)`)
    console.log(`   Categorias vazias: ${emptyCategories} (${Math.round(emptyCategories / totalCategories * 100)}%)`)
    console.log(`   Produtos sem categoria: ${uncategorizedResult.rows.length}`)
    
    // Totais gerais
    const totalsResult = await connector.queryNeon(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active,
        COUNT(CASE WHEN quantity > 0 THEN 1 END) as with_stock,
        COUNT(CASE WHEN is_active = true AND quantity > 0 THEN 1 END) as visible
      FROM products
    `)
    
    const totals = totalsResult.rows[0]
    console.log(`\n   PRODUTOS NO SISTEMA:`)
    console.log(`   Total geral: ${totals.total}`)
    console.log(`   Ativos: ${totals.active} (${Math.round(totals.active / totals.total * 100)}%)`)
    console.log(`   Com estoque: ${totals.with_stock} (${Math.round(totals.with_stock / totals.total * 100)}%)`)
    console.log(`   Visíveis no site: ${totals.visible} (${Math.round(totals.visible / totals.total * 100)}%)`)
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await connector.disconnect()
  }
}

analyzeAllCategories() 