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

async function testSingleProduct() {
  console.log('🧪 TESTE DE ENRIQUECIMENTO - 1 PRODUTO\n')
  console.log('=' .repeat(50) + '\n')
  
  const connector = new DatabaseConnector({ forceConnection: true })
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  
  try {
    await connector.connectNeon()
    
    // Buscar apenas 1 produto
    console.log('📦 Buscando 1 produto para teste...\n')
    
    const result = await connector.queryNeon(`
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
      LIMIT 1
    `)
    
    if (result.rows.length === 0) {
      console.log('✅ Todos os produtos já foram enriquecidos!')
      return
    }
    
    const product = result.rows[0]
    console.log('Produto selecionado:')
    console.log(`Nome: ${product.name}`)
    console.log(`SKU: ${product.sku}`)
    console.log(`Preço: R$ ${product.price}`)
    console.log(`Categoria: ${product.category_name || 'Sem categoria'}\n`)
    
    // Teste 1: Gerar SEO Title
    console.log('📝 TESTE 1: Gerando SEO Title...')
    
    const titlePrompt = `
Você é um especialista em SEO para e-commerce de produtos infantis.

Crie um título SEO para:
Produto: ${product.name}
Categoria: ${product.category_name || 'Produtos Infantis'}

INSTRUÇÕES:
- Máximo 60 caracteres
- Inclua o nome do produto
- Seja atrativo e claro

Responda APENAS com o título, sem explicações.`

    try {
      const titleResponse = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [{
          role: 'user',
          content: titlePrompt
        }],
        temperature: 0.7,
        max_tokens: 100
      })
      
      const seoTitle = titleResponse.choices[0].message.content.trim()
      console.log(`✅ Título gerado: "${seoTitle}"`)
      console.log(`   Comprimento: ${seoTitle.length} caracteres`)
      console.log(`   Tokens usados: ${titleResponse.usage.total_tokens}`)
      
      // Salvar no banco
      console.log('\n💾 Salvando no banco...')
      
      await connector.queryNeon(`
        UPDATE products 
        SET 
          meta_title = $1,
          updated_at = NOW()
        WHERE id = $2
      `, [seoTitle, product.id])
      
      console.log('✅ Salvo com sucesso!')
      
      // Verificar se foi salvo
      console.log('\n🔍 Verificando se foi salvo...')
      
      const checkResult = await connector.queryNeon(`
        SELECT meta_title, updated_at
        FROM products
        WHERE id = $1
      `, [product.id])
      
      const saved = checkResult.rows[0]
      console.log(`Meta Title no banco: "${saved.meta_title}"`)
      console.log(`Atualizado em: ${new Date(saved.updated_at).toLocaleString('pt-BR')}`)
      
    } catch (error) {
      console.error('❌ Erro ao gerar título:', error.message)
      if (error.response) {
        console.error('Detalhes:', error.response.data)
      }
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error)
  } finally {
    await connector.disconnect()
  }
}

testSingleProduct().catch(console.error) 