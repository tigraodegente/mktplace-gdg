#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'

async function checkNeonStructure() {
  const connector = new DatabaseConnector()
  
  try {
    console.log('🔍 Verificando estrutura do banco Neon...\n')
    
    await connector.connectNeon()
    
    // Verificar colunas da tabela products
    const result = await connector.queryNeon(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'products' 
      ORDER BY ordinal_position
    `)
    
    console.log('📋 Estrutura da tabela products:')
    console.log('================================')
    
    for (const col of result.rows) {
      console.log(`${col.column_name.padEnd(25)} ${col.data_type.padEnd(20)} ${col.is_nullable}`)
    }
    
    // Verificar se existe metadata como JSONB
    const hasMetadata = result.rows.some(col => col.column_name === 'metadata')
    console.log(`\n✅ Coluna metadata existe: ${hasMetadata}`)
    
    // Verificar um produto exemplo
    const sample = await connector.queryNeon('SELECT * FROM products LIMIT 1')
    if (sample.rows.length > 0) {
      console.log('\n📄 Exemplo de produto:')
      console.log('Colunas disponíveis:', Object.keys(sample.rows[0]))
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await connector.disconnect()
  }
}

checkNeonStructure() 