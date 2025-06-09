#!/usr/bin/env node

import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

async function testWebpConversion() {
  try {
    console.log('🧪 TESTE DE CONVERSÃO WEBP\n')
    
    // Encontrar a primeira imagem JPG
    const inputDir = './downloads/images'
    
    function findFirstImage(dir) {
      const items = fs.readdirSync(dir)
      
      for (const item of items) {
        const itemPath = path.join(dir, item)
        const stat = fs.statSync(itemPath)
        
        if (stat.isDirectory()) {
          const result = findFirstImage(itemPath)
          if (result) return result
        } else if (stat.isFile() && itemPath.toLowerCase().endsWith('.jpg')) {
          return itemPath
        }
      }
      return null
    }
    
    const firstImage = findFirstImage(inputDir)
    
    if (!firstImage) {
      console.log('❌ Nenhuma imagem JPG encontrada!')
      return
    }
    
    console.log(`📸 Testando com: ${firstImage}`)
    
    // Criar pasta de teste
    const testDir = './downloads/test-webp'
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true })
    }
    
    // Nome do arquivo de saída
    const outputFile = path.join(testDir, 'teste.webp')
    
    // Obter tamanho original
    const originalSize = fs.statSync(firstImage).size
    console.log(`💾 Tamanho original: ${(originalSize / 1024).toFixed(2)} KB`)
    
    // Conversão
    console.log('🔄 Convertendo...')
    
    await sharp(firstImage)
      .webp({ 
        quality: 88,
        effort: 6,
        lossless: false,
        nearLossless: false,
        smartSubsample: true,
        preset: 'photo',
        method: 6
      })
      .toFile(outputFile)
    
    // Verificar resultado
    const webpSize = fs.statSync(outputFile).size
    const reduction = ((originalSize - webpSize) / originalSize * 100).toFixed(1)
    
    console.log(`✅ Conversão bem-sucedida!`)
    console.log(`💾 Tamanho WebP: ${(webpSize / 1024).toFixed(2)} KB`)
    console.log(`📉 Redução: ${reduction}%`)
    console.log(`📁 Arquivo salvo: ${outputFile}`)
    
  } catch (error) {
    console.error('❌ Erro na conversão:', error.message)
  }
}

testWebpConversion() 