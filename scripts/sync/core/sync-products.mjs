#!/usr/bin/env node

import { DatabaseConnector } from '../utils/db-connector.mjs'
import { Logger } from '../utils/logger.mjs'
import { DataMapper } from '../utils/data-mapper.mjs'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Carregar configurações
dotenv.config({ path: path.resolve(__dirname, '../../../.env.develop') })
dotenv.config()

/**
 * Sincronizar produtos do MongoDB para Neon
 */
export async function syncProducts(options = {}) {
  const logger = new Logger('sync-products')
  const mapper = new DataMapper(options)
  const connector = new DatabaseConnector(options)
  
  const stats = {
    total: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    errorDetails: []
  }
  
  try {
    // Iniciar sincronização
    await logger.syncStart('products', options)
    
    // Conectar aos bancos
    await logger.info('🔌 Conectando aos bancos de dados...')
    await connector.connectMongo()
    await connector.connectNeon()
    
    // Verificar saúde das conexões
    const health = await connector.healthCheck()
    if (!health.mongo || !health.neon) {
      throw new Error('Falha na verificação de saúde das conexões')
    }
    
    // Obter coleção de produtos
    const db = connector.getMongoDb()
    const collection = db.collection('m_product_typesense')
    
    // Contar total de produtos
    const totalCount = await collection.countDocuments()
    await logger.info(`📊 Total de produtos no MongoDB: ${totalCount}`)
    
    if (totalCount === 0) {
      await logger.warn('Nenhum produto encontrado no MongoDB')
      return stats
    }
    
    // Configurações de processamento
    const batchSize = options.batchSize || parseInt(process.env.SYNC_BATCH_SIZE) || 1000
    const delayMs = options.delayMs || parseInt(process.env.SYNC_DELAY_MS) || 100
    const dryRun = options.dryRun || false
    
    if (dryRun) {
      await logger.warn('🚧 Modo DRY RUN ativado - nenhuma alteração será feita')
    }
    
    // Processar em lotes
    let skip = 0
    let batchNumber = 1
    
    while (skip < totalCount) {
      const batch = await collection
        .find({})
        .skip(skip)
        .limit(batchSize)
        .toArray()
      
      await logger.info(`🔄 Processando lote ${batchNumber} (${batch.length} produtos)`)
      
      for (const mongoProduct of batch) {
        try {
          // Mapear produto
          const neonProduct = mapper.mapProduct(mongoProduct)
          
          if (!neonProduct.sku) {
            throw new Error('SKU não pode ser vazio')
          }
          
          // Verificar se produto existe no Neon
          const existingResult = await connector.queryNeon(
            'SELECT id, updated_at, metadata FROM products WHERE sku = $1',
            [neonProduct.sku]
          )
          
          if (existingResult.rows.length > 0) {
            const existing = existingResult.rows[0]
            
            // Verificar se precisa atualizar
            if (shouldUpdate(existing, mongoProduct, options)) {
              if (!dryRun) {
                await updateProduct(connector, existing.id, neonProduct)
              }
              stats.updated++
              await logger.debug(`✏️  Atualizado: ${neonProduct.name} (SKU: ${neonProduct.sku})`)
            } else {
              stats.skipped++
              await logger.debug(`⏭️  Pulado: ${neonProduct.name} (SKU: ${neonProduct.sku})`)
            }
          } else {
            // Criar novo produto
            if (!dryRun) {
              await createProduct(connector, neonProduct)
            }
            stats.created++
            await logger.debug(`➕ Criado: ${neonProduct.name} (SKU: ${neonProduct.sku})`)
          }
          
          stats.total++
          
          // Atualizar progresso a cada 100 produtos
          if (stats.total % 100 === 0) {
            await logger.syncProgress('products', stats.total, totalCount, {
              created: stats.created,
              updated: stats.updated,
              skipped: stats.skipped,
              errors: stats.errors
            })
          }
          
        } catch (error) {
          stats.errors++
          stats.errorDetails.push({
            product: mongoProduct.name || mongoProduct._id,
            error: error.message
          })
          await logger.error(`❌ Erro ao processar produto: ${error.message}`, {
            product: mongoProduct.name,
            productId: mongoProduct._id,
            error
          })
          
          // Continuar com próximo produto
          continue
        }
      }
      
      // Próximo lote
      skip += batchSize
      batchNumber++
      
      // Delay entre lotes
      if (skip < totalCount && delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    }
    
    // Finalizar sincronização
    await logger.syncComplete('products', stats)
    
    // Mostrar resumo
    await logger.info('📊 Resumo da sincronização:')
    await logger.info(`   ✅ Criados: ${stats.created}`)
    await logger.info(`   ✏️  Atualizados: ${stats.updated}`)
    await logger.info(`   ⏭️  Pulados: ${stats.skipped}`)
    await logger.info(`   ❌ Erros: ${stats.errors}`)
    await logger.info(`   📦 Total processado: ${stats.total}`)
    
    if (stats.errors > 0) {
      await logger.warn(`⚠️  ${stats.errors} produtos com erro. Verifique os logs para detalhes.`)
    }
    
    return stats
    
  } catch (error) {
    await logger.syncError('products', error)
    throw error
  } finally {
    // Garantir que o logger faz flush
    await logger.flush()
    
    // Desconectar
    await connector.disconnect()
  }
}

/**
 * Verificar se produto deve ser atualizado
 */
function shouldUpdate(existing, mongoProduct, options) {
  // Se forçar atualização
  if (options.force) return true
  
  // Se não tem metadata de sincronização
  if (!existing.metadata?.imported_from) return true
  
  // Verificar por timestamp de atualização do MongoDB
  if (mongoProduct.updatedAt || mongoProduct.updated) {
    const mongoUpdated = new Date(mongoProduct.updatedAt || mongoProduct.updated)
    const neonUpdated = new Date(existing.updated_at)
    
    return mongoUpdated > neonUpdated
  }
  
  // Por padrão, não atualizar
  return false
}

/**
 * Criar produto no Neon
 */
async function createProduct(connector, product) {
  // Primeiro, criar na tabela principal
  const result = await connector.queryNeon(`
    INSERT INTO products (
      sku, barcode, name, slug, description, short_description,
      price, compare_at_price, cost,
      quantity, track_inventory, allow_backorder,
      weight, width, height, length,
      is_active, is_featured,
      meta_title, meta_description, meta_keywords,
      category_id, brand, video_url,
      tags, metadata,
      created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9,
      $10, $11, $12,
      $13, $14, $15, $16,
      $17, $18,
      $19, $20, $21,
      $22, $23, $24,
      $25, $26,
      NOW(), NOW()
    ) RETURNING id
  `, [
    product.sku, product.barcode, product.name, product.slug, 
    product.description, product.short_description,
    product.price, product.compare_at_price, product.cost,
    product.quantity, product.track_inventory, product.allow_backorder,
    product.weight, product.width, product.height, product.length,
    product.is_active, product.is_featured,
    product.meta_title, product.meta_description, product.meta_keywords,
    product.category_id, product.brand, product.video_url,
    JSON.stringify(product.tags), JSON.stringify(product.metadata)
  ])
  
  const productId = result.rows[0].id
  
  // Inserir imagens
  if (product.images && product.images.length > 0) {
    for (let i = 0; i < product.images.length; i++) {
      const img = product.images[i]
      await connector.queryNeon(`
        INSERT INTO product_images (
          product_id, url, alt, position, is_primary
        ) VALUES ($1, $2, $3, $4, $5)
      `, [productId, img.url, img.alt, i, img.is_primary || false])
    }
  }
  
  return productId
}

/**
 * Atualizar produto no Neon
 */
async function updateProduct(connector, productId, product) {
  // Atualizar produto principal
  await connector.queryNeon(`
    UPDATE products SET
      barcode = $2,
      name = $3,
      slug = $4,
      description = $5,
      short_description = $6,
      price = $7,
      compare_at_price = $8,
      cost = $9,
      quantity = $10,
      track_inventory = $11,
      allow_backorder = $12,
      weight = $13,
      width = $14,
      height = $15,
      length = $16,
      is_active = $17,
      is_featured = $18,
      meta_title = $19,
      meta_description = $20,
      meta_keywords = $21,
      brand = $22,
      video_url = $23,
      tags = $24,
      metadata = metadata || $25,
      updated_at = NOW()
    WHERE id = $1
  `, [
    productId,
    product.barcode, product.name, product.slug,
    product.description, product.short_description,
    product.price, product.compare_at_price, product.cost,
    product.quantity, product.track_inventory, product.allow_backorder,
    product.weight, product.width, product.height, product.length,
    product.is_active, product.is_featured,
    product.meta_title, product.meta_description, product.meta_keywords,
    product.brand, product.video_url,
    JSON.stringify(product.tags), JSON.stringify(product.metadata)
  ])
  
  // Atualizar imagens (remover antigas e inserir novas)
  await connector.queryNeon('DELETE FROM product_images WHERE product_id = $1', [productId])
  
  if (product.images && product.images.length > 0) {
    for (let i = 0; i < product.images.length; i++) {
      const img = product.images[i]
      await connector.queryNeon(`
        INSERT INTO product_images (
          product_id, url, alt, position, is_primary
        ) VALUES ($1, $2, $3, $4, $5)
      `, [productId, img.url, img.alt, i, img.is_primary || false])
    }
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const options = {
    dryRun: process.argv.includes('--dry-run'),
    force: process.argv.includes('--force'),
    batchSize: process.argv.includes('--batch-size') ? 
      parseInt(process.argv[process.argv.indexOf('--batch-size') + 1]) : undefined,
    limit: process.argv.includes('--limit') ? 
      parseInt(process.argv[process.argv.indexOf('--limit') + 1]) : undefined
  }
  
  console.log('🚀 Iniciando sincronização de produtos...\n')
  console.log('Opções:', options)
  console.log('')
  
  try {
    const stats = await syncProducts(options)
    console.log('\n✅ Sincronização concluída!')
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Erro na sincronização:', error)
    process.exit(1)
  }
} 