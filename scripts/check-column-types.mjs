#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'

async function checkTypes() {
  const connector = new DatabaseConnector({ forceConnection: true })
  
  try {
    await connector.connectNeon()
    
    const result = await connector.queryNeon(`
      SELECT 
        column_name,
        data_type,
        udt_name
      FROM information_schema.columns
      WHERE table_name = 'products'
        AND column_name IN ('tags', 'meta_keywords')
      ORDER BY ordinal_position
    `)
    
    console.log('Tipos de colunas:')
    result.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (${row.udt_name})`)
    })
    
  } catch (error) {
    console.error('Erro:', error)
  } finally {
    await connector.disconnect()
  }
}

checkTypes() 