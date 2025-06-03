#!/usr/bin/env node

import { DatabaseConnector } from './sync/utils/db-connector.mjs'

async function fixEmptySlug() {
  const connector = new DatabaseConnector({ forceConnection: true })
  
  try {
    console.log('🔧 Corrigindo produtos com slug vazio...\n')
    
    await connector.connectNeon()
    
    // Verificar produtos com slug vazio
    const emptySlugResult = await connector.queryNeon(`
      SELECT id, sku, name 
      FROM products 
      WHERE slug IS NULL OR slug = '' 
    `)
    
    console.log(`📊 Encontrados ${emptySlugResult.rows.length} produtos com slug vazio`)
    
    if (emptySlugResult.rows.length > 0) {
      for (const product of emptySlugResult.rows) {
        console.log(`\n🔨 Corrigindo produto:`)
        console.log(`  ID: ${product.id}`)
        console.log(`  SKU: ${product.sku}`)
        console.log(`  Nome: ${product.name || 'SEM NOME'}`)
        
        // Gerar um novo slug único
        const baseSlug = product.name ? 
          product.name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim() 
          : `produto-${product.sku}`
        
        // Adicionar timestamp para garantir unicidade
        const newSlug = `${baseSlug}-${Date.now()}`
        
        console.log(`  Novo slug: ${newSlug}`)
        
        // Atualizar o produto
        await connector.queryNeon(
          'UPDATE products SET slug = $1, updated_at = NOW() WHERE id = $2',
          [newSlug, product.id]
        )
        
        console.log(`  ✅ Atualizado!`)
      }
      
      console.log('\n✅ Todos os produtos foram corrigidos!')
    } else {
      console.log('✅ Nenhum produto com slug vazio encontrado!')
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await connector.disconnect()
  }
}

fixEmptySlug() 