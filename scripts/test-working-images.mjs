#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'

async function testWorkingImages() {
  const connector = new DatabaseConnector({ forceConnection: true })
  
  try {
    await connector.connectNeon()
    
    console.log('🧪 TESTANDO IMAGENS QUE FUNCIONAM')
    console.log('=' .repeat(50))
    
    // Buscar algumas imagens originais que sabemos que existem
    const originalImages = await connector.queryNeon(`
      SELECT p.name, p.sku, pi.url 
      FROM products p 
      JOIN product_images pi ON pi.product_id = p.id 
      WHERE pi.url LIKE '%almofada%' 
      LIMIT 5
    `)
    
    console.log('📋 IMAGENS ORIGINAIS:')
    originalImages.rows.forEach(row => {
      console.log(`${row.sku}: ${row.url}`)
    })
    
    console.log('\n🔍 Para o produto SKU 176223 que você mencionou:')
    
    const product176223 = await connector.queryNeon(`
      SELECT p.name, p.sku, pi.url 
      FROM products p 
      JOIN product_images pi ON pi.product_id = p.id 
      WHERE p.sku = '176223'
      ORDER BY pi.position
    `)
    
    if (product176223.rows.length > 0) {
      console.log(`Produto: ${product176223.rows[0].name}`)
      product176223.rows.forEach((row, i) => {
        console.log(`  ${i+1}. ${row.url}`)
      })
    } else {
      console.log('❌ Produto SKU 176223 não encontrado no banco')
    }
    
    // Verificar se este produto existe na tabela
    const checkProduct = await connector.queryNeon(`
      SELECT name, sku, slug FROM products WHERE sku = '176223'
    `)
    
    if (checkProduct.rows.length > 0) {
      console.log('\n✅ Produto 176223 existe:')
      console.log(`   Nome: ${checkProduct.rows[0].name}`)
      console.log(`   Slug: ${checkProduct.rows[0].slug}`)
    } else {
      console.log('\n❌ Produto 176223 NÃO EXISTE na tabela products')
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await connector.disconnect()
  }
}

testWorkingImages() 