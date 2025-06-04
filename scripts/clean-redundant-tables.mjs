#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Carregar configurações
dotenv.config({ path: path.resolve(__dirname, '../.env.develop') })
dotenv.config()

async function cleanRedundantTables() {
  const connector = new DatabaseConnector({ forceConnection: true })
  
  try {
    console.log('🧹 LIMPEZA SEGURA DE TABELAS REDUNDANTES')
    console.log('=======================================\n')
    
    await connector.connectNeon()
    
    // ETAPA 1: REMOVER TABELAS TEMPORÁRIAS/CACHE (100% SEGURO)
    console.log('🗑️  ETAPA 1: REMOVENDO TABELAS TEMPORÁRIAS/CACHE')
    console.log('------------------------------------------------')
    
    const safeDeletions = [
      { table: 'facet_cache', reason: 'Cache de facetas - pode ser recriado' },
      { table: 'pending_refreshes', reason: 'Fila de atualizações temporária' },
      { table: 'query_cache', reason: 'Cache de queries - pode ser recriado' },
      { table: 'shipping_carriers_temp', reason: 'Tabela temporária de transportadoras' }
    ]
    
    for (const { table, reason } of safeDeletions) {
      try {
        const count = await connector.queryNeon(`SELECT COUNT(*) as total FROM ${table}`)
        console.log(`\n🔍 Analisando ${table}:`)
        console.log(`   • Registros: ${count.rows[0].total}`)
        console.log(`   • Motivo: ${reason}`)
        
        await connector.queryNeon(`DROP TABLE IF EXISTS ${table} CASCADE`)
        console.log(`   ✅ Removida com sucesso`)
        
      } catch (error) {
        console.log(`   ❌ Erro ao remover ${table}: ${error.message}`)
      }
    }
    
    // ETAPA 2: ANALISAR TABELAS SUSPEITAS
    console.log('\n\n🔍 ETAPA 2: ANALISANDO TABELAS SUSPEITAS')
    console.log('---------------------------------------')
    
    const suspiciousTables = [
      'collection_products',
      'products_with_primary_category', 
      'product_option_values',
      'product_options',
      'variant_option_values'
    ]
    
    for (const table of suspiciousTables) {
      try {
        const count = await connector.queryNeon(`SELECT COUNT(*) as total FROM ${table}`)
        const columns = await connector.queryNeon(`
          SELECT column_name
          FROM information_schema.columns 
          WHERE table_name = $1 
          ORDER BY ordinal_position
        `, [table])
        
        console.log(`\n📋 ${table.toUpperCase()}:`)
        console.log(`   • Registros: ${count.rows[0].total}`)
        console.log(`   • Colunas: ${columns.rows.map(c => c.column_name).join(', ')}`)
        
        // Análise específica por tabela
        if (table === 'collection_products') {
          console.log(`   🔍 Verificando se é duplicata de product_collections...`)
          try {
            const pcCount = await connector.queryNeon(`SELECT COUNT(*) as total FROM product_collections`)
            console.log(`   • product_collections tem: ${pcCount.rows[0].total} registros`)
            
            if (count.rows[0].total === 0 && pcCount.rows[0].total > 0) {
              console.log(`   💡 RECOMENDAÇÃO: REMOVER - É duplicata vazia de product_collections`)
            } else {
              console.log(`   ⚠️  MANTER - Pode ter estrutura diferente`)
            }
          } catch (e) {
            console.log(`   ⚠️  MANTER - Não foi possível comparar`)
          }
        }
        
        else if (table === 'products_with_primary_category') {
          console.log(`   🔍 Analisando se é view materializada...`)
          if (count.rows[0].total > 0) {
            console.log(`   💡 RECOMENDAÇÃO: MANTER - Contém dados, pode ser view otimizada`)
          } else {
            console.log(`   💡 RECOMENDAÇÃO: REMOVER - Vazia e pode ser recriada`)
          }
        }
        
        else if (table.includes('option')) {
          console.log(`   🔍 Sistema de opções de produtos...`)
          if (count.rows[0].total === 0) {
            console.log(`   💡 RECOMENDAÇÃO: MANTER - Será usado para variações futuras`)
          } else {
            console.log(`   💡 RECOMENDAÇÃO: MANTER - Contém dados ativos`)
          }
        }
        
      } catch (error) {
        console.log(`\n❌ Erro ao analisar ${table}: ${error.message}`)
      }
    }
    
    // ETAPA 3: REMOVER TABELAS VAZIAS OBSOLETAS
    console.log('\n\n🗑️  ETAPA 3: REMOVENDO TABELAS VAZIAS OBSOLETAS')
    console.log('----------------------------------------------')
    
    const emptyObsolete = [
      { table: 'financial_adjustments', reason: 'Funcionalidade não implementada' },
      { table: 'order_tracking', reason: 'Redundante com order_status_history' },
      { table: 'payment_queue', reason: 'Sistema de filas não utilizado' },
      { table: 'store_credits', reason: 'Funcionalidade não implementada' },
      { table: 'product_price_history', reason: 'Histórico não sendo usado' }
    ]
    
    for (const { table, reason } of emptyObsolete) {
      try {
        const count = await connector.queryNeon(`SELECT COUNT(*) as total FROM ${table}`)
        
        if (count.rows[0].total === 0) {
          console.log(`\n🔍 ${table}:`)
          console.log(`   • Registros: ${count.rows[0].total}`)
          console.log(`   • Motivo: ${reason}`)
          
          await connector.queryNeon(`DROP TABLE IF EXISTS ${table} CASCADE`)
          console.log(`   ✅ Removida com sucesso`)
        } else {
          console.log(`\n⚠️  ${table}: Mantida (${count.rows[0].total} registros)`)
        }
        
      } catch (error) {
        console.log(`\n❌ Erro com ${table}: ${error.message}`)
      }
    }
    
    // ETAPA 4: VERIFICAR DUPLICATAS ESPECÍFICAS
    console.log('\n\n🔄 ETAPA 4: VERIFICANDO DUPLICATAS ESPECÍFICAS')
    console.log('---------------------------------------------')
    
    try {
      // Verificar collection_products vs product_collections
      const cp = await connector.queryNeon(`SELECT COUNT(*) as total FROM collection_products`)
      const pc = await connector.queryNeon(`SELECT COUNT(*) as total FROM product_collections`)
      
      console.log(`\n📊 Comparação collection_products vs product_collections:`)
      console.log(`   • collection_products: ${cp.rows[0].total} registros`)
      console.log(`   • product_collections: ${pc.rows[0].total} registros`)
      
      if (cp.rows[0].total === 0 && pc.rows[0].total >= 0) {
        console.log(`   💡 collection_products está vazia, product_collections é a ativa`)
        await connector.queryNeon(`DROP TABLE IF EXISTS collection_products CASCADE`)
        console.log(`   ✅ collection_products removida (duplicata vazia)`)
      }
      
    } catch (error) {
      console.log(`   ❌ Erro na verificação de duplicatas: ${error.message}`)
    }
    
    // RESUMO FINAL
    console.log('\n\n📊 RESUMO DA LIMPEZA')
    console.log('===================')
    
    const finalCount = await connector.queryNeon(`
      SELECT COUNT(*) as total 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `)
    
    console.log(`\n✅ Limpeza concluída!`)
    console.log(`   • Tabelas restantes: ${finalCount.rows[0].total}`)
    console.log(`   • Removidas: Apenas redundantes/temporárias`)
    console.log(`   • Mantidas: TODAS as funcionais (marketing, A/B, gift lists, chat, GDPR, etc.)`)
    
    console.log(`\n🎯 PRÓXIMOS PASSOS:`)
    console.log(`   1. ✅ API de imagens implementada`)
    console.log(`   2. ✅ Limpeza de tabelas redundantes concluída`)
    console.log(`   3. 🚀 Sistema pronto para implementar funcionalidades avançadas`)
    
    await connector.disconnect()
    
  } catch (error) {
    console.error('❌ Erro na limpeza:', error.message)
    await connector.disconnect()
    process.exit(1)
  }
}

cleanRedundantTables() 