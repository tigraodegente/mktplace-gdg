#!/usr/bin/env node

import { Pool } from 'pg'
import { execSync } from 'child_process'

console.log('🔍 COMPARAÇÃO COMPLETA: Local vs Neon\n')

const LOCAL_DB_URL = "postgresql://postgres@localhost/mktplace_dev"
const NEON_DB_URL = "postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-dawn-field-acydf752-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require"

const localPool = new Pool({ connectionString: LOCAL_DB_URL })
const neonPool = new Pool({ 
  connectionString: NEON_DB_URL,
  ssl: { rejectUnauthorized: false }
})

async function compareSchemas() {
  console.log('📊 COMPARANDO ESQUEMAS...\n')
  
  try {
    // Buscar todas as tabelas
    const localTables = await localPool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `)
    
    const neonTables = await neonPool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `)
    
    const localTableNames = new Set(localTables.rows.map(r => r.table_name))
    const neonTableNames = new Set(neonTables.rows.map(r => r.table_name))
    
    console.log(`📋 Tabelas no Local: ${localTableNames.size}`)
    console.log(`📋 Tabelas no Neon: ${neonTableNames.size}\n`)
    
    // Tabelas que existem apenas em um dos bancos
    const onlyInLocal = [...localTableNames].filter(t => !neonTableNames.has(t))
    const onlyInNeon = [...neonTableNames].filter(t => !localTableNames.has(t))
    
    if (onlyInLocal.length > 0) {
      console.log('⚠️  APENAS NO LOCAL:')
      onlyInLocal.forEach(t => console.log(`   - ${t}`))
      console.log()
    }
    
    if (onlyInNeon.length > 0) {
      console.log('⚠️  APENAS NO NEON:')
      onlyInNeon.forEach(t => console.log(`   - ${t}`))
      console.log()
    }
    
    // Comparar estrutura das tabelas comuns
    const commonTables = [...localTableNames].filter(t => neonTableNames.has(t))
    console.log(`\n🔄 COMPARANDO ESTRUTURA DE ${commonTables.length} TABELAS COMUNS...\n`)
    
    for (const tableName of commonTables) {
      const localColumns = await localPool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = $1 AND table_schema = 'public'
        ORDER BY ordinal_position
      `, [tableName])
      
      const neonColumns = await neonPool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = $1 AND table_schema = 'public'
        ORDER BY ordinal_position
      `, [tableName])
      
      const localColsMap = new Map(localColumns.rows.map(c => [c.column_name, c]))
      const neonColsMap = new Map(neonColumns.rows.map(c => [c.column_name, c]))
      
      const colsOnlyInLocal = [...localColsMap.keys()].filter(c => !neonColsMap.has(c))
      const colsOnlyInNeon = [...neonColsMap.keys()].filter(c => !localColsMap.has(c))
      
      if (colsOnlyInLocal.length > 0 || colsOnlyInNeon.length > 0) {
        console.log(`📋 ${tableName}:`)
        if (colsOnlyInLocal.length > 0) {
          console.log(`   ⚠️  Colunas apenas no LOCAL: ${colsOnlyInLocal.join(', ')}`)
        }
        if (colsOnlyInNeon.length > 0) {
          console.log(`   ⚠️  Colunas apenas no NEON: ${colsOnlyInNeon.join(', ')}`)
        }
        console.log()
      }
    }
    
  } catch (error) {
    console.error('❌ Erro ao comparar esquemas:', error.message)
  }
}

async function compareData() {
  console.log('\n📊 COMPARANDO DADOS...\n')
  
  const tablesToCheck = [
    'users',
    'products', 
    'categories',
    'sellers',
    'orders',
    'brands',
    'coupons',
    'banners',
    'pages'
  ]
  
  for (const table of tablesToCheck) {
    try {
      const localCount = await localPool.query(`SELECT COUNT(*) as count FROM ${table}`)
      const neonCount = await neonPool.query(`SELECT COUNT(*) as count FROM ${table}`)
      
      const localTotal = parseInt(localCount.rows[0].count)
      const neonTotal = parseInt(neonCount.rows[0].count)
      
      const diff = localTotal - neonTotal
      const status = diff === 0 ? '✅' : '⚠️'
      
      console.log(`${status} ${table.padEnd(20)} Local: ${localTotal.toString().padStart(6)} | Neon: ${neonTotal.toString().padStart(6)} | Diff: ${diff > 0 ? '+' : ''}${diff}`)
      
    } catch (error) {
      console.log(`❌ ${table.padEnd(20)} Erro: ${error.message}`)
    }
  }
}

async function checkRecentData() {
  console.log('\n📊 VERIFICANDO DADOS RECENTES...\n')
  
  try {
    // Últimos produtos
    const localLastProduct = await localPool.query(`
      SELECT id, name, created_at 
      FROM products 
      ORDER BY created_at DESC 
      LIMIT 1
    `)
    
    const neonLastProduct = await neonPool.query(`
      SELECT id, name, created_at 
      FROM products 
      ORDER BY created_at DESC 
      LIMIT 1
    `)
    
    console.log('🛍️  ÚLTIMO PRODUTO:')
    console.log('   Local:', localLastProduct.rows[0] ? 
      `${localLastProduct.rows[0].name} (${new Date(localLastProduct.rows[0].created_at).toLocaleString()})` : 
      'Nenhum produto')
    console.log('   Neon:', neonLastProduct.rows[0] ? 
      `${neonLastProduct.rows[0].name} (${new Date(neonLastProduct.rows[0].created_at).toLocaleString()})` : 
      'Nenhum produto')
    
    // Últimos pedidos
    const localLastOrder = await localPool.query(`
      SELECT id, created_at, total 
      FROM orders 
      ORDER BY created_at DESC 
      LIMIT 1
    `)
    
    const neonLastOrder = await neonPool.query(`
      SELECT id, created_at, total 
      FROM orders 
      ORDER BY created_at DESC 
      LIMIT 1
    `)
    
    console.log('\n📦 ÚLTIMO PEDIDO:')
    console.log('   Local:', localLastOrder.rows[0] ? 
      `ID: ${localLastOrder.rows[0].id} - R$ ${localLastOrder.rows[0].total} (${new Date(localLastOrder.rows[0].created_at).toLocaleString()})` : 
      'Nenhum pedido')
    console.log('   Neon:', neonLastOrder.rows[0] ? 
      `ID: ${neonLastOrder.rows[0].id} - R$ ${neonLastOrder.rows[0].total} (${new Date(neonLastOrder.rows[0].created_at).toLocaleString()})` : 
      'Nenhum pedido')
    
  } catch (error) {
    console.error('❌ Erro ao verificar dados recentes:', error.message)
  }
}

async function main() {
  try {
    await compareSchemas()
    await compareData()
    await checkRecentData()
    
    console.log('\n📌 RESUMO:')
    console.log('   - Use o banco LOCAL para desenvolvimento')
    console.log('   - Use o banco NEON para produção')
    console.log('   - Execute scripts de sincronização se necessário')
    
  } catch (error) {
    console.error('❌ Erro geral:', error)
  } finally {
    await localPool.end()
    await neonPool.end()
  }
}

main() 