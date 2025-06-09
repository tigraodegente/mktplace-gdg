#!/usr/bin/env node

import { DatabaseConnector } from './scripts/sync/utils/db-connector.mjs'

async function checkMongoVariationsScope() {
  const connector = new DatabaseConnector({ forceConnection: true })
  
  try {
    await connector.connectMongo()
    const db = connector.getMongoDb()
    
    // Total de produtos
    const totalProducts = await db.collection('m_product_typesense').countDocuments()
    console.log(`📦 Total de produtos no MongoDB: ${totalProducts}`)
    
    // Produtos com parentID (fazem parte de grupos de variações)
    const productsWithParent = await db.collection('m_product_typesense')
      .countDocuments({ parentID: { $exists: true, $ne: null } })
    console.log(`🔗 Produtos com parentID: ${productsWithParent}`)
    
    // Quantos grupos únicos de variações existem
    const uniqueParents = await db.collection('m_product_typesense')
      .distinct('parentID', { parentID: { $exists: true, $ne: null } })
    console.log(`👥 Grupos únicos de variações: ${uniqueParents.length}`)
    
    // Top 10 grupos com mais variações
    const topGroups = await db.collection('m_product_typesense').aggregate([
      { $match: { parentID: { $exists: true, $ne: null } } },
      { $group: { _id: '$parentID', count: { $sum: 1 }, products: { $push: { sku: '$productid', name: '$productname' } } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).toArray()
    
    console.log('\n🏆 TOP 10 grupos com mais variações:')
    topGroups.forEach((group, i) => {
      console.log(`${i+1}. Parent ID ${group._id}: ${group.count} variações`)
      console.log(`   Produtos: ${group.products.map(p => `${p.name} (${p.sku})`).join(', ')}`)
      console.log('')
    })
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await connector.disconnect()
  }
}

checkMongoVariationsScope() 