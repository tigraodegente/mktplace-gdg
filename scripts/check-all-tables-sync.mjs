#!/usr/bin/env node

import { Pool } from 'pg'

console.log('🔍 VERIFICAÇÃO COMPLETA DE SINCRONIZAÇÃO\n')

const LOCAL_DB_URL = "postgresql://postgres@localhost/mktplace_dev"
const NEON_DB_URL = "postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-dawn-field-acydf752-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require"

const localPool = new Pool({ connectionString: LOCAL_DB_URL })
const neonPool = new Pool({ 
  connectionString: NEON_DB_URL,
  ssl: { rejectUnauthorized: false }
})

async function checkAllTables() {
  try {
    // Buscar todas as tabelas
    const tablesResult = await localPool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `)
    
    const tables = tablesResult.rows.map(r => r.table_name)
    console.log(`📊 Total de tabelas encontradas: ${tables.length}\n`)
    
    let syncedTables = 0
    let unsyncedTables = 0
    const differences = []
    
    for (const table of tables) {
      try {
        const localCount = await localPool.query(`SELECT COUNT(*) as count FROM ${table}`)
        const neonCount = await neonPool.query(`SELECT COUNT(*) as count FROM ${table}`)
        
        const localTotal = parseInt(localCount.rows[0].count)
        const neonTotal = parseInt(neonCount.rows[0].count)
        
        const diff = localTotal - neonTotal
        
        if (diff === 0) {
          syncedTables++
          console.log(`✅ ${table.padEnd(30)} Sincronizado (${localTotal} registros)`)
        } else {
          unsyncedTables++
          const status = '⚠️'
          console.log(`${status} ${table.padEnd(30)} Local: ${localTotal} | Neon: ${neonTotal} | Diferença: ${diff > 0 ? '+' : ''}${diff}`)
          differences.push({ table, localTotal, neonTotal, diff })
        }
        
      } catch (error) {
        console.log(`❌ ${table.padEnd(30)} Erro: ${error.message}`)
      }
    }
    
    console.log('\n📊 RESUMO FINAL:')
    console.log(`   ✅ Tabelas sincronizadas: ${syncedTables}`)
    console.log(`   ⚠️  Tabelas com diferenças: ${unsyncedTables}`)
    console.log(`   📋 Total de tabelas: ${tables.length}`)
    
    if (differences.length > 0) {
      console.log('\n⚠️  TABELAS QUE PRECISAM DE SINCRONIZAÇÃO:')
      differences.forEach(d => {
        console.log(`   - ${d.table}: ${d.diff > 0 ? '+' : ''}${d.diff} registros de diferença`)
      })
    }
    
    // Verificar integridade de dados críticos
    console.log('\n🔒 VERIFICANDO INTEGRIDADE DE DADOS CRÍTICOS...\n')
    
    // Verificar se IDs principais estão sincronizados
    const criticalTables = ['users', 'products', 'orders', 'categories', 'sellers']
    
    for (const table of criticalTables) {
      try {
        const localIds = await localPool.query(`SELECT id FROM ${table} ORDER BY id`)
        const neonIds = await neonPool.query(`SELECT id FROM ${table} ORDER BY id`)
        
        const localIdSet = new Set(localIds.rows.map(r => r.id))
        const neonIdSet = new Set(neonIds.rows.map(r => r.id))
        
        const idsOnlyInLocal = [...localIdSet].filter(id => !neonIdSet.has(id))
        const idsOnlyInNeon = [...neonIdSet].filter(id => !localIdSet.has(id))
        
        if (idsOnlyInLocal.length === 0 && idsOnlyInNeon.length === 0) {
          console.log(`✅ ${table}: Todos os IDs estão sincronizados`)
        } else {
          console.log(`⚠️  ${table}: IDs não sincronizados`)
          if (idsOnlyInLocal.length > 0) {
            console.log(`   - IDs apenas no LOCAL: ${idsOnlyInLocal.slice(0, 5).join(', ')}${idsOnlyInLocal.length > 5 ? '...' : ''}`)
          }
          if (idsOnlyInNeon.length > 0) {
            console.log(`   - IDs apenas no NEON: ${idsOnlyInNeon.slice(0, 5).join(', ')}${idsOnlyInNeon.length > 5 ? '...' : ''}`)
          }
        }
      } catch (error) {
        console.log(`❌ Erro ao verificar IDs de ${table}: ${error.message}`)
      }
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error)
  } finally {
    await localPool.end()
    await neonPool.end()
  }
}

checkAllTables() 