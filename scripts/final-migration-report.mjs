#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'

async function generateFinalReport() {
  const connector = new DatabaseConnector({ forceConnection: true })
  
  try {
    console.log('📊 RELATÓRIO FINAL DA MIGRAÇÃO MONGODB → NEON\n')
    console.log('='.repeat(60) + '\n')
    
    // Conectar aos bancos
    await connector.connectMongo()
    await connector.connectNeon()
    
    // Estatísticas do MongoDB
    const mongoDb = connector.getMongoDb()
    const mongoCollection = mongoDb.collection('m_product_typesense')
    const mongoTotal = await mongoCollection.countDocuments()
    
    // Estatísticas do Neon
    const neonStats = await connector.queryNeon(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN attributes->>'imported_from' = 'mongodb' THEN 1 END) as from_mongodb,
        COUNT(CASE WHEN attributes->>'imported_from' IS NULL THEN 1 END) as native_products,
        MIN(created_at) as oldest_product,
        MAX(created_at) as newest_product
      FROM products
    `)
    
    const stats = neonStats.rows[0]
    
    console.log('📦 PRODUTOS NO MONGODB:')
    console.log(`  Total: ${mongoTotal.toLocaleString('pt-BR')}`)
    
    console.log('\n📦 PRODUTOS NO NEON:')
    console.log(`  Total: ${parseInt(stats.total).toLocaleString('pt-BR')}`)
    console.log(`  - Importados do MongoDB: ${parseInt(stats.from_mongodb).toLocaleString('pt-BR')}`)
    console.log(`  - Produtos nativos: ${parseInt(stats.native_products).toLocaleString('pt-BR')}`)
    console.log(`  - Produto mais antigo: ${new Date(stats.oldest_product).toLocaleDateString('pt-BR')}`)
    console.log(`  - Produto mais recente: ${new Date(stats.newest_product).toLocaleDateString('pt-BR')}`)
    
    // Taxa de migração
    const migrationRate = (parseInt(stats.from_mongodb) / mongoTotal * 100).toFixed(1)
    console.log(`\n📊 TAXA DE MIGRAÇÃO: ${migrationRate}%`)
    
    // Produtos faltantes
    const missing = mongoTotal - parseInt(stats.from_mongodb)
    if (missing > 0) {
      console.log(`\n⚠️  PRODUTOS FALTANTES: ${missing}`)
      
      // Buscar quais produtos faltam
      const neonSkus = await connector.queryNeon('SELECT sku FROM products WHERE attributes->>\'imported_from\' = \'mongodb\'')
      const existingSkus = new Set(neonSkus.rows.map(r => r.sku))
      
      const missingProducts = []
      const mongoCursor = mongoCollection.find({})
      
      for await (const product of mongoCursor) {
        const sku = product.productid?.toString()
        if (!existingSkus.has(sku)) {
          missingProducts.push({
            sku: sku,
            name: product.productname,
            price: product.price,
            active: product.isactive
          })
        }
      }
      
      console.log('\nProdutos não migrados:')
      missingProducts.slice(0, 10).forEach(p => {
        console.log(`  - [${p.sku}] ${p.name || 'SEM NOME'} - R$ ${p.price} - Ativo: ${p.active}`)
      })
      
      if (missingProducts.length > 10) {
        console.log(`  ... e mais ${missingProducts.length - 10} produtos`)
      }
    } else {
      console.log('\n✅ TODOS OS PRODUTOS FORAM MIGRADOS!')
    }
    
    // Estatísticas de qualidade
    const qualityStats = await connector.queryNeon(`
      SELECT 
        COUNT(CASE WHEN price > 0 THEN 1 END) as with_price,
        COUNT(CASE WHEN quantity > 0 THEN 1 END) as with_stock,
        COUNT(CASE WHEN brand IS NOT NULL THEN 1 END) as with_brand,
        COUNT(CASE WHEN meta_description IS NOT NULL THEN 1 END) as with_seo,
        COUNT(CASE WHEN json_array_length((attributes->>'images')::json) > 0 THEN 1 END) as with_images
      FROM products
      WHERE attributes->>'imported_from' = 'mongodb'
    `)
    
    const quality = qualityStats.rows[0]
    
    console.log('\n📈 QUALIDADE DOS PRODUTOS MIGRADOS:')
    console.log(`  Com preço: ${parseInt(quality.with_price).toLocaleString('pt-BR')} (${(parseInt(quality.with_price) / parseInt(stats.from_mongodb) * 100).toFixed(1)}%)`)
    console.log(`  Com estoque: ${parseInt(quality.with_stock).toLocaleString('pt-BR')} (${(parseInt(quality.with_stock) / parseInt(stats.from_mongodb) * 100).toFixed(1)}%)`)
    console.log(`  Com marca: ${parseInt(quality.with_brand).toLocaleString('pt-BR')} (${(parseInt(quality.with_brand) / parseInt(stats.from_mongodb) * 100).toFixed(1)}%)`)
    console.log(`  Com SEO: ${parseInt(quality.with_seo).toLocaleString('pt-BR')} (${(parseInt(quality.with_seo) / parseInt(stats.from_mongodb) * 100).toFixed(1)}%)`)
    
    console.log('\n' + '='.repeat(60))
    console.log('\n✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!')
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await connector.disconnect()
  }
}

generateFinalReport() 