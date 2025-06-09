#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'
import https from 'https'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Carregar configurações
dotenv.config({ path: path.resolve(__dirname, '../.env.develop') })
dotenv.config({ path: path.resolve(__dirname, '../.env') })

const DOWNLOAD_DIR = path.resolve(__dirname, '../downloads/images')
const BATCH_SIZE = 10 // Downloads simultâneos
const DELAY_MS = 200   // Delay entre lotes

async function downloadImagesFromAws() {
  const connector = new DatabaseConnector({ forceConnection: true })
  
  const stats = {
    total: 0,
    downloaded: 0,
    skipped: 0,
    errors: 0,
    totalSize: 0,
    errorDetails: []
  }
  
  try {
    console.log('📥 DOWNLOAD DE IMAGENS DA AWS\n')
    console.log(`📁 Pasta de destino: ${DOWNLOAD_DIR}`)
    console.log(`⚡ Downloads simultâneos: ${BATCH_SIZE}`)
    console.log(`📊 Estimativa: ~7.361 imagens (~2-5GB)\n`)
    
    // Criar diretório se não existir
    if (!fs.existsSync(DOWNLOAD_DIR)) {
      fs.mkdirSync(DOWNLOAD_DIR, { recursive: true })
      console.log(`✅ Pasta criada: ${DOWNLOAD_DIR}\n`)
    }
    
    // Conectar ao banco
    await connector.connectNeon()
    console.log('🔌 Conectado ao banco Neon\n')
    
    // Buscar todas as imagens
    console.log('🔍 Buscando URLs das imagens...')
    const result = await connector.queryNeon(`
      SELECT 
        pi.id,
        pi.url,
        pi.position,
        pi.is_primary,
        p.sku,
        p.name as product_name
      FROM product_images pi
      JOIN products p ON p.id = pi.product_id
      WHERE p.attributes->>'imported_from' = 'mongodb'
        AND pi.url LIKE '%gdg-images.s3.sa-east-1.amazonaws.com%'
      ORDER BY p.sku, pi.position
    `)
    
    const images = result.rows
    stats.total = images.length
    
    console.log(`✅ Encontradas ${stats.total} imagens para download\n`)
    
    if (stats.total === 0) {
      console.log('❌ Nenhuma imagem encontrada!')
      return
    }
    
    // Verificar espaço em disco
    const freeSpace = await getAvailableSpace(DOWNLOAD_DIR)
    console.log(`💾 Espaço disponível: ${formatBytes(freeSpace)}`)
    console.log(`📊 Espaço estimado necessário: ~3GB\n`)
    
    if (freeSpace < 3 * 1024 * 1024 * 1024) { // 3GB
      console.log('⚠️  AVISO: Pouco espaço em disco disponível!')
      console.log('⚠️  Aguarde 5 segundos para cancelar...\n')
      await new Promise(resolve => setTimeout(resolve, 5000))
    }
    
    console.log('🚀 INICIANDO DOWNLOADS...\n')
    
    // Processar em lotes
    for (let i = 0; i < images.length; i += BATCH_SIZE) {
      const batch = images.slice(i, i + BATCH_SIZE)
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(images.length / BATCH_SIZE)
      
      console.log(`📦 LOTE ${batchNumber}/${totalBatches} - Imagens ${i + 1} a ${Math.min(i + BATCH_SIZE, images.length)}`)
      
      // Download simultâneo do lote
      const promises = batch.map(image => downloadSingleImage(image, stats))
      await Promise.allSettled(promises)
      
      // Progresso
      const progress = ((i + batch.length) / images.length * 100).toFixed(1)
      console.log(`   📊 Progresso: ${progress}% | ✅ ${stats.downloaded} baixadas | ❌ ${stats.errors} erros | 📁 ${formatBytes(stats.totalSize)}`)
      
      // Delay entre lotes
      if (i + BATCH_SIZE < images.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS))
      }
      
      console.log('')
    }
    
    // Resumo final
    console.log('🔍 VERIFICANDO RESULTADO FINAL...\n')
    
    const downloadedFiles = fs.readdirSync(DOWNLOAD_DIR, { recursive: true })
      .filter(file => fs.statSync(path.join(DOWNLOAD_DIR, file)).isFile())
    
    console.log('🎯 RESUMO DO DOWNLOAD:')
    console.log(`   📊 Total de imagens: ${stats.total}`)
    console.log(`   ✅ Baixadas com sucesso: ${stats.downloaded}`)
    console.log(`   ⏭️  Arquivos já existiam: ${stats.skipped}`)
    console.log(`   ❌ Erros: ${stats.errors}`)
    console.log(`   📁 Arquivos salvos: ${downloadedFiles.length}`)
    console.log(`   💾 Tamanho total: ${formatBytes(stats.totalSize)}`)
    console.log(`   📂 Pasta: ${DOWNLOAD_DIR}`)
    
    if (stats.errors > 0) {
      console.log('\n❌ PRIMEIROS 10 ERROS:')
      stats.errorDetails.slice(0, 10).forEach((err, i) => {
        console.log(`   ${i + 1}. ${err.url}: ${err.error}`)
      })
    }
    
    const successRate = ((stats.downloaded / stats.total) * 100).toFixed(1)
    console.log(`\n🎉 DOWNLOAD CONCLUÍDO! Taxa de sucesso: ${successRate}%`)
    
  } catch (error) {
    console.error('❌ Erro no download:', error.message)
    throw error
  } finally {
    await connector.disconnect()
  }
}

async function downloadSingleImage(imageData, stats) {
  const { id, url, sku, product_name, position } = imageData
  
  try {
    // Extrair nome do arquivo da URL
    const urlPath = new URL(url).pathname
    const fileName = path.basename(urlPath)
    const fileExt = path.extname(fileName)
    
    // Criar pasta por produto
    const productDir = path.join(DOWNLOAD_DIR, sanitizeFileName(sku))
    if (!fs.existsSync(productDir)) {
      fs.mkdirSync(productDir, { recursive: true })
    }
    
    // Nome do arquivo local
    const localFileName = `${position}-${sanitizeFileName(fileName)}`
    const localPath = path.join(productDir, localFileName)
    
    // Verificar se já existe
    if (fs.existsSync(localPath)) {
      stats.skipped++
      return { success: true, skipped: true }
    }
    
    // Download
    const fileSize = await downloadFile(url, localPath)
    
    stats.downloaded++
    stats.totalSize += fileSize
    
    return { success: true, size: fileSize }
    
  } catch (error) {
    stats.errors++
    stats.errorDetails.push({
      url: url,
      sku: sku,
      error: error.message
    })
    
    return { success: false, error: error.message }
  }
}

function downloadFile(url, localPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(localPath)
    let totalSize = 0
    
    const request = https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`))
        return
      }
      
      response.pipe(file)
      
      response.on('data', (chunk) => {
        totalSize += chunk.length
      })
      
      file.on('finish', () => {
        file.close()
        resolve(totalSize)
      })
      
      file.on('error', (err) => {
        fs.unlink(localPath, () => {}) // Remover arquivo incompleto
        reject(err)
      })
    })
    
    request.on('error', (err) => {
      reject(err)
    })
    
    request.setTimeout(30000, () => {
      request.destroy()
      reject(new Error('Timeout na requisição'))
    })
  })
}

function sanitizeFileName(fileName) {
  return fileName.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '-')
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

async function getAvailableSpace(dirPath) {
  try {
    const stats = fs.statSync(dirPath)
    return stats.size || 10 * 1024 * 1024 * 1024 // 10GB default
  } catch {
    return 10 * 1024 * 1024 * 1024 // 10GB default
  }
}

// Executar
console.log('⚠️  ATENÇÃO: Esta operação vai baixar ~7.361 imagens (~2-5GB)!')
console.log('⚠️  Certifique-se de ter espaço suficiente em disco!')
console.log('⚠️  Aguarde 5 segundos para cancelar se necessário...\n')

setTimeout(() => {
  downloadImagesFromAws()
    .then(() => {
      console.log('\n🚀 DOWNLOAD FINALIZADO COM SUCESSO!')
      process.exit(0)
    })
    .catch(error => {
      console.error('\n💥 DOWNLOAD FALHOU:', error)
      process.exit(1)
    })
}, 5000) 