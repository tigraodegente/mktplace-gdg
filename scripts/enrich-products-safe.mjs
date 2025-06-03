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

// Configurações
const config = {
  model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
  batchSize: 5, // Menos produtos por vez
  delayBetweenItems: 2000, // 2 segundos entre items
  maxRetries: 3,
  temperatures: {
    seoTitle: 0.7,
    metaDescription: 0.8,
    shortDescription: 0.9,
    tags: 0.3
  }
}

// Tracker de custos
const costTracker = {
  totalTokens: 0,
  totalCost: 0,
  productCount: 0,
  startTime: Date.now()
}

// Função para limpar e processar tags
function processTagsString(tagsText) {
  // Remove quebras de linha e espaços extras
  const cleaned = tagsText.replace(/[\n\r]/g, ' ').trim()
  
  // Divide por vírgula e limpa cada tag
  const tags = cleaned.split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0)
    .map(tag => {
      // Remove aspas extras se houver
      return tag.replace(/^["']|["']$/g, '')
    })
  
  return tags
}

// Função simplificada de enriquecimento
async function enrichProduct(product, openai, connector) {
  console.log(`\n🔄 Processando: ${product.name}`)
  
  try {
    const enrichedData = {}
    let productTokens = 0
    
    // 1. SEO Title
    console.log('  📝 Gerando SEO title...')
    const titlePrompt = `Crie um título SEO atrativo para o produto "${product.name}". 
    Máximo 60 caracteres. Responda APENAS com o título.`
    
    const titleResponse = await openai.chat.completions.create({
      model: config.model,
      messages: [{ role: 'user', content: titlePrompt }],
      temperature: config.temperatures.seoTitle,
      max_tokens: 100
    })
    
    enrichedData.meta_title = titleResponse.choices[0].message.content.trim()
    productTokens += titleResponse.usage.total_tokens
    console.log(`  ✅ Title: "${enrichedData.meta_title}"`)
    
    // 2. Meta Description
    console.log('  📝 Gerando meta description...')
    const descPrompt = `Crie uma meta description para o produto "${product.name}" por R$ ${product.price}. 
    Entre 145-160 caracteres. Responda APENAS com a descrição.`
    
    const descResponse = await openai.chat.completions.create({
      model: config.model,
      messages: [{ role: 'user', content: descPrompt }],
      temperature: config.temperatures.metaDescription,
      max_tokens: 200
    })
    
    enrichedData.meta_description = descResponse.choices[0].message.content.trim()
    productTokens += descResponse.usage.total_tokens
    console.log(`  ✅ Description: ${enrichedData.meta_description.length} chars`)
    
    // 3. Short Description
    console.log('  📝 Gerando descrição curta...')
    const shortPrompt = `Crie uma descrição curta e persuasiva (2-3 frases) para o produto "${product.name}". 
    Responda APENAS com a descrição.`
    
    const shortResponse = await openai.chat.completions.create({
      model: config.model,
      messages: [{ role: 'user', content: shortPrompt }],
      temperature: config.temperatures.shortDescription,
      max_tokens: 150
    })
    
    enrichedData.short_description = shortResponse.choices[0].message.content.trim()
    productTokens += shortResponse.usage.total_tokens
    
    // 4. Tags
    console.log('  📝 Gerando tags...')
    const tagsPrompt = `Liste 5-8 tags de busca para o produto "${product.name}". 
    Formato: tag1, tag2, tag3, tag4, tag5
    Responda APENAS com as tags separadas por vírgula.`
    
    const tagsResponse = await openai.chat.completions.create({
      model: config.model,
      messages: [{ role: 'user', content: tagsPrompt }],
      temperature: config.temperatures.tags,
      max_tokens: 100
    })
    
    const tagsText = tagsResponse.choices[0].message.content.trim()
    enrichedData.tags = processTagsString(tagsText)
    enrichedData.meta_keywords = enrichedData.tags.slice(0, 8).join(', ')
    productTokens += tagsResponse.usage.total_tokens
    console.log(`  ✅ Tags: ${enrichedData.tags.length} geradas`)
    
    // Calcular custo
    const productCost = (productTokens / 1000) * 0.04 // Estimativa simplificada
    costTracker.totalTokens += productTokens
    costTracker.totalCost += productCost
    
    console.log(`  💰 Tokens: ${productTokens} | Custo: $${productCost.toFixed(4)}`)
    
    // Salvar no banco
    console.log('  💾 Salvando no banco...')
    
    // Primeiro, vamos salvar sem as tags para garantir que funciona
    await connector.queryNeon(`
      UPDATE products 
      SET 
        meta_title = $1,
        meta_description = $2,
        short_description = $3,
        meta_keywords = $4,
        updated_at = NOW()
      WHERE id = $5
    `, [
      enrichedData.meta_title,
      enrichedData.meta_description,
      enrichedData.short_description,
      enrichedData.meta_keywords,
      product.id
    ])
    
    // Agora tentar salvar as tags separadamente
    try {
      await connector.queryNeon(`
        UPDATE products 
        SET tags = $1::jsonb
        WHERE id = $2
      `, [JSON.stringify(enrichedData.tags), product.id])
      console.log('  ✅ Tags salvas com sucesso!')
    } catch (tagError) {
      console.log('  ⚠️  Erro ao salvar tags:', tagError.message)
      console.log('  Tags que tentamos salvar:', enrichedData.tags)
    }
    
    console.log('  ✅ Produto enriquecido com sucesso!')
    
    // Delay entre produtos
    await new Promise(resolve => setTimeout(resolve, config.delayBetweenItems))
    
    return enrichedData
    
  } catch (error) {
    console.error(`  ❌ Erro ao processar ${product.name}:`, error.message)
    throw error
  }
}

// Função principal
async function main() {
  console.log('🚀 ENRIQUECIMENTO SEGURO DE PRODUTOS COM IA\n')
  console.log('=' .repeat(60) + '\n')
  
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY não configurada!')
    process.exit(1)
  }
  
  const connector = new DatabaseConnector({ forceConnection: true })
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  
  try {
    await connector.connectNeon()
    
    // Buscar produtos
    console.log('📊 Buscando produtos sem enriquecimento...\n')
    
    const productsResult = await connector.queryNeon(`
      SELECT 
        p.id,
        p.name,
        p.description,
        p.price,
        p.sku,
        c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.meta_title IS NULL 
         OR p.meta_description IS NULL
      ORDER BY p.price DESC
      LIMIT $1
    `, [config.batchSize])
    
    const products = productsResult.rows
    
    if (products.length === 0) {
      console.log('✅ Todos os produtos já foram enriquecidos!')
      return
    }
    
    console.log(`📦 ${products.length} produtos encontrados\n`)
    products.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.name} (R$ ${p.price})`)
    })
    
    console.log('\n⚠️  ATENÇÃO:')
    console.log(`Custo estimado: ~$${(products.length * 0.02).toFixed(2)}`)
    console.log('Iniciando em 3 segundos...\n')
    
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // Processar produtos
    let successCount = 0
    let errorCount = 0
    
    for (let i = 0; i < products.length; i++) {
      const product = products[i]
      console.log(`\n${'='.repeat(50)}`)
      console.log(`[${i + 1}/${products.length}] Processando...`)
      
      try {
        await enrichProduct(product, openai, connector)
        successCount++
        costTracker.productCount++
      } catch (error) {
        errorCount++
        console.error(`❌ Falha no produto ${product.name}`)
        
        if (error.message.includes('rate limit')) {
          console.log('⏳ Aguardando 60 segundos...')
          await new Promise(resolve => setTimeout(resolve, 60000))
          i-- // Tentar novamente
        }
      }
    }
    
    // Resumo final
    const duration = (Date.now() - costTracker.startTime) / 1000
    console.log('\n' + '=' .repeat(60))
    console.log('\n📊 RESUMO DO PROCESSAMENTO:\n')
    console.log(`✅ Produtos processados com sucesso: ${successCount}`)
    console.log(`❌ Produtos com erro: ${errorCount}`)
    console.log(`💰 Custo total: $${costTracker.totalCost.toFixed(4)}`)
    console.log(`📝 Tokens usados: ${costTracker.totalTokens.toLocaleString()}`)
    console.log(`⏱️  Tempo total: ${Math.floor(duration)}s`)
    
    if (successCount > 0) {
      console.log(`💵 Custo médio por produto: $${(costTracker.totalCost / successCount).toFixed(4)}`)
    }
    
    console.log('\n✅ PROCESSAMENTO CONCLUÍDO!\n')
    
  } catch (error) {
    console.error('❌ Erro geral:', error)
  } finally {
    await connector.disconnect()
  }
}

// Executar
main().catch(console.error) 