#!/usr/bin/env node

import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const INPUT_DIR = path.resolve(__dirname, '../downloads/images')
const OUTPUT_DIR = path.resolve(__dirname, '../downloads/images-optimized')

async function debugWebpConversion() {
  try {
    console.log('🔍 DEBUG CONVERSÃO WEBP\n')
    
    // Listar primeiras 5 imagens para teste
    console.log('📂 Buscando primeiras 5 imagens...')
    
    const imageFiles = []
    const subDirs = fs.readdirSync(INPUT_DIR).slice(0, 2) // Apenas 2 primeiras pastas
    
    for (const subDir of subDirs) {
      const subDirPath = path.join(INPUT_DIR, subDir)
      const files = fs.readdirSync(subDirPath)
        .filter(f => f.toLowerCase().endsWith('.jpg'))
        .slice(0, 2) // Apenas 2 imagens por pasta
      
      for (const file of files) {
        imageFiles.push(path.join(subDirPath, file))
      }
    }
    
    console.log(`✅ Encontradas ${imageFiles.length} imagens para teste`)
    
    // Processar cada imagem individualmente
    for (let i = 0; i < imageFiles.length; i++) {
      const inputPath = imageFiles[i]
      console.log(`\n📦 [${i+1}/${imageFiles.length}] Processando: ${path.basename(inputPath)}`)
      
      try {
        // Criar path de saída
        const relativePath = path.relative(INPUT_DIR, inputPath)
        const outputPath = path.join(OUTPUT_DIR, relativePath)
        const outputDir = path.dirname(outputPath)
        const fileName = path.basename(outputPath, path.extname(outputPath))
        const webpOutputPath = path.join(outputDir, `${fileName}.webp`)
        
        console.log(`   📁 Criando diretório: ${outputDir}`)
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true })
        }
        
        console.log(`   📸 Convertendo para: ${path.basename(webpOutputPath)}`)
        
        // Conversão
        await sharp(inputPath)
          .webp({ 
            quality: 88,
            effort: 6,
            lossless: false,
            preset: 'photo',
            method: 6
          })
          .toFile(webpOutputPath)
        
        // Verificar resultado
        const originalSize = fs.statSync(inputPath).size
        const webpSize = fs.statSync(webpOutputPath).size
        const reduction = ((originalSize - webpSize) / originalSize * 100).toFixed(1)
        
        console.log(`   ✅ Sucesso! ${(originalSize/1024).toFixed(1)}KB → ${(webpSize/1024).toFixed(1)}KB (${reduction}% redução)`)
        
      } catch (error) {
        console.log(`   ❌ Erro: ${error.message}`)
      }
    }
    
    console.log('\n🎉 Debug concluído!')
    
  } catch (error) {
    console.error('❌ Erro no debug:', error.message)
    console.error(error.stack)
  }
}

debugWebpConversion() 