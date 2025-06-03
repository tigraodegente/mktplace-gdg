#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'

const connector = new DatabaseConnector({ forceConnection: true })

try {
  await connector.connectNeon()
  
  // Verificar products
  console.log('📋 Estrutura da tabela products:\n')
  const productsResult = await connector.queryNeon(`
    SELECT column_name, data_type
    FROM information_schema.columns 
    WHERE table_name = 'products' 
    ORDER BY ordinal_position
  `)
  
  productsResult.rows.forEach(col => {
    console.log(`  - ${col.column_name}: ${col.data_type}`)
  })
  
  // Verificar product_images
  console.log('\n📋 Estrutura da tabela product_images:\n')
  const imagesResult = await connector.queryNeon(`
    SELECT column_name, data_type
    FROM information_schema.columns 
    WHERE table_name = 'product_images' 
    ORDER BY ordinal_position
  `)
  
  imagesResult.rows.forEach(col => {
    console.log(`  - ${col.column_name}: ${col.data_type}`)
  })
  
  // Verificar product_categories
  console.log('\n📋 Estrutura da tabela product_categories:\n')
  const categoriesResult = await connector.queryNeon(`
    SELECT column_name, data_type
    FROM information_schema.columns 
    WHERE table_name = 'product_categories' 
    ORDER BY ordinal_position
  `)
  
  categoriesResult.rows.forEach(col => {
    console.log(`  - ${col.column_name}: ${col.data_type}`)
  })
  
} catch (error) {
  console.error('Erro:', error)
} finally {
  await connector.disconnect()
} 