#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'

async function analyzeProductSalesCriteria() {
  const connector = new DatabaseConnector({ forceConnection: true })
  
  try {
    console.log('🔍 ANALISANDO CRITÉRIOS DE PRODUTOS À VENDA NO MONGODB\n')
    
    await connector.connectMongo()
    const db = connector.getMongoDb()
    const collection = db.collection('m_product_typesense')
    
    // 1. Pegar uma amostra de produtos para ver TODOS os campos
    console.log('📊 ANALISANDO ESTRUTURA COMPLETA DOS PRODUTOS:\n')
    
    const sampleProducts = await collection.find({}).limit(3).toArray()
    
    console.log('🔍 CAMPOS ENCONTRADOS EM PRODUTOS DE AMOSTRA:')
    const allFields = new Set()
    
    sampleProducts.forEach((product, i) => {
      console.log(`\n${i + 1}. Produto: ${product.productname || product.productid}`)
      console.log('   Campos disponíveis:')
      
      Object.keys(product).forEach(key => {
        allFields.add(key)
        const value = product[key]
        const type = typeof value
        const preview = type === 'object' ? 
          (Array.isArray(value) ? `Array[${value.length}]` : 'Object') :
          type === 'string' ? `"${value.substring(0, 50)}${value.length > 50 ? '...' : ''}"` :
          value
        
        console.log(`      ${key}: ${type} = ${preview}`)
      })
    })
    
    // 2. Analisar campos relacionados a vendas/ativação
    console.log('\n\n🎯 ANÁLISE DE CAMPOS RELACIONADOS A VENDAS:\n')
    
    const salesFields = [
      'isactive', 'activeforseo', 'active', 'status', 'visible',
      'realstock', 'virtualstock', 'stock', 'quantity',
      'price', 'salesprice', 'promotionalprice', 'originalPrice',
      'sold', 'sales', 'salescount', 'ordercount', 'popularity',
      'featured', 'bestseller', 'trending', 'promoted',
      'available', 'instock', 'outofstock',
      'createdAt', 'updatedAt', 'lastSold', 'lastOrder'
    ]
    
    for (const field of salesFields) {
      const count = await collection.countDocuments({ [field]: { $exists: true } })
      const countTrue = await collection.countDocuments({ [field]: true })
      const countFalse = await collection.countDocuments({ [field]: false })
      const countGreaterZero = await collection.countDocuments({ [field]: { $gt: 0 } })
      
      if (count > 0) {
        console.log(`📊 ${field}:`)
        console.log(`   Existe em: ${count} produtos`)
        if (countTrue > 0) console.log(`   true: ${countTrue}`)
        if (countFalse > 0) console.log(`   false: ${countFalse}`)
        if (countGreaterZero > 0) console.log(`   > 0: ${countGreaterZero}`)
        
        // Mostrar valores únicos para campos pequenos
        if (count < 20) {
          const uniqueValues = await collection.distinct(field)
          console.log(`   Valores únicos: ${uniqueValues.slice(0, 10).join(', ')}`)
        }
        console.log('')
      }
    }
    
    // 3. Analisar produtos por diferentes critérios
    console.log('🎯 COMPARAÇÃO DE CRITÉRIOS DIFERENTES:\n')
    
    const criteria = [
      {
        name: 'Apenas isactive=true',
        filter: { isactive: true }
      },
      {
        name: 'Apenas activeforseo=true', 
        filter: { activeforseo: true }
      },
      {
        name: 'isactive=true OU activeforseo=true',
        filter: { $or: [{ isactive: true }, { activeforseo: true }] }
      },
      {
        name: 'Com realstock > 0',
        filter: { realstock: { $gt: 0 } }
      },
      {
        name: 'Com qualquer estoque > 0',
        filter: { $or: [{ realstock: { $gt: 0 } }, { virtualstock: { $gt: 0 } }, { stock: { $gt: 0 } }] }
      },
      {
        name: 'Com preço > 0',
        filter: { price: { $gt: 0 } }
      },
      {
        name: 'VENDÁVEIS (minha definição atual)',
        filter: {
          $and: [
            { $or: [{ isactive: true }, { activeforseo: true }] },
            { $or: [{ realstock: { $gt: 0 } }, { virtualstock: { $gt: 0 } }, { stock: { $gt: 0 } }] },
            { price: { $gt: 0 } },
            { productname: { $exists: true, $ne: '' } }
          ]
        }
      }
    ]
    
    for (const criterion of criteria) {
      const count = await collection.countDocuments(criterion.filter)
      console.log(`${criterion.name}: ${count} produtos`)
    }
    
    // 4. Verificar se há campos de data/movimentação
    console.log('\n📅 ANALISANDO CAMPOS DE DATA E MOVIMENTAÇÃO:\n')
    
    const dateFields = ['createdAt', 'updatedAt', 'lastSold', 'lastOrder', 'lastUpdate']
    
    for (const field of dateFields) {
      const count = await collection.countDocuments({ [field]: { $exists: true } })
      if (count > 0) {
        const recent = await collection.countDocuments({ 
          [field]: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Últimos 30 dias
        })
        console.log(`📅 ${field}: ${count} produtos têm este campo (${recent} nos últimos 30 dias)`)
      }
    }
    
    // 5. Sugestões
    console.log('\n💡 PERGUNTAS PARA DEFINIR CRITÉRIOS CORRETOS:\n')
    console.log('1. Quais campos você usa no sistema atual para determinar se um produto está "à venda"?')
    console.log('2. Há algum campo de status específico que indica vendas ativas?')
    console.log('3. Você considera "movimentação recente" ou apenas status ativo + estoque?')
    console.log('4. Há produtos sazonais ou com regras especiais de disponibilidade?')
    console.log('5. Qual a diferença entre "isactive" e "activeforseo"?')
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await connector.disconnect()
  }
}

analyzeProductSalesCriteria() 