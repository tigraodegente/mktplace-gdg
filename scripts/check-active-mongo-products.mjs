#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'

async function checkActiveMongoProducts() {
  const connector = new DatabaseConnector({ forceConnection: true })
  
  try {
    console.log('🔍 ANALISANDO PRODUTOS ATIVOS NO MONGODB\n')
    
    await connector.connectMongo()
    const db = connector.getMongoDb()
    const collection = db.collection('m_product_typesense')
    
    // 1. Total de produtos
    const totalProducts = await collection.countDocuments()
    console.log(`📦 Total de produtos no MongoDB: ${totalProducts}`)
    
    // 2. Produtos ativos
    const activeProducts = await collection.countDocuments({
      $or: [
        { isactive: true },
        { activeforseo: true }
      ]
    })
    console.log(`✅ Produtos ativos: ${activeProducts}`)
    
    // 3. Produtos com estoque
    const withStock = await collection.countDocuments({
      $and: [
        {
          $or: [
            { isactive: true },
            { activeforseo: true }
          ]
        },
        {
          $or: [
            { realstock: { $gt: 0 } },
            { virtualstock: { $gt: 0 } },
            { stock: { $gt: 0 } }
          ]
        }
      ]
    })
    console.log(`📊 Produtos ativos com estoque: ${withStock}`)
    
    // 4. Produtos com preço válido
    const withPrice = await collection.countDocuments({
      $and: [
        {
          $or: [
            { isactive: true },
            { activeforseo: true }
          ]
        },
        {
          price: { $gt: 0 }
        }
      ]
    })
    console.log(`💰 Produtos ativos com preço: ${withPrice}`)
    
    // 5. Produtos completos (ativo, estoque, preço, nome)
    const completeProducts = await collection.countDocuments({
      $and: [
        {
          $or: [
            { isactive: true },
            { activeforseo: true }
          ]
        },
        {
          $or: [
            { realstock: { $gt: 0 } },
            { virtualstock: { $gt: 0 } },
            { stock: { $gt: 0 } }
          ]
        },
        {
          price: { $gt: 0 }
        },
        {
          productname: { $exists: true, $ne: '' }
        }
      ]
    })
    console.log(`🎯 Produtos VENDÁVEIS (ativo + estoque + preço + nome): ${completeProducts}`)
    
    console.log('\n🖼️  ANÁLISE DE IMAGENS:\n')
    
    // 6. Verificar URLs de imagem nos produtos ativos
    const productsWithImages = await collection.find({
      $and: [
        {
          $or: [
            { isactive: true },
            { activeforseo: true }
          ]
        },
        {
          $or: [
            { urlImagePrimary: { $exists: true, $ne: '' } },
            { 'files.photos': { $exists: true, $ne: [] } }
          ]
        }
      ]
    }).limit(10).toArray()
    
    console.log(`📸 Produtos ativos com imagens: ${productsWithImages.length} (amostra de 10)`)
    
    // Analisar URLs de imagem
    let ovhCount = 0
    let awsCount = 0
    let otherCount = 0
    
    productsWithImages.forEach(product => {
      // Verificar imagem principal
      if (product.urlImagePrimary) {
        if (product.urlImagePrimary.includes('ovh')) ovhCount++
        else if (product.urlImagePrimary.includes('amazonaws')) awsCount++
        else otherCount++
      }
      
      // Verificar galeria
      if (product.files?.photos) {
        product.files.photos.forEach(photo => {
          const url = photo.url || photo.src || photo
          if (typeof url === 'string') {
            if (url.includes('ovh')) ovhCount++
            else if (url.includes('amazonaws')) awsCount++
            else otherCount++
          }
        })
      }
    })
    
    console.log(`\n📊 ANÁLISE DE URLs (amostra):\n`)
    console.log(`   🏢 URLs OVH: ${ovhCount}`)
    console.log(`   ☁️  URLs AWS: ${awsCount}`)
    console.log(`   ❓ Outras URLs: ${otherCount}`)
    
    // 7. Exemplos de URLs encontradas
    console.log('\n🔍 EXEMPLOS DE URLs ENCONTRADAS:\n')
    
    for (let i = 0; i < Math.min(5, productsWithImages.length); i++) {
      const product = productsWithImages[i]
      console.log(`${i + 1}. ${product.productname} (ID: ${product.productid})`)
      
      if (product.urlImagePrimary) {
        const type = product.urlImagePrimary.includes('ovh') ? '🏢 OVH' : 
                    product.urlImagePrimary.includes('amazonaws') ? '☁️  AWS' : '❓ Outro'
        console.log(`   ${type} Principal: ${product.urlImagePrimary}`)
      }
      
      if (product.files?.photos && product.files.photos.length > 0) {
        console.log(`   📸 Galeria (${product.files.photos.length} fotos):`)
        product.files.photos.slice(0, 2).forEach((photo, j) => {
          const url = photo.url || photo.src || photo
          if (typeof url === 'string') {
            const type = url.includes('ovh') ? '🏢 OVH' : 
                        url.includes('amazonaws') ? '☁️  AWS' : '❓ Outro'
            console.log(`      ${type} ${url}`)
          }
        })
        if (product.files.photos.length > 2) {
          console.log(`      ... e mais ${product.files.photos.length - 2} fotos`)
        }
      }
      console.log('')
    }
    
    // 8. Verificar distribuição por categoria/marca
    console.log('📈 ESTATÍSTICAS ADICIONAIS:\n')
    
    const brandStats = await collection.aggregate([
      {
        $match: {
          $and: [
            {
              $or: [
                { isactive: true },
                { activeforseo: true }
              ]
            },
            {
              'brand.name': { $exists: true, $ne: '' }
            }
          ]
        }
      },
      {
        $group: {
          _id: '$brand.name',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]).toArray()
    
    console.log('🏷️  Top 10 marcas (produtos ativos):')
    brandStats.forEach((brand, i) => {
      console.log(`   ${i + 1}. ${brand._id}: ${brand.count} produtos`)
    })
    
    console.log('\n💡 RESUMO EXECUTIVO:')
    console.log(`   📦 ${completeProducts} produtos VENDÁVEIS no MongoDB`)
    console.log(`   🖼️  URLs OVH encontradas nos produtos ativos (precisam migração)`)
    console.log(`   ☁️  Poucas URLs AWS já migradas`)
    console.log(`   🎯 Foco: migrar ${completeProducts} produtos vendáveis`)
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await connector.disconnect()
  }
}

checkActiveMongoProducts() 