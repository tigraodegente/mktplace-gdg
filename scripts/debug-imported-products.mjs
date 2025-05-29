#!/usr/bin/env node

import 'dotenv/config'
import pg from 'pg'

const { Pool } = pg

const neonPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

async function debugImportedProducts() {
  try {
    console.log('🔍 Verificando integridade dos produtos importados...\n')
    
    // Verificar produtos importados
    const result = await neonPool.query(`
      SELECT 
        p.id, p.sku, p.name, p.slug, p.is_active, 
        p.brand_id, p.category_id, p.seller_id,
        p.description, p.price, p.currency, p.quantity,
        b.name as brand_name,
        c.name as category_name,
        s.company_name as seller_name
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN sellers s ON p.seller_id = s.id
      WHERE p.tags::text LIKE '%importado-mongodb%'
      ORDER BY p.created_at DESC
    `)
    
    const problems = []
    
    result.rows.forEach((p, index) => {
      console.log(`${index + 1}. ${p.name}`)
      console.log(`   ✅ ID: ${p.id}`)
      console.log(`   ✅ SKU: ${p.sku}`)
      console.log(`   ✅ Slug: ${p.slug}`)
      console.log(`   ${p.is_active ? '✅' : '❌'} Ativo: ${p.is_active}`)
      console.log(`   ${p.brand_id ? '✅' : '❌'} Brand ID: ${p.brand_id || 'NULL'} (${p.brand_name || 'N/A'})`)
      console.log(`   ${p.category_id ? '✅' : '❌'} Category ID: ${p.category_id || 'NULL'} (${p.category_name || 'N/A'})`)
      console.log(`   ${p.seller_id ? '✅' : '❌'} Seller ID: ${p.seller_id || 'NULL'} (${p.seller_name || 'N/A'})`)
      
      const hasValidDesc = p.description && p.description !== '[PENDENTE] Descrição a ser enriquecida via IA'
      console.log(`   ${hasValidDesc ? '✅' : '⚠️'} Descrição: ${p.description ? (p.description.length > 50 ? p.description.substring(0, 50) + '...' : p.description) : 'NULL'}`)
      console.log(`   ✅ Preço: R$ ${p.price} ${p.currency}`)
      console.log(`   ✅ Estoque: ${p.quantity}`)
      console.log('')
      
      // Identificar problemas
      if (!p.is_active) problems.push(`${p.name}: não está ativo`)
      if (!p.brand_id) problems.push(`${p.name}: sem marca`)
      if (!p.category_id) problems.push(`${p.name}: sem categoria`)
      if (!p.seller_id) problems.push(`${p.name}: sem vendedor`)
      if (!hasValidDesc) problems.push(`${p.name}: descrição pendente`)
    })
    
    // Testar API diretamente
    console.log('🧪 Testando API para o primeiro produto...\n')
    
    if (result.rows.length > 0) {
      const firstProduct = result.rows[0]
      console.log(`Testando: /api/products/${firstProduct.slug}`)
      
      // Simular a query da API
      const apiResult = await neonPool.query(`
        WITH product_images_agg AS (
          SELECT 
            pi.product_id,
            array_agg(pi.url ORDER BY pi.position) as images
          FROM product_images pi
          GROUP BY pi.product_id
        )
        SELECT 
          p.*,
          COALESCE(pi.images, ARRAY[]::text[]) as images,
          c.name as category_name,
          b.name as brand_name,
          s.company_name as seller_name
        FROM products p
        LEFT JOIN product_images_agg pi ON pi.product_id = p.id
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN brands b ON b.id = p.brand_id
        LEFT JOIN sellers s ON s.id = p.seller_id
        WHERE p.slug = $1 AND p.is_active = true
        LIMIT 1
      `, [firstProduct.slug])
      
      if (apiResult.rows.length === 0) {
        console.log('❌ API não encontrou o produto!')
        console.log('Possíveis causas:')
        console.log(`   - is_active: ${firstProduct.is_active}`)
        console.log(`   - slug correto: ${firstProduct.slug}`)
        
        // Testar sem is_active
        const testResult = await neonPool.query(`
          SELECT id, slug, is_active FROM products WHERE slug = $1
        `, [firstProduct.slug])
        
        if (testResult.rows.length > 0) {
          console.log('✅ Produto existe, mas is_active pode estar false')
          console.log(`   is_active: ${testResult.rows[0].is_active}`)
        }
      } else {
        console.log('✅ API encontrou o produto!')
        console.log(`   ID: ${apiResult.rows[0].id}`)
        console.log(`   Nome: ${apiResult.rows[0].name}`)
        console.log(`   Imagens: ${apiResult.rows[0].images?.length || 0}`)
      }
    }
    
    // Resumo de problemas
    if (problems.length > 0) {
      console.log('\n⚠️ Problemas encontrados:')
      problems.forEach(problem => console.log(`   - ${problem}`))
      
      console.log('\n🔧 Sugestões de correção:')
      console.log('   1. Verificar se is_active = true para todos')
      console.log('   2. Verificar se todas as foreign keys estão corretas')
      console.log('   3. Verificar se as descrições estão válidas')
    } else {
      console.log('\n✅ Nenhum problema óbvio encontrado nos dados!')
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await neonPool.end()
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  debugImportedProducts()
} 