#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'

async function checkCollections() {
  const connector = new DatabaseConnector()
  
  try {
    console.log('🔍 Verificando coleções do MongoDB...\n')
    
    await connector.connectMongo()
    const db = connector.getMongoDb()
    
    // Listar todas as coleções
    const collections = await db.listCollections().toArray()
    console.log(`📋 Total de coleções: ${collections.length}\n`)
    
    // Mostrar coleções e contar documentos
    for (const coll of collections) {
      const count = await db.collection(coll.name).countDocuments()
      console.log(`📁 ${coll.name}: ${count} documentos`)
    }
    
    // Verificar especificamente m_product
    console.log('\n🔍 Verificando coleção m_product especificamente...')
    const productCount = await db.collection('m_product').countDocuments()
    console.log(`📦 m_product: ${productCount} produtos`)
    
    // Se não houver produtos em m_product, procurar em outras coleções
    if (productCount === 0) {
      console.log('\n🔍 Procurando produtos em outras coleções...')
      
      // Tentar outras possíveis coleções de produtos
      const possibleCollections = ['products', 'produto', 'produtos', 'items', 'catalog']
      
      for (const collName of possibleCollections) {
        try {
          const count = await db.collection(collName).countDocuments()
          if (count > 0) {
            console.log(`✅ ${collName}: ${count} documentos encontrados`)
            
            // Mostrar um exemplo
            const sample = await db.collection(collName).findOne()
            console.log(`\n📄 Exemplo de documento em ${collName}:`)
            console.log(JSON.stringify(sample, null, 2).substring(0, 500) + '...')
          }
        } catch (e) {
          // Coleção não existe
        }
      }
    } else {
      // Mostrar um exemplo de m_product
      const sample = await db.collection('m_product').findOne()
      console.log('\n📄 Exemplo de produto em m_product:')
      console.log(JSON.stringify(sample, null, 2).substring(0, 500) + '...')
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await connector.disconnect()
  }
}

checkCollections() 