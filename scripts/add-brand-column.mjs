#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'

async function addBrandColumn() {
  const connector = new DatabaseConnector()
  
  try {
    console.log('🔧 Adicionando coluna brand à tabela products...\n')
    
    await connector.connectNeon()
    
    // Verificar se já existe
    const checkResult = await connector.queryNeon(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'brand'
    `)
    
    if (checkResult.rows.length > 0) {
      console.log('✅ Coluna brand já existe!')
    } else {
      // Adicionar coluna
      await connector.queryNeon(`
        ALTER TABLE products 
        ADD COLUMN brand VARCHAR(255)
      `)
      console.log('✅ Coluna brand adicionada com sucesso!')
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await connector.disconnect()
  }
}

addBrandColumn() 