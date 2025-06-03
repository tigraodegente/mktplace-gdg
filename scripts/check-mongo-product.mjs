#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'

const connector = new DatabaseConnector({ forceConnection: true })

try {
  await connector.connectMongo()
  
  // Buscar um produto exemplo
  const products = await connector.queryMongo('m_product_typesense', 'find', {}, { limit: 1 })
  
  if (products.length > 0) {
    const product = products[0]
    console.log('📦 Exemplo de produto no MongoDB:\n')
    console.log('Campos principais:')
    console.log(`  - _id: ${product._id}`)
    console.log(`  - code: ${product.code}`)
    console.log(`  - productname: ${product.productname}`)
    console.log(`  - salesprice: ${product.salesprice} (tipo: ${typeof product.salesprice})`)
    console.log(`  - costprice: ${product.costprice} (tipo: ${typeof product.costprice})`)
    console.log(`  - realstock: ${product.realstock} (tipo: ${typeof product.realstock})`)
    console.log(`  - virtualstock: ${product.virtualstock}`)
    console.log(`  - isactive: ${product.isactive}`)
    console.log(`  - activeforseo: ${product.activeforseo}`)
    console.log(`  - brand: ${JSON.stringify(product.brand)}`)
    console.log(`  - category: ${product.category}`)
    console.log(`  - urlImagePrimary: ${product.urlImagePrimary}`)
    
    console.log('\nTodos os campos:')
    Object.keys(product).forEach(key => {
      console.log(`  - ${key}: ${typeof product[key]}`)
    })
  } else {
    console.log('Nenhum produto encontrado')
  }
  
} catch (error) {
  console.error('Erro:', error)
} finally {
  await connector.disconnect()
} 