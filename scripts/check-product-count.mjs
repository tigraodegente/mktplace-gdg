#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'

async function checkProductCount() {
  const connector = new DatabaseConnector({ forceConnection: true })
  
  try {
    await connector.connectNeon()
    
    console.log('🔍 VERIFICANDO PRODUTOS NO BANCO DE DADOS NEON:\n')
    
    // Total de produtos
    const totalResult = await connector.queryNeon('SELECT COUNT(*) as total FROM products')
    console.log(`📊 TOTAL DE PRODUTOS NO BANCO: ${totalResult.rows[0].total}`)
    
    // Produtos ativos
    const activeResult = await connector.queryNeon('SELECT COUNT(*) as total FROM products WHERE is_active = true')
    console.log(`✅ Produtos ATIVOS: ${activeResult.rows[0].total}`)
    
    // Produtos com estoque
    const stockResult = await connector.queryNeon('SELECT COUNT(*) as total FROM products WHERE quantity > 0')
    console.log(`📦 Produtos COM ESTOQUE: ${stockResult.rows[0].total}`)
    
    // Produtos ativos com estoque
    const activeStockResult = await connector.queryNeon('SELECT COUNT(*) as total FROM products WHERE is_active = true AND quantity > 0')
    console.log(`🛒 Produtos ATIVOS + COM ESTOQUE: ${activeStockResult.rows[0].total}`)
    
    // Produtos com imagens
    const withImagesResult = await connector.queryNeon(`
      SELECT COUNT(DISTINCT p.id) as total 
      FROM products p 
      JOIN product_images pi ON p.id = pi.product_id
    `)
    console.log(`🖼️  Produtos COM IMAGENS: ${withImagesResult.rows[0].total}`)
    
    // Produtos completos (ativos, com estoque e imagens)
    const completeResult = await connector.queryNeon(`
      SELECT COUNT(DISTINCT p.id) as total 
      FROM products p 
      JOIN product_images pi ON p.id = pi.product_id 
      WHERE p.is_active = true AND p.quantity > 0
    `)
    console.log(`💎 Produtos COMPLETOS (ativo + estoque + imagem): ${completeResult.rows[0].total}`)
    
    // Produtos nativos vs importados
    const importedResult = await connector.queryNeon(`
      SELECT COUNT(*) as total 
      FROM products 
      WHERE attributes->>'imported_from' = 'mongodb'
    `)
    console.log(`\n📥 Produtos IMPORTADOS do MongoDB: ${importedResult.rows[0].total}`)
    
    const nativeResult = await connector.queryNeon(`
      SELECT COUNT(*) as total 
      FROM products 
      WHERE attributes->>'imported_from' IS NULL
    `)
    console.log(`🏠 Produtos NATIVOS (criados no Neon): ${nativeResult.rows[0].total}`)
    
    // Verificar produtos visíveis no frontend (ativos + com estoque + com categoria)
    const visibleResult = await connector.queryNeon(`
      SELECT COUNT(DISTINCT p.id) as total 
      FROM products p 
      JOIN product_categories pc ON p.id = pc.product_id
      WHERE p.is_active = true 
      AND p.quantity > 0
    `)
    console.log(`\n👁️  Produtos VISÍVEIS NO FRONTEND (ativo + estoque + categoria): ${visibleResult.rows[0].total}`)
    
    // Mostrar alguns produtos como exemplo
    console.log('\n📋 PRIMEIROS 5 PRODUTOS ATIVOS COM ESTOQUE:')
    const sampleProducts = await connector.queryNeon(`
      SELECT name, sku, price, quantity 
      FROM products 
      WHERE is_active = true AND quantity > 0
      ORDER BY created_at DESC
      LIMIT 5
    `)
    
    sampleProducts.rows.forEach((p, i) => {
      console.log(`${i + 1}. ${p.name} (SKU: ${p.sku}) - R$ ${p.price} - Estoque: ${p.quantity}`)
    })
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await connector.disconnect()
  }
}

checkProductCount() 