#!/usr/bin/env node

import fs from 'fs'
import pg from 'pg'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const { Pool } = pg
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

console.log('🚀 Executando migration do Sistema de Atendimento Unificado...\n')

// DATABASE_URL deve ser definida como variável de ambiente
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_wS8ux1paQcY@ep-raspy-meadow-acds6p80-pooler.sa-east-1.aws.neon.tech/neondb'

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

try {
  console.log('📊 Lendo arquivo de migration...')
  
  const migrationPath = join(__dirname, 'sql-migrations', 'create_unified_support_system.sql')
  const sql = fs.readFileSync(migrationPath, 'utf8')
  
  console.log('🔧 Executando migration...')
  
  // Executar a migration
  await pool.query(sql)
  
  console.log('✅ Migration executada com sucesso!\n')
  
  // Verificar tabelas criadas
  const result = await pool.query(`
    SELECT 
      table_name, 
      (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
    FROM information_schema.tables t 
    WHERE table_schema = 'public' 
      AND table_name IN ('support_categories', 'faq_categories', 'faq_items', 'faq_feedback')
    ORDER BY table_name
  `)
  
  console.log(`📋 Tabelas do Sistema Unificado:`)
  result.rows.forEach(row => {
    console.log(`   ✅ ${row.table_name} (${row.column_count} colunas)`)
  })
  
  // Verificar dados inseridos
  const categoriesResult = await pool.query('SELECT COUNT(*) as total FROM support_categories')
  const faqCategoriesResult = await pool.query('SELECT COUNT(*) as total FROM faq_categories')
  const faqItemsResult = await pool.query('SELECT COUNT(*) as total FROM faq_items')
  
  console.log('\n📈 Dados inseridos:')
  console.log(`   🎯 ${categoriesResult.rows[0].total} categorias de suporte`)
  console.log(`   ❓ ${faqCategoriesResult.rows[0].total} categorias FAQ`)
  console.log(`   📝 ${faqItemsResult.rows[0].total} itens FAQ`)
  
  console.log('\n🎉 Sistema de Atendimento Unificado configurado com sucesso!')
  
} catch (error) {
  console.error('❌ Erro na migration:', error.message)
  console.error('Stack:', error.stack)
  process.exit(1)
} finally {
  await pool.end()
} 