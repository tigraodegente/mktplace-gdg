#!/usr/bin/env node

import 'dotenv/config'
import { Database } from '../apps/store/src/lib/db/database.js'

console.log('🔍 Visualizando analytics de busca...\n')

const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres@localhost/mktplace_dev'
const isLocal = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')

const db = new Database({
  provider: 'postgres',
  connectionString: dbUrl,
  options: {
    postgres: {
      ssl: isLocal ? false : 'require'
    }
  }
})

async function viewSearchAnalytics() {
  try {
    // 1. Termos mais populares
    console.log('🔥 Top 10 Termos Mais Buscados:')
    console.log('================================')
    const popularTerms = await db.query`
      SELECT term, search_count, click_count, last_searched_at
      FROM popular_searches
      ORDER BY search_count DESC
      LIMIT 10
    `
    
    popularTerms.forEach((term, index) => {
      const ctr = term.search_count > 0 ? ((term.click_count / term.search_count) * 100).toFixed(1) : 0
      console.log(`${index + 1}. "${term.term}" - ${term.search_count} buscas, ${term.click_count} cliques (CTR: ${ctr}%)`)
    })
    
    // 2. Histórico recente
    console.log('\n📊 Últimas 10 Buscas:')
    console.log('====================')
    const recentSearches = await db.query`
      SELECT 
        query,
        results_count,
        clicked_product_id,
        clicked_position,
        created_at,
        user_id IS NOT NULL as is_logged_in
      FROM search_history
      ORDER BY created_at DESC
      LIMIT 10
    `
    
    recentSearches.forEach(search => {
      const date = new Date(search.created_at).toLocaleString('pt-BR')
      const clicked = search.clicked_product_id ? `✓ Clicou (posição ${search.clicked_position})` : '✗ Não clicou'
      const user = search.is_logged_in ? '👤' : '👻'
      console.log(`${user} "${search.query}" - ${search.results_count} resultados - ${clicked} - ${date}`)
    })
    
    // 3. Estatísticas gerais
    console.log('\n📈 Estatísticas Gerais:')
    console.log('======================')
    
    const stats = await db.queryOne`
      SELECT 
        COUNT(DISTINCT query) as unique_queries,
        COUNT(*) as total_searches,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT session_id) as unique_sessions,
        COUNT(clicked_product_id) as searches_with_clicks,
        AVG(results_count) as avg_results_per_search
      FROM search_history
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    `
    
    console.log(`Total de buscas (30 dias): ${stats.total_searches}`)
    console.log(`Termos únicos buscados: ${stats.unique_queries}`)
    console.log(`Usuários únicos: ${stats.unique_users || 0}`)
    console.log(`Sessões únicas: ${stats.unique_sessions || 0}`)
    console.log(`Buscas com cliques: ${stats.searches_with_clicks} (${((stats.searches_with_clicks / stats.total_searches) * 100).toFixed(1)}%)`)
    console.log(`Média de resultados por busca: ${Math.round(stats.avg_results_per_search || 0)}`)
    
    // 4. Buscas sem resultados
    console.log('\n🚫 Buscas Sem Resultados (últimas 5):')
    console.log('=====================================')
    const noResults = await db.query`
      SELECT DISTINCT query, COUNT(*) as count
      FROM search_history
      WHERE results_count = 0
      GROUP BY query
      ORDER BY count DESC
      LIMIT 5
    `
    
    if (noResults.length === 0) {
      console.log('Nenhuma busca sem resultados! 🎉')
    } else {
      noResults.forEach(search => {
        console.log(`"${search.query}" - ${search.count} tentativas`)
      })
    }
    
    // 5. Sugestões customizadas
    console.log('\n💡 Sugestões Customizadas Ativas:')
    console.log('=================================')
    const suggestions = await db.query`
      SELECT term, suggestion_type, priority
      FROM search_suggestions
      WHERE is_active = true
      ORDER BY priority DESC
    `
    
    suggestions.forEach(sugg => {
      console.log(`"${sugg.term}" (${sugg.suggestion_type}) - Prioridade: ${sugg.priority}`)
    })
    
  } catch (error) {
    console.error('❌ Erro ao visualizar analytics:', error)
    throw error
  } finally {
    await db.close()
  }
}

viewSearchAnalytics().catch(console.error) 