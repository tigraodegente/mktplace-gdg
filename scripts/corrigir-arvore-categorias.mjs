#!/usr/bin/env node

/**
 * Script para corrigir a árvore de categorias
 * Move "Trocador" e "Fralda e Cueiro" de "Alimentação e Higiene" para "Quarto de Bebê"
 */

import { DatabaseConnector } from './sync/utils/db-connector.mjs'

async function corrigirArvoreCategoria() {
  const connector = new DatabaseConnector({ forceConnection: true })
  
  try {
    console.log('🔧 Iniciando correção da árvore de categorias...\n')
    
    await connector.connectNeon()
    
    console.log('📋 Estado ANTES da correção:')
    
    // Verificar estado atual
    const estadoAntes = await connector.queryNeon(`
      SELECT 
          c1.name as categoria_pai,
          c2.name as subcategoria,
          c2.id as subcategoria_id
      FROM categories c1 
      JOIN categories c2 ON c2.parent_id = c1.id 
      WHERE c1.slug IN ('alimentacao-e-higiene', 'quarto-de-bebe')
        AND c2.slug IN ('trocador', 'fralda-e-cueiro')
      ORDER BY c1.name, c2.name
    `)
    
    estadoAntes.rows.forEach(row => {
      console.log(`   ${row.categoria_pai} → ${row.subcategoria}`)
    })
    
    console.log('\n🔄 Executando correções...\n')
    
    // 1. Mover "Trocador" para "Quarto de Bebê"
    console.log('1. Movendo "Trocador" para "Quarto de Bebê"...')
    const resultTrocador = await connector.queryNeon(`
      UPDATE categories 
      SET parent_id = 'd64893f3-126b-415b-9bf6-db64ae19d836'  -- Quarto de Bebê
      WHERE id = '3a67b01c-2113-4fa1-9d13-32e6e6f36cb6'       -- Trocador
        AND name = 'Trocador'
      RETURNING id, name
    `)
    
    if (resultTrocador.rowCount > 0) {
      console.log('   ✅ Trocador movido com sucesso!')
    } else {
      console.log('   ⚠️  Nenhuma linha alterada para Trocador')
    }

    // 2. Mover "Fralda e Cueiro" para "Quarto de Bebê"  
    console.log('2. Movendo "Fralda e Cueiro" para "Quarto de Bebê"...')
    const resultFralda = await connector.queryNeon(`
      UPDATE categories 
      SET parent_id = 'd64893f3-126b-415b-9bf6-db64ae19d836'  -- Quarto de Bebê
      WHERE id = '42a60155-3d30-4863-a110-cdf9919e1966'       -- Fralda e Cueiro
        AND name = 'Fralda e Cueiro'
      RETURNING id, name
    `)
    
    if (resultFralda.rowCount > 0) {
      console.log('   ✅ Fralda e Cueiro movido com sucesso!')
    } else {
      console.log('   ⚠️  Nenhuma linha alterada para Fralda e Cueiro')
    }

    console.log('\n📋 Estado DEPOIS da correção:')
    
    // Verificar estado final
    const estadoDepois = await connector.queryNeon(`
      SELECT 
          c1.name as categoria_pai,
          c2.name as subcategoria,
          c2.id as subcategoria_id
      FROM categories c1 
      JOIN categories c2 ON c2.parent_id = c1.id 
      WHERE c1.slug IN ('alimentacao-e-higiene', 'quarto-de-bebe')
        AND c2.slug IN ('trocador', 'fralda-e-cueiro')
      ORDER BY c1.name, c2.name
    `)
    
    estadoDepois.rows.forEach(row => {
      console.log(`   ${row.categoria_pai} → ${row.subcategoria}`)
    })
    
    // Verificar quantos produtos ficaram em "Alimentação e Higiene"
    console.log('\n📊 Contagem de produtos após correção:')
    
    const contagemAlimentacao = await connector.queryNeon(`
      SELECT COUNT(DISTINCT pc.product_id) as total_produtos
      FROM product_categories pc
      JOIN categories c ON pc.category_id = c.id
      WHERE c.parent_id = 'a46b2d09-28d5-47dc-b929-020bec090bb9'  -- Alimentação e Higiene
         OR c.id = 'a46b2d09-28d5-47dc-b929-020bec090bb9'
    `)
    
    const contagemQuarto = await connector.queryNeon(`
      SELECT COUNT(DISTINCT pc.product_id) as total_produtos
      FROM product_categories pc
      JOIN categories c ON pc.category_id = c.id
      WHERE c.parent_id = 'd64893f3-126b-415b-9bf6-db64ae19d836'  -- Quarto de Bebê
         OR c.id = 'd64893f3-126b-415b-9bf6-db64ae19d836'
    `)
    
    console.log(`   Alimentação e Higiene: ${contagemAlimentacao.rows[0].total_produtos} produtos`)
    console.log(`   Quarto de Bebê: ${contagemQuarto.rows[0].total_produtos} produtos`)
    
    console.log('\n✅ Correção da árvore de categorias concluída!')
    console.log('\n🔄 Reinicie o servidor para ver as mudanças:')
    console.log('   cd apps/store && pnpm dev')
    
  } catch (error) {
    console.error('❌ Erro durante a correção:', error)
    process.exit(1)
  } finally {
    await connector.disconnect()
  }
}

corrigirArvoreCategoria() 