#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'
import { DataMapper } from './sync/utils/data-mapper.mjs'

async function analyzeMigrationCandidates() {
  const connector = new DatabaseConnector({ forceConnection: true })
  const mapper = new DataMapper()
  
  const candidates = {
    total: 0,
    canMigrate: [],
    alreadyExists: [],
    incomplete: [],
    withIssues: []
  }
  
  try {
    console.log('🔍 Analisando candidatos para migração...\n')
    
    // Conectar aos dois bancos
    await connector.connectMongo()
    await connector.connectNeon()
    
    const mongoDb = connector.getMongoDb()
    const mongoCollection = mongoDb.collection('m_product_typesense')
    
    // Obter todos os SKUs já existentes no Neon
    console.log('📊 Carregando produtos existentes no Neon...')
    const existingResult = await connector.queryNeon('SELECT sku FROM products')
    const existingSkus = new Set(existingResult.rows.map(r => r.sku))
    console.log(`  - ${existingSkus.size} produtos já existem no Neon\n`)
    
    // Analisar produtos do MongoDB
    console.log('📊 Analisando produtos do MongoDB...')
    const cursor = mongoCollection.find({})
    const totalCount = await mongoCollection.countDocuments()
    
    let processed = 0
    
    for await (const mongoProduct of cursor) {
      candidates.total++
      
      // Mapear produto
      const mappedProduct = mapper.mapProduct(mongoProduct)
      
      // Critérios de qualidade
      const hasName = !!mappedProduct.name && mappedProduct.name !== 'Produto sem nome'
      const hasPrice = mappedProduct.price > 0
      const hasSku = !!mappedProduct.sku
      const hasValidSlug = !!mappedProduct.slug && !mappedProduct.slug.startsWith('produto-')
      const isActive = mappedProduct.is_active
      
      const productInfo = {
        mongoId: mongoProduct._id,
        sku: mappedProduct.sku,
        name: mappedProduct.name,
        price: mappedProduct.price,
        slug: mappedProduct.slug,
        hasImages: mappedProduct.images.length > 0 && !mappedProduct.images[0].is_placeholder,
        hasStock: mappedProduct.quantity > 0
      }
      
      // Verificar se já existe
      if (existingSkus.has(mappedProduct.sku)) {
        candidates.alreadyExists.push(productInfo)
      }
      // Verificar se está completo
      else if (!hasName || !hasPrice || !hasSku || !isActive) {
        productInfo.issues = []
        if (!hasName) productInfo.issues.push('sem nome')
        if (!hasPrice) productInfo.issues.push('sem preço')
        if (!hasSku) productInfo.issues.push('sem SKU')
        if (!isActive) productInfo.issues.push('inativo')
        candidates.incomplete.push(productInfo)
      }
      // Verificar se tem problemas
      else if (!hasValidSlug) {
        productInfo.issues = ['slug genérico']
        candidates.withIssues.push(productInfo)
      }
      // Produto OK para migrar
      else {
        candidates.canMigrate.push(productInfo)
      }
      
      // Progresso
      processed++
      if (processed % 500 === 0) {
        console.log(`  Processados: ${processed}/${totalCount} (${Math.round(processed/totalCount*100)}%)`)
      }
    }
    
    // Relatório final
    console.log('\n' + '='.repeat(60))
    console.log('📊 RELATÓRIO DE ANÁLISE DE MIGRAÇÃO\n')
    
    console.log('📌 RESUMO:')
    console.log(`  Total no MongoDB: ${candidates.total}`)
    console.log(`  ✅ Prontos para migrar: ${candidates.canMigrate.length} (${Math.round(candidates.canMigrate.length/candidates.total*100)}%)`)
    console.log(`  ⏭️  Já existem no Neon: ${candidates.alreadyExists.length} (${Math.round(candidates.alreadyExists.length/candidates.total*100)}%)`)
    console.log(`  ❌ Incompletos: ${candidates.incomplete.length} (${Math.round(candidates.incomplete.length/candidates.total*100)}%)`)
    console.log(`  ⚠️  Com problemas: ${candidates.withIssues.length} (${Math.round(candidates.withIssues.length/candidates.total*100)}%)`)
    
    // Detalhes dos prontos para migrar
    console.log('\n📦 PRODUTOS PRONTOS PARA MIGRAR:')
    console.log(`  Total: ${candidates.canMigrate.length} produtos`)
    
    // Estatísticas dos produtos prontos
    const withImages = candidates.canMigrate.filter(p => p.hasImages).length
    const withStock = candidates.canMigrate.filter(p => p.hasStock).length
    const priceRanges = {
      low: candidates.canMigrate.filter(p => p.price < 50).length,
      medium: candidates.canMigrate.filter(p => p.price >= 50 && p.price < 200).length,
      high: candidates.canMigrate.filter(p => p.price >= 200 && p.price < 500).length,
      premium: candidates.canMigrate.filter(p => p.price >= 500).length
    }
    
    console.log(`  Com imagens: ${withImages} (${Math.round(withImages/candidates.canMigrate.length*100)}%)`)
    console.log(`  Com estoque: ${withStock} (${Math.round(withStock/candidates.canMigrate.length*100)}%)`)
    console.log('\n  Faixas de preço:')
    console.log(`    - Até R$ 50: ${priceRanges.low}`)
    console.log(`    - R$ 50-200: ${priceRanges.medium}`)
    console.log(`    - R$ 200-500: ${priceRanges.high}`)
    console.log(`    - Acima de R$ 500: ${priceRanges.premium}`)
    
    // Amostra de produtos prontos
    console.log('\n  Amostra (5 primeiros):')
    candidates.canMigrate.slice(0, 5).forEach(p => {
      console.log(`    - [${p.sku}] ${p.name} - R$ ${p.price.toFixed(2)}`)
    })
    
    // Detalhes dos que já existem
    if (candidates.alreadyExists.length > 0) {
      console.log('\n⏭️  PRODUTOS JÁ EXISTENTES NO NEON:')
      console.log(`  Total: ${candidates.alreadyExists.length} produtos`)
      console.log('  Amostra (5 primeiros):')
      candidates.alreadyExists.slice(0, 5).forEach(p => {
        console.log(`    - [${p.sku}] ${p.name}`)
      })
    }
    
    // Detalhes dos incompletos
    if (candidates.incomplete.length > 0) {
      console.log('\n❌ PRODUTOS INCOMPLETOS:')
      console.log(`  Total: ${candidates.incomplete.length} produtos`)
      console.log('  Amostra (5 primeiros):')
      candidates.incomplete.slice(0, 5).forEach(p => {
        console.log(`    - [${p.sku}] ${p.name || 'SEM NOME'} - Problemas: ${p.issues.join(', ')}`)
      })
    }
    
    // Detalhes dos com problemas
    if (candidates.withIssues.length > 0) {
      console.log('\n⚠️  PRODUTOS COM PROBLEMAS:')
      console.log(`  Total: ${candidates.withIssues.length} produtos`)
      console.log('  Amostra (5 primeiros):')
      candidates.withIssues.slice(0, 5).forEach(p => {
        console.log(`    - [${p.sku}] ${p.name} - Problemas: ${p.issues.join(', ')}`)
      })
    }
    
    // Recomendação
    console.log('\n' + '='.repeat(60))
    console.log('\n💡 RECOMENDAÇÃO:')
    console.log(`Migrar ${candidates.canMigrate.length} produtos completos e válidos.`)
    console.log('\nPara executar a migração apenas destes produtos:')
    console.log('  node scripts/sync/core/sync-products.mjs --only-valid')
    
    // Salvar relatório
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: candidates.total,
        canMigrate: candidates.canMigrate.length,
        alreadyExists: candidates.alreadyExists.length,
        incomplete: candidates.incomplete.length,
        withIssues: candidates.withIssues.length
      },
      candidateSkus: candidates.canMigrate.map(p => p.sku)
    }
    
    // Escrever arquivo JSON com os SKUs dos candidatos
    const fs = await import('fs/promises')
    await fs.writeFile(
      'migration-candidates.json',
      JSON.stringify(report, null, 2),
      'utf8'
    )
    console.log('\n📄 Relatório salvo em: migration-candidates.json')
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await connector.disconnect()
  }
}

analyzeMigrationCandidates() 