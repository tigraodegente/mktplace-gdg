#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'
import { Logger } from './sync/utils/logger.mjs'
import { DataMapper } from './sync/utils/data-mapper.mjs'

/**
 * Script otimizado para corrigir estoque de produtos importados
 * Usa a nova infraestrutura modular de sincronização
 */
async function fixImportedStock(options = {}) {
  const logger = new Logger('fix-stock')
  const connector = new DatabaseConnector(options)
  
  const stats = {
    total: 0,
    fixed: 0,
    notFound: 0,
    errors: 0,
    unchanged: 0
  }
  
  try {
    await logger.info('🔧 Iniciando correção de estoque dos produtos importados...')
    
    // Conectar aos bancos
    await connector.connectMongo()
    await connector.connectNeon()
    
    // Verificar saúde das conexões
    const health = await connector.healthCheck()
    if (!health.mongo || !health.neon) {
      throw new Error('Falha na verificação de saúde das conexões')
    }
    
    // Buscar produtos importados no Neon
    const neonProducts = await connector.queryNeon(`
      SELECT id, sku, name, quantity, metadata
      FROM products 
      WHERE tags::text LIKE '%importado-mongodb%'
         OR tags::text LIKE '%sync-mongodb%'
         OR metadata->>'imported_from' = 'mongodb'
      ORDER BY created_at DESC
    `)
    
    await logger.info(`📦 ${neonProducts.rows.length} produtos importados encontrados`)
    
    if (neonProducts.rows.length === 0) {
      await logger.warn('Nenhum produto importado encontrado para corrigir')
      return stats
    }
    
    // Obter coleção do MongoDB
    const db = connector.getMongoDb()
    const collection = db.collection('m_product_typesense')
    
    // Processar cada produto
    for (const neonProduct of neonProducts.rows) {
      stats.total++
      
      try {
        // Buscar produto original no MongoDB
        let mongoProduct = null
        
        // Tentar buscar por SKU (productId)
        if (neonProduct.sku) {
          const productId = parseInt(neonProduct.sku)
          if (!isNaN(productId)) {
            mongoProduct = await collection.findOne({ productId })
          }
        }
        
        // Se não encontrou por productId, tentar por ID original
        if (!mongoProduct && neonProduct.metadata?.original_id) {
          mongoProduct = await collection.findOne({ 
            _id: neonProduct.metadata.original_id 
          })
        }
        
        if (!mongoProduct) {
          await logger.warn(`⚠️  Produto não encontrado no MongoDB: ${neonProduct.name} (SKU: ${neonProduct.sku})`)
          stats.notFound++
          continue
        }
        
        // Determinar estoque correto usando mesma lógica do DataMapper
        let correctStock = 0
        
        if (mongoProduct.stock && mongoProduct.stock > 0) {
          correctStock = mongoProduct.stock
        } else if (mongoProduct.realStock && mongoProduct.realStock > 0) {
          correctStock = mongoProduct.realStock
        } else if (mongoProduct.virtualStock && mongoProduct.virtualStock > 0) {
          correctStock = mongoProduct.virtualStock
        } else if (mongoProduct.activeForSeo) {
          correctStock = 10 // Estoque padrão para produtos ativos
        }
        
        // Verificar se precisa atualizar
        if (correctStock !== neonProduct.quantity) {
          // Atualizar estoque
          await connector.queryNeon(`
            UPDATE products 
            SET 
              quantity = $1,
              metadata = jsonb_set(
                COALESCE(metadata, '{}'::jsonb),
                '{stock_fixed_at}',
                to_jsonb(CURRENT_TIMESTAMP),
                true
              ),
              updated_at = NOW()
            WHERE id = $2
          `, [correctStock, neonProduct.id])
          
          await logger.info(`✅ ${neonProduct.name}: estoque corrigido de ${neonProduct.quantity} → ${correctStock}`)
          stats.fixed++
          
        } else {
          await logger.debug(`➡️  ${neonProduct.name}: estoque já está correto (${correctStock})`)
          stats.unchanged++
        }
        
      } catch (error) {
        stats.errors++
        await logger.error(`❌ Erro ao processar ${neonProduct.name}:`, {
          error,
          product: neonProduct.name,
          sku: neonProduct.sku
        })
      }
      
      // Mostrar progresso a cada 50 produtos
      if (stats.total % 50 === 0) {
        await logger.info(`📊 Progresso: ${stats.total} produtos processados`)
      }
    }
    
    // Relatório final
    await logger.info('\n📊 Resumo da correção de estoque:')
    await logger.info(`   ✅ Corrigidos: ${stats.fixed}`)
    await logger.info(`   ➡️  Mantidos: ${stats.unchanged}`)
    await logger.info(`   ⚠️  Não encontrados: ${stats.notFound}`)
    await logger.info(`   ❌ Erros: ${stats.errors}`)
    await logger.info(`   📦 Total processado: ${stats.total}`)
    
    if (stats.fixed > 0) {
      await logger.info(`\n🎉 ${stats.fixed} produtos tiveram o estoque corrigido!`)
      
      // Sugerir verificação
      const sampleProduct = await connector.queryNeon(`
        SELECT slug FROM products 
        WHERE metadata->>'stock_fixed_at' IS NOT NULL
        ORDER BY metadata->>'stock_fixed_at' DESC
        LIMIT 1
      `)
      
      if (sampleProduct.rows.length > 0) {
        await logger.info(`📱 Teste um produto corrigido: http://localhost:5173/produto/${sampleProduct.rows[0].slug}`)
      }
    }
    
    return stats
    
  } catch (error) {
    await logger.error('❌ Erro fatal na correção de estoque:', { error })
    throw error
  } finally {
    await logger.flush()
    await connector.disconnect()
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const options = {
    dryRun: process.argv.includes('--dry-run'),
    verbose: process.argv.includes('--verbose')
  }
  
  console.log('🔧 Correção de Estoque v2.0\n')
  
  if (options.dryRun) {
    console.log('🚧 Modo DRY RUN - nenhuma alteração será feita\n')
  }
  
  try {
    const stats = await fixImportedStock(options)
    console.log('\n✅ Correção concluída com sucesso!')
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Erro na correção:', error.message)
    process.exit(1)
  }
} 