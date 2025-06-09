#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'

async function checkSellableProductsCorrected() {
  const connector = new DatabaseConnector({ forceConnection: true })
  
  try {
    console.log('🎯 PRODUTOS VENDÁVEIS - CRITÉRIOS CORRETOS\n')
    console.log('✅ Incluindo regra: "produtos ocultos NÃO podem ser vendidos"\n')
    
    await connector.connectMongo()
    const db = connector.getMongoDb()
    const collection = db.collection('m_product_typesense')
    
    // 1. Verificar primeiro os campos de visibilidade
    console.log('👁️  ANALISANDO PRODUTOS OCULTOS:\n')
    
    const hiddenStats = await Promise.all([
      collection.countDocuments({ hideinlist: true }),
      collection.countDocuments({ hideinsearch: true }),
      collection.countDocuments({ notSalable: true }),
      collection.countDocuments({ 
        $or: [
          { hideinlist: true }, 
          { hideinsearch: true },
          { notSalable: true }
        ]
      })
    ])
    
    console.log(`🚫 Ocultos na listagem (hideinlist=true): ${hiddenStats[0]}`)
    console.log(`🚫 Ocultos na busca (hideinsearch=true): ${hiddenStats[1]}`)
    console.log(`🚫 Não vendáveis (notSalable=true): ${hiddenStats[2]}`)
    console.log(`🚫 Total de produtos OCULTOS/NÃO-VENDÁVEIS: ${hiddenStats[3]}`)
    
    // 2. Definir critérios corretos
    console.log('\n📋 CRITÉRIOS CORRETOS PARA PRODUTOS VENDÁVEIS:\n')
    console.log('✅ isactive = true (produto ativo)')
    console.log('✅ realstock > 0 OU virtualstock > 0 (tem estoque)')
    console.log('✅ price > 0 (tem preço válido)')
    console.log('✅ productname existe (tem nome)')
    console.log('🚫 hideinlist ≠ true (NÃO oculto na listagem)')
    console.log('🚫 hideinsearch ≠ true (NÃO oculto na busca)')
    console.log('🚫 notSalable ≠ true (NÃO marcado como não-vendável)')
    
    // 3. Aplicar critérios corretos
    const sellableFilter = {
      $and: [
        // Deve estar ativo
        { isactive: true },
        
        // Deve ter estoque
        {
          $or: [
            { realstock: { $gt: 0 } },
            { virtualstock: { $gt: 0 } }
          ]
        },
        
        // Deve ter preço
        { price: { $gt: 0 } },
        
        // Deve ter nome
        { productname: { $exists: true, $ne: '' } },
        
        // NÃO deve estar oculto (novos critérios!)
        { hideinlist: { $ne: true } },
        { hideinsearch: { $ne: true } },
        { notSalable: { $ne: true } }
      ]
    }
    
    const sellableCount = await collection.countDocuments(sellableFilter)
    
    console.log(`\n🎯 RESULTADO FINAL: ${sellableCount} produtos REALMENTE VENDÁVEIS`)
    
    // 4. Comparar com minha definição anterior
    const oldFilter = {
      $and: [
        { $or: [{ isactive: true }, { activeforseo: true }] },
        { $or: [{ realstock: { $gt: 0 } }, { virtualstock: { $gt: 0 } }] },
        { price: { $gt: 0 } },
        { productname: { $exists: true, $ne: '' } }
      ]
    }
    
    const oldCount = await collection.countDocuments(oldFilter)
    const difference = oldCount - sellableCount
    
    console.log('\n📊 COMPARAÇÃO:')
    console.log(`   Critério ANTIGO (sem excluir ocultos): ${oldCount}`)
    console.log(`   Critério CORRETO (excluindo ocultos): ${sellableCount}`)
    console.log(`   Diferença (produtos ocultos removidos): ${difference}`)
    
    // 5. Analisar alguns produtos vendáveis
    console.log('\n🔍 AMOSTRA DE PRODUTOS REALMENTE VENDÁVEIS:\n')
    
    const sampleSellable = await collection.find(sellableFilter).limit(5).toArray()
    
    sampleSellable.forEach((product, i) => {
      console.log(`${i + 1}. ${product.productname} (ID: ${product.productid})`)
      console.log(`   💰 Preço: R$ ${product.price}`)
      console.log(`   📦 Estoque real: ${product.realstock} | virtual: ${product.virtualstock}`)
      console.log(`   👁️  Visível: lista=${!product.hideinlist} | busca=${!product.hideinsearch}`)
      console.log(`   🛍️  Vendável: ${!product.notSalable}`)
      console.log('')
    })
    
    // 6. Verificar produtos com URLs de imagem
    const sellableWithImages = await collection.countDocuments({
      $and: [
        sellableFilter,
        {
          $or: [
            { urlImagePrimary: { $exists: true, $ne: '' } },
            { 'files.photos': { $exists: true, $ne: [] } }
          ]
        }
      ]
    })
    
    console.log(`🖼️  Produtos vendáveis COM imagens: ${sellableWithImages}`)
    console.log(`📊 ${((sellableWithImages / sellableCount) * 100).toFixed(1)}% dos vendáveis têm imagem`)
    
    // 7. Estatísticas por marca dos produtos vendáveis
    console.log('\n🏷️  TOP 5 MARCAS (produtos vendáveis):')
    
    const brandStats = await collection.aggregate([
      { $match: sellableFilter },
      {
        $group: {
          _id: '$brand.name',
          count: { $sum: 1 },
          totalStock: { $sum: '$realstock' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]).toArray()
    
    brandStats.forEach((brand, i) => {
      console.log(`   ${i + 1}. ${brand._id}: ${brand.count} produtos (${brand.totalStock} unidades)`)
    })
    
    console.log('\n✅ CRITÉRIOS FINAIS DEFINIDOS!')
    console.log(`🎯 ${sellableCount} produtos VENDÁVEIS que devem ser migrados do MongoDB`)
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await connector.disconnect()
  }
}

checkSellableProductsCorrected() 