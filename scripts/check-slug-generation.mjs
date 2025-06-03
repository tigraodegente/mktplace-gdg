#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'
import { DataMapper } from './sync/utils/data-mapper.mjs'

async function checkSlugGeneration() {
  const connector = new DatabaseConnector({ forceConnection: true })
  const mapper = new DataMapper()
  
  try {
    console.log('🔍 Verificando geração de slugs...\n')
    
    await connector.connectMongo()
    const db = connector.getMongoDb()
    const collection = db.collection('m_product_typesense')
    
    // Pegar 10 produtos de exemplo
    const products = await collection.find().limit(10).toArray()
    
    console.log(`📦 Analisando ${products.length} produtos:\n`)
    
    for (let i = 0; i < products.length; i++) {
      const product = products[i]
      console.log(`\n========== Produto ${i + 1} ==========`)
      console.log('ID:', product._id)
      console.log('ProductID:', product.productid)
      console.log('Nome original:', product.productname)
      
      // Testar a função createSlug
      const slug1 = mapper.createSlug(product.productname)
      const slug2 = mapper.createSlug(product.marketplaceproductname)
      const slug3 = mapper.createSlug(product.googleproductname)
      
      console.log('\nSlugs gerados:')
      console.log('  - De productname:', slug1)
      console.log('  - De marketplaceproductname:', slug2)
      console.log('  - De googleproductname:', slug3)
      
      // Mapear o produto completo
      const mappedProduct = mapper.mapProduct(product)
      console.log('\nSlug final no produto mapeado:', mappedProduct.slug)
      
      // Verificar se o slug está vazio
      if (!mappedProduct.slug || mappedProduct.slug === '') {
        console.log('⚠️  SLUG VAZIO DETECTADO!')
        console.log('Campos de nome disponíveis:')
        console.log('  - productname:', product.productname)
        console.log('  - marketplaceproductname:', product.marketplaceproductname)
        console.log('  - googleproductname:', product.googleproductname)
        console.log('  - name:', product.name)
        console.log('  - productName:', product.productName)
      }
    }
    
    // Verificar produtos com problemas específicos
    console.log('\n\n🔍 Buscando produtos que podem gerar slugs vazios...')
    
    // Produtos onde productname pode estar vazio ou só ter caracteres especiais
    const problematicProducts = await collection.find({
      $or: [
        { productname: '' },
        { productname: null },
        { productname: { $regex: /^[^a-zA-Z0-9]+$/ } }
      ]
    }).limit(10).toArray()
    
    console.log(`\nEncontrados ${problematicProducts.length} produtos potencialmente problemáticos:`)
    
    for (const product of problematicProducts) {
      console.log(`\n  ID: ${product._id}`)
      console.log(`  ProductID: ${product.productid}`)
      console.log(`  Productname: "${product.productname}"`)
      console.log(`  Slug gerado: "${mapper.createSlug(product.productname)}"`)
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await connector.disconnect()
  }
}

checkSlugGeneration() 