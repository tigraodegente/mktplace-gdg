#!/usr/bin/env node

import 'dotenv/config'
import { MongoClient } from 'mongodb'

const MONGO_CONFIG = {
  uri: process.env.MONGODB_URI,
  database: process.env.MONGODB_DATABASE,
  collection: process.env.MONGODB_COLLECTION || 'm_product'
}

async function checkActiveProducts() {
  const client = new MongoClient(MONGO_CONFIG.uri)
  
  try {
    console.log('🔌 Conectando ao MongoDB...')
    await client.connect()
    
    const db = client.db(MONGO_CONFIG.database)
    const collection = db.collection(MONGO_CONFIG.collection)
    
    console.log('📊 Analisando status dos produtos...\n')
    
    // 1. Total geral
    const total = await collection.countDocuments()
    console.log(`📦 Total de produtos: ${total.toLocaleString()}`)
    
    // 2. Produtos ativos (activeForSeo = true)
    const activeForSeo = await collection.countDocuments({ activeForSeo: true })
    console.log(`✅ Ativos para SEO: ${activeForSeo.toLocaleString()}`)
    
    // 3. Produtos ativos (isActive = true) 
    const isActive = await collection.countDocuments({ isActive: true })
    console.log(`✅ Marcados como ativos: ${isActive.toLocaleString()}`)
    
    // 4. Produtos com estoque
    const withStock = await collection.countDocuments({ 
      stock: { $gt: 0 } 
    })
    console.log(`📦 Com estoque > 0: ${withStock.toLocaleString()}`)
    
    // 5. Produtos vendáveis (notSalable = false)
    const salable = await collection.countDocuments({ notSalable: false })
    console.log(`💰 Vendáveis (notSalable=false): ${salable.toLocaleString()}`)
    
    // 6. Produtos realmente vendendo (combinação ideal)
    const selling = await collection.countDocuments({
      activeForSeo: true,
      isActive: true,
      stock: { $gt: 0 },
      notSalable: false
    })
    console.log(`\n🚀 VENDENDO ATIVAMENTE: ${selling.toLocaleString()}`)
    
    // 7. Análise detalhada por status
    console.log('\n📋 Análise Detalhada:')
    console.log('=' * 50)
    
    const combinations = [
      {
        name: 'Ativos + Com Estoque',
        filter: { activeForSeo: true, stock: { $gt: 0 } }
      },
      {
        name: 'Ativos + Sem Estoque',
        filter: { activeForSeo: true, stock: { $lte: 0 } }
      },
      {
        name: 'Inativos + Com Estoque',
        filter: { activeForSeo: false, stock: { $gt: 0 } }
      },
      {
        name: 'Inativos + Sem Estoque',
        filter: { activeForSeo: false, stock: { $lte: 0 } }
      }
    ]
    
    for (const combo of combinations) {
      const count = await collection.countDocuments(combo.filter)
      console.log(`${combo.name.padEnd(25)}: ${count.toLocaleString()}`)
    }
    
    // 8. Estatísticas de estoque
    console.log('\n📊 Estatísticas de Estoque:')
    console.log('=' * 50)
    
    const stockStats = await collection.aggregate([
      {
        $group: {
          _id: null,
          totalStock: { $sum: '$stock' },
          avgStock: { $avg: '$stock' },
          maxStock: { $max: '$stock' },
          minStock: { $min: '$stock' }
        }
      }
    ]).toArray()
    
    if (stockStats.length > 0) {
      const stats = stockStats[0]
      console.log(`Total de itens em estoque: ${stats.totalStock?.toLocaleString() || 0}`)
      console.log(`Estoque médio por produto: ${stats.avgStock?.toFixed(1) || 0}`)
      console.log(`Maior estoque individual: ${stats.maxStock?.toLocaleString() || 0}`)
      console.log(`Menor estoque individual: ${stats.minStock || 0}`)
    }
    
    // 9. Top produtos por estoque
    console.log('\n🏆 Top 10 Produtos com Maior Estoque:')
    console.log('=' * 50)
    
    const topStock = await collection
      .find({ stock: { $gt: 0 } })
      .sort({ stock: -1 })
      .limit(10)
      .project({ productName: 1, stock: 1, price: 1 })
      .toArray()
    
    topStock.forEach((product, index) => {
      console.log(`${(index + 1).toString().padStart(2)}. ${product.productName.substring(0, 40)}... (${product.stock} un.) - R$ ${product.price}`)
    })
    
    // 10. Produtos sem estoque mas ativos
    const activeNoStock = await collection.countDocuments({
      activeForSeo: true,
      stock: { $lte: 0 }
    })
    
    console.log('\n⚠️  Atenção:')
    console.log(`${activeNoStock.toLocaleString()} produtos estão ativos mas SEM ESTOQUE`)
    
    // 11. Resumo final
    console.log('\n🎯 RESUMO PARA IMPORTAÇÃO:')
    console.log('=' * 60)
    console.log(`📦 Total no banco: ${total.toLocaleString()}`)
    console.log(`🚀 Prontos para vender: ${selling.toLocaleString()}`)
    console.log(`📊 Taxa de produtos vendendo: ${((selling / total) * 100).toFixed(1)}%`)
    
    if (selling > 0) {
      console.log('\n✅ Recomendação: Importar todos os produtos')
      console.log('   - Produtos ativos funcionarão imediatamente')
      console.log('   - Produtos inativos ficam como rascunho para ativar depois')
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await client.close()
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  checkActiveProducts()
} 