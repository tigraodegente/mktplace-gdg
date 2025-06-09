#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'
import { DataMapper } from './sync/utils/data-mapper.mjs'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Carregar configurações
dotenv.config({ path: path.resolve(__dirname, '../.env.develop') })
dotenv.config({ path: path.resolve(__dirname, '../.env') })

async function testeUrlsCorrigidas() {
  const mapper = new DataMapper({ defaultStock: 10 })
  const connector = new DatabaseConnector({ forceConnection: true })
  
  try {
    console.log('🧪 TESTANDO URLs CORRIGIDAS - ESTRATÉGIA OVH ORIGINAL\n')
    
    await connector.connectMongo()
    await connector.connectNeon()
    
    const db = connector.getMongoDb()
    const collection = db.collection('m_product_typesense')
    
    // Buscar o produto problemático
    const product = await collection.findOne({ productid: 102005 })
    
    if (!product) {
      console.log('❌ Produto não encontrado')
      return
    }
    
    console.log(`📦 Testando produto: ${product.productname}`)
    console.log(`🔗 SKU: ${product.productid}`)
    
    // Mapear com nova estratégia
    const neonProduct = mapper.mapProduct(product)
    
    console.log('\n🖼️  URLs COM NOVA ESTRATÉGIA:')
    neonProduct.images.forEach((img, i) => {
      console.log(`${i + 1}. ${img.url}`)
      console.log(`   Primary: ${img.is_primary}`)
    })
    
    // Atualizar o produto no banco
    console.log('\n🔄 Atualizando URLs no banco...')
    
    // Buscar ID do produto no Neon
    const existingProduct = await connector.queryNeon(
      'SELECT id FROM products WHERE sku = $1',
      [product.productid.toString()]
    )
    
    if (existingProduct.rows.length > 0) {
      const productId = existingProduct.rows[0].id
      
      // Deletar imagens antigas
      await connector.queryNeon('DELETE FROM product_images WHERE product_id = $1', [productId])
      
      // Inserir imagens com URLs corrigidas
      for (let i = 0; i < neonProduct.images.length; i++) {
        const img = neonProduct.images[i]
        await connector.queryNeon(`
          INSERT INTO product_images (
            product_id, url, alt_text, position, is_primary, created_at
          ) VALUES ($1, $2, $3, $4, $5, NOW())
        `, [productId, img.url, img.alt, i, img.is_primary])
      }
      
      console.log('✅ URLs atualizadas no banco!')
      
      // Verificar resultado
      const updatedImages = await connector.queryNeon(`
        SELECT url, is_primary, position 
        FROM product_images 
        WHERE product_id = $1 
        ORDER BY position
      `, [productId])
      
      console.log('\n📊 URLs SALVAS NO BANCO:')
      updatedImages.rows.forEach((img, i) => {
        console.log(`${i + 1}. ${img.url}`)
        console.log(`   Primary: ${img.is_primary}`)
      })
      
      console.log('\n🎯 TESTE: Tente acessar a primeira URL agora!')
      console.log('URL para testar:', updatedImages.rows[0].url)
      
    } else {
      console.log('❌ Produto não encontrado no Neon')
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await connector.disconnect()
  }
}

testeUrlsCorrigidas() 