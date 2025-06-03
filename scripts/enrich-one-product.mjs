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

async function enrichSingleProduct() {
  console.log('🎯 ENRIQUECIMENTO DIRETO - 1 PRODUTO\n')
  console.log('=' .repeat(50) + '\n')
  
  const connector = new DatabaseConnector({ forceConnection: true })
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  
  try {
    await connector.connectNeon()
    
    // Buscar o próximo produto sem enriquecimento
    console.log('📦 Buscando próximo produto...\n')
    
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
      LIMIT 1
    `)
    
    if (result.rows.length === 0) {
      console.log('✅ Todos os produtos já foram enriquecidos!')
      return
    }
    
    const product = result.rows[0]
    console.log('Produto selecionado:')
    console.log(`ID: ${product.id}`)
    console.log(`Nome: ${product.name}`)
    console.log(`SKU: ${product.sku}`)
    console.log(`Preço: R$ ${product.price}\n`)
    
    const enrichedData = {
      meta_title: null,
      meta_description: null,
      short_description: null,
      tags: [],
      meta_keywords: null
    }
    
    let totalTokens = 0
    
    try {
      // 1. SEO Title
      console.log('📝 GERANDO SEO TITLE...')
      const titleResponse = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{
          role: 'user',
          content: `Crie um título SEO para: "${product.name}". Máximo 60 caracteres. Responda APENAS o título.`
        }],
        temperature: 0.7,
        max_tokens: 100
      })
      
      enrichedData.meta_title = titleResponse.choices[0].message.content.trim()
      totalTokens += titleResponse.usage.total_tokens
      console.log(`✅ Título: "${enrichedData.meta_title}"`)
      console.log(`   Tokens: ${titleResponse.usage.total_tokens}\n`)
      
      // 2. Meta Description
      console.log('📝 GERANDO META DESCRIPTION...')
      const descResponse = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{
          role: 'user',
          content: `Crie uma meta description para "${product.name}" por R$ ${product.price}. Entre 145-160 caracteres. Responda APENAS a descrição.`
        }],
        temperature: 0.8,
        max_tokens: 200
      })
      
      enrichedData.meta_description = descResponse.choices[0].message.content.trim()
      totalTokens += descResponse.usage.total_tokens
      console.log(`✅ Description: "${enrichedData.meta_description}"`)
      console.log(`   Comprimento: ${enrichedData.meta_description.length} chars`)
      console.log(`   Tokens: ${descResponse.usage.total_tokens}\n`)
      
      // 3. Short Description
      console.log('📝 GERANDO DESCRIÇÃO CURTA...')
      const shortResponse = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{
          role: 'user',
          content: `Escreva 2-3 frases persuasivas sobre "${product.name}". Responda APENAS as frases.`
        }],
        temperature: 0.9,
        max_tokens: 150
      })
      
      enrichedData.short_description = shortResponse.choices[0].message.content.trim()
      totalTokens += shortResponse.usage.total_tokens
      console.log(`✅ Descrição curta gerada`)
      console.log(`   Tokens: ${shortResponse.usage.total_tokens}\n`)
      
      // 4. Tags
      console.log('📝 GERANDO TAGS...')
      const tagsResponse = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{
          role: 'user',
          content: `Liste 5 tags de busca para "${product.name}". Formato: tag1, tag2, tag3, tag4, tag5`
        }],
        temperature: 0.3,
        max_tokens: 100
      })
      
      const tagsText = tagsResponse.choices[0].message.content.trim()
      enrichedData.tags = tagsText.split(',').map(t => t.trim())
      enrichedData.meta_keywords = enrichedData.tags.slice(0, 8)
      totalTokens += tagsResponse.usage.total_tokens
      console.log(`✅ Tags: ${enrichedData.tags.join(', ')}`)
      console.log(`   Tokens: ${tagsResponse.usage.total_tokens}\n`)
      
    } catch (aiError) {
      console.error('❌ Erro na IA:', aiError.message)
      return
    }
    
    // Calcular custo
    const cost = (totalTokens / 1000) * 0.04
    console.log(`💰 CUSTO TOTAL: $${cost.toFixed(4)} (${totalTokens} tokens)\n`)
    
    // Salvar no banco - uma atualização por vez
    console.log('💾 SALVANDO NO BANCO...')
    
    try {
      // Update 1: Campos de texto
      console.log('  1. Salvando textos...')
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
      console.log('  ✅ Textos salvos!')
      
      // Update 2: Tags (separado)
      console.log('  2. Salvando tags...')
      await connector.queryNeon(`
        UPDATE products 
        SET tags = $1::jsonb
        WHERE id = $2
      `, [
        JSON.stringify(enrichedData.tags),
        product.id
      ])
      console.log('  ✅ Tags salvas!')
      
    } catch (dbError) {
      console.error('❌ Erro ao salvar:', dbError.message)
      return
    }
    
    // Verificar se foi salvo
    console.log('\n🔍 VERIFICANDO...')
    const checkResult = await connector.queryNeon(`
      SELECT meta_title, meta_description, short_description, tags
      FROM products
      WHERE id = $1
    `, [product.id])
    
    const saved = checkResult.rows[0]
    console.log('✅ Produto enriquecido com sucesso!')
    console.log(`   Title: ${saved.meta_title ? 'OK' : 'FALHOU'}`)
    console.log(`   Description: ${saved.meta_description ? 'OK' : 'FALHOU'}`)
    console.log(`   Short: ${saved.short_description ? 'OK' : 'FALHOU'}`)
    console.log(`   Tags: ${saved.tags ? 'OK' : 'FALHOU'}`)
    
    console.log('\n✅ CONCLUÍDO COM SUCESSO!\n')
    
  } catch (error) {
    console.error('❌ Erro geral:', error)
  } finally {
    await connector.disconnect()
  }
}

enrichSingleProduct().catch(console.error) 