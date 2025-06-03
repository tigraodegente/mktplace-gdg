#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'

async function checkAlmofadas() {
  const connector = new DatabaseConnector({ forceConnection: true })
  
  try {
    await connector.connectNeon()
    
    console.log('🔍 VERIFICANDO CATEGORIA ALMOFADAS:\n')
    
    // Buscar a categoria
    const categoryResult = await connector.queryNeon(
      "SELECT id, name, slug FROM categories WHERE LOWER(name) LIKE '%almofada%' OR LOWER(slug) LIKE '%almofada%'"
    )
    
    if (categoryResult.rows.length === 0) {
      console.log('❌ Categoria almofadas não encontrada')
      return
    }
    
    const category = categoryResult.rows[0]
    console.log(`📁 Categoria encontrada: ${category.name} (ID: ${category.id}, Slug: ${category.slug})\n`)
    
    // Total de produtos nesta categoria
    const totalResult = await connector.queryNeon(
      'SELECT COUNT(DISTINCT p.id) as total FROM products p JOIN product_categories pc ON p.id = pc.product_id WHERE pc.category_id = $1',
      [category.id]
    )
    console.log(`📊 TOTAL de produtos na categoria: ${totalResult.rows[0].total}`)
    
    // Produtos ativos
    const activeResult = await connector.queryNeon(
      'SELECT COUNT(DISTINCT p.id) as total FROM products p JOIN product_categories pc ON p.id = pc.product_id WHERE pc.category_id = $1 AND p.is_active = true',
      [category.id]
    )
    console.log(`✅ Produtos ATIVOS: ${activeResult.rows[0].total}`)
    
    // Produtos ativos com estoque
    const activeStockResult = await connector.queryNeon(
      'SELECT COUNT(DISTINCT p.id) as total FROM products p JOIN product_categories pc ON p.id = pc.product_id WHERE pc.category_id = $1 AND p.is_active = true AND p.quantity > 0',
      [category.id]
    )
    console.log(`🛒 Produtos ATIVOS + COM ESTOQUE (visíveis no frontend): ${activeStockResult.rows[0].total}`)
    
    // Listar os produtos visíveis
    console.log('\n📋 PRODUTOS QUE DEVERIAM APARECER NO FRONTEND:')
    const visibleProducts = await connector.queryNeon(
      'SELECT p.name, p.sku, p.price, p.quantity FROM products p JOIN product_categories pc ON p.id = pc.product_id WHERE pc.category_id = $1 AND p.is_active = true AND p.quantity > 0 ORDER BY p.name',
      [category.id]
    )
    
    visibleProducts.rows.forEach((p, i) => {
      console.log(`${i + 1}. ${p.name} (SKU: ${p.sku}) - R$ ${p.price} - Estoque: ${p.quantity}`)
    })
    
    // Verificar se há produtos inativos ou sem estoque
    const inactiveResult = await connector.queryNeon(
      'SELECT COUNT(DISTINCT p.id) as total FROM products p JOIN product_categories pc ON p.id = pc.product_id WHERE pc.category_id = $1 AND p.is_active = false',
      [category.id]
    )
    
    const noStockResult = await connector.queryNeon(
      'SELECT COUNT(DISTINCT p.id) as total FROM products p JOIN product_categories pc ON p.id = pc.product_id WHERE pc.category_id = $1 AND p.quantity = 0',
      [category.id]
    )
    
    if (inactiveResult.rows[0].total > 0 || noStockResult.rows[0].total > 0) {
      console.log('\n⚠️  PRODUTOS NÃO VISÍVEIS:')
      console.log(`   - Produtos INATIVOS: ${inactiveResult.rows[0].total}`)
      console.log(`   - Produtos SEM ESTOQUE: ${noStockResult.rows[0].total}`)
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await connector.disconnect()
  }
}

checkAlmofadas() 