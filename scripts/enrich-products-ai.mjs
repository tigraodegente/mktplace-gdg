#!/usr/bin/env node

import 'dotenv/config'
import { getXataClient } from '../packages/xata-client/src/xata.js'

console.log('🤖 Script de Enriquecimento de Produtos via IA\n')

// Cliente Xata
const xata = getXataClient()

// Configuração da API de IA (você pode usar OpenAI, Claude, etc)
const AI_CONFIG = {
  // Adicione sua configuração de API aqui
  apiKey: process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY,
  model: 'gpt-4' // ou 'claude-3'
}

// Template de prompt para enriquecimento
const ENRICHMENT_PROMPT = `
Você é um especialista em e-commerce e copywriting. 
Dado o seguinte produto com informações básicas, crie:

1. Uma descrição detalhada e atrativa (200-300 palavras)
2. Lista de características principais (5-8 itens)
3. Especificações técnicas detalhadas
4. Tags relevantes para SEO (10-15 tags)
5. Sugestões de categorização

Produto:
Nome: {name}
Preço: R$ {price}
SKU: {sku}
Dados originais: {originalData}

Responda em formato JSON estruturado.
`

// Função para enriquecer produto via IA
async function enrichProductWithAI(product) {
  // Aqui você implementaria a chamada para sua API de IA preferida
  // Este é um exemplo de estrutura
  
  const enrichedData = {
    description: `${product.name} - Produto de alta qualidade com excelente custo-benefício. 
    Ideal para quem busca qualidade e durabilidade. 
    [Esta é uma descrição temporária que será substituída pela IA]`,
    
    features: [
      'Alta qualidade',
      'Durabilidade garantida',
      'Design moderno',
      'Fácil utilização',
      'Garantia do fabricante'
    ],
    
    specifications: {
      material: 'Premium',
      origem: 'Nacional',
      garantia: '12 meses',
      certificacoes: ['ISO 9001', 'INMETRO']
    },
    
    seo_tags: [
      product.name.toLowerCase(),
      'comprar online',
      'melhor preço',
      'frete grátis',
      'promoção'
    ],
    
    suggested_categories: ['produtos-gerais']
  }
  
  return enrichedData
}

// Função para processar produtos pendentes
async function enrichPendingProducts() {
  try {
    // 1. Buscar produtos que precisam de enriquecimento
    console.log('🔍 Buscando produtos pendentes de enriquecimento...')
    
    const pendingProducts = await xata.db.products
      .filter({
        'metadata.needs_enrichment': true
      })
      .getMany({ pagination: { size: 100 } })
    
    console.log(`✅ ${pendingProducts.length} produtos encontrados\n`)
    
    if (pendingProducts.length === 0) {
      console.log('Nenhum produto pendente de enriquecimento!')
      return
    }
    
    // 2. Processar cada produto
    const results = {
      success: 0,
      errors: 0,
      details: []
    }
    
    for (let i = 0; i < pendingProducts.length; i++) {
      const product = pendingProducts[i]
      
      try {
        console.log(`🔄 Processando ${i + 1}/${pendingProducts.length}: ${product.name}`)
        
        // Enriquecer via IA
        const enrichedData = await enrichProductWithAI(product)
        
        // Atualizar produto no banco
        await xata.db.products.update(product.id, {
          description: enrichedData.description,
          tags: [...(product.tags || []), ...enrichedData.seo_tags],
          metadata: {
            ...product.metadata,
            needs_enrichment: false,
            enriched_at: new Date().toISOString(),
            enrichment_data: {
              features: enrichedData.features,
              specifications: enrichedData.specifications,
              suggested_categories: enrichedData.suggested_categories
            }
          }
        })
        
        console.log(`✅ Produto enriquecido com sucesso`)
        results.success++
        results.details.push({
          id: product.id,
          name: product.name,
          enriched: true
        })
        
        // Delay para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 1000))
        
      } catch (error) {
        console.error(`❌ Erro ao enriquecer produto: ${error.message}`)
        results.errors++
      }
    }
    
    // 3. Resumo final
    console.log('\n📊 Resumo do Enriquecimento:')
    console.log(`✅ Sucesso: ${results.success} produtos`)
    console.log(`❌ Erros: ${results.errors} produtos`)
    
    return results
    
  } catch (error) {
    console.error('❌ Erro fatal:', error)
    throw error
  }
}

// Função para verificar produtos pendentes
async function checkPendingProducts() {
  const stats = await xata.db.products.aggregate({
    needsEnrichment: {
      count: {
        filter: {
          'metadata.needs_enrichment': true
        }
      }
    },
    enriched: {
      count: {
        filter: {
          'metadata.needs_enrichment': false
        }
      }
    },
    total: {
      count: '*'
    }
  })
  
  console.log('\n📈 Estatísticas de Enriquecimento:')
  console.log(`📦 Total de produtos: ${stats.total}`)
  console.log(`⏳ Pendentes: ${stats.needsEnrichment}`)
  console.log(`✅ Enriquecidos: ${stats.enriched}`)
  
  return stats
}

// Executar enriquecimento
async function main() {
  const args = process.argv.slice(2)
  
  if (args.includes('--check')) {
    // Apenas verificar estatísticas
    await checkPendingProducts()
  } else {
    // Executar enriquecimento
    await enrichPendingProducts()
    
    // Mostrar estatísticas finais
    await checkPendingProducts()
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}

export { enrichProductWithAI, enrichPendingProducts } 