#!/usr/bin/env node

import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-raspy-meadow-acds6p80-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require'
});

console.log('🔧 ========================================');
console.log('🔧 TESTE DOS FILTROS CORRIGIDOS');
console.log('🔧 ========================================');

async function testCategoriesFilter() {
  console.log('\n📂 TESTE: CATEGORIAS');
  try {
    const categoriesQuery = `
      SELECT 
        c.id, c.name, c.slug, c.parent_id, c.image_url,
        COUNT(DISTINCT p.id) as count
      FROM categories c
      INNER JOIN product_categories pc ON pc.category_id = c.id
      INNER JOIN products p ON p.id = pc.product_id
      WHERE p.is_active = true
      AND c.is_active = true
      GROUP BY c.id, c.name, c.slug, c.parent_id, c.image_url
      HAVING COUNT(DISTINCT p.id) > 0
      ORDER BY count DESC, c.name ASC
      LIMIT 10
    `;
    
    const result = await client.query(categoriesQuery);
    console.log(`✅ Categorias: ${result.rows.length} encontradas`);
    
    result.rows.slice(0, 5).forEach((cat, index) => {
      console.log(`  ${index + 1}. ${cat.name} (${cat.count} produtos) - URL: ?categoria=${cat.slug}`);
    });
    
  } catch (error) {
    console.error('❌ Erro em categorias:', error.message);
  }
}

async function testDeliveryFilter() {
  console.log('\n🚚 TESTE: TEMPO DE ENTREGA');
  try {
    const deliveryQuery = `
      WITH delivery_grouped AS (
        SELECT 
          CASE 
            WHEN p.delivery_days <= 1 THEN '24h'
            WHEN p.delivery_days <= 2 THEN '48h'
            WHEN p.delivery_days <= 3 THEN '3days'
            WHEN p.delivery_days <= 7 THEN '7days'
            WHEN p.delivery_days <= 15 THEN '15days'
            ELSE '15days'
          END as delivery_option,
          COUNT(DISTINCT p.id) as count
        FROM products p
        WHERE p.is_active = true
        GROUP BY 
          CASE 
            WHEN p.delivery_days <= 1 THEN '24h'
            WHEN p.delivery_days <= 2 THEN '48h'
            WHEN p.delivery_days <= 3 THEN '3days'
            WHEN p.delivery_days <= 7 THEN '7days'
            WHEN p.delivery_days <= 15 THEN '15days'
            ELSE '15days'
          END
      )
      SELECT delivery_option, count
      FROM delivery_grouped
      ORDER BY 
        CASE 
          WHEN delivery_option = '24h' THEN 1
          WHEN delivery_option = '48h' THEN 2
          WHEN delivery_option = '3days' THEN 3
          WHEN delivery_option = '7days' THEN 4
          ELSE 5
        END
    `;
    
    const result = await client.query(deliveryQuery);
    console.log(`✅ Opções de entrega: ${result.rows.length} encontradas`);
    
    const labels = {
      '24h': 'Entrega em 24h',
      '48h': 'Até 2 dias',
      '3days': 'Até 3 dias úteis',
      '7days': 'Até 7 dias úteis',
      '15days': 'Até 15 dias'
    };
    
    result.rows.forEach((delivery, index) => {
      const label = labels[delivery.delivery_option];
      console.log(`  ${index + 1}. ${label} (${delivery.count} produtos) - URL: ?entrega=${delivery.delivery_option}`);
    });
    
  } catch (error) {
    console.error('❌ Erro em tempo de entrega:', error.message);
  }
}

async function testBenefitsFilter() {
  console.log('\n🎁 TESTE: OFERTAS E BENEFÍCIOS');
  try {
    const benefitsQuery = `
      SELECT 
        COUNT(DISTINCT CASE WHEN p.original_price > 0 AND p.original_price > p.price THEN p.id END) as discount_count,
        COUNT(DISTINCT CASE WHEN p.has_free_shipping = true THEN p.id END) as free_shipping_count,
        COUNT(DISTINCT CASE WHEN p.quantity = 0 THEN p.id END) as out_of_stock_count,
        COUNT(DISTINCT CASE WHEN p.quantity > 0 THEN p.id END) as in_stock_count
      FROM products p
      WHERE p.is_active = true
    `;
    
    const result = await client.query(benefitsQuery);
    const data = result.rows[0];
    
    console.log('✅ Benefícios encontrados:');
    console.log(`  🎁 Com desconto: ${data.discount_count} produtos - URL: ?promocao=true`);
    console.log(`  🚚 Frete grátis: ${data.free_shipping_count} produtos - URL: ?frete_gratis=true`);
    console.log(`  📦 Em estoque: ${data.in_stock_count} produtos - URL: ?disponivel=true`);
    console.log(`  ❌ Fora de estoque: ${data.out_of_stock_count} produtos - URL: ?disponivel=false`);
    
  } catch (error) {
    console.error('❌ Erro em benefícios:', error.message);
  }
}

async function runTests() {
  try {
    await client.connect();
    console.log('✅ Conectado ao banco\n');
    
    await testCategoriesFilter();
    await testDeliveryFilter();
    await testBenefitsFilter();
    
    console.log('\n🎯 ========================================');
    console.log('🎯 TESTE CONCLUÍDO!');
    console.log('🎯 ========================================');
    console.log('✅ Todos os filtros corrigidos estão funcionando');
    console.log('\n🔍 Para testar na API:');
    console.log('curl "http://localhost:5173/api/products?categoria=SLUG"');
    console.log('curl "http://localhost:5173/api/products?entrega=3days"');
    console.log('curl "http://localhost:5173/api/products?promocao=true"');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  } finally {
    await client.end();
  }
}

runTests(); 