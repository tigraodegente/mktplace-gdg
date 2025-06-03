#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'
import OpenAI from 'openai'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Configuração
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

// Carregar variáveis de ambiente
dotenv.config({ path: path.join(rootDir, '.env.local') })

// Configurações
const config = {
  model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
  batchSize: 10, // Começar com 10 produtos
  delayBetweenItems: 1000, // 1 segundo entre items
  maxRetries: 3,
  temperatures: {
    seoTitle: 0.7,
    metaDescription: 0.8,
    shortDescription: 0.9,
    tags: 0.3,
    specifications: 0.5
  }
}

// Tracker de custos
const costTracker = {
  totalTokens: 0,
  totalCost: 0,
  productCount: 0,
  startTime: Date.now()
}

// Prompts anti-detecção
const MASTER_PROMPT = `
Você é um especialista em produtos infantis escrevendo para o e-commerce Grão de Gente.

REGRAS CRÍTICAS PARA CONTEÚDO NÃO DETECTÁVEL:

1. VARIAÇÃO OBRIGATÓRIA:
   - Nunca use a mesma estrutura duas vezes
   - Alterne entre frases curtas e longas
   - Varie início das frases

2. LINGUAGEM NATURAL:
   - Escreva como um brasileiro real falaria
   - Use expressões coloquiais ocasionalmente ("super macio", "uma gracinha")
   - Inclua detalhes específicos que humanos notariam

3. IMPERFEIÇÕES HUMANAS:
   - Ocasionalmente use reticências...
   - Varie uso de exclamações
   - Às vezes seja mais informal, outras mais profissional

4. EVITE SEMPRE:
   - Palavras muito rebuscadas
   - Estruturas perfeitas demais
   - Repetição de adjetivos
   - Padrões óbvios de template
`

// Funções de prompt
function getSeoTitlePrompt(product) {
  return `${MASTER_PROMPT}

Crie um título SEO para:
Produto: ${product.name}
Categoria: ${product.category_name || 'Produtos Infantis'}

INSTRUÇÕES:
- Máximo 60 caracteres
- Inclua palavra-chave principal naturalmente
- Varie a estrutura (não sempre "Produto - Categoria | Loja")

EXEMPLOS DE VARIAÇÃO:
- "Almofada Nuvem Rosa para Bebê | Grão de Gente"
- "Decoração Infantil - Almofada Estrela Azul"
- "Kit Berço Safari Completo 7 Peças - GDG"

Gere APENAS o título, sem explicações.`
}

function getMetaDescriptionPrompt(product) {
  return `${MASTER_PROMPT}

Crie uma meta description para:
Produto: ${product.name}
Preço: R$ ${product.price}
Categoria: ${product.category_name || 'Produtos Infantis'}

VARIE ENTRE ESTES ESTILOS:
1. Começar com pergunta: "Procurando almofada para bebê?"
2. Começar com benefício: "Decore o quarto com nossa..."
3. Começar com o produto: "Almofada Nuvem em algodão..."
4. Começar com ação: "Compre almofada decorativa..."

Incluir (varie a ordem):
- Descrição do produto
- Material ou qualidade
- Benefício principal
- Menção a frete/parcelas (nem sempre)

NÃO use sempre 160 chars. Varie entre 145-160.

Gere APENAS a descrição, sem explicações.`
}

function getShortDescriptionPrompt(product) {
  return `${MASTER_PROMPT}

Crie uma descrição curta e persuasiva para:
Produto: ${product.name}
Descrição atual: ${product.description}

INSTRUÇÕES:
- 2-3 frases no máximo
- Destaque benefícios principais
- Use linguagem emotiva mas natural
- Varie o estilo (às vezes técnico, às vezes emocional)

Gere APENAS a descrição curta, sem explicações.`
}

function getTagsPrompt(product) {
  return `${MASTER_PROMPT}

Gere tags de busca para:
Produto: ${product.name}
Categoria: ${product.category_name || 'Produtos Infantis'}
Descrição: ${product.description}

INSTRUÇÕES:
- Gere entre 5-10 tags
- Misture tags gerais e específicas
- Inclua variações de busca
- Pense como um cliente buscaria

Formato: tag1, tag2, tag3, tag4, tag5

Gere APENAS as tags separadas por vírgula, sem explicações.`
}

// Função de humanização
function humanizeContent(text, type) {
  // Variações regionais brasileiras
  const variations = {
    "bebê": ["bebê", "neném", "baby"],
    "criança": ["criança", "pequeno", "pequenino"],
    "bonito": ["bonito", "lindo", "fofo", "uma graça"],
    "comprar": ["comprar", "adquirir", "garantir o seu"]
  }
  
  // Aplicar variações aleatoriamente
  Object.keys(variations).forEach(key => {
    if (text.includes(key) && Math.random() < 0.3) {
      const options = variations[key]
      const replacement = options[Math.floor(Math.random() * options.length)]
      text = text.replace(key, replacement)
    }
  })
  
  // Ajustar comprimento para meta description
  if (type === 'metaDescription') {
    const targetLength = 145 + Math.floor(Math.random() * 15)
    if (text.length > targetLength) {
      text = text.substring(0, targetLength).trim()
    }
  }
  
  return text
}

// Função principal de enriquecimento
async function enrichProduct(product, openai, connector) {
  console.log(`\n🔄 Processando: ${product.name}`)
  
  try {
    const enrichedData = {}
    let productTokens = 0 // Contador de tokens para este produto apenas
    
    // 1. SEO Title
    console.log('  📝 Gerando SEO title...')
    const titleResponse = await openai.chat.completions.create({
      model: config.model,
      messages: [{
        role: 'user',
        content: getSeoTitlePrompt(product)
      }],
      temperature: config.temperatures.seoTitle,
      max_tokens: 100
    })
    
    enrichedData.meta_title = humanizeContent(
      titleResponse.choices[0].message.content.trim(),
      'seoTitle'
    )
    
    // Tracking de custos
    productTokens += titleResponse.usage.total_tokens
    
    // 2. Meta Description
    console.log('  📝 Gerando meta description...')
    const descResponse = await openai.chat.completions.create({
      model: config.model,
      messages: [{
        role: 'user',
        content: getMetaDescriptionPrompt(product)
      }],
      temperature: config.temperatures.metaDescription,
      max_tokens: 200
    })
    
    enrichedData.meta_description = humanizeContent(
      descResponse.choices[0].message.content.trim(),
      'metaDescription'
    )
    
    productTokens += descResponse.usage.total_tokens
    
    // 3. Short Description
    console.log('  📝 Gerando descrição curta...')
    const shortDescResponse = await openai.chat.completions.create({
      model: config.model,
      messages: [{
        role: 'user',
        content: getShortDescriptionPrompt(product)
      }],
      temperature: config.temperatures.shortDescription,
      max_tokens: 150
    })
    
    enrichedData.short_description = shortDescResponse.choices[0].message.content.trim()
    productTokens += shortDescResponse.usage.total_tokens
    
    // 4. Tags
    console.log('  📝 Gerando tags...')
    const tagsResponse = await openai.chat.completions.create({
      model: config.model,
      messages: [{
        role: 'user',
        content: getTagsPrompt(product)
      }],
      temperature: config.temperatures.tags,
      max_tokens: 100
    })
    
    const tagsText = tagsResponse.choices[0].message.content.trim()
    enrichedData.tags = tagsText.split(',').map(tag => tag.trim())
    
    productTokens += tagsResponse.usage.total_tokens
    
    // 5. Keywords (baseado nas tags)
    enrichedData.meta_keywords = enrichedData.tags.slice(0, 8).join(', ')
    
    // Calcular custo deste produto
    const inputCost = (productTokens / 1000) * 0.01
    const outputCost = (productTokens / 1000) * 0.03
    const productCost = inputCost + outputCost
    
    // Atualizar totais gerais
    costTracker.totalTokens += productTokens
    costTracker.totalCost += productCost
    
    console.log(`  ✅ Concluído! Tokens: ${productTokens} | Custo: $${productCost.toFixed(4)}`)
    
    // Salvar no banco
    console.log('  💾 Salvando no banco...')
    await connector.queryNeon(`
      UPDATE products 
      SET 
        meta_title = $1,
        meta_description = $2,
        short_description = $3,
        tags = $4::jsonb,
        meta_keywords = $5,
        updated_at = NOW()
      WHERE id = $6
    `, [
      enrichedData.meta_title,
      enrichedData.meta_description,
      enrichedData.short_description,
      JSON.stringify(enrichedData.tags),
      enrichedData.meta_keywords,
      product.id
    ])
    
    console.log('  ✅ Salvo com sucesso!')
    
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
  console.log('🚀 INICIANDO ENRIQUECIMENTO DE PRODUTOS COM IA\n')
  console.log('=' .repeat(60) + '\n')
  
  // Verificar configuração
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY não configurada!')
    console.error('Execute primeiro: node scripts/setup-and-test-env.mjs')
    process.exit(1)
  }
  
  const connector = new DatabaseConnector({ forceConnection: true })
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  
  try {
    await connector.connectNeon()
    
    // Buscar produtos para enriquecer
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
         OR p.short_description IS NULL
      ORDER BY p.price DESC
      LIMIT $1
    `, [config.batchSize])
    
    const products = productsResult.rows
    
    if (products.length === 0) {
      console.log('✅ Todos os produtos já foram enriquecidos!')
      return
    }
    
    console.log(`📦 ${products.length} produtos encontrados para enriquecimento\n`)
    console.log('Produtos a processar:')
    products.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.name} (${p.sku})`)
    })
    
    // Confirmar antes de prosseguir
    console.log('\n⚠️  ATENÇÃO:')
    console.log(`Custo estimado: ~$${(products.length * 0.02).toFixed(2)}`)
    console.log('Processando em 3 segundos... (Ctrl+C para cancelar)\n')
    
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // Processar produtos
    console.log('🔄 INICIANDO PROCESSAMENTO...\n')
    
    for (let i = 0; i < products.length; i++) {
      const product = products[i]
      console.log(`\n[${i + 1}/${products.length}] Processando...`)
      
      try {
        await enrichProduct(product, openai, connector)
        costTracker.productCount++
      } catch (error) {
        console.error(`❌ Erro no produto ${product.name}:`, error.message)
        
        if (error.message.includes('rate limit')) {
          console.log('⏳ Rate limit atingido. Aguardando 60 segundos...')
          await new Promise(resolve => setTimeout(resolve, 60000))
          i-- // Tentar novamente
        }
      }
    }
    
    // Resumo final
    const duration = (Date.now() - costTracker.startTime) / 1000
    console.log('\n' + '=' .repeat(60))
    console.log('\n📊 RESUMO DO PROCESSAMENTO:\n')
    console.log(`✅ Produtos processados: ${costTracker.productCount}`)
    console.log(`💰 Custo total: $${costTracker.totalCost.toFixed(4)}`)
    console.log(`📝 Tokens usados: ${costTracker.totalTokens.toLocaleString()}`)
    console.log(`⏱️  Tempo total: ${duration.toFixed(0)}s`)
    console.log(`💵 Custo médio por produto: $${(costTracker.totalCost / costTracker.productCount).toFixed(4)}`)
    
    // Mostrar preview de um produto
    if (costTracker.productCount > 0) {
      console.log('\n👀 PREVIEW DE UM PRODUTO ENRIQUECIDO:\n')
      
      const previewResult = await connector.queryNeon(`
        SELECT 
          name,
          meta_title,
          meta_description,
          short_description,
          tags
        FROM products
        WHERE id = $1
      `, [products[0].id])
      
      const preview = previewResult.rows[0]
      console.log(`📦 ${preview.name}`)
      console.log(`\n🏷️  SEO Title:\n   "${preview.meta_title}"`)
      console.log(`\n📝 Meta Description:\n   "${preview.meta_description}"`)
      console.log(`\n💬 Descrição Curta:\n   "${preview.short_description}"`)
      console.log(`\n🏷️  Tags:\n   ${JSON.parse(preview.tags).join(', ')}`)
    }
    
    console.log('\n✅ ENRIQUECIMENTO CONCLUÍDO COM SUCESSO!\n')
    
  } catch (error) {
    console.error('❌ Erro geral:', error)
  } finally {
    await connector.disconnect()
  }
}

// Executar
main().catch(console.error) 