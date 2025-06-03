#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'

async function checkMongoCategories() {
  const connector = new DatabaseConnector({ forceConnection: true })
  
  try {
    console.log('🔍 Verificando estrutura de categorias no MongoDB...\n')
    
    await connector.connectMongo()
    const db = connector.getMongoDb()
    
    // Verificar se produtos têm categorias
    console.log('📦 CATEGORIAS NOS PRODUTOS:\n')
    const products = await db.collection('m_product_typesense').find().limit(10).toArray()
    
    console.log('Analisando campos de categoria em 10 produtos:')
    for (let i = 0; i < products.length; i++) {
      const product = products[i]
      console.log(`\n${i + 1}. ${product.productname}`)
      console.log(`   ID: ${product.productid}`)
      
      // Procurar por campos relacionados a categoria
      const categoryFields = [
        'category', 'categories', 'categoryId', 'categoryid',
        'category_id', 'productcategory', 'product_category',
        'categoryName', 'categoryname', 'categoryslug'
      ]
      
      let foundCategory = false
      for (const field of categoryFields) {
        if (product[field]) {
          console.log(`   ✅ ${field}: ${JSON.stringify(product[field])}`)
          foundCategory = true
        }
      }
      
      if (!foundCategory) {
        console.log('   ❌ Nenhum campo de categoria encontrado')
      }
    }
    
    // Verificar possíveis coleções de categoria
    console.log('\n\n📂 VERIFICANDO COLEÇÕES DE CATEGORIA:\n')
    const possibleCollections = [
      'm_category', 'c_category', 'categories', 
      'm_productcategory', 'product_categories'
    ]
    
    for (const colName of possibleCollections) {
      try {
        const count = await db.collection(colName).countDocuments()
        if (count > 0) {
          console.log(`✅ ${colName}: ${count} documentos`)
          
          // Pegar amostra
          const sample = await db.collection(colName).findOne()
          console.log('   Estrutura:', Object.keys(sample))
          console.log('   Exemplo:', JSON.stringify(sample, null, 2).substring(0, 200) + '...')
        }
      } catch (error) {
        // Coleção não existe
      }
    }
    
    // Verificar estrutura detalhada de produtos
    console.log('\n\n📊 ESTRUTURA COMPLETA DE UM PRODUTO:\n')
    const sampleProduct = products[0]
    console.log('Todos os campos disponíveis:')
    Object.keys(sampleProduct).forEach(key => {
      const value = sampleProduct[key]
      if (typeof value === 'object' && value !== null) {
        console.log(`  ${key}: [object] ${Array.isArray(value) ? `Array(${value.length})` : 'Object'}`)
      } else {
        console.log(`  ${key}: ${value}`)
      }
    })
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await connector.disconnect()
  }
}

checkMongoCategories() 