#!/usr/bin/env node

import 'dotenv/config'
import { Database } from '../apps/store/src/lib/db/database.js'

console.log('📊 Resumo dos dados do marketplace\n')

// Configurar conexão
const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres@localhost/mktplace_dev'
const isLocal = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')

const db = new Database({
  provider: 'postgres',
  connectionString: dbUrl,
  options: {
    postgres: {
      ssl: isLocal ? false : 'require'
    }
  }
})

async function viewDataSummary() {
  try {
    // 1. Resumo geral
    console.log('📈 RESUMO GERAL')
    console.log('================\n')
    
    const summary = await db.queryOne`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE role = 'customer') as total_customers,
        (SELECT COUNT(*) FROM users WHERE role = 'seller') as total_seller_users,
        (SELECT COUNT(*) FROM users WHERE role = 'admin') as total_admins,
        (SELECT COUNT(*) FROM sellers) as total_sellers,
        (SELECT COUNT(*) FROM products) as total_products,
        (SELECT COUNT(*) FROM products WHERE published_at IS NOT NULL) as published_products,
        (SELECT COUNT(*) FROM product_variants) as total_variants,
        (SELECT COUNT(*) FROM product_images) as total_images,
        (SELECT COUNT(*) FROM reviews) as total_reviews,
        (SELECT COUNT(*) FROM categories) as total_categories,
        (SELECT COUNT(*) FROM brands) as total_brands,
        (SELECT COUNT(*) FROM coupons) as total_coupons,
        (SELECT COUNT(*) FROM banners) as total_banners
    `
    
    console.log(`👥 Usuários: ${summary.total_users} total`)
    console.log(`   - Clientes: ${summary.total_customers}`)
    console.log(`   - Vendedores: ${summary.total_seller_users}`)
    console.log(`   - Admins: ${summary.total_admins}`)
    console.log(`🏪 Vendedores: ${summary.total_sellers}`)
    console.log(`📦 Produtos: ${summary.total_products} (${summary.published_products} publicados)`)
    console.log(`🎨 Variações: ${summary.total_variants}`)
    console.log(`🖼️  Imagens: ${summary.total_images}`)
    console.log(`⭐ Avaliações: ${summary.total_reviews}`)
    console.log(`📁 Categorias: ${summary.total_categories}`)
    console.log(`🏷️  Marcas: ${summary.total_brands}`)
    console.log(`🎟️  Cupons: ${summary.total_coupons}`)
    console.log(`🎯 Banners: ${summary.total_banners}`)
    
    // 2. Top vendedores
    console.log('\n\n🏆 TOP VENDEDORES')
    console.log('==================\n')
    
    const topSellers = await db.query`
      SELECT 
        s.company_name,
        s.rating_average,
        s.rating_count,
        COUNT(DISTINCT p.id) as product_count,
        COUNT(DISTINCT r.id) as review_count
      FROM sellers s
      LEFT JOIN products p ON p.seller_id = s.id
      LEFT JOIN reviews r ON r.product_id = p.id
      GROUP BY s.id, s.company_name, s.rating_average, s.rating_count
      ORDER BY s.rating_average DESC, product_count DESC
      LIMIT 5
    `
    
    topSellers.forEach((seller, index) => {
      console.log(`${index + 1}. ${seller.company_name}`)
      console.log(`   ⭐ ${seller.rating_average} (${seller.rating_count} avaliações)`)
      console.log(`   📦 ${seller.product_count} produtos | 💬 ${seller.review_count} reviews`)
    })
    
    // 3. Produtos mais bem avaliados
    console.log('\n\n⭐ PRODUTOS MAIS BEM AVALIADOS')
    console.log('================================\n')
    
    const topProducts = await db.query`
      SELECT 
        p.name,
        p.price,
        p.rating_average,
        COUNT(r.id) as review_count,
        c.name as category,
        s.company_name as seller
      FROM products p
      JOIN categories c ON p.category_id = c.id
      JOIN sellers s ON p.seller_id = s.id
      LEFT JOIN reviews r ON r.product_id = p.id
      WHERE p.rating_average > 0
      GROUP BY p.id, p.name, p.price, p.rating_average, c.name, s.company_name
      ORDER BY p.rating_average DESC, review_count DESC
      LIMIT 5
    `
    
    topProducts.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name}`)
      console.log(`   💰 R$ ${product.price} | ⭐ ${product.rating_average} (${product.review_count} reviews)`)
      console.log(`   📁 ${product.category} | 🏪 ${product.seller}`)
    })
    
    // 4. Categorias com mais produtos
    console.log('\n\n📁 CATEGORIAS POPULARES')
    console.log('========================\n')
    
    const popularCategories = await db.query`
      SELECT 
        c.name,
        c.slug,
        COUNT(DISTINCT p.id) as product_count,
        COUNT(DISTINCT pv.id) as variant_count,
        COALESCE(AVG(p.price), 0) as avg_price
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id
      LEFT JOIN product_variants pv ON pv.product_id = p.id
      GROUP BY c.id, c.name, c.slug
      HAVING COUNT(DISTINCT p.id) > 0
      ORDER BY product_count DESC
      LIMIT 10
    `
    
    popularCategories.forEach(cat => {
      console.log(`• ${cat.name} (${cat.slug})`)
      console.log(`  ${cat.product_count} produtos | ${cat.variant_count} variações | Preço médio: R$ ${parseFloat(cat.avg_price).toFixed(2)}`)
    })
    
    // 5. Estatísticas de preços
    console.log('\n\n💰 ESTATÍSTICAS DE PREÇOS')
    console.log('==========================\n')
    
    const priceStats = await db.queryOne`
      SELECT 
        MIN(price) as min_price,
        MAX(price) as max_price,
        AVG(price) as avg_price,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price) as median_price
      FROM products
      WHERE price > 0
    `
    
    console.log(`Menor preço: R$ ${priceStats.min_price}`)
    console.log(`Maior preço: R$ ${priceStats.max_price}`)
    console.log(`Preço médio: R$ ${parseFloat(priceStats.avg_price).toFixed(2)}`)
    console.log(`Preço mediano: R$ ${parseFloat(priceStats.median_price).toFixed(2)}`)
    
    // 6. Cupons ativos
    console.log('\n\n🎟️  CUPONS ATIVOS')
    console.log('==================\n')
    
    const activeCoupons = await db.query`
      SELECT 
        code,
        description,
        type,
        value,
        minimum_amount,
        usage_limit,
        valid_until
      FROM coupons
      WHERE is_active = true
      ORDER BY value DESC
    `
    
    activeCoupons.forEach(coupon => {
      const discount = coupon.type === 'percentage' ? `${coupon.value}%` : `R$ ${coupon.value}`
      console.log(`• ${coupon.code}: ${coupon.description}`)
      console.log(`  Desconto: ${discount} | Mínimo: R$ ${coupon.minimum_amount} | Limite: ${coupon.usage_limit} usos`)
    })
    
    // 7. Usuários de teste
    console.log('\n\n🔑 USUÁRIOS DE TESTE')
    console.log('=====================\n')
    
    const testUsers = await db.query`
      SELECT 
        u.email,
        u.name,
        u.role,
        s.company_name
      FROM users u
      LEFT JOIN sellers s ON s.user_id = u.id
      ORDER BY u.role, u.created_at
    `
    
    console.log('Admins:')
    testUsers.filter(u => u.role === 'admin').forEach(u => {
      console.log(`  • ${u.email} (${u.name})`)
    })
    
    console.log('\nVendedores:')
    testUsers.filter(u => u.role === 'seller').forEach(u => {
      console.log(`  • ${u.email} (${u.name}) - ${u.company_name || 'Sem loja'}`)
    })
    
    console.log('\nClientes:')
    testUsers.filter(u => u.role === 'customer').forEach(u => {
      console.log(`  • ${u.email} (${u.name})`)
    })
    
    console.log('\n\n✅ Resumo completo gerado com sucesso!')
    
  } catch (error) {
    console.error('❌ Erro ao gerar resumo:', error)
    throw error
  } finally {
    await db.close()
  }
}

viewDataSummary().catch(console.error) 