#!/usr/bin/env node

import pg from 'pg'

const { Pool } = pg

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-raspy-meadow-acds6p80-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
})

async function addTestHistory() {
  try {
    console.log('🔍 Adicionando histórico de teste...\n')
    
    // Buscar alguns produtos para adicionar histórico
    const products = await pool.query(`
      SELECT id, name, sku 
      FROM products 
      ORDER BY created_at DESC 
      LIMIT 5
    `)
    
    console.log(`📋 Encontrados ${products.rows.length} produtos`)
    
    for (const product of products.rows) {
      console.log(`\n📝 Adicionando histórico para: ${product.name} (${product.id})`)
      
      // Verificar se já tem histórico
      const existing = await pool.query(
        'SELECT COUNT(*) as count FROM product_history WHERE product_id = $1',
        [product.id]
      )
      
      if (parseInt(existing.rows[0].count) > 0) {
        console.log(`   ✅ Já tem ${existing.rows[0].count} entradas`)
        continue
      }
      
      // Adicionar várias entradas de histórico
      const historyEntries = [
        {
          action: 'created',
          summary: 'Produto criado no sistema',
          changes: { name: { old: null, new: product.name } }
        },
        {
          action: 'updated',
          summary: 'Preço atualizado',
          changes: { 
            price: { old: '99.90', new: '89.90' },
            original_price: { old: '129.90', new: '119.90' }
          }
        },
        {
          action: 'updated',
          summary: 'Estoque reabastecido',
          changes: { quantity: { old: 5, new: 50 } }
        },
        {
          action: 'updated',
          summary: 'Descrição e tags atualizadas',
          changes: { 
            description: { old: 'Descrição antiga', new: 'Nova descrição detalhada' },
            tags: { old: ['tag1'], new: ['tag1', 'tag2', 'novo'] }
          }
        },
        {
          action: 'published',
          summary: 'Produto publicado na loja',
          changes: { is_active: { old: false, new: true } }
        }
      ]
      
      for (let i = 0; i < historyEntries.length; i++) {
        const entry = historyEntries[i]
        const createdAt = new Date(Date.now() - (historyEntries.length - i) * 24 * 60 * 60 * 1000) // Espaçar por dias
        
        await pool.query(`
          INSERT INTO product_history (
            product_id, user_id, action, changes, summary, created_at
          ) VALUES (
            $1, NULL, $2, $3, $4, $5
          )
        `, [
          product.id,
          entry.action,
          JSON.stringify(entry.changes),
          entry.summary,
          createdAt
        ])
        
        console.log(`   📝 Adicionado: ${entry.action} - ${entry.summary}`)
      }
    }
    
    // Mostrar estatísticas finais
    const finalCount = await pool.query('SELECT COUNT(*) as total FROM product_history')
    console.log(`\n✅ Total de registros de histórico: ${finalCount.rows[0].total}`)
    
    await pool.end()
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
    await pool.end()
  }
}

addTestHistory() 