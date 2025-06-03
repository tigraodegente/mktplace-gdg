#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'

async function checkProgress() {
  const connector = new DatabaseConnector({ forceConnection: true })
  
  try {
    await connector.connectNeon()
    
    console.log('📊 VERIFICANDO PROGRESSO DO ENRIQUECIMENTO\n')
    console.log('=' .repeat(50) + '\n')
    
    // Contar produtos enriquecidos
    const enrichedResult = await connector.queryNeon(`
      SELECT 
        COUNT(*) as total,
        COUNT(meta_title) as with_meta_title,
        COUNT(meta_description) as with_meta_description,
        COUNT(short_description) as with_short_description,
        COUNT(tags) as with_tags
      FROM products
    `)
    
    const stats = enrichedResult.rows[0]
    console.log('📈 ESTATÍSTICAS GERAIS:')
    console.log(`Total de produtos: ${stats.total}`)
    console.log(`Com SEO Title: ${stats.with_meta_title} (${((stats.with_meta_title/stats.total)*100).toFixed(1)}%)`)
    console.log(`Com Meta Description: ${stats.with_meta_description} (${((stats.with_meta_description/stats.total)*100).toFixed(1)}%)`)
    console.log(`Com Descrição Curta: ${stats.with_short_description} (${((stats.with_short_description/stats.total)*100).toFixed(1)}%)`)
    console.log(`Com Tags: ${stats.with_tags} (${((stats.with_tags/stats.total)*100).toFixed(1)}%)`)
    
    // Últimos produtos enriquecidos
    console.log('\n🆕 ÚLTIMOS 5 PRODUTOS ENRIQUECIDOS:\n')
    
    const recentResult = await connector.queryNeon(`
      SELECT 
        name,
        meta_title,
        meta_description,
        updated_at
      FROM products
      WHERE meta_title IS NOT NULL
      ORDER BY updated_at DESC
      LIMIT 5
    `)
    
    recentResult.rows.forEach((product, i) => {
      console.log(`${i + 1}. ${product.name}`)
      console.log(`   📝 "${product.meta_title}"`)
      console.log(`   🕐 ${new Date(product.updated_at).toLocaleString('pt-BR')}\n`)
    })
    
    // Exemplo completo
    if (recentResult.rows.length > 0) {
      console.log('=' .repeat(50))
      console.log('\n👀 EXEMPLO COMPLETO DO PRIMEIRO:\n')
      
      const exampleResult = await connector.queryNeon(`
        SELECT 
          name,
          meta_title,
          meta_description,
          short_description,
          tags,
          meta_keywords
        FROM products
        WHERE meta_title IS NOT NULL
        ORDER BY updated_at DESC
        LIMIT 1
      `)
      
      const example = exampleResult.rows[0]
      console.log(`📦 ${example.name}\n`)
      console.log(`🏷️  SEO Title (${example.meta_title.length} chars):`)
      console.log(`   "${example.meta_title}"\n`)
      console.log(`📝 Meta Description (${example.meta_description.length} chars):`)
      console.log(`   "${example.meta_description}"\n`)
      console.log(`💬 Descrição Curta:`)
      console.log(`   "${example.short_description}"\n`)
      console.log(`🏷️  Tags:`)
      console.log(`   ${JSON.parse(example.tags).join(', ')}\n`)
      console.log(`🔑 Keywords:`)
      console.log(`   ${example.meta_keywords}`)
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await connector.disconnect()
  }
}

checkProgress() 