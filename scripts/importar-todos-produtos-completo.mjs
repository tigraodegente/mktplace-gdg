#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'
import { DataMapper } from './sync/utils/data-mapper.mjs'
import { Logger } from './sync/utils/logger.mjs'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Carregar configurações
dotenv.config({ path: path.resolve(__dirname, '../.env.develop') })
dotenv.config({ path: path.resolve(__dirname, '../.env') })

async function importarTodosProdutosCompleto() {
  const logger = new Logger('import-all-complete')
  const mapper = new DataMapper({ defaultStock: 10 })
  const connector = new DatabaseConnector({ forceConnection: true })
  
  const stats = {
    total: 0,
    imported: 0,
    skipped: 0,
    errors: 0,
    errorDetails: [],
    batchesProcessed: 0
  }
  
  const BATCH_SIZE = 50 // Processar em lotes de 50
  const DELAY_MS = 100   // Delay entre lotes para não sobrecarregar
  
  try {
    console.log('🚀 IMPORTAÇÃO COMPLETA - TODOS OS PRODUTOS\n')
    console.log('✅ Total esperado: 2.624 produtos (TODOS)')
    console.log('✅ Data de criação: HOJE (' + new Date().toLocaleDateString('pt-BR') + ')')
    console.log('✅ URLs AWS com padrão correto')
    console.log('✅ SEM FILTROS: inclui produtos inativos, ocultos, sem estoque, etc.')
    console.log('⚡ Processamento em lotes de 50 produtos\n')
    
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
    
    // SEM FILTROS - importar TODOS os produtos
    const allProductsFilter = {}
    
    // Contar total de produtos
    console.log('📊 Contando TODOS os produtos...')
    const totalCount = await collection.countDocuments(allProductsFilter)
    console.log(`✅ Total encontrado: ${totalCount} produtos\n`)
    
    if (totalCount === 0) {
      console.log('❌ Nenhum produto encontrado!')
      return
    }
    
    stats.total = totalCount
    
    // Verificar produtos já existentes para pular duplicatas
    console.log('🔍 Verificando produtos já existentes no Neon...')
    const existingProducts = await connector.queryNeon(`
      SELECT sku FROM products 
      WHERE attributes->>'imported_from' = 'mongodb'
    `)
    const existingSkus = new Set(existingProducts.rows.map(row => row.sku))
    console.log(`📊 ${existingSkus.size} produtos já existem no banco\n`)
    
    console.log('🚀 INICIANDO IMPORTAÇÃO EM LOTES...\n')
    
    // Processar em lotes
    let skip = 0
    let batchNumber = 1
    
    while (skip < totalCount) {
      const startTime = Date.now()
      
      console.log(`📦 LOTE ${batchNumber} - Produtos ${skip + 1} a ${Math.min(skip + BATCH_SIZE, totalCount)}`)
      
      // Buscar lote atual
      const batch = await collection
        .find(allProductsFilter)
        .skip(skip)
        .limit(BATCH_SIZE)
        .toArray()
      
      console.log(`   🔍 Processando ${batch.length} produtos do lote...`)
      
      let batchImported = 0
      let batchSkipped = 0
      let batchErrors = 0
      
      // Processar cada produto do lote
      for (const mongoProduct of batch) {
        const sku = mongoProduct.productid?.toString()
        
        try {
          // Verificar se já existe
          if (existingSkus.has(sku)) {
            stats.skipped++
            batchSkipped++
            continue
          }
          
          // Mapear produto (agora sem filtros - aceita qualquer produto)
          const neonProduct = mapper.mapProduct(mongoProduct)
          
          // Criar produto no Neon
          const result = await connector.queryNeon(`
            INSERT INTO products (
              sku, barcode, name, slug, description, short_description,
              price, original_price, cost,
              quantity, track_inventory, allow_backorder,
              weight, width, height, length,
              is_active, featured,
              meta_title, meta_description, meta_keywords,
              category_id, brand, 
              tags, attributes,
              created_at, updated_at, status, currency, view_count, sales_count, rating_count
            ) VALUES (
              $1, $2, $3, $4, $5, $6,
              $7, $8, $9,
              $10, $11, $12,
              $13, $14, $15, $16,
              $17, $18,
              $19, $20, $21,
              $22, $23,
              $24, $25,
              NOW(), NOW(), 'published', 'BRL', 0, 0, 0
            ) RETURNING id
          `, [
            neonProduct.sku, 
            neonProduct.barcode, 
            neonProduct.name, 
            neonProduct.slug, 
            neonProduct.description, 
            neonProduct.short_description,
            neonProduct.price, 
            neonProduct.compare_at_price, 
            neonProduct.cost,
            neonProduct.quantity, 
            neonProduct.track_inventory, 
            neonProduct.allow_backorder,
            neonProduct.weight, 
            neonProduct.width, 
            neonProduct.height, 
            neonProduct.length,
            neonProduct.is_active, 
            neonProduct.is_featured,
            neonProduct.meta_title, 
            neonProduct.meta_description, 
            neonProduct.meta_keywords || [],
            neonProduct.category_id, 
            neonProduct.brand,
            neonProduct.tags || [], 
            JSON.stringify(neonProduct.metadata)
          ])
          
          const productId = result.rows[0].id
          
          // Inserir imagens (mesmo que seja 0)
          for (let imgIndex = 0; imgIndex < neonProduct.images.length; imgIndex++) {
            const img = neonProduct.images[imgIndex]
            await connector.queryNeon(`
              INSERT INTO product_images (
                product_id, url, alt_text, position, is_primary, created_at
              ) VALUES ($1, $2, $3, $4, $5, NOW())
            `, [
              productId, 
              img.url, 
              img.alt || 'Imagem do produto', 
              imgIndex, 
              img.is_primary || false
            ])
          }
          
          stats.imported++
          batchImported++
          
        } catch (error) {
          stats.errors++
          batchErrors++
          stats.errorDetails.push({
            product: mongoProduct.productname || 'Produto sem nome',
            sku: sku,
            error: error.message
          })
          
          // Continuar com próximo produto
          continue
        }
      }
      
      const batchTime = ((Date.now() - startTime) / 1000).toFixed(1)
      
      console.log(`   ✅ Lote concluído em ${batchTime}s:`)
      console.log(`      ➕ Importados: ${batchImported}`)
      console.log(`      ⏭️  Pulados: ${batchSkipped}`)
      console.log(`      ❌ Erros: ${batchErrors}`)
      
      // Mostrar progresso geral
      const progressPercent = ((skip + batch.length) / totalCount * 100).toFixed(1)
      console.log(`   📊 Progresso: ${progressPercent}% (${skip + batch.length}/${totalCount})`)
      
      // Estatísticas acumuladas
      console.log(`   📈 Total: ${stats.imported} importados | ${stats.skipped} pulados | ${stats.errors} erros\n`)
      
      // Próximo lote
      skip += BATCH_SIZE
      batchNumber++
      stats.batchesProcessed++
      
      // Delay entre lotes para não sobrecarregar
      if (skip < totalCount && DELAY_MS > 0) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS))
      }
    }
    
    // Verificar resultado final
    console.log('🔍 VERIFICANDO RESULTADO FINAL...\n')
    
    const finalCount = await connector.queryNeon(`
      SELECT COUNT(*) as total FROM products 
      WHERE attributes->>'imported_from' = 'mongodb'
    `)
    
    const finalImages = await connector.queryNeon(`
      SELECT COUNT(*) as total FROM product_images pi
      JOIN products p ON p.id = pi.product_id
      WHERE p.attributes->>'imported_from' = 'mongodb'
    `)
    
    // Estatísticas por status
    const statusStats = await connector.queryNeon(`
      SELECT 
        COUNT(CASE WHEN is_active = true THEN 1 END) as ativos,
        COUNT(CASE WHEN is_active = false THEN 1 END) as inativos,
        COUNT(CASE WHEN quantity > 0 THEN 1 END) as com_estoque,
        COUNT(CASE WHEN quantity = 0 THEN 1 END) as sem_estoque,
        COUNT(CASE WHEN price > 0 THEN 1 END) as com_preco,
        COUNT(CASE WHEN price = 0 THEN 1 END) as sem_preco
      FROM products 
      WHERE attributes->>'imported_from' = 'mongodb'
    `)
    
    console.log('🎯 RESUMO FINAL DA IMPORTAÇÃO COMPLETA:')
    console.log(`   📦 Produtos no MongoDB: ${stats.total}`)
    console.log(`   ✅ Produtos importados: ${stats.imported}`)
    console.log(`   ⏭️  Produtos pulados: ${stats.skipped}`)
    console.log(`   ❌ Produtos com erro: ${stats.errors}`)
    console.log(`   📊 Total no banco: ${finalCount.rows[0].total}`)
    console.log(`   🖼️  Imagens importadas: ${finalImages.rows[0].total}`)
    console.log(`   ⚡ Lotes processados: ${stats.batchesProcessed}`)
    console.log(`   📅 Data de criação: HOJE (${new Date().toLocaleDateString('pt-BR')})`)
    
    console.log('\n📈 DISTRIBUIÇÃO POR STATUS:')
    const statusData = statusStats.rows[0]
    console.log(`   ✅ Ativos: ${statusData.ativos}`)
    console.log(`   ❌ Inativos: ${statusData.inativos}`)
    console.log(`   📦 Com estoque: ${statusData.com_estoque}`)
    console.log(`   📭 Sem estoque: ${statusData.sem_estoque}`)
    console.log(`   💰 Com preço: ${statusData.com_preco}`)
    console.log(`   💸 Sem preço: ${statusData.sem_preco}`)
    
    if (stats.errors > 0) {
      console.log('\n❌ PRIMEIROS 10 ERROS:')
      stats.errorDetails.slice(0, 10).forEach((err, i) => {
        console.log(`   ${i + 1}. [${err.sku}] ${err.product}: ${err.error}`)
      })
    }
    
    const successRate = ((stats.imported / stats.total) * 100).toFixed(1)
    console.log(`\n🎉 IMPORTAÇÃO COMPLETA CONCLUÍDA! Taxa de sucesso: ${successRate}%`)
    
  } catch (error) {
    console.error('❌ Erro na importação:', error.message)
    throw error
  } finally {
    await logger.flush()
    await connector.disconnect()
  }
}

// Executar
console.log('⚠️  ATENÇÃO: Esta operação vai importar TODOS OS 2.624 PRODUTOS!')
console.log('⚠️  Incluindo inativos, ocultos, sem estoque, sem preço, etc.')
console.log('⚠️  Aguarde 5 segundos para cancelar se necessário...\n')

setTimeout(() => {
  importarTodosProdutosCompleto()
    .then(() => {
      console.log('\n🚀 IMPORTAÇÃO COMPLETA FINALIZADA COM SUCESSO!')
      process.exit(0)
    })
    .catch(error => {
      console.error('\n💥 IMPORTAÇÃO COMPLETA FALHOU:', error)
      process.exit(1)
    })
}, 5000) 