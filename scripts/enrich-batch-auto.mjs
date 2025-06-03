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

// Configuração
const BATCH_SIZE = parseInt(process.argv[2]) || 10
const DELAY_BETWEEN_PRODUCTS = 2000 // 2 segundos

async function enrichBatch() {
  console.log('🚀 ENRIQUECIMENTO AUTOMÁTICO EM LOTE\n')
  console.log('=' .repeat(60) + '\n')
  console.log(`📦 Processando ${BATCH_SIZE} produtos\n`)
  
  const connector = new DatabaseConnector({ forceConnection: true })
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  
  let successCount = 0
  let errorCount = 0
  let totalCost = 0
  let totalTokens = 0
  const startTime = Date.now()
  
  try {
    await connector.connectNeon()
    
    // Buscar produtos não enriquecidos
    const result = await connector.queryNeon(`
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
    `, [BATCH_SIZE])
    
    const products = result.rows
    
    if (products.length === 0) {
      console.log('✅ Todos os produtos já foram enriquecidos!')
      return
    }
    
    console.log(`Encontrados ${products.length} produtos para processar:\n`)
    
    // Processar cada produto
    for (let i = 0; i < products.length; i++) {
      const product = products[i]
      console.log(`\n${'='.repeat(50)}`)
      console.log(`[${i + 1}/${products.length}] ${product.name}`)
      
      try {
        // Gerar conteúdo com IA
        const [titleRes, descRes, shortRes, tagsRes] = await Promise.all([
          // SEO Title
          openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [{
              role: 'user',
              content: `Crie um título SEO para: "${product.name}". Máximo 60 caracteres. Responda APENAS o título.`
            }],
            temperature: 0.7,
            max_tokens: 100
          }),
          
          // Meta Description
          openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [{
              role: 'user',
              content: `Crie uma meta description para "${product.name}" por R$ ${product.price}. Entre 145-160 caracteres. Responda APENAS a descrição.`
            }],
            temperature: 0.8,
            max_tokens: 200
          }),
          
          // Short Description
          openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [{
              role: 'user',
              content: `Escreva 2-3 frases persuasivas sobre "${product.name}". Responda APENAS as frases.`
            }],
            temperature: 0.9,
            max_tokens: 150
          }),
          
          // Tags
          openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [{
              role: 'user',
              content: `Liste 5 tags de busca para "${product.name}". Formato: tag1, tag2, tag3, tag4, tag5`
            }],
            temperature: 0.3,
            max_tokens: 100
          })
        ])
        
        // Processar respostas
        const enrichedData = {
          meta_title: titleRes.choices[0].message.content.trim(),
          meta_description: descRes.choices[0].message.content.trim(),
          short_description: shortRes.choices[0].message.content.trim(),
          tags: tagsRes.choices[0].message.content.trim().split(',').map(t => t.trim()),
          meta_keywords: []
        }
        
        // Limpar aspas extras do título se houver
        if (enrichedData.meta_title.startsWith('"') && enrichedData.meta_title.endsWith('"')) {
          enrichedData.meta_title = enrichedData.meta_title.slice(1, -1)
        }
        
        enrichedData.meta_keywords = enrichedData.tags.slice(0, 8)
        
        // Calcular tokens e custo
        const productTokens = titleRes.usage.total_tokens + 
                            descRes.usage.total_tokens + 
                            shortRes.usage.total_tokens + 
                            tagsRes.usage.total_tokens
        
        const productCost = (productTokens / 1000) * 0.04
        totalTokens += productTokens
        totalCost += productCost
        
        console.log(`  ✅ Conteúdo gerado (${productTokens} tokens, $${productCost.toFixed(4)})`)
        
        // Salvar no banco
        await connector.queryNeon(`
          UPDATE products 
          SET 
            meta_title = $1,
            meta_description = $2,
            short_description = $3,
            meta_keywords = $4::text[],
            updated_at = NOW()
          WHERE id = $5
        `, [
          enrichedData.meta_title,
          enrichedData.meta_description,
          enrichedData.short_description,
          enrichedData.meta_keywords.length > 0 ? enrichedData.meta_keywords : null,
          product.id
        ])
        
        // Salvar tags separadamente
        try {
          await connector.queryNeon(`
            UPDATE products 
            SET tags = $1::text[]
            WHERE id = $2
          `, [enrichedData.tags, product.id])
        } catch (tagError) {
          console.log('  ⚠️  Tags não salvas:', tagError.message)
        }
        
        console.log(`  ✅ Salvo no banco!`)
        successCount++
        
        // Delay entre produtos
        if (i < products.length - 1) {
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_PRODUCTS))
        }
        
      } catch (error) {
        console.error(`  ❌ Erro: ${error.message}`)
        errorCount++
        
        if (error.message.includes('rate limit')) {
          console.log('  ⏳ Aguardando 60 segundos...')
          await new Promise(resolve => setTimeout(resolve, 60000))
          i-- // Tentar novamente
        }
      }
    }
    
    // Resumo final
    const duration = (Date.now() - startTime) / 1000
    console.log('\n' + '=' .repeat(60))
    console.log('\n📊 RESUMO DO PROCESSAMENTO:\n')
    console.log(`✅ Sucesso: ${successCount} produtos`)
    console.log(`❌ Erros: ${errorCount} produtos`)
    console.log(`💰 Custo total: $${totalCost.toFixed(4)}`)
    console.log(`📝 Tokens totais: ${totalTokens.toLocaleString()}`)
    console.log(`⏱️  Tempo: ${Math.floor(duration)}s`)
    
    if (successCount > 0) {
      console.log(`\n💵 Custo médio: $${(totalCost / successCount).toFixed(4)}/produto`)
      console.log(`📈 Velocidade: ${(successCount / (duration / 60)).toFixed(1)} produtos/minuto`)
    }
    
    // Estimativa para todos os produtos
    const remainingResult = await connector.queryNeon(`
      SELECT COUNT(*) as count
      FROM products
      WHERE meta_title IS NULL
         OR meta_description IS NULL
    `)
    
    const remaining = remainingResult.rows[0].count
    if (remaining > 0 && successCount > 0) {
      const avgCost = totalCost / successCount
      const estimatedTotalCost = remaining * avgCost
      const estimatedTime = (remaining * DELAY_BETWEEN_PRODUCTS) / 1000 / 60
      
      console.log(`\n📊 ESTIMATIVAS PARA PRODUTOS RESTANTES:`)
      console.log(`   Produtos restantes: ${remaining}`)
      console.log(`   Custo estimado: $${estimatedTotalCost.toFixed(2)}`)
      console.log(`   Tempo estimado: ${estimatedTime.toFixed(0)} minutos`)
    }
    
    console.log('\n✅ PROCESSAMENTO CONCLUÍDO!\n')
    
  } catch (error) {
    console.error('❌ Erro geral:', error)
  } finally {
    await connector.disconnect()
  }
}

// Executar
enrichBatch().catch(console.error) 