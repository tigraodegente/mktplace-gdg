#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'

async function findProductsCollection() {
  const connector = new DatabaseConnector()
  
  try {
    console.log('🔍 Procurando coleções de produtos no MongoDB...\n')
    
    await connector.connectMongo()
    const db = connector.getMongoDb()
    
    // Padrões comuns para coleções de produtos
    const productPatterns = [
      /product/i,
      /produto/i,
      /item/i,
      /catalog/i,
      /merchandise/i,
      /goods/i,
      /article/i
    ]
    
    const collections = await db.listCollections().toArray()
    const productCollections = []
    
    // Filtrar coleções que parecem ser de produtos
    for (const coll of collections) {
      for (const pattern of productPatterns) {
        if (pattern.test(coll.name)) {
          productCollections.push(coll.name)
          break
        }
      }
    }
    
    console.log(`📋 Coleções que podem conter produtos: ${productCollections.length}\n`)
    
    // Verificar cada coleção de produtos
    for (const collName of productCollections) {
      const count = await db.collection(collName).countDocuments()
      console.log(`📦 ${collName}: ${count} documentos`)
      
      if (count > 0) {
        // Pegar um exemplo
        const sample = await db.collection(collName).findOne()
        console.log(`   Campos: ${Object.keys(sample).slice(0, 10).join(', ')}...`)
        
        // Verificar se parece um produto
        const hasProductFields = 
          sample.name || sample.title || sample.productName ||
          sample.price || sample.preco || sample.value ||
          sample.sku || sample.productId || sample.codigo
          
        if (hasProductFields) {
          console.log(`   ✅ Parece ser uma coleção de produtos!`)
          console.log(`   Exemplo: ${sample.name || sample.title || sample.productName || 'sem nome'}`)
        }
      }
      console.log('')
    }
    
    // Verificar especificamente m_product
    console.log('🔍 Verificando m_product especificamente...')
    try {
      const count = await db.collection('m_product').countDocuments()
      console.log(`m_product: ${count} documentos`)
      
      if (count > 0) {
        const sample = await db.collection('m_product').findOne()
        console.log('Exemplo:', JSON.stringify(sample, null, 2).substring(0, 300) + '...')
      }
    } catch (e) {
      console.log('m_product não encontrada ou erro ao acessar')
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await connector.disconnect()
  }
}

findProductsCollection() 