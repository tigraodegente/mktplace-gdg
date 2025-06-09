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

async function importarTodosProdutosVendaveis() {
  const logger = new Logger('import-all')
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
    console.log('🚀 IMPORTAÇÃO COMPLETA DE PRODUTOS VENDÁVEIS\n')
    console.log('✅ Total esperado: 2.151 produtos')
    console.log('✅ Data de criação: HOJE (' + new Date().toLocaleDateString('pt-BR') + ')')
    console.log('✅ URLs AWS com padrão correto')
    console.log('✅ Critérios: produtos ativos, com estoque, preço e não ocultos')
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
    
    // Filtro para produtos vendáveis (critérios corretos)
    const sellableFilter = {
      $and: [
        // Deve estar ativo
        { isactive: true },
        
        // Deve ter estoque
        {
          $or: [
            { realstock: { $gt: 0 } },
            { virtualstock: { $gt: 0 } }
          ]
        },
        
        // Deve ter preço
        { price: { $gt: 0 } },
        
        // Deve ter nome
        { productname: { $exists: true, $ne: '' } },
        
        // NÃO deve estar oculto ou não-vendável
        { hideinlist: { $ne: true } },
        { hideinsearch: { $ne: true } },
        { notSalable: { $ne: true } }
      ]
    }
    
    // Contar total de produtos vendáveis
    console.log('📊 Contando produtos vendáveis...')
    const totalCount = await collection.countDocuments(sellableFilter)
    console.log(`✅ Total encontrado: ${totalCount} produtos\n`)
    
    if (totalCount === 0) {
      console.log('❌ Nenhum produto vendável encontrado!')
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
        .find(sellableFilter)
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
          
          // Mapear produto
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
          
          // Inserir imagens
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
            product: mongoProduct.productname,
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
    
    console.log('🎯 RESUMO FINAL DA IMPORTAÇÃO:')
    console.log(`   📦 Produtos no MongoDB: ${stats.total}`)
    console.log(`   ✅ Produtos importados: ${stats.imported}`)
    console.log(`   ⏭️  Produtos pulados: ${stats.skipped}`)
    console.log(`   ❌ Produtos com erro: ${stats.errors}`)
    console.log(`   📊 Total no banco: ${finalCount.rows[0].total}`)
    console.log(`   🖼️  Imagens importadas: ${finalImages.rows[0].total}`)
    console.log(`   ⚡ Lotes processados: ${stats.batchesProcessed}`)
    console.log(`   📅 Data de criação: HOJE (${new Date().toLocaleDateString('pt-BR')})`)
    
    if (stats.errors > 0) {
      console.log('\n❌ PRIMEIROS 10 ERROS:')
      stats.errorDetails.slice(0, 10).forEach((err, i) => {
        console.log(`   ${i + 1}. [${err.sku}] ${err.product}: ${err.error}`)
      })
    }
    
    const successRate = ((stats.imported / stats.total) * 100).toFixed(1)
    console.log(`\n🎉 IMPORTAÇÃO CONCLUÍDA! Taxa de sucesso: ${successRate}%`)
    
  } catch (error) {
    console.error('❌ Erro na importação:', error.message)
    throw error
  } finally {
    await logger.flush()
    await connector.disconnect()
  }
}

// Executar
console.log('⚠️  ATENÇÃO: Esta operação vai importar TODOS os produtos vendáveis!')
console.log('⚠️  Aguarde 5 segundos para cancelar se necessário...\n')

setTimeout(() => {
  importarTodosProdutosVendaveis()
    .then(() => {
      console.log('\n🚀 IMPORTAÇÃO FINALIZADA COM SUCESSO!')
      process.exit(0)
    })
    .catch(error => {
      console.error('\n💥 IMPORTAÇÃO FALHOU:', error)
      process.exit(1)
    })
}, 5000) 