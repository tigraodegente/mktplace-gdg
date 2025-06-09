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

async function atualizarNomeSeller() {
  const connector = new DatabaseConnector({ forceConnection: true })
  
  try {
    console.log('✏️ ATUALIZANDO NOME DO SELLER\n')
    
    // Conectar ao Neon
    await connector.connectNeon()
    
    // Buscar o seller atual
    const sellerAtual = await connector.queryNeon(`
      SELECT id, company_name, slug, total_sales
      FROM sellers 
      WHERE company_name ILIKE '%grão de gente%'
    `)
    
    if (sellerAtual.rows.length === 0) {
      throw new Error('Seller "Grão de Gente" não encontrado!')
    }
    
    const seller = sellerAtual.rows[0]
    console.log('📊 SELLER ATUAL:')
    console.log(`   ID: ${seller.id}`)
    console.log(`   Nome: ${seller.company_name}`)
    console.log(`   Slug: ${seller.slug || 'null'}`)
    console.log(`   Total de vendas: ${seller.total_sales}\n`)
    
    // Verificar produtos vinculados
    const produtosVinculados = await connector.queryNeon(`
      SELECT COUNT(*) as total
      FROM products 
      WHERE seller_id = $1
    `, [seller.id])
    
    console.log(`📦 Produtos vinculados: ${produtosVinculados.rows[0].total}\n`)
    
    console.log('🔄 Atualizando nome do seller...')
    
    // Atualizar nome e slug
    const result = await connector.queryNeon(`
      UPDATE sellers 
      SET 
        company_name = 'Grão de Gente',
        slug = 'grao-de-gente',
        updated_at = NOW()
      WHERE id = $1
      RETURNING id, company_name, slug
    `, [seller.id])
    
    if (result.rows.length === 0) {
      throw new Error('Falha ao atualizar seller')
    }
    
    const sellerAtualizado = result.rows[0]
    
    console.log('✅ Seller atualizado com sucesso!')
    console.log('\n📊 SELLER APÓS ATUALIZAÇÃO:')
    console.log(`   ID: ${sellerAtualizado.id}`)
    console.log(`   Nome: ${sellerAtualizado.company_name}`)
    console.log(`   Slug: ${sellerAtualizado.slug}`)
    
    // Verificar se produtos ainda estão vinculados
    const produtosAposUpdate = await connector.queryNeon(`
      SELECT COUNT(*) as total
      FROM products 
      WHERE seller_id = $1
    `, [seller.id])
    
    console.log(`   Produtos vinculados: ${produtosAposUpdate.rows[0].total}\n`)
    
    // Mostrar alguns produtos como exemplo
    const exemplosProdutos = await connector.queryNeon(`
      SELECT p.sku, p.name, s.company_name
      FROM products p
      JOIN sellers s ON p.seller_id = s.id
      WHERE s.id = $1
      ORDER BY p.updated_at DESC
      LIMIT 3
    `, [seller.id])
    
    console.log('📦 Exemplos de produtos vinculados:')
    exemplosProdutos.rows.forEach((product, i) => {
      console.log(`   ${i + 1}. SKU ${product.sku}: ${product.name.substring(0, 40)}...`)
      console.log(`      Seller: ${product.company_name}`)
    })
    
    console.log('\n🎉 ATUALIZAÇÃO CONCLUÍDA!')
    console.log('✅ Nome do seller alterado de "Grão de Gente - Produtos para Bebê" para "Grão de Gente"')
    
  } catch (error) {
    console.error('❌ Erro na atualização:', error.message)
    throw error
  } finally {
    await connector.disconnect()
  }
}

// Executar
atualizarNomeSeller()
  .then(() => {
    console.log('\n🚀 Script finalizado com sucesso!')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n💥 Script falhou:', error)
    process.exit(1)
  }) 