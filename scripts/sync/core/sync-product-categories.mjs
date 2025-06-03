#!/usr/bin/env node

import { DatabaseConnector } from '../utils/db-connector.mjs'
import { Logger } from '../utils/logger.mjs'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Carregar configurações
dotenv.config({ path: path.resolve(__dirname, '../../../.env.develop') })
dotenv.config()

/**
 * Sincronizar relações produto-categoria do MongoDB para Neon
 */
export async function syncProductCategories(options = {}) {
  const logger = new Logger('sync-product-categories')
  const connector = new DatabaseConnector({ ...options, forceConnection: true })
  
  const stats = {
    total: 0,
    created: 0,
    skipped: 0,
    errors: 0,
    productsWithoutCategory: 0,
    categoryMapping: new Map()
  }
  
  try {
    await logger.info('🚀 Iniciando sincronização de relações produto-categoria...')
    
    // Conectar aos bancos
    await connector.connectMongo()
    await connector.connectNeon()
    
    const mongoDb = connector.getMongoDb()
    const mongoCollection = mongoDb.collection('m_product_typesense')
    
    // Primeiro, criar mapeamento de categorias MongoDB -> Neon
    await logger.info('📊 Carregando categorias do Neon...')
    const neonCategories = await connector.queryNeon('SELECT id, name, slug FROM categories')
    
    // Criar mapa por nome (já que o ID do MongoDB é diferente)
    const categoryByName = new Map()
    for (const cat of neonCategories.rows) {
      categoryByName.set(cat.name.toLowerCase(), cat.id)
    }
    
    await logger.info(`✅ ${neonCategories.rows.length} categorias carregadas do Neon`)
    
    // Buscar produtos com categorias no MongoDB
    const totalProducts = await mongoCollection.countDocuments()
    await logger.info(`📦 Total de produtos no MongoDB: ${totalProducts}`)
    
    // Limpar relações existentes se solicitado
    if (options.clearExisting) {
      await logger.warn('🧹 Limpando relações existentes...')
      await connector.queryNeon('TRUNCATE TABLE product_categories')
    }
    
    // Processar produtos em lotes
    const batchSize = options.batchSize || 100
    let skip = 0
    
    while (skip < totalProducts) {
      const products = await mongoCollection
        .find({ categories: { $exists: true, $ne: [] } })
        .skip(skip)
        .limit(batchSize)
        .toArray()
      
      await logger.info(`🔄 Processando lote: ${skip + 1} a ${skip + products.length}`)
      
      for (const mongoProduct of products) {
        try {
          // Buscar produto no Neon pelo SKU
          const neonProductResult = await connector.queryNeon(
            'SELECT id FROM products WHERE sku = $1',
            [mongoProduct.productid?.toString()]
          )
          
          if (neonProductResult.rows.length === 0) {
            continue // Produto não migrado ainda
          }
          
          const productId = neonProductResult.rows[0].id
          
          // Processar categorias do produto
          if (mongoProduct.categories && Array.isArray(mongoProduct.categories)) {
            for (const mongoCategory of mongoProduct.categories) {
              const categoryName = mongoCategory.name?.toLowerCase()
              
              if (!categoryName) continue
              
              // Buscar categoria no Neon
              let neonCategoryId = categoryByName.get(categoryName)
              
              // Se não encontrou, tentar criar
              if (!neonCategoryId) {
                await logger.warn(`⚠️  Categoria não encontrada: "${mongoCategory.name}"`)
                
                // Criar categoria se não existir
                const slug = categoryName
                  .normalize('NFD')
                  .replace(/[\u0300-\u036f]/g, '')
                  .replace(/[^\w\s-]/g, '')
                  .replace(/\s+/g, '-')
                  .replace(/-+/g, '-')
                  .trim()
                
                const createResult = await connector.queryNeon(
                  `INSERT INTO categories (name, slug, created_at, updated_at) 
                   VALUES ($1, $2, NOW(), NOW()) 
                   ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
                   RETURNING id`,
                  [mongoCategory.name, slug]
                )
                
                neonCategoryId = createResult.rows[0].id
                categoryByName.set(categoryName, neonCategoryId)
                await logger.info(`✅ Categoria criada: ${mongoCategory.name}`)
              }
              
              // Criar relação produto-categoria
              try {
                await connector.queryNeon(
                  `INSERT INTO product_categories (product_id, category_id, created_at) 
                   VALUES ($1, $2, NOW()) 
                   ON CONFLICT (product_id, category_id) DO NOTHING`,
                  [productId, neonCategoryId]
                )
                stats.created++
              } catch (error) {
                if (!error.message.includes('duplicate key')) {
                  throw error
                }
                stats.skipped++
              }
            }
          } else {
            stats.productsWithoutCategory++
          }
          
          stats.total++
          
        } catch (error) {
          stats.errors++
          await logger.error(`❌ Erro ao processar produto ${mongoProduct.productid}: ${error.message}`)
        }
      }
      
      skip += batchSize
      
      // Mostrar progresso
      if (stats.total % 500 === 0) {
        await logger.info(`📊 Progresso: ${stats.total}/${totalProducts} produtos processados`)
      }
    }
    
    // Estatísticas finais
    await logger.info('\n📊 RESUMO DA SINCRONIZAÇÃO:')
    await logger.info(`✅ Relações criadas: ${stats.created}`)
    await logger.info(`⏭️  Relações já existentes: ${stats.skipped}`)
    await logger.info(`⚠️  Produtos sem categoria: ${stats.productsWithoutCategory}`)
    await logger.info(`❌ Erros: ${stats.errors}`)
    await logger.info(`📦 Total processado: ${stats.total}`)
    
    // Verificar resultado
    const finalCount = await connector.queryNeon('SELECT COUNT(*) as count FROM product_categories')
    await logger.info(`\n✅ Total de relações produto-categoria no Neon: ${finalCount.rows[0].count}`)
    
    // Produtos órfãos
    const orphans = await connector.queryNeon(`
      SELECT COUNT(*) as count 
      FROM products p 
      LEFT JOIN product_categories pc ON p.id = pc.product_id 
      WHERE pc.product_id IS NULL
    `)
    
    if (orphans.rows[0].count > 0) {
      await logger.warn(`⚠️  Ainda existem ${orphans.rows[0].count} produtos sem categoria`)
    }
    
    return stats
    
  } catch (error) {
    await logger.error(`❌ Erro fatal: ${error.message}`)
    throw error
  } finally {
    await logger.flush()
    await connector.disconnect()
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const options = {
    clearExisting: process.argv.includes('--clear'),
    batchSize: process.argv.includes('--batch-size') ? 
      parseInt(process.argv[process.argv.indexOf('--batch-size') + 1]) : 100
  }
  
  console.log('🚀 Iniciando sincronização de categorias...\n')
  console.log('Opções:', options)
  console.log('')
  
  try {
    const stats = await syncProductCategories(options)
    console.log('\n✅ Sincronização concluída!')
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Erro na sincronização:', error)
    process.exit(1)
  }
} 