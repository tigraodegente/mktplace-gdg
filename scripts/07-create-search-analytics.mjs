#!/usr/bin/env node

import 'dotenv/config'
import { Database } from '../apps/store/src/lib/db/database.js'

console.log('🔍 Criando tabelas de analytics de busca...\n')

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

async function createSearchAnalytics() {
  try {
    // 1. Tabela de histórico de buscas
    console.log('📊 Criando tabela search_history...')
    await db.execute`
      CREATE TABLE IF NOT EXISTS search_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        query TEXT NOT NULL,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        session_id VARCHAR(100),
        results_count INTEGER DEFAULT 0,
        clicked_position INTEGER,
        clicked_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `
    
    // 2. Tabela de termos populares agregados
    console.log('🔥 Criando tabela popular_searches...')
    await db.execute`
      CREATE TABLE IF NOT EXISTS popular_searches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        term TEXT NOT NULL UNIQUE,
        search_count INTEGER DEFAULT 1,
        click_count INTEGER DEFAULT 0,
        conversion_count INTEGER DEFAULT 0,
        last_searched_at TIMESTAMP NOT NULL DEFAULT NOW(),
        period_start DATE NOT NULL DEFAULT CURRENT_DATE,
        period_end DATE NOT NULL DEFAULT CURRENT_DATE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `
    
    // 3. Tabela de sugestões de busca customizadas
    console.log('💡 Criando tabela search_suggestions...')
    await db.execute`
      CREATE TABLE IF NOT EXISTS search_suggestions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        term TEXT NOT NULL,
        suggestion_type VARCHAR(50) NOT NULL DEFAULT 'autocomplete',
        priority INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `
    
    // 4. Índices para performance
    console.log('🚀 Criando índices...')
    await db.execute`CREATE INDEX IF NOT EXISTS idx_search_history_query ON search_history(query)`
    await db.execute`CREATE INDEX IF NOT EXISTS idx_search_history_created_at ON search_history(created_at)`
    await db.execute`CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id)`
    await db.execute`CREATE INDEX IF NOT EXISTS idx_popular_searches_term ON popular_searches(term)`
    await db.execute`CREATE INDEX IF NOT EXISTS idx_popular_searches_count ON popular_searches(search_count DESC)`
    await db.execute`CREATE INDEX IF NOT EXISTS idx_search_suggestions_term ON search_suggestions(term)`
    
    // 5. Função para atualizar termos populares
    console.log('⚙️ Criando função de agregação...')
    await db.execute`
      CREATE OR REPLACE FUNCTION update_popular_searches()
      RETURNS void AS $$
      BEGIN
        -- Inserir ou atualizar termos populares baseado no histórico dos últimos 30 dias
        INSERT INTO popular_searches (term, search_count, period_start, period_end)
        SELECT 
          LOWER(TRIM(query)) as term,
          COUNT(*) as search_count,
          CURRENT_DATE - INTERVAL '30 days' as period_start,
          CURRENT_DATE as period_end
        FROM search_history
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
          AND query IS NOT NULL
          AND TRIM(query) != ''
        GROUP BY LOWER(TRIM(query))
        HAVING COUNT(*) >= 3  -- Mínimo de 3 buscas para ser considerado popular
        ON CONFLICT (term) DO UPDATE
        SET 
          search_count = EXCLUDED.search_count,
          last_searched_at = NOW(),
          period_end = EXCLUDED.period_end,
          updated_at = NOW();
      END;
      $$ LANGUAGE plpgsql;
    `
    
    // 6. Inserir alguns termos populares iniciais (baseados nos produtos existentes)
    console.log('🌱 Inserindo termos populares iniciais...')
    await db.execute`
      INSERT INTO popular_searches (term, search_count, click_count)
      VALUES 
        ('samsung', 150, 45),
        ('iphone', 120, 38),
        ('galaxy', 95, 28),
        ('notebook', 85, 25),
        ('fone de ouvido', 75, 22),
        ('tv', 70, 20),
        ('playstation', 65, 19),
        ('xbox', 60, 18),
        ('smartphone', 55, 16),
        ('monitor', 50, 15)
      ON CONFLICT (term) DO NOTHING
    `
    
    // 7. Inserir sugestões customizadas
    console.log('💫 Inserindo sugestões customizadas...')
    await db.execute`
      INSERT INTO search_suggestions (term, suggestion_type, priority)
      VALUES 
        ('promoção', 'promo', 100),
        ('frete grátis', 'shipping', 90),
        ('lançamento', 'new', 80),
        ('mais vendidos', 'popular', 70),
        ('oferta do dia', 'daily', 60)
      ON CONFLICT DO NOTHING
    `
    
    console.log('\n✅ Tabelas de analytics de busca criadas com sucesso!')
    
    // Executar agregação inicial
    console.log('\n📈 Executando agregação inicial...')
    await db.execute`SELECT update_popular_searches()`
    
    console.log('✨ Analytics de busca configurado!')
    
  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error)
    throw error
  } finally {
    await db.close()
  }
}

createSearchAnalytics().catch(console.error) 