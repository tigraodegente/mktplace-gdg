#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'
import OpenAI from 'openai'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

dotenv.config({ path: path.join(rootDir, '.env.local') })

// Configuração para processar TODOS os produtos
const config = {
  batchSize: 50, // Processar 50 produtos por vez
  delayBetweenProducts: 1500, // 1.5 segundos entre produtos
  delayBetweenBatches: 10000, // 10 segundos entre lotes
  maxRetriesPerProduct: 3,
  budgetLimit: 200 // Limite de orçamento em dólares
}

let globalStats = {
  totalProcessed: 0,
  totalSuccess: 0,
  totalErrors: 0,
  totalCost: 0,
  totalTokens: 0,
  startTime: Date.now(),
  currentBatch: 0
}

async function enrichAllProducts() {
  console.log('🚀 ENRIQUECIMENTO COMPLETO - TODOS OS PRODUTOS\n')
  console.log('=' .repeat(70) + '\n')
  
  const connector = new DatabaseConnector({ forceConnection: true })
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  
  try {
    await connector.connectNeon()
    
    // Verificar quantos produtos precisam ser processados
    const countResult = await connector.queryNeon(`
      SELECT COUNT(*) as total
      FROM products
      WHERE meta_title IS NULL 
         OR meta_description IS NULL
         OR short_description IS NULL
    `)
    
    const totalRemaining = parseInt(countResult.rows[0].total)
    const estimatedCost = totalRemaining * 0.016
    const estimatedTime = (totalRemaining * config.delayBetweenProducts) / 1000 / 60
    
    console.log('📊 ANÁLISE INICIAL:')
    console.log(`Total de produtos: 2,633`)
    console.log(`Produtos para processar: ${totalRemaining}`)
    console.log(`Custo estimado: $${estimatedCost.toFixed(2)} (R$ ${(estimatedCost * 5).toFixed(2)})`)
    console.log(`Tempo estimado: ${Math.floor(estimatedTime)} minutos (${Math.floor(estimatedTime/60)}h${Math.floor(estimatedTime%60)}min)`)
    console.log(`Limite de orçamento: $${config.budgetLimit}`)
    
    if (estimatedCost > config.budgetLimit) {
      console.log(`\n⚠️  AVISO: Custo estimado excede o limite!`)
      console.log(`Sugestão: Processar em ${Math.ceil(estimatedCost / config.budgetLimit)} etapas`)
    }
    
    console.log('\n⚠️  ATENÇÃO: Este processo pode levar várias horas!')
    console.log('Processamento iniciará em 10 segundos... (Ctrl+C para cancelar)\n')
    
    await new Promise(resolve => setTimeout(resolve, 10000))
    
    let batchNumber = 1
    let continueProcessing = true
    
    while (continueProcessing) {
      console.log(`\n${'='.repeat(70)}`)
      console.log(`🔄 LOTE ${batchNumber} - Processando ${config.batchSize} produtos`)
      console.log(`${'='.repeat(70)}`)
      
      // Buscar próximo lote
      const batchResult = await connector.queryNeon(`
        SELECT 
          p.id,
          p.name,
          p.price,
          p.sku
        FROM products p
        WHERE p.meta_title IS NULL 
           OR p.meta_description IS NULL
           OR p.short_description IS NULL
        ORDER BY p.price DESC
        LIMIT $1
      `, [config.batchSize])
      
      const products = batchResult.rows
      
      if (products.length === 0) {
        console.log('\n✅ TODOS OS PRODUTOS FORAM PROCESSADOS!')
        continueProcessing = false
        break
      }
      
      // Verificar orçamento
      if (globalStats.totalCost >= config.budgetLimit) {
        console.log(`\n⚠️  LIMITE DE ORÇAMENTO ATINGIDO: $${globalStats.totalCost.toFixed(2)}`)
        console.log(`Para continuar, aumente o budgetLimit no script`)
        break
      }
      
      console.log(`\nProcessando ${products.length} produtos neste lote...`)
      
      // Processar produtos do lote
      let batchSuccess = 0
      let batchErrors = 0
      let batchCost = 0
      
      for (let i = 0; i < products.length; i++) {
        const product = products[i]
        const productIndex = (batchNumber - 1) * config.batchSize + i + 1
        
        console.log(`\n[${productIndex}] ${product.name}`)
        console.log(`   💰 Custo total até agora: $${globalStats.totalCost.toFixed(2)}`)
        
        try {
          // Verificar orçamento antes de cada produto
          if (globalStats.totalCost >= config.budgetLimit) {
            console.log(`   ⚠️  Limite de orçamento atingido!`)
            continueProcessing = false
            break
          }
          
          // Gerar conteúdo com IA (paralelo para eficiência)
          const [titleRes, descRes, shortRes, tagsRes] = await Promise.all([
            openai.chat.completions.create({
              model: 'gpt-4-turbo-preview',
              messages: [{
                role: 'user',
                content: `Crie um título SEO atrativo para "${product.name}". Máximo 60 caracteres. Apenas o título.`
              }],
              temperature: 0.7,
              max_tokens: 100
            }),
            
            openai.chat.completions.create({
              model: 'gpt-4-turbo-preview',
              messages: [{
                role: 'user',
                content: `Meta description para "${product.name}" por R$ ${product.price}. 145-160 caracteres. Apenas a descrição.`
              }],
              temperature: 0.8,
              max_tokens: 200
            }),
            
            openai.chat.completions.create({
              model: 'gpt-4-turbo-preview',
              messages: [{
                role: 'user',
                content: `Descrição persuasiva de 2-3 frases para "${product.name}". Apenas as frases.`
              }],
              temperature: 0.9,
              max_tokens: 150
            }),
            
            openai.chat.completions.create({
              model: 'gpt-4-turbo-preview',
              messages: [{
                role: 'user',
                content: `5 tags de busca para "${product.name}". Formato: tag1, tag2, tag3, tag4, tag5`
              }],
              temperature: 0.3,
              max_tokens: 100
            })
          ])
          
          // Processar dados
          const enrichedData = {
            meta_title: titleRes.choices[0].message.content.trim().replace(/^"|"$/g, ''),
            meta_description: descRes.choices[0].message.content.trim().replace(/^"|"$/g, ''),
            short_description: shortRes.choices[0].message.content.trim(),
            tags: tagsRes.choices[0].message.content.trim().split(',').map(t => t.trim()),
            meta_keywords: []
          }
          
          enrichedData.meta_keywords = enrichedData.tags.slice(0, 8)
          
          // Calcular custo
          const productTokens = titleRes.usage.total_tokens + 
                              descRes.usage.total_tokens + 
                              shortRes.usage.total_tokens + 
                              tagsRes.usage.total_tokens
          
          const productCost = (productTokens / 1000) * 0.04
          globalStats.totalTokens += productTokens
          globalStats.totalCost += productCost
          batchCost += productCost
          
          console.log(`   ✅ IA: ${productTokens} tokens, $${productCost.toFixed(4)}`)
          
          // Salvar no banco
          await connector.queryNeon(`
            UPDATE products 
            SET 
              meta_title = $1,
              meta_description = $2,
              short_description = $3,
              meta_keywords = $4::text[],
              tags = $5::text[],
              updated_at = NOW()
            WHERE id = $6
          `, [
            enrichedData.meta_title,
            enrichedData.meta_description,
            enrichedData.short_description,
            enrichedData.meta_keywords.length > 0 ? enrichedData.meta_keywords : null,
            enrichedData.tags,
            product.id
          ])
          
          console.log(`   ✅ Salvo no banco!`)
          batchSuccess++
          globalStats.totalSuccess++
          
          // Delay entre produtos
          if (i < products.length - 1) {
            await new Promise(resolve => setTimeout(resolve, config.delayBetweenProducts))
          }
          
        } catch (error) {
          console.error(`   ❌ Erro: ${error.message}`)
          batchErrors++
          globalStats.totalErrors++
          
          if (error.message.includes('rate limit')) {
            console.log(`   ⏳ Rate limit - aguardando 60 segundos...`)
            await new Promise(resolve => setTimeout(resolve, 60000))
            i-- // Tentar novamente
          }
        }
      }
      
      // Resumo do lote
      console.log(`\n📊 RESUMO DO LOTE ${batchNumber}:`)
      console.log(`   ✅ Sucessos: ${batchSuccess}`)
      console.log(`   ❌ Erros: ${batchErrors}`)
      console.log(`   💰 Custo do lote: $${batchCost.toFixed(4)}`)
      
      batchNumber++
      globalStats.currentBatch = batchNumber
      
      // Delay entre lotes
      if (continueProcessing && products.length === config.batchSize) {
        console.log(`\n⏳ Pausando ${config.delayBetweenBatches/1000}s entre lotes...`)
        await new Promise(resolve => setTimeout(resolve, config.delayBetweenBatches))
      }
    }
    
    // Resumo final
    const totalDuration = (Date.now() - globalStats.startTime) / 1000
    console.log('\n' + '='.repeat(70))
    console.log('\n🎉 PROCESSAMENTO FINAL CONCLUÍDO!\n')
    console.log('📊 ESTATÍSTICAS FINAIS:')
    console.log(`   ✅ Total processado: ${globalStats.totalSuccess}`)
    console.log(`   ❌ Total de erros: ${globalStats.totalErrors}`)
    console.log(`   💰 Custo total: $${globalStats.totalCost.toFixed(2)} (R$ ${(globalStats.totalCost * 5).toFixed(2)})`)
    console.log(`   📝 Tokens usados: ${globalStats.totalTokens.toLocaleString()}`)
    console.log(`   ⏱️  Tempo total: ${Math.floor(totalDuration/60)}min ${Math.floor(totalDuration%60)}s`)
    console.log(`   🔄 Lotes processados: ${batchNumber - 1}`)
    
    if (globalStats.totalSuccess > 0) {
      const avgCost = globalStats.totalCost / globalStats.totalSuccess
      const avgSpeed = globalStats.totalSuccess / (totalDuration / 60)
      console.log(`   💵 Custo médio: $${avgCost.toFixed(4)}/produto`)
      console.log(`   📈 Velocidade: ${avgSpeed.toFixed(1)} produtos/minuto`)
    }
    
    // Verificar produtos restantes
    const finalCountResult = await connector.queryNeon(`
      SELECT COUNT(*) as remaining
      FROM products
      WHERE meta_title IS NULL 
         OR meta_description IS NULL
         OR short_description IS NULL
    `)
    
    const remaining = parseInt(finalCountResult.rows[0].remaining)
    console.log(`\n📦 Produtos restantes: ${remaining}`)
    
    if (remaining > 0) {
      console.log(`\n🔄 Para continuar processamento:`)
      console.log(`   node scripts/enrich-all-products.mjs`)
    } else {
      console.log(`\n🎊 PARABÉNS! Todos os produtos foram enriquecidos!`)
    }
    
  } catch (error) {
    console.error('\n❌ Erro geral:', error)
  } finally {
    await connector.disconnect()
  }
}

// Executar
enrichAllProducts().catch(console.error) 