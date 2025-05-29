#!/usr/bin/env node

import 'dotenv/config'
import { MongoClient } from 'mongodb'

const MONGO_CONFIG = {
  uri: process.env.MONGODB_URI,
  database: process.env.MONGODB_DATABASE
}

async function listCollections() {
  const client = new MongoClient(MONGO_CONFIG.uri)
  
  try {
    console.log('🔌 Conectando ao MongoDB...')
    await client.connect()
    
    const db = client.db(MONGO_CONFIG.database)
    
    // Listar todas as collections
    const collections = await db.listCollections().toArray()
    
    console.log(`\n📊 Collections encontradas no banco "${MONGO_CONFIG.database}":\n`)
    
    if (collections.length === 0) {
      console.log('❌ Nenhuma collection encontrada!')
      return
    }
    
    for (const collection of collections) {
      const coll = db.collection(collection.name)
      const count = await coll.countDocuments()
      
      console.log(`📁 ${collection.name.padEnd(20)} → ${count.toLocaleString()} documentos`)
      
      if (count > 0) {
        // Mostrar exemplo de documento
        const sample = await coll.findOne()
        const fields = Object.keys(sample)
        console.log(`   Campos: ${fields.join(', ')}`)
        console.log('')
      }
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await client.close()
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  listCollections()
} 