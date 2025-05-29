#!/usr/bin/env node

import 'dotenv/config'
import { getXataClient } from '../packages/xata-client/src/xata.js'
import Anthropic from '@anthropic-ai/sdk'

console.log('🤖 Script Profissional de Enriquecimento via IA\n')

// Cliente Xata
const xata = getXataClient()

// Cliente Anthropic (Claude)
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

// Configurações
const CONFIG = {
  batchSize: 10, // Processar 10 por vez
  delayMs: 2000, // 2 segundos entre requisições
  maxRetries: 3,
  model: 'claude-3-opus-20240229' // Melhor modelo para textos
}

// Prompts otimizados para SEO e naturalidade
const PROMPTS = {
  product: `Você é um especialista em e-commerce e copywriting SEO brasileiro.

IMPORTANTE: 
- Escreva de forma NATURAL, como um humano especialista escreveria
- EVITE padrões repetitivos ou frases genéricas
- NÃO use termos como "destaca-se", "além disso", "portanto"
- Varie o vocabulário e estrutura entre produtos
- Foque em benefícios reais e específicos
- Use linguagem persuasiva mas honesta

Para o produto abaixo, crie:

1. TÍTULO SEO (máx 65 caracteres)
   - Inclua marca e principal característica
   - Otimizado para busca
   
2. DESCRIÇÃO COMPLETA (300-400 palavras)
   - Parágrafo inicial: benefício principal
   - Desenvolvimento: características únicas
   - Especificações: detalhes técnicos
   - Call to action natural
   
3. DESCRIÇÃO CURTA (150 caracteres)
   - Resumo atrativo para cards/listagens
   
4. CARACTERÍSTICAS PRINCIPAIS (5-8 itens)
   - Bullets concisos e específicos
   - Foque em diferenciais reais
   
5. ESPECIFICAÇÕES TÉCNICAS
   - Organize em formato chave: valor
   - Seja preciso e completo
   
6. TAGS SEO (15-20)
   - Palavras-chave relevantes
   - Inclua variações e sinônimos
   - Pense em long-tail keywords
   
7. META DESCRIPTION (máx 155 caracteres)
   - Otimizada para SERP
   - Com call to action

8. CATEGORIA SUGERIDA
   - Baseada na taxonomia padrão de e-commerce
   - Inclua categoria pai > subcategoria

Produto:
Nome: {name}
Preço: R$ {price}
Marca: {brand}
SKU: {sku}
Dados originais: {originalData}

Responda APENAS em JSON, sem explicações adicionais.`,

  category: `Analise este produto e sugira a melhor estrutura de categorias:

Produto: {productName}
Descrição: {description}
Tags: {tags}

Crie uma estrutura hierárquica de categorias (máximo 3 níveis) seguindo padrões de e-commerce brasileiro.
Retorne em JSON com: categoria_principal, subcategoria, sub_subcategoria (se aplicável).`
}

// Função para limpar textos de padrões de IA
function cleanAIPatterns(text) {
  // Remove padrões comuns de IA
  const patterns = [
    /^(Além disso|Portanto|Desta forma|Em resumo|Em conclusão),?\s*/gi,
    /\b(destaca-se|sobressai|evidencia-se)\b/gi,
    /\b(indubitavelmente|inquestionavelmente)\b/gi,
    /\b(revolucionário|inovador|excepcional)\b/gi, // Só se não for verdade
  ]
  
  let cleaned = text
  patterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '')
  })
  
  // Ajusta espaçamento
  cleaned = cleaned.replace(/\s+/g, ' ').trim()
  
  return cleaned
}

// Função para variar estruturas de texto
function varyTextStructure(text, index) {
  // Adiciona variação baseada no índice do produto
  const variations = [
    text, // Original
    text.replace(/\. /g, '. ').replace(/([.!?])\s+([A-Z])/g, '$1\n\n$2'), // Quebra parágrafos
    text.replace(/^(.{50,}?[.!?])\s+/, '$1\n\n'), // Quebra primeiro parágrafo
  ]
  
  return variations[index % variations.length]
}

// Função para enriquecer via Claude
async function enrichProductWithClaude(product, productIndex) {
  try {
    // Preparar dados do produto
    const productData = {
      name: product.name,
      price: product.price,
      brand: detectBrand(product.name),
      sku: product.sku,
      originalData: JSON.stringify(product.metadata?.original_data || {})
    }
    
    // Fazer requisição para Claude
    const response = await anthropic.messages.create({
      model: CONFIG.model,
      max_tokens: 2000,
      temperature: 0.7 + (productIndex % 3) * 0.1, // Varia temperatura para diversidade
      messages: [{
        role: 'user',
        content: PROMPTS.product
          .replace('{name}', productData.name)
          .replace('{price}', productData.price)
          .replace('{brand}', productData.brand)
          .replace('{sku}', productData.sku)
          .replace('{originalData}', productData.originalData)
      }]
    })
    
    // Parse da resposta
    const enrichedData = JSON.parse(response.content[0].text)
    
    // Limpar padrões de IA
    enrichedData.description = cleanAIPatterns(enrichedData.description)
    enrichedData.short_description = cleanAIPatterns(enrichedData.short_description)
    enrichedData.meta_description = cleanAIPatterns(enrichedData.meta_description)
    
    // Variar estrutura
    enrichedData.description = varyTextStructure(enrichedData.description, productIndex)
    
    // Adicionar dados de SEO
    enrichedData.seo = {
      title: enrichedData.title_seo,
      meta_description: enrichedData.meta_description,
      canonical_url: `/produto/${product.slug}`,
      structured_data: {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": product.name,
        "description": enrichedData.short_description,
        "sku": product.sku,
        "offers": {
          "@type": "Offer",
          "price": product.price,
          "priceCurrency": "BRL",
          "availability": product.stock_quantity > 0 ? "InStock" : "OutOfStock"
        }
      }
    }
    
    return enrichedData
    
  } catch (error) {
    console.error(`Erro ao enriquecer com Claude: ${error.message}`)
    throw error
  }
}

// Detectar marca do nome do produto
function detectBrand(productName) {
  const brands = [
    'Samsung', 'Apple', 'iPhone', 'Xiaomi', 'Motorola', 'LG', 'Sony',
    'Dell', 'HP', 'Lenovo', 'Asus', 'Acer', 'Microsoft',
    'Nike', 'Adidas', 'Puma', 'Reebok'
  ]
  
  const nameLower = productName.toLowerCase()
  const found = brands.find(brand => nameLower.includes(brand.toLowerCase()))
  
  return found || 'Genérico'
}

// Criar categorias automaticamente
async function createCategoryStructure(categoryData) {
  const categories = []
  
  try {
    // Criar categoria principal
    let parentCategory = await xata.db.categories
      .filter({ slug: createSlug(categoryData.categoria_principal) })
      .getFirst()
    
    if (!parentCategory) {
      parentCategory = await xata.db.categories.create({
        name: categoryData.categoria_principal,
        slug: createSlug(categoryData.categoria_principal),
        description: `Categoria principal: ${categoryData.categoria_principal}`,
        is_active: true
      })
      categories.push(parentCategory)
      console.log(`📁 Categoria criada: ${categoryData.categoria_principal}`)
    }
    
    // Criar subcategoria se existir
    if (categoryData.subcategoria) {
      let subCategory = await xata.db.categories
        .filter({ 
          slug: createSlug(categoryData.subcategoria),
          parent_id: parentCategory.id 
        })
        .getFirst()
      
      if (!subCategory) {
        subCategory = await xata.db.categories.create({
          name: categoryData.subcategoria,
          slug: createSlug(categoryData.subcategoria),
          parent_id: parentCategory.id,
          description: `Subcategoria de ${categoryData.categoria_principal}`,
          is_active: true
        })
        categories.push(subCategory)
        console.log(`  📁 Subcategoria criada: ${categoryData.subcategoria}`)
      }
      
      return subCategory.id // Retorna a subcategoria mais específica
    }
    
    return parentCategory.id
    
  } catch (error) {
    console.error('Erro ao criar categorias:', error)
    return null
  }
}

// Função auxiliar
function createSlug(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Processar produtos em lotes
async function processProductBatch(products, startIndex) {
  const results = []
  
  for (let i = 0; i < products.length; i++) {
    const product = products[i]
    const globalIndex = startIndex + i
    
    try {
      console.log(`🔄 Enriquecendo ${globalIndex + 1}: ${product.name}`)
      
      // Enriquecer com Claude
      const enrichedData = await enrichProductWithClaude(product, globalIndex)
      
      // Criar categoria se necessário
      let categoryId = product.category_id
      if (enrichedData.categoria_sugerida) {
        const newCategoryId = await createCategoryStructure(enrichedData.categoria_sugerida)
        if (newCategoryId) {
          categoryId = newCategoryId
        }
      }
      
      // Atualizar produto
      await xata.db.products.update(product.id, {
        name: enrichedData.title_seo || product.name,
        description: enrichedData.description,
        category_id: categoryId,
        tags: [...new Set([...(product.tags || []), ...enrichedData.tags_seo])],
        metadata: {
          ...product.metadata,
          needs_enrichment: false,
          enriched_at: new Date().toISOString(),
          enrichment_version: '2.0',
          seo: enrichedData.seo,
          features: enrichedData.caracteristicas_principais,
          specifications: enrichedData.especificacoes_tecnicas,
          short_description: enrichedData.short_description
        }
      })
      
      results.push({ success: true, id: product.id, name: product.name })
      console.log(`✅ Produto enriquecido com sucesso`)
      
      // Delay entre produtos
      if (i < products.length - 1) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.delayMs))
      }
      
    } catch (error) {
      console.error(`❌ Erro no produto ${product.name}: ${error.message}`)
      results.push({ success: false, id: product.id, error: error.message })
      
      // Retry logic
      if (error.message.includes('rate limit')) {
        console.log('⏳ Rate limit atingido, aguardando 30s...')
        await new Promise(resolve => setTimeout(resolve, 30000))
      }
    }
  }
  
  return results
}

// Função principal
async function enrichAllProducts() {
  try {
    console.log('🔍 Buscando produtos para enriquecer...')
    
    // Buscar todos os produtos pendentes
    const pendingProducts = await xata.db.products
      .filter({ 'metadata.needs_enrichment': true })
      .select(['id', 'name', 'price', 'sku', 'slug', 'category_id', 'tags', 'metadata'])
      .getMany({ pagination: { size: 1000 } })
    
    console.log(`📦 ${pendingProducts.length} produtos encontrados\n`)
    
    if (pendingProducts.length === 0) {
      console.log('✅ Nenhum produto pendente!')
      return
    }
    
    // Processar em lotes
    const results = {
      total: pendingProducts.length,
      success: 0,
      errors: 0,
      batches: Math.ceil(pendingProducts.length / CONFIG.batchSize)
    }
    
    for (let i = 0; i < pendingProducts.length; i += CONFIG.batchSize) {
      const batch = pendingProducts.slice(i, i + CONFIG.batchSize)
      const batchNumber = Math.floor(i / CONFIG.batchSize) + 1
      
      console.log(`\n📦 Processando lote ${batchNumber}/${results.batches}...`)
      
      const batchResults = await processProductBatch(batch, i)
      
      // Contar resultados
      batchResults.forEach(result => {
        if (result.success) results.success++
        else results.errors++
      })
      
      // Delay entre lotes
      if (i + CONFIG.batchSize < pendingProducts.length) {
        console.log('⏳ Aguardando próximo lote...')
        await new Promise(resolve => setTimeout(resolve, 5000))
      }
    }
    
    // Resumo final
    console.log('\n📊 Enriquecimento Concluído!')
    console.log(`✅ Sucesso: ${results.success} produtos`)
    console.log(`❌ Erros: ${results.errors} produtos`)
    console.log(`📦 Lotes processados: ${results.batches}`)
    
    // Salvar relatório
    const report = {
      timestamp: new Date().toISOString(),
      results,
      model: CONFIG.model,
      version: '2.0'
    }
    
    await fs.writeFile(
      `enrichment-report-${Date.now()}.json`,
      JSON.stringify(report, null, 2)
    )
    
  } catch (error) {
    console.error('❌ Erro fatal:', error)
    throw error
  }
}

// Imports necessários
import fs from 'fs/promises'

// Executar
async function main() {
  const args = process.argv.slice(2)
  
  if (args.includes('--test')) {
    // Modo teste - apenas 5 produtos
    console.log('🧪 Modo teste - processando apenas 5 produtos')
    CONFIG.batchSize = 5
  }
  
  await enrichAllProducts()
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}

export { enrichProductWithClaude, enrichAllProducts } 