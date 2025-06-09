#!/usr/bin/env node

import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const INPUT_DIR = path.resolve(__dirname, '../downloads/images')
const OUTPUT_DIR = path.resolve(__dirname, '../downloads/images-optimized')

async function convertAllWebpSimple() {
  const stats = {
    total: 0,
    converted: 0,
    skipped: 0,
    errors: 0,
    originalSize: 0,
    optimizedSize: 0
  }
  
  try {
    console.log('🎨 CONVERSÃO WEBP SIMPLIFICADA\n')
    console.log(`📁 Origem: ${INPUT_DIR}`)
    console.log(`📁 Destino: ${OUTPUT_DIR}`)
    console.log(`🎯 Qualidade: 88% | Redução esperada: 5-20%\n`)
    
    // Garantir pasta de destino
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true })
      console.log(`✅ Pasta criada: ${OUTPUT_DIR}\n`)
    }
    
    // Escanear todas as pastas de produtos
    console.log('📂 Escaneando pastas de produtos...')
    const productDirs = fs.readdirSync(INPUT_DIR)
      .filter(item => {
        const itemPath = path.join(INPUT_DIR, item)
        return fs.statSync(itemPath).isDirectory()
      })
    
    console.log(`✅ Encontradas ${productDirs.length} pastas de produtos\n`)
    
    // Processar cada pasta de produto
    for (let i = 0; i < productDirs.length; i++) {
      const productDir = productDirs[i]
      const inputProductPath = path.join(INPUT_DIR, productDir)
      const outputProductPath = path.join(OUTPUT_DIR, productDir)
      
      console.log(`📦 [${i + 1}/${productDirs.length}] Processando pasta: ${productDir}`)
      
      // Criar pasta de destino
      if (!fs.existsSync(outputProductPath)) {
        fs.mkdirSync(outputProductPath, { recursive: true })
      }
      
      // Buscar imagens JPG na pasta
      const jpgFiles = fs.readdirSync(inputProductPath)
        .filter(file => file.toLowerCase().endsWith('.jpg') || file.toLowerCase().endsWith('.jpeg'))
      
      if (jpgFiles.length === 0) {
        console.log(`   ⏭️  Nenhuma imagem JPG encontrada`)
        continue
      }
      
      let productConverted = 0
      let productSkipped = 0
      let productErrors = 0
      
      // Processar cada imagem da pasta
      for (const jpgFile of jpgFiles) {
        const inputImagePath = path.join(inputProductPath, jpgFile)
        const fileName = path.basename(jpgFile, path.extname(jpgFile))
        const outputImagePath = path.join(outputProductPath, `${fileName}.webp`)
        
        try {
          // Verificar se já existe
          if (fs.existsSync(outputImagePath)) {
            stats.skipped++
            productSkipped++
            continue
          }
          
          // Obter tamanho original
          const originalSize = fs.statSync(inputImagePath).size
          stats.originalSize += originalSize
          
          // Converter
          await sharp(inputImagePath)
            .webp({ 
              quality: 88,
              effort: 6,
              lossless: false,
              preset: 'photo',
              method: 6
            })
            .toFile(outputImagePath)
          
          // Verificar resultado
          const webpSize = fs.statSync(outputImagePath).size
          stats.optimizedSize += webpSize
          stats.converted++
          productConverted++
          stats.total++
          
        } catch (error) {
          stats.errors++
          productErrors++
          console.log(`     ❌ Erro em ${jpgFile}: ${error.message}`)
        }
      }
      
      // Log do progresso da pasta
      const folderProgress = ((i + 1) / productDirs.length * 100).toFixed(1)
      console.log(`   📊 ${productConverted} convertidas | ${productSkipped} puladas | ${productErrors} erros`)
      console.log(`   📈 Progresso: ${folderProgress}% (${i + 1}/${productDirs.length} pastas)`)
      
      // Mostrar estatísticas acumuladas a cada 100 pastas
      if ((i + 1) % 100 === 0 || i === productDirs.length - 1) {
        const compressionRate = stats.originalSize > 0 ? 
          ((stats.originalSize - stats.optimizedSize) / stats.originalSize * 100).toFixed(1) : 0
        
        console.log(`\n   💾 Total: ${stats.converted} convertidas | ${formatBytes(stats.originalSize)} → ${formatBytes(stats.optimizedSize)} (${compressionRate}% menor)\n`)
      }
    }
    
    // Resumo final
    console.log('\n🎯 RESUMO FINAL:')
    const compressionRate = stats.originalSize > 0 ? 
      ((stats.originalSize - stats.optimizedSize) / stats.originalSize * 100).toFixed(1) : 0
    
    console.log(`   📊 Imagens convertidas: ${stats.converted}`)
    console.log(`   ⏭️  Imagens puladas: ${stats.skipped}`)
    console.log(`   ❌ Erros: ${stats.errors}`)
    console.log(`   💾 Tamanho original: ${formatBytes(stats.originalSize)}`)
    console.log(`   💾 Tamanho otimizado: ${formatBytes(stats.optimizedSize)}`)
    console.log(`   🎯 Compressão: ${compressionRate}% menor`)
    console.log(`   💰 Economia: ${formatBytes(stats.originalSize - stats.optimizedSize)}`)
    
    const successRate = stats.total > 0 ? ((stats.converted / stats.total) * 100).toFixed(1) : 0
    console.log(`\n🎉 CONVERSÃO CONCLUÍDA! Taxa de sucesso: ${successRate}%`)
    
  } catch (error) {
    console.error('❌ Erro na conversão:', error.message)
    throw error
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

console.log('🚀 INICIANDO CONVERSÃO WEBP SIMPLIFICADA...\n')

convertAllWebpSimple()
  .then(() => {
    console.log('\n✅ CONVERSÃO FINALIZADA!')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n💥 CONVERSÃO FALHOU:', error)
    process.exit(1)
  }) 