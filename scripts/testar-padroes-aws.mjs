#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'
import { DataMapper } from './sync/utils/data-mapper.mjs'
import https from 'https'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Carregar configurações
dotenv.config({ path: path.resolve(__dirname, '../.env.develop') })
dotenv.config({ path: path.resolve(__dirname, '../.env') })

// Função para testar se URL existe
function testUrlExists(url) {
  return new Promise((resolve) => {
    const request = https.get(url, (response) => {
      resolve({
        url,
        status: response.statusCode,
        exists: response.statusCode === 200
      })
    })
    
    request.on('error', () => {
      resolve({
        url,
        status: 'ERROR',
        exists: false
      })
    })
    
    request.setTimeout(5000, () => {
      request.destroy()
      resolve({
        url,
        status: 'TIMEOUT',
        exists: false
      })
    })
  })
}

async function testarPadroesAws() {
  const connector = new DatabaseConnector({ forceConnection: true })
  
  try {
    console.log('🧪 TESTANDO DIFERENTES PADRÕES DE URL AWS\n')
    
    await connector.connectMongo()
    const db = connector.getMongoDb()
    const collection = db.collection('m_product_typesense')
    
    // Buscar produto específico
    const product = await collection.findOne({ productid: 102005 })
    
    if (!product) {
      console.log('❌ Produto não encontrado')
      return
    }
    
    console.log(`📦 Produto: ${product.productname}`)
    console.log(`🔗 URL OVH original: ${product.urlImagePrimary}`)
    console.log('')
    
    // Extrair informações da URL OVH
    const ovhUrl = product.urlImagePrimary
    const ovhPattern = /https?:\/\/grao-cdn\.s3\.bhs\.perf\.cloud\.ovh\.net\/fotos\/(\d+)\/(.*)/i
    const match = ovhUrl.match(ovhPattern)
    
    if (!match) {
      console.log('❌ URL OVH não corresponde ao padrão esperado')
      return
    }
    
    const [, productId, fileName] = match
    console.log(`📊 ID do produto: ${productId}`)
    console.log(`📊 Nome do arquivo: ${fileName}`)
    console.log('')
    
    // Gerar diferentes padrões AWS para testar
    const urlsParaTestar = [
      // Padrão 1: AWS com nome completo + prefixo fotos
      `https://gdg-images.s3.sa-east-1.amazonaws.com/fotos/${productId}/${fileName}`,
      
      // Padrão 2: AWS sem prefixo fotos
      `https://gdg-images.s3.sa-east-1.amazonaws.com/${productId}/${fileName}`,
      
      // Padrão 3: AWS com nome limpo + prefixo fotos
      `https://gdg-images.s3.sa-east-1.amazonaws.com/fotos/${productId}/${fileName.replace(/-\d{6}(\.\w+)$/, '-1$1')}`,
      
      // Padrão 4: AWS com nome limpo sem prefixo fotos
      `https://gdg-images.s3.sa-east-1.amazonaws.com/${productId}/${fileName.replace(/-\d{6}(\.\w+)$/, '-1$1')}`,
      
      // Padrão 5: Apenas ID como nome
      `https://gdg-images.s3.sa-east-1.amazonaws.com/fotos/${productId}/${productId}.jpg`,
      
      // Padrão 6: Sem fotos, apenas ID como nome
      `https://gdg-images.s3.sa-east-1.amazonaws.com/${productId}/${productId}.jpg`,
      
      // Padrão 7: Estrutura diferente
      `https://gdg-images.s3.sa-east-1.amazonaws.com/images/${productId}/${fileName}`,
      
      // Padrão 8: Com underscore
      `https://gdg-images.s3.sa-east-1.amazonaws.com/fotos/${productId}/${fileName.replace(/-/g, '_')}`
    ]
    
    console.log('🔍 TESTANDO URLs AWS (pode demorar alguns segundos)...\n')
    
    // Testar cada URL
    for (let i = 0; i < urlsParaTestar.length; i++) {
      const url = urlsParaTestar[i]
      console.log(`${i + 1}. Testando: ${url.substring(0, 80)}...`)
      
      const result = await testUrlExists(url)
      
      if (result.exists) {
        console.log(`   ✅ FUNCIONA! Status: ${result.status}`)
        console.log(`   🎯 URL CORRETA ENCONTRADA: ${url}`)
        
        // Salvar URL funcionando no banco
        await connector.connectNeon()
        const existingProduct = await connector.queryNeon(
          'SELECT id FROM products WHERE sku = $1',
          [product.productid.toString()]
        )
        
        if (existingProduct.rows.length > 0) {
          const productIdNeon = existingProduct.rows[0].id
          await connector.queryNeon('DELETE FROM product_images WHERE product_id = $1', [productIdNeon])
          await connector.queryNeon(`
            INSERT INTO product_images (
              product_id, url, alt_text, position, is_primary, created_at
            ) VALUES ($1, $2, $3, $4, $5, NOW())
          `, [productIdNeon, url, product.productname, 0, true])
          
          console.log(`   💾 URL salva no banco!`)
        }
        
        console.log('\n🎉 PADRÃO CORRETO IDENTIFICADO!')
        console.log(`📋 Use este padrão: Padrão ${i + 1}`)
        return url
        
      } else {
        console.log(`   ❌ Não funciona. Status: ${result.status}`)
      }
    }
    
    console.log('\n😔 Nenhum padrão AWS funcionou.')
    console.log('💡 Possibilidades:')
    console.log('   1. As imagens ainda estão na OVH')
    console.log('   2. O bucket AWS tem estrutura diferente')
    console.log('   3. As imagens têm nomes diferentes na AWS')
    console.log('   4. Problemas de permissão no bucket AWS')
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await connector.disconnect()
  }
}

testarPadroesAws() 