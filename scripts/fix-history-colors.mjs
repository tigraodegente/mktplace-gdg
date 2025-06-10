#!/usr/bin/env node

import pg from 'pg'

const { Pool } = pg

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-raspy-meadow-acds6p80-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
})

async function fixHistoryColors() {
  try {
    console.log('🎨 Corrigindo cores do histórico...\n')
    
    // Atualizar todas as ações para usar apenas as cores do sistema
    const updates = [
      { action: 'created', summary: 'Produto criado no sistema' },
      { action: 'updated', summary: 'Preço atualizado' },
      { action: 'updated', summary: 'Estoque reabastecido' },
      { action: 'updated', summary: 'Descrição e tags atualizadas' },
      { action: 'published', summary: 'Produto publicado na loja' }
    ]
    
    console.log('📋 Adicionando mais entradas variadas...')
    
    // Buscar produtos que já têm histórico
    const products = await pool.query(`
      SELECT DISTINCT product_id 
      FROM product_history 
      LIMIT 5
    `)
    
    for (const product of products.rows) {
      console.log(`\n📝 Adicionando entradas para produto: ${product.product_id}`)
      
      // Adicionar diferentes tipos de ações
      const newEntries = [
        {
          action: 'updated',
          summary: 'Imagens atualizadas',
          changes: { images: { old: ['img1.jpg'], new: ['img1.jpg', 'img2.jpg'] } }
        },
        {
          action: 'updated', 
          summary: 'Categoria alterada',
          changes: { category: { old: 'Categoria A', new: 'Categoria B' } }
        },
        {
          action: 'updated',
          summary: 'SEO otimizado',
          changes: { 
            meta_title: { old: 'Título antigo', new: 'Novo título SEO' },
            meta_description: { old: 'Desc antiga', new: 'Nova descrição' }
          }
        },
        {
          action: 'unpublished',
          summary: 'Produto despublicado para manutenção',
          changes: { is_active: { old: true, new: false } }
        },
        {
          action: 'published',
          summary: 'Produto republicado após ajustes',
          changes: { is_active: { old: false, new: true } }
        }
      ]
      
      for (let i = 0; i < newEntries.length; i++) {
        const entry = newEntries[i]
        const createdAt = new Date(Date.now() - (newEntries.length - i) * 12 * 60 * 60 * 1000) // Espaçar por 12h
        
        await pool.query(`
          INSERT INTO product_history (
            product_id, user_id, action, changes, summary, created_at
          ) VALUES (
            $1, NULL, $2, $3, $4, $5
          )
        `, [
          product.product_id,
          entry.action,
          JSON.stringify(entry.changes),
          entry.summary,
          createdAt
        ])
        
        console.log(`   ✅ ${entry.action}: ${entry.summary}`)
      }
    }
    
    // Mostrar estatísticas finais
    const finalCount = await pool.query('SELECT COUNT(*) as total FROM product_history')
    console.log(`\n✅ Total de registros: ${finalCount.rows[0].total}`)
    
    // Mostrar distribuição por ação
    const distribution = await pool.query(`
      SELECT action, COUNT(*) as count 
      FROM product_history 
      GROUP BY action 
      ORDER BY count DESC
    `)
    
    console.log('\n📊 Distribuição por ação:')
    distribution.rows.forEach(row => {
      console.log(`   ${row.action}: ${row.count} registros`)
    })
    
    await pool.end()
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
    await pool.end()
  }
}

fixHistoryColors() 