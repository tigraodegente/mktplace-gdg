#!/usr/bin/env node

import 'dotenv/config'
import { Database } from '../packages/db-hyperdrive/dist/index.js'

console.log('🔍 Otimizando índices para busca...\n')

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

async function createSearchIndexes() {
  try {
    // Índice GIN para busca full-text em português
    console.log('📚 Criando índice full-text...')
    await db.execute`
      CREATE INDEX IF NOT EXISTS idx_products_search_text 
      ON products 
      USING GIN (to_tsvector('portuguese', name || ' ' || COALESCE(description, '')))
    `
    
    // Índice GIN para busca fuzzy (trigram)
    console.log('🔤 Criando índice para busca fuzzy...')
    await db.execute`
      CREATE INDEX IF NOT EXISTS idx_products_name_trgm 
      ON products 
      USING GIN (name gin_trgm_ops)
    `
    
    // Índice para busca em tags (array)
    console.log('🏷️ Criando índice para tags...')
    await db.execute`
      CREATE INDEX IF NOT EXISTS idx_products_tags 
      ON products 
      USING GIN (tags)
    `
    
    // Índice composto para filtros comuns
    console.log('🎯 Criando índices para filtros...')
    await db.execute`
      CREATE INDEX IF NOT EXISTS idx_products_filters 
      ON products (is_active, quantity, category_id, brand_id, price)
      WHERE is_active = true AND quantity > 0
    `
    
    // Índice para ordenação por vendas
    console.log('📊 Criando índice para ordenação por vendas...')
    await db.execute`
      CREATE INDEX IF NOT EXISTS idx_products_sales 
      ON products (sales_count DESC, created_at DESC)
      WHERE is_active = true
    `
    
    // Índice para SKU (busca exata)
    console.log('🔢 Criando índice para SKU...')
    await db.execute`
      CREATE INDEX IF NOT EXISTS idx_products_sku 
      ON products (UPPER(sku))
      WHERE sku IS NOT NULL
    `
    
    // Índice para search_history
    console.log('📝 Criando índices para histórico de busca...')
    await db.execute`
      CREATE INDEX IF NOT EXISTS idx_search_history_query 
      ON search_history (query, created_at DESC)
    `
    
    await db.execute`
      CREATE INDEX IF NOT EXISTS idx_search_history_session 
      ON search_history (session_id, created_at DESC)
      WHERE session_id IS NOT NULL
    `
    
    // Índice para popular_searches
    console.log('🔥 Criando índices para buscas populares...')
    await db.execute`
      CREATE INDEX IF NOT EXISTS idx_popular_searches_period 
      ON popular_searches (period_end DESC, search_count DESC)
    `
    
    // Atualizar estatísticas
    console.log('📈 Atualizando estatísticas do banco...')
    await db.execute`ANALYZE products`
    await db.execute`ANALYZE search_history`
    await db.execute`ANALYZE popular_searches`
    
    console.log('\n✅ Índices criados com sucesso!')
    
    // Verificar índices criados
    console.log('\n📋 Índices existentes:')
    const indexes = await db.query`
      SELECT 
        schemaname,
        tablename,
        indexname,
        pg_size_pretty(pg_relation_size(indexrelid)) as size
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename IN ('products', 'search_history', 'popular_searches')
      ORDER BY tablename, indexname
    `
    
    indexes.forEach(idx => {
      console.log(`  - ${idx.tablename}.${idx.indexname} (${idx.size})`)
    })
    
  } catch (error) {
    console.error('❌ Erro ao criar índices:', error)
    throw error
  } finally {
    await db.close()
  }
}

createSearchIndexes().catch(console.error) 