#!/usr/bin/env node

import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const INPUT_DIR = path.resolve(__dirname, '../downloads/images')
const OUTPUT_DIR = path.resolve(__dirname, '../downloads/images-optimized')
const BATCH_SIZE = 5  // Conversões simultâneas
const WEBP_QUALITY = 88 // Qualidade otimizada para compressão garantida
const PRESERVE_QUALITY = true // Usar configurações de alta qualidade

async function optimizeImagesToWebp() {
  const stats = {
    total: 0,
    converted: 0,
    skipped: 0,
    errors: 0,
    originalSize: 0,
    optimizedSize: 0,
    errorDetails: []
  }
  
  try {
    console.log('🎨 OTIMIZAÇÃO DE IMAGENS PARA WEBP\n')
    console.log(`📁 Pasta origem: ${INPUT_DIR}`)
    console.log(`📁 Pasta destino: ${OUTPUT_DIR}`)
    console.log(`⚡ Conversões simultâneas: ${BATCH_SIZE}`)
    console.log(`🎯 Qualidade WebP: ${WEBP_QUALITY}%\n`)
    
    // Verificar se pasta de origem existe
    if (!fs.existsSync(INPUT_DIR)) {
      console.log('❌ Pasta de origem não encontrada!')
      console.log(`   Execute primeiro: node scripts/download-images-from-aws.mjs`)
      return
    }
    
    // Criar pasta de destino
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true })
      console.log(`✅ Pasta criada: ${OUTPUT_DIR}\n`)
    }
    
    // Encontrar todas as imagens
    console.log('🔍 Escaneando imagens...')
    const imageFiles = await findAllImages(INPUT_DIR)
    stats.total = imageFiles.length
    
    console.log(`✅ Encontradas ${stats.total} imagens para otimizar\n`)
    
    if (stats.total === 0) {
      console.log('❌ Nenhuma imagem encontrada!')
      return
    }
    
    // Verificar dependência Sharp
    try {
      await sharp().metadata()
    } catch (error) {
      console.log('❌ Sharp não está instalado!')
      console.log('   Execute: npm install sharp')
      return
    }
    
    console.log('🚀 INICIANDO OTIMIZAÇÃO...\n')
    
    // Processar em lotes
    for (let i = 0; i < imageFiles.length; i += BATCH_SIZE) {
      const batch = imageFiles.slice(i, i + BATCH_SIZE)
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(imageFiles.length / BATCH_SIZE)
      
      console.log(`📦 LOTE ${batchNumber}/${totalBatches} - Imagens ${i + 1} a ${Math.min(i + BATCH_SIZE, imageFiles.length)}`)
      
      // Conversão simultânea do lote
      const promises = batch.map(filePath => optimizeSingleImage(filePath, stats))
      await Promise.allSettled(promises)
      
      // Progresso
      const progress = ((i + batch.length) / imageFiles.length * 100).toFixed(1)
      const compressionRate = stats.originalSize > 0 ? 
        ((stats.originalSize - stats.optimizedSize) / stats.originalSize * 100).toFixed(1) : 0
      
      console.log(`   📊 Progresso: ${progress}% | ✅ ${stats.converted} convertidas | ❌ ${stats.errors} erros`)
      console.log(`   💾 Original: ${formatBytes(stats.originalSize)} → Otimizado: ${formatBytes(stats.optimizedSize)} (${compressionRate}% menor)`)
      console.log('')
    }
    
    // Resumo final
    console.log('🔍 VERIFICANDO RESULTADO FINAL...\n')
    
    const optimizedFiles = await findAllImages(OUTPUT_DIR)
    const compressionRate = stats.originalSize > 0 ? 
      ((stats.originalSize - stats.optimizedSize) / stats.originalSize * 100).toFixed(1) : 0
    
    console.log('🎯 RESUMO DA OTIMIZAÇÃO:')
    console.log(`   📊 Total de imagens: ${stats.total}`)
    console.log(`   ✅ Convertidas para WebP: ${stats.converted}`)
    console.log(`   ⏭️  Arquivos pulados: ${stats.skipped}`)
    console.log(`   ❌ Erros: ${stats.errors}`)
    console.log(`   📁 Arquivos otimizados: ${optimizedFiles.length}`)
    console.log(`   💾 Tamanho original: ${formatBytes(stats.originalSize)}`)
    console.log(`   💾 Tamanho otimizado: ${formatBytes(stats.optimizedSize)}`)
    console.log(`   🎯 Compressão: ${compressionRate}% menor`)
    console.log(`   📂 Pasta: ${OUTPUT_DIR}`)
    
    if (stats.errors > 0) {
      console.log('\n❌ PRIMEIROS 10 ERROS:')
      stats.errorDetails.slice(0, 10).forEach((err, i) => {
        console.log(`   ${i + 1}. ${err.file}: ${err.error}`)
      })
    }
    
    const successRate = ((stats.converted / stats.total) * 100).toFixed(1)
    console.log(`\n🎉 OTIMIZAÇÃO CONCLUÍDA! Taxa de sucesso: ${successRate}%`)
    console.log(`💰 Economia de espaço: ${formatBytes(stats.originalSize - stats.optimizedSize)}`)
    
  } catch (error) {
    console.error('❌ Erro na otimização:', error.message)
    throw error
  }
}

async function findAllImages(dir) {
  const imageFiles = []
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp']
  
  function scanDirectory(currentDir) {
    const items = fs.readdirSync(currentDir)
    
    for (const item of items) {
      const itemPath = path.join(currentDir, item)
      const stat = fs.statSync(itemPath)
      
      if (stat.isDirectory()) {
        scanDirectory(itemPath)
      } else if (stat.isFile()) {
        const ext = path.extname(itemPath).toLowerCase()
        if (imageExtensions.includes(ext)) {
          imageFiles.push(itemPath)
        }
      }
    }
  }
  
  scanDirectory(dir)
  return imageFiles
}

async function optimizeSingleImage(inputPath, stats) {
  try {
    // Calcular path de saída
    const relativePath = path.relative(INPUT_DIR, inputPath)
    const outputPath = path.join(OUTPUT_DIR, relativePath)
    const outputDir = path.dirname(outputPath)
    const fileName = path.basename(outputPath, path.extname(outputPath))
    const webpOutputPath = path.join(outputDir, `${fileName}.webp`)
    
    // Criar diretório de saída se não existir
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }
    
    // Verificar se já foi convertido
    if (fs.existsSync(webpOutputPath)) {
      stats.skipped++
      return { success: true, skipped: true }
    }
    
    // Obter tamanho original
    const originalSize = fs.statSync(inputPath).size
    stats.originalSize += originalSize
    
    // Converter para WebP - configurações otimizadas e testadas
    const webpOptions = PRESERVE_QUALITY ? {
      quality: WEBP_QUALITY,
      effort: 6, // Máximo esforço para melhor resultado
      lossless: false,
      preset: 'photo', // Otimizado para fotos
      method: 6 // Método de compressão mais eficiente
    } : {
      quality: WEBP_QUALITY,
      effort: 4,
      lossless: false
    }
    
    await sharp(inputPath)
      .webp(webpOptions)
      .toFile(webpOutputPath)
    
    // Obter tamanho otimizado
    const optimizedSize = fs.statSync(webpOutputPath).size
    stats.optimizedSize += optimizedSize
    stats.converted++
    
    const compression = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1)
    
    return { 
      success: true, 
      originalSize, 
      optimizedSize, 
      compression: `${compression}%` 
    }
    
  } catch (error) {
    stats.errors++
    stats.errorDetails.push({
      file: inputPath,
      error: error.message
    })
    
    return { success: false, error: error.message }
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Executar
console.log('⚠️  ATENÇÃO: Esta operação vai converter todas as imagens para WebP!')
console.log('⚠️  Certifique-se de ter executado o download primeiro!')
console.log('⚠️  Aguarde 3 segundos para cancelar se necessário...\n')

setTimeout(() => {
  optimizeImagesToWebp()
    .then(() => {
      console.log('\n🚀 OTIMIZAÇÃO FINALIZADA COM SUCESSO!')
      process.exit(0)
    })
    .catch(error => {
      console.error('\n💥 OTIMIZAÇÃO FALHOU:', error)
      process.exit(1)
    })
}, 3000) 