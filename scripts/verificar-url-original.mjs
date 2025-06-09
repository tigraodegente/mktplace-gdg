#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Carregar configurações
dotenv.config({ path: path.resolve(__dirname, '../.env.develop') })
dotenv.config({ path: path.resolve(__dirname, '../.env') })

async function verificarUrlOriginal() {
  const connector = new DatabaseConnector({ forceConnection: true })
  
  try {
    console.log('🔍 VERIFICANDO URL ORIGINAL NO MONGODB\n')
    
    await connector.connectMongo()
    const db = connector.getMongoDb()
    const collection = db.collection('m_product_typesense')
    
    // Buscar produto específico
    const productId = 102005
    const product = await collection.findOne({ productid: productId })
    
    if (!product) {
      console.log(`❌ Produto ${productId} não encontrado`)
      return
    }
    
    console.log(`📦 Produto: ${product.productname}`)
    console.log(`🔗 SKU: ${productId}`)
    console.log('')
    
    console.log('🖼️  URLs ORIGINAIS NO MONGODB:')
    console.log('urlImagePrimary:', product.urlImagePrimary || 'não tem')
    console.log('')
    
    if (product.files?.photos) {
      console.log('files.photos:')
      product.files.photos.forEach((photo, i) => {
        const url = photo.url || photo.src || (typeof photo === 'string' ? photo : JSON.stringify(photo))
        console.log(`  ${i + 1}. ${url}`)
      })
    } else {
      console.log('files.photos: não tem')
    }
    
    console.log('')
    console.log('🔄 COMO A CONVERSÃO DEVERIA FUNCIONAR:')
    
    const urlPrimary = product.urlImagePrimary
    if (urlPrimary && urlPrimary.includes('ovh.net')) {
      console.log('URL OVH:', urlPrimary)
      
      const ovhPattern = /https?:\/\/grao-cdn\.s3\.bhs\.perf\.cloud\.ovh\.net\/fotos\/(\d+)\/(.*)/i
      const match = urlPrimary.match(ovhPattern)
      
      if (match) {
        const [, id, fileName] = match
        console.log('ID extraído:', id)
        console.log('Nome do arquivo:', fileName)
        
        // Testar algumas estratégias de conversão
        console.log('')
        console.log('🧪 TESTANDO ESTRATÉGIAS DE CONVERSÃO:')
        console.log('1. Conversão atual (problemática):')
        console.log(`   https://gdg-images.s3.sa-east-1.amazonaws.com/fotos/${id}/${fileName.replace(/-\d{6}(\.\w+)$/, '-1$1')}`)
        
        console.log('2. Manter OVH original:')
        console.log(`   ${urlPrimary}`)
        
        console.log('3. AWS com nome original:')
        console.log(`   https://gdg-images.s3.sa-east-1.amazonaws.com/fotos/${id}/${fileName}`)
        
        console.log('4. AWS sem prefixo fotos:')
        console.log(`   https://gdg-images.s3.sa-east-1.amazonaws.com/${id}/${fileName}`)
      }
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await connector.disconnect()
  }
}

verificarUrlOriginal() 