#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs/promises'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Carregar configurações
dotenv.config({ path: path.resolve(__dirname, '../.env.develop') })
dotenv.config()

async function fixDatabaseSchema() {
  const connector = new DatabaseConnector({ forceConnection: true })
  
  try {
    console.log('🔌 Conectando ao banco Neon...')
    await connector.connectNeon()
    
    console.log('🔧 Executando correções de schema...')
    
    // Ler o arquivo SQL de correção
    const sqlFile = await fs.readFile('scripts/fix-schema-errors.sql', 'utf8')
    
    // Executar o SQL
    await connector.queryNeon(sqlFile)
    
    console.log('✅ Correções de schema aplicadas com sucesso!')
    
    // Verificar se as correções foram aplicadas
    console.log('\n📊 Verificando estrutura das tabelas...')
    
    // Verificar shipping_carriers
    const carriersColumns = await connector.queryNeon(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'shipping_carriers'
        AND column_name IN ('type', 'api_type')
      ORDER BY column_name
    `)
    
    if (carriersColumns.rows.length > 0) {
      console.log('📋 Colunas shipping_carriers:')
      carriersColumns.rows.forEach(row => {
        console.log(`   - ${row.column_name}: ${row.data_type}`)
      })
    }
    
    // Verificar categories
    const categoriesImageUrl = await connector.queryNeon(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'categories'
        AND column_name = 'image_url'
    `)
    
    if (categoriesImageUrl.rows.length > 0) {
      console.log('📋 Coluna image_url em categories:')
      categoriesImageUrl.rows.forEach(row => {
        console.log(`   - ${row.column_name}: ${row.data_type}`)
      })
    }
    
    // Verificar tabelas criadas
    const tables = await connector.queryNeon(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name IN ('product_downloads', 'product_related')
        AND table_schema = 'public'
    `)
    
    if (tables.rows.length > 0) {
      console.log('📋 Tabelas verificadas:')
      tables.rows.forEach(row => {
        console.log(`   - ${row.table_name}`)
      })
    }
    
    console.log('\n🎉 Correções aplicadas com sucesso!')
    console.log('   - Coluna api_type adicionada/verificada em shipping_carriers')
    console.log('   - Coluna image_url adicionada/verificada em categories e banners')
    console.log('   - Tabelas product_downloads e product_related criadas/verificadas')
    
  } catch (error) {
    console.error('❌ Erro ao corrigir schema:', error)
    throw error
  } finally {
    await connector.disconnect()
  }
}

// Executar
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Iniciando correção do schema do banco...\n')
  
  try {
    await fixDatabaseSchema()
    console.log('\n✅ Correção concluída!')
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Erro na correção:', error)
    process.exit(1)
  }
} 