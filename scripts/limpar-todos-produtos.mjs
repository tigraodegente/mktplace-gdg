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

async function limparTodosProdutos() {
  const connector = new DatabaseConnector({ forceConnection: true })
  
  try {
    console.log('🧹 LIMPANDO TODOS OS PRODUTOS DO BANCO\n')
    console.log('⚠️  ATENÇÃO: Esta operação vai deletar TODOS os produtos!')
    console.log('⚠️  Aguarde 3 segundos para cancelar se necessário...\n')
    
    // Aguardar 3 segundos
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    console.log('🔌 Conectando ao banco Neon...')
    await connector.connectNeon()
    
    // Verificar quantos produtos existem antes
    console.log('📊 Verificando produtos existentes...')
    const countProducts = await connector.queryNeon('SELECT COUNT(*) as total FROM products')
    const countImages = await connector.queryNeon('SELECT COUNT(*) as total FROM product_images')
    
    console.log(`📦 Produtos encontrados: ${countProducts.rows[0].total}`)
    console.log(`🖼️  Imagens encontradas: ${countImages.rows[0].total}`)
    
    if (countProducts.rows[0].total === '0') {
      console.log('✅ Não há produtos para limpar.')
      return
    }
    
    console.log('\n🗑️  Iniciando limpeza...')
    
    // 1. Primeiro, limpar tabelas que referenciam products
    console.log('🗑️  Limpando tabela: product_images...')
    await connector.queryNeon('DELETE FROM product_images')
    console.log('✅ product_images limpa')
    
    // 2. Limpar outras tabelas relacionadas se existirem
    const tablesToCheck = [
      'order_items',
      'cart_items', 
      'wishlist_items',
      'product_reviews',
      'product_categories',
      'product_variants'
    ]
    
    for (const table of tablesToCheck) {
      try {
        const checkTable = await connector.queryNeon(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = '${table}'
          );
        `)
        
        if (checkTable.rows[0].exists) {
          console.log(`🗑️  Limpando tabela: ${table}...`)
          await connector.queryNeon(`DELETE FROM ${table}`)
          console.log(`✅ ${table} limpa`)
        }
      } catch (error) {
        console.log(`⚠️  Tabela ${table} não existe ou erro: ${error.message}`)
      }
    }
    
    // 3. Por último, limpar a tabela principal de produtos
    console.log('🗑️  Limpando tabela principal: products...')
    await connector.queryNeon('DELETE FROM products')
    console.log('✅ products limpa')
    
    // 4. Resetar sequences se necessário
    console.log('🔄 Resetando sequências...')
    try {
      await connector.queryNeon('ALTER SEQUENCE products_id_seq RESTART WITH 1')
      await connector.queryNeon('ALTER SEQUENCE product_images_id_seq RESTART WITH 1')
      console.log('✅ Sequências resetadas')
    } catch (error) {
      console.log('⚠️  Sequências não puderam ser resetadas:', error.message)
    }
    
    // 5. Verificar se limpeza foi bem-sucedida
    console.log('\n🔍 Verificando limpeza...')
    const finalCountProducts = await connector.queryNeon('SELECT COUNT(*) as total FROM products')
    const finalCountImages = await connector.queryNeon('SELECT COUNT(*) as total FROM product_images')
    
    console.log(`📦 Produtos restantes: ${finalCountProducts.rows[0].total}`)
    console.log(`🖼️  Imagens restantes: ${finalCountImages.rows[0].total}`)
    
    if (finalCountProducts.rows[0].total === '0' && finalCountImages.rows[0].total === '0') {
      console.log('\n✅ LIMPEZA CONCLUÍDA COM SUCESSO!')
      console.log('🎯 Banco pronto para nova importação')
    } else {
      console.log('\n⚠️  Alguns registros podem não ter sido removidos')
    }
    
  } catch (error) {
    console.error('❌ Erro na limpeza:', error.message)
    throw error
  } finally {
    await connector.disconnect()
  }
}

// Executar
limparTodosProdutos()
  .then(() => {
    console.log('\n🚀 Limpeza finalizada!')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n💥 Limpeza falhou:', error)
    process.exit(1)
  }) 