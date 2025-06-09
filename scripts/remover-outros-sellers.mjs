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

async function removerOutrosSellers() {
  const connector = new DatabaseConnector({ forceConnection: true })
  
  try {
    console.log('🗑️ REMOVENDO OUTROS SELLERS (MANTENDO APENAS GRÃO DE GENTE)\n')
    
    // Conectar ao Neon
    await connector.connectNeon()
    
    // Listar todos os sellers atuais
    const todosOsSellers = await connector.queryNeon(`
      SELECT 
        s.id, 
        s.company_name, 
        s.slug,
        s.is_active,
        COUNT(p.id) as produtos_vinculados
      FROM sellers s
      LEFT JOIN products p ON s.id = p.seller_id
      GROUP BY s.id, s.company_name, s.slug, s.is_active
      ORDER BY produtos_vinculados DESC, s.company_name
    `)
    
    console.log('📊 SELLERS ATUAIS:')
    todosOsSellers.rows.forEach((seller, i) => {
      const status = seller.company_name.toLowerCase().includes('grão de gente') ? '👑 MANTER' : '🗑️ REMOVER'
      console.log(`   ${i + 1}. ${seller.company_name} ${status}`)
      console.log(`      ID: ${seller.id}`)
      console.log(`      Produtos: ${seller.produtos_vinculados}`)
      console.log(`      Ativo: ${seller.is_active}`)
      console.log('')
    })
    
    // Identificar Grão de Gente
    const graoDeGente = todosOsSellers.rows.find(s => 
      s.company_name.toLowerCase().includes('grão de gente')
    )
    
    if (!graoDeGente) {
      throw new Error('Seller "Grão de Gente" não encontrado!')
    }
    
    console.log(`👑 SELLER A MANTER: ${graoDeGente.company_name}`)
    console.log(`   ID: ${graoDeGente.id}`)
    console.log(`   Produtos: ${graoDeGente.produtos_vinculados}\n`)
    
    // Sellers para remover
    const sellersParaRemover = todosOsSellers.rows.filter(s => 
      !s.company_name.toLowerCase().includes('grão de gente')
    )
    
    console.log(`🗑️ SELLERS PARA REMOVER: ${sellersParaRemover.length}`)
    
    if (sellersParaRemover.length === 0) {
      console.log('✅ Nenhum seller para remover! Só existe o "Grão de Gente".')
      return
    }
    
    // Verificar se algum seller tem produtos vinculados
    const sellersComProdutos = sellersParaRemover.filter(s => s.produtos_vinculados > 0)
    
    if (sellersComProdutos.length > 0) {
      console.log('\n⚠️ ATENÇÃO: Os seguintes sellers têm produtos vinculados:')
      sellersComProdutos.forEach(seller => {
        console.log(`   - ${seller.company_name}: ${seller.produtos_vinculados} produtos`)
      })
      console.log('\n❌ Não é possível remover sellers com produtos vinculados!')
      console.log('💡 Primeiro vincule todos os produtos ao "Grão de Gente"')
      return
    }
    
    console.log('\n🔄 Removendo sellers sem produtos...')
    
    let removidos = 0
    for (const seller of sellersParaRemover) {
      try {
        console.log(`   🗑️ Removendo: ${seller.company_name}`)
        
        await connector.queryNeon(`
          DELETE FROM sellers 
          WHERE id = $1
        `, [seller.id])
        
        removidos++
        console.log(`   ✅ Removido com sucesso`)
        
      } catch (error) {
        console.log(`   ❌ Erro ao remover: ${error.message}`)
      }
    }
    
    // Verificar estado final
    const sellersFinais = await connector.queryNeon(`
      SELECT 
        s.id, 
        s.company_name, 
        COUNT(p.id) as produtos_vinculados
      FROM sellers s
      LEFT JOIN products p ON s.id = p.seller_id
      GROUP BY s.id, s.company_name
      ORDER BY s.company_name
    `)
    
    console.log(`\n📊 ESTADO FINAL:`)
    console.log(`   ✅ Sellers removidos: ${removidos}`)
    console.log(`   📊 Sellers restantes: ${sellersFinais.rows.length}`)
    
    console.log('\n🏪 SELLERS FINAIS:')
    sellersFinais.rows.forEach((seller, i) => {
      console.log(`   ${i + 1}. ${seller.company_name}`)
      console.log(`      ID: ${seller.id}`)
      console.log(`      Produtos: ${seller.produtos_vinculados}`)
      console.log('')
    })
    
    if (sellersFinais.rows.length === 1 && sellersFinais.rows[0].company_name.toLowerCase().includes('grão de gente')) {
      console.log('🎉 LIMPEZA CONCLUÍDA!')
      console.log('✅ Apenas o seller "Grão de Gente" permanece no banco!')
    } else {
      console.log('⚠️ Atenção: Ainda existem outros sellers no banco.')
    }
    
  } catch (error) {
    console.error('❌ Erro na remoção:', error.message)
    throw error
  } finally {
    await connector.disconnect()
  }
}

// Executar
removerOutrosSellers()
  .then(() => {
    console.log('\n🚀 Script finalizado com sucesso!')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n💥 Script falhou:', error)
    process.exit(1)
  }) 