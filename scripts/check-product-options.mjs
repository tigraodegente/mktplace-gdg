#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'

async function checkProductOptions() {
  const connector = new DatabaseConnector({ forceConnection: true })
  
  try {
    await connector.connectNeon()
    
    console.log('🔍 VERIFICANDO OPÇÕES DOS PRODUTOS\n')
    
    // Buscar opções de um produto específico
    const result = await connector.queryNeon(`
      SELECT 
        p.name as product_name,
        p.sku,
        po.name as option_name,
        pov.value as option_value
      FROM products p
      JOIN product_options po ON po.product_id = p.id
      JOIN product_option_values pov ON pov.option_id = po.id
      WHERE p.sku = '120455'
      ORDER BY po.name, pov.value
    `)
    
    console.log('📊 Opções do produto Kit Berço Amiguinhas Realeza:')
    result.rows.forEach(row => {
      console.log(`   ${row.option_name}: ${row.option_value}`)
    })
    
    // Verificar variações do mesmo produto
    console.log('\n🎨 Variações do produto:')
    const variants = await connector.queryNeon(`
      SELECT sku, price, quantity
      FROM product_variants 
      WHERE product_id = (SELECT id FROM products WHERE sku = '120455')
      ORDER BY created_at
    `)
    
    variants.rows.forEach((variant, i) => {
      console.log(`   ${i+1}. ${variant.sku} - R$ ${variant.price} (Estoque: ${variant.quantity})`)
    })
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await connector.disconnect()
  }
}

checkProductOptions() 