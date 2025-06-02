#!/usr/bin/env node

import { Pool } from 'pg'

console.log('💳 VERIFICAÇÃO DE TABELAS DE PAGAMENTO\n')

const LOCAL_DB_URL = "postgresql://postgres@localhost/mktplace_dev"
const NEON_DB_URL = "postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-dawn-field-acydf752-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require"

const localPool = new Pool({ connectionString: LOCAL_DB_URL })
const neonPool = new Pool({ 
  connectionString: NEON_DB_URL,
  ssl: { rejectUnauthorized: false }
})

async function checkPaymentTables() {
  try {
    // Buscar todas as tabelas relacionadas a pagamento
    const paymentTables = await localPool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND (
          table_name LIKE '%payment%' 
          OR table_name LIKE '%transaction%'
          OR table_name LIKE '%gateway%'
          OR table_name LIKE '%credit%'
          OR table_name LIKE '%refund%'
          OR table_name = 'orders'
        )
      ORDER BY table_name
    `)
    
    console.log(`📊 Tabelas de pagamento encontradas: ${paymentTables.rows.length}\n`)
    console.log('TABELAS RELACIONADAS A PAGAMENTO:')
    console.log('='.repeat(80))
    
    for (const { table_name } of paymentTables.rows) {
      console.log(`\n📋 ${table_name.toUpperCase()}:`)
      
      try {
        // Verificar estrutura
        const localColumns = await localPool.query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_name = $1 AND table_schema = 'public'
          ORDER BY ordinal_position
        `, [table_name])
        
        const neonColumns = await neonPool.query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_name = $1 AND table_schema = 'public'
          ORDER BY ordinal_position
        `, [table_name])
        
        // Contar registros
        const localCount = await localPool.query(`SELECT COUNT(*) as count FROM ${table_name}`)
        const neonCount = await neonPool.query(`SELECT COUNT(*) as count FROM ${table_name}`)
        
        const localTotal = parseInt(localCount.rows[0].count)
        const neonTotal = parseInt(neonCount.rows[0].count)
        
        console.log(`   Colunas: ${localColumns.rows.length}`)
        console.log(`   Registros - Local: ${localTotal} | Neon: ${neonTotal}`)
        
        // Listar colunas importantes
        const importantColumns = localColumns.rows.filter(col => 
          col.column_name.includes('amount') ||
          col.column_name.includes('total') ||
          col.column_name.includes('price') ||
          col.column_name.includes('value') ||
          col.column_name.includes('status') ||
          col.column_name.includes('gateway') ||
          col.column_name.includes('method') ||
          col.column_name.includes('transaction')
        )
        
        if (importantColumns.length > 0) {
          console.log(`   Colunas importantes:`)
          importantColumns.forEach(col => {
            console.log(`     - ${col.column_name} (${col.data_type})`)
          })
        }
        
        // Verificar dados de exemplo (se houver)
        if (localTotal > 0) {
          const sample = await localPool.query(`
            SELECT * FROM ${table_name} 
            ORDER BY ${localColumns.rows.find(c => c.column_name === 'created_at') ? 'created_at DESC' : '1'} 
            LIMIT 1
          `)
          
          if (sample.rows[0]) {
            console.log(`   Exemplo de registro:`)
            Object.entries(sample.rows[0]).forEach(([key, value]) => {
              if (value !== null && !key.startsWith('xata') && key !== 'id') {
                console.log(`     - ${key}: ${value}`)
              }
            })
          }
        }
        
      } catch (error) {
        console.log(`   ❌ Erro: ${error.message}`)
      }
    }
    
    // Análise específica de transações
    console.log('\n\n💰 ANÁLISE DE TRANSAÇÕES E VALORES:')
    console.log('='.repeat(80))
    
    // Verificar total de vendas em orders
    try {
      const localOrdersTotal = await localPool.query(`
        SELECT 
          COUNT(*) as total_orders,
          SUM(total) as total_value,
          AVG(total) as avg_value,
          MAX(total) as max_value,
          MIN(total) as min_value
        FROM orders
        WHERE status NOT IN ('cancelled', 'failed')
      `)
      
      const neonOrdersTotal = await neonPool.query(`
        SELECT 
          COUNT(*) as total_orders,
          SUM(total) as total_value,
          AVG(total) as avg_value,
          MAX(total) as max_value,
          MIN(total) as min_value
        FROM orders
        WHERE status NOT IN ('cancelled', 'failed')
      `)
      
      console.log('\n📦 PEDIDOS:')
      console.log('   LOCAL:')
      const localStats = localOrdersTotal.rows[0]
      console.log(`     - Total de pedidos: ${localStats.total_orders}`)
      console.log(`     - Valor total: R$ ${parseFloat(localStats.total_value || 0).toFixed(2)}`)
      console.log(`     - Ticket médio: R$ ${parseFloat(localStats.avg_value || 0).toFixed(2)}`)
      console.log(`     - Maior pedido: R$ ${parseFloat(localStats.max_value || 0).toFixed(2)}`)
      console.log(`     - Menor pedido: R$ ${parseFloat(localStats.min_value || 0).toFixed(2)}`)
      
      console.log('   NEON:')
      const neonStats = neonOrdersTotal.rows[0]
      console.log(`     - Total de pedidos: ${neonStats.total_orders}`)
      console.log(`     - Valor total: R$ ${parseFloat(neonStats.total_value || 0).toFixed(2)}`)
      console.log(`     - Ticket médio: R$ ${parseFloat(neonStats.avg_value || 0).toFixed(2)}`)
      console.log(`     - Maior pedido: R$ ${parseFloat(neonStats.max_value || 0).toFixed(2)}`)
      console.log(`     - Menor pedido: R$ ${parseFloat(neonStats.min_value || 0).toFixed(2)}`)
      
    } catch (error) {
      console.log(`   ❌ Erro ao analisar pedidos: ${error.message}`)
    }
    
    // Verificar métodos de pagamento
    try {
      const localPaymentMethods = await localPool.query(`
        SELECT * FROM payment_methods ORDER BY name
      `)
      
      const neonPaymentMethods = await neonPool.query(`
        SELECT * FROM payment_methods ORDER BY name
      `)
      
      console.log('\n💳 MÉTODOS DE PAGAMENTO:')
      console.log('   LOCAL:')
      localPaymentMethods.rows.forEach(method => {
        console.log(`     - ${method.name} (${method.type}) - ${method.is_active ? 'Ativo' : 'Inativo'}`)
      })
      
      console.log('   NEON:')
      neonPaymentMethods.rows.forEach(method => {
        console.log(`     - ${method.name} (${method.type}) - ${method.is_active ? 'Ativo' : 'Inativo'}`)
      })
      
    } catch (error) {
      console.log(`   ❌ Erro ao verificar métodos: ${error.message}`)
    }
    
    // Verificar gateways de pagamento
    try {
      const localGateways = await localPool.query(`
        SELECT * FROM payment_gateways ORDER BY name
      `)
      
      const neonGateways = await neonPool.query(`
        SELECT * FROM payment_gateways ORDER BY name
      `)
      
      console.log('\n🏦 GATEWAYS DE PAGAMENTO:')
      console.log('   LOCAL:')
      localGateways.rows.forEach(gateway => {
        console.log(`     - ${gateway.name} - ${gateway.is_active ? 'Ativo' : 'Inativo'}`)
        if (gateway.environment) console.log(`       Ambiente: ${gateway.environment}`)
      })
      
      console.log('   NEON:')
      neonGateways.rows.forEach(gateway => {
        console.log(`     - ${gateway.name} - ${gateway.is_active ? 'Ativo' : 'Inativo'}`)
        if (gateway.environment) console.log(`       Ambiente: ${gateway.environment}`)
      })
      
    } catch (error) {
      console.log(`   ❌ Erro ao verificar gateways: ${error.message}`)
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error)
  } finally {
    await localPool.end()
    await neonPool.end()
  }
}

checkPaymentTables() 