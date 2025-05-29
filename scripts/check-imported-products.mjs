#!/usr/bin/env node

import 'dotenv/config'
import pg from 'pg'

const { Pool } = pg

const neonPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

async function checkImportedProducts() {
  try {
    console.log('🔍 Verificando produtos importados do MongoDB...\n')
    
    // Consultar produtos importados
    const result = await neonPool.query(`
      SELECT p.id, p.sku, p.name, p.slug, p.price, p.is_active, p.created_at,
             c.name as category, b.name as brand,
             (SELECT COUNT(*) FROM product_images pi WHERE pi.product_id = p.id) as image_count
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id  
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE p.tags::text LIKE '%importado-mongodb%'
      ORDER BY p.created_at DESC
    `)
    
    console.log(`📦 ${result.rows.length} produtos importados encontrados:\n`)
    
    result.rows.forEach((p, index) => {
      console.log(`${index + 1}. ✅ ${p.name}`)
      console.log(`   SKU: ${p.sku} | Slug: ${p.slug}`)
      console.log(`   Preço: R$ ${parseFloat(p.price).toFixed(2)} | Categoria: ${p.category || 'N/A'}`)
      console.log(`   Marca: ${p.brand || 'N/A'} | Imagens: ${p.image_count}`)
      console.log(`   Ativo: ${p.is_active ? 'Sim' : 'Não'} | Criado: ${p.created_at.toLocaleString('pt-BR')}`)
      console.log(`   🔗 URL: /produto/${p.slug}`)
      console.log('')
    })
    
    // Estatísticas
    const activeCount = result.rows.filter(p => p.is_active).length
    const totalImages = result.rows.reduce((sum, p) => sum + parseInt(p.image_count), 0)
    
    console.log('📊 Estatísticas:')
    console.log(`   Total: ${result.rows.length} produtos`)
    console.log(`   Ativos: ${activeCount} produtos`)
    console.log(`   Inativos: ${result.rows.length - activeCount} produtos`)
    console.log(`   Imagens: ${totalImages} imagens importadas`)
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await neonPool.end()
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  checkImportedProducts()
} 