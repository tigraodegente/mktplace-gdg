#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Carregar configurações
dotenv.config({ path: path.resolve(__dirname, '../.env.develop') })
dotenv.config({ path: path.resolve(__dirname, '../.env') })

async function limparMetadataSync() {
  const connector = new DatabaseConnector({ forceConnection: true })
  
  try {
    console.log('🧹 LIMPANDO METADATA DE SYNC DOS PRODUTOS\n')
    
    // Conectar ao Neon
    await connector.connectNeon()
    
    // Verificar quantos produtos têm metadata
    const countBefore = await connector.queryNeon(`
      SELECT COUNT(*) as total
      FROM products 
      WHERE attributes ? 'imported_from'
    `)
    
    console.log(`📊 Produtos com metadata de sync: ${countBefore.rows[0].total}`)
    
    // Mostrar exemplo antes
    const example = await connector.queryNeon(`
      SELECT sku, attributes
      FROM products 
      WHERE attributes ? 'imported_from'
      LIMIT 1
    `)
    
    if (example.rows.length > 0) {
      console.log(`📋 Exemplo antes (SKU ${example.rows[0].sku}):`)
      console.log(JSON.stringify(example.rows[0].attributes, null, 2))
    }
    
    console.log('\n🔄 Removendo campos de metadata...')
    
    // Remover metadata em lotes para evitar timeout
    let processed = 0
    const batchSize = 100
    
    while (true) {
      const result = await connector.queryNeon(`
        UPDATE products 
        SET attributes = attributes - 'imported_at' - 'original_id' - 'sync_version' - 'imported_from'
        WHERE id IN (
          SELECT id FROM products 
          WHERE attributes ? 'imported_from'
          LIMIT $1
        )
      `, [batchSize])
      
      if (result.rowCount === 0) break
      
      processed += result.rowCount
      console.log(`   ✅ Processados: ${processed} produtos`)
    }
    
    // Verificar resultado final
    const countAfter = await connector.queryNeon(`
      SELECT COUNT(*) as total
      FROM products 
      WHERE attributes ? 'imported_from'
    `)
    
    console.log(`\n📊 Produtos com metadata após limpeza: ${countAfter.rows[0].total}`)
    console.log(`✅ Total processado: ${processed} produtos`)
    
    // Mostrar exemplo depois
    const exampleAfter = await connector.queryNeon(`
      SELECT sku, attributes
      FROM products 
      WHERE sku = $1
    `, [example.rows[0]?.sku])
    
    if (exampleAfter.rows.length > 0) {
      console.log(`\n📋 Exemplo depois (SKU ${exampleAfter.rows[0].sku}):`)
      console.log(JSON.stringify(exampleAfter.rows[0].attributes, null, 2))
    }
    
    console.log('\n🎉 LIMPEZA CONCLUÍDA!')
    
  } catch (error) {
    console.error('❌ Erro na limpeza:', error.message)
    throw error
  } finally {
    await connector.disconnect()
  }
}

// Executar
limparMetadataSync()
  .then(() => {
    console.log('\n🚀 Script finalizado com sucesso!')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n💥 Script falhou:', error)
    process.exit(1)
  }) 