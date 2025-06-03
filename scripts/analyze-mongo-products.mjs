#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'
import { DataMapper } from './sync/utils/data-mapper.mjs'

async function analyzeMongoProducts() {
  const connector = new DatabaseConnector({ forceConnection: true })
  const mapper = new DataMapper()
  
  const stats = {
    total: 0,
    withName: 0,
    withoutName: 0,
    withPrice: 0,
    withoutPrice: 0,
    withSku: 0,
    withoutSku: 0,
    withImages: 0,
    withoutImages: 0,
    withStock: 0,
    withoutStock: 0,
    active: 0,
    inactive: 0,
    complete: 0,
    incomplete: 0,
    byNameField: {},
    priceRanges: {
      zero: 0,
      low: 0,      // 0-50
      medium: 0,   // 50-200
      high: 0,     // 200-500
      premium: 0   // 500+
    }
  }
  
  try {
    console.log('🔍 Analisando produtos no MongoDB...\n')
    
    await connector.connectMongo()
    const db = connector.getMongoDb()
    const collection = db.collection('m_product_typesense')
    
    const totalCount = await collection.countDocuments()
    console.log(`📊 Total de produtos: ${totalCount}\n`)
    
    // Processar todos os produtos
    const cursor = collection.find({})
    
    let processed = 0
    
    for await (const product of cursor) {
      stats.total++
      
      // Verificar nome
      const name = product.productname || product.marketplaceproductname || 
                   product.googleproductname || product.name || product.productName
      
      if (name) {
        stats.withName++
        // Contar qual campo de nome foi usado
        if (product.productname) stats.byNameField.productname = (stats.byNameField.productname || 0) + 1
        if (product.marketplaceproductname) stats.byNameField.marketplaceproductname = (stats.byNameField.marketplaceproductname || 0) + 1
        if (product.googleproductname) stats.byNameField.googleproductname = (stats.byNameField.googleproductname || 0) + 1
        if (product.name) stats.byNameField.name = (stats.byNameField.name || 0) + 1
        if (product.productName) stats.byNameField.productName = (stats.byNameField.productName || 0) + 1
      } else {
        stats.withoutName++
      }
      
      // Verificar preço
      const price = product.price || product.salePrice
      if (price && price > 0) {
        stats.withPrice++
        
        // Categorizar faixas de preço
        if (price === 0) stats.priceRanges.zero++
        else if (price < 50) stats.priceRanges.low++
        else if (price < 200) stats.priceRanges.medium++
        else if (price < 500) stats.priceRanges.high++
        else stats.priceRanges.premium++
      } else {
        stats.withoutPrice++
      }
      
      // Verificar SKU
      const sku = product.productid?.toString() || product.sku
      if (sku) {
        stats.withSku++
      } else {
        stats.withoutSku++
      }
      
      // Verificar imagens
      const hasImages = product.urlImagePrimary || 
                       (product.files?.photos && product.files.photos.length > 0) ||
                       (product.images && product.images.length > 0)
      
      if (hasImages) {
        stats.withImages++
      } else {
        stats.withoutImages++
      }
      
      // Verificar estoque
      const stock = product.realstock || product.virtualstock || product.stock || 0
      if (stock > 0) {
        stats.withStock++
      } else {
        stats.withoutStock++
      }
      
      // Verificar status
      if (product.isactive || product.activeforseo) {
        stats.active++
      } else {
        stats.inactive++
      }
      
      // Produto completo = tem nome, preço, SKU e está ativo
      if (name && price > 0 && sku && (product.isactive || product.activeforseo)) {
        stats.complete++
      } else {
        stats.incomplete++
      }
      
      // Progresso
      processed++
      if (processed % 500 === 0) {
        console.log(`Processados: ${processed}/${totalCount} (${Math.round(processed/totalCount*100)}%)`)
      }
    }
    
    // Exibir relatório
    console.log('\n📊 RELATÓRIO DE ANÁLISE DOS PRODUTOS\n')
    console.log('='.repeat(50))
    
    console.log('\n📌 ESTATÍSTICAS GERAIS:')
    console.log(`Total de produtos: ${stats.total}`)
    console.log(`Produtos completos: ${stats.complete} (${Math.round(stats.complete/stats.total*100)}%)`)
    console.log(`Produtos incompletos: ${stats.incomplete} (${Math.round(stats.incomplete/stats.total*100)}%)`)
    
    console.log('\n📝 NOMES:')
    console.log(`Com nome: ${stats.withName} (${Math.round(stats.withName/stats.total*100)}%)`)
    console.log(`Sem nome: ${stats.withoutName} (${Math.round(stats.withoutName/stats.total*100)}%)`)
    console.log('\nCampos de nome utilizados:')
    for (const [field, count] of Object.entries(stats.byNameField)) {
      console.log(`  - ${field}: ${count} produtos`)
    }
    
    console.log('\n💰 PREÇOS:')
    console.log(`Com preço: ${stats.withPrice} (${Math.round(stats.withPrice/stats.total*100)}%)`)
    console.log(`Sem preço: ${stats.withoutPrice} (${Math.round(stats.withoutPrice/stats.total*100)}%)`)
    console.log('\nFaixas de preço:')
    console.log(`  - R$ 0: ${stats.priceRanges.zero}`)
    console.log(`  - R$ 0-50: ${stats.priceRanges.low}`)
    console.log(`  - R$ 50-200: ${stats.priceRanges.medium}`)
    console.log(`  - R$ 200-500: ${stats.priceRanges.high}`)
    console.log(`  - R$ 500+: ${stats.priceRanges.premium}`)
    
    console.log('\n🔑 SKUs:')
    console.log(`Com SKU: ${stats.withSku} (${Math.round(stats.withSku/stats.total*100)}%)`)
    console.log(`Sem SKU: ${stats.withoutSku} (${Math.round(stats.withoutSku/stats.total*100)}%)`)
    
    console.log('\n🖼️  IMAGENS:')
    console.log(`Com imagens: ${stats.withImages} (${Math.round(stats.withImages/stats.total*100)}%)`)
    console.log(`Sem imagens: ${stats.withoutImages} (${Math.round(stats.withoutImages/stats.total*100)}%)`)
    
    console.log('\n📦 ESTOQUE:')
    console.log(`Com estoque: ${stats.withStock} (${Math.round(stats.withStock/stats.total*100)}%)`)
    console.log(`Sem estoque: ${stats.withoutStock} (${Math.round(stats.withoutStock/stats.total*100)}%)`)
    
    console.log('\n✅ STATUS:')
    console.log(`Ativos: ${stats.active} (${Math.round(stats.active/stats.total*100)}%)`)
    console.log(`Inativos: ${stats.inactive} (${Math.round(stats.inactive/stats.total*100)}%)`)
    
    console.log('\n' + '='.repeat(50))
    console.log('\n💡 RECOMENDAÇÃO:')
    console.log(`Sincronizar apenas produtos completos: ${stats.complete} produtos`)
    console.log('Critérios: ter nome, preço > 0, SKU e estar ativo')
    
    // Verificar alguns produtos sem nome para debug
    console.log('\n🔍 Amostra de produtos sem nome:')
    const noNameProducts = await collection
      .find({
        $and: [
          { productname: { $exists: false } },
          { marketplaceproductname: { $exists: false } },
          { googleproductname: { $exists: false } },
          { name: { $exists: false } },
          { productName: { $exists: false } }
        ]
      })
      .limit(5)
      .toArray()
    
    for (const product of noNameProducts) {
      console.log(`\n  ID: ${product._id}`)
      console.log(`  ProductID: ${product.productid}`)
      console.log(`  Campos disponíveis: ${Object.keys(product).join(', ')}`)
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await connector.disconnect()
  }
}

analyzeMongoProducts() 