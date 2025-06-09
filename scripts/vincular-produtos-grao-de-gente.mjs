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

async function vincularProdutosGraoDeGente() {
  const connector = new DatabaseConnector({ forceConnection: true })
  
  try {
    console.log('🔗 VINCULANDO PRODUTOS AO SELLER "GRÃO DE GENTE"\n')
    
    // Conectar ao Neon
    await connector.connectNeon()
    
    // Buscar o seller "Grão de Gente"
    const graoDgGenteResult = await connector.queryNeon(`
      SELECT id, company_name 
      FROM sellers 
      WHERE company_name ILIKE '%grão de gente%'
    `)
    
    if (graoDgGenteResult.rows.length === 0) {
      throw new Error('Seller "Grão de Gente" não encontrado!')
    }
    
    const graoDeGenteId = graoDgGenteResult.rows[0].id
    const graoDeGenteNome = graoDgGenteResult.rows[0].company_name
    
    console.log(`🏪 Seller encontrado: ${graoDeGenteNome}`)
    console.log(`🆔 ID: ${graoDeGenteId}\n`)
    
    // Verificar estatísticas antes
    const statsBefore = await connector.queryNeon(`
      SELECT 
        COUNT(*) as total_produtos,
        COUNT(seller_id) as produtos_com_seller,
        COUNT(*) - COUNT(seller_id) as produtos_sem_seller
      FROM products
    `)
    
    console.log('📊 ANTES DA ATUALIZAÇÃO:')
    console.log(`   Total de produtos: ${statsBefore.rows[0].total_produtos}`)
    console.log(`   Com seller: ${statsBefore.rows[0].produtos_com_seller}`)
    console.log(`   Sem seller: ${statsBefore.rows[0].produtos_sem_seller}\n`)
    
    // Verificar distribuição atual por seller
    const distribBefore = await connector.queryNeon(`
      SELECT 
        s.company_name,
        COUNT(p.id) as total_produtos
      FROM sellers s
      LEFT JOIN products p ON s.id = p.seller_id
      GROUP BY s.id, s.company_name
      ORDER BY total_produtos DESC
    `)
    
    console.log('📋 Distribuição atual por seller:')
    distribBefore.rows.forEach(row => {
      console.log(`   ${row.company_name}: ${row.total_produtos} produtos`)
    })
    
    console.log('\n🔄 Atualizando produtos sem seller...')
    
    // Atualizar produtos sem seller em lotes
    let processed = 0
    const batchSize = 200
    
    while (true) {
      const result = await connector.queryNeon(`
        UPDATE products 
        SET seller_id = $1, updated_at = NOW()
        WHERE id IN (
          SELECT id FROM products 
          WHERE seller_id IS NULL
          LIMIT $2
        )
      `, [graoDeGenteId, batchSize])
      
      if (result.rowCount === 0) break
      
      processed += result.rowCount
      console.log(`   ✅ Processados: ${processed} produtos`)
    }
    
    // Verificar estatísticas depois
    const statsAfter = await connector.queryNeon(`
      SELECT 
        COUNT(*) as total_produtos,
        COUNT(seller_id) as produtos_com_seller,
        COUNT(*) - COUNT(seller_id) as produtos_sem_seller
      FROM products
    `)
    
    console.log(`\n📊 DEPOIS DA ATUALIZAÇÃO:`)
    console.log(`   Total de produtos: ${statsAfter.rows[0].total_produtos}`)
    console.log(`   Com seller: ${statsAfter.rows[0].produtos_com_seller}`)
    console.log(`   Sem seller: ${statsAfter.rows[0].produtos_sem_seller}`)
    console.log(`   Produtos processados: ${processed}\n`)
    
    // Verificar distribuição final por seller
    const distribAfter = await connector.queryNeon(`
      SELECT 
        s.company_name,
        COUNT(p.id) as total_produtos
      FROM sellers s
      LEFT JOIN products p ON s.id = p.seller_id
      GROUP BY s.id, s.company_name
      ORDER BY total_produtos DESC
    `)
    
    console.log('📋 Distribuição final por seller:')
    distribAfter.rows.forEach(row => {
      console.log(`   ${row.company_name}: ${row.total_produtos} produtos`)
    })
    
    // Verificar alguns produtos atualizados
    const sampleProducts = await connector.queryNeon(`
      SELECT p.sku, p.name, s.company_name
      FROM products p
      JOIN sellers s ON p.seller_id = s.id
      WHERE s.id = $1
      ORDER BY p.updated_at DESC
      LIMIT 5
    `, [graoDeGenteId])
    
    console.log(`\n📦 Exemplos de produtos vinculados ao "${graoDeGenteNome}":`)
    sampleProducts.rows.forEach((product, i) => {
      console.log(`   ${i + 1}. SKU ${product.sku}: ${product.name.substring(0, 50)}...`)
    })
    
    console.log('\n🎉 VINCULAÇÃO CONCLUÍDA!')
    console.log(`✅ Todos os produtos agora pertencem ao seller "${graoDeGenteNome}"`)
    
  } catch (error) {
    console.error('❌ Erro na vinculação:', error.message)
    throw error
  } finally {
    await connector.disconnect()
  }
}

// Executar
vincularProdutosGraoDeGente()
  .then(() => {
    console.log('\n🚀 Script finalizado com sucesso!')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n💥 Script falhou:', error)
    process.exit(1)
  }) 