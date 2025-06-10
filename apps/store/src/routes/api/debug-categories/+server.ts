import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ url, platform }) => {
  try {
    console.log('🔍 DEBUG CATEGORIES - Iniciando teste...');
    
    const db = getDatabase(platform);
    
    // 1. Primeiro vamos verificar se existem categorias
    console.log('\n1️⃣ Verificando categorias ativas:');
    const categories = await db.query(`
      SELECT id, name, slug, is_active 
      FROM categories 
      WHERE is_active = true 
      LIMIT 10
    `);
    console.log(`   📂 Total categorias ativas: ${categories.length}`);
    categories.forEach(cat => {
      console.log(`   • ${cat.name} (${cat.slug})`);
    });
    
    // 2. Verificar produtos
    console.log('\n2️⃣ Verificando produtos ativos:');
    const products = await db.query(`
      SELECT id, name, is_active 
      FROM products 
      WHERE is_active = true 
      LIMIT 5
    `);
    console.log(`   📦 Total produtos ativos: ${products.length}`);
    products.forEach(prod => {
      console.log(`   • ${prod.name?.slice(0, 40)}...`);
    });
    
    // 3. Verificar relação product_categories
    console.log('\n3️⃣ Verificando relação product_categories:');
    const productCategories = await db.query(`
      SELECT 
        pc.product_id, 
        pc.category_id,
        p.name as product_name,
        c.name as category_name
      FROM product_categories pc
      INNER JOIN products p ON p.id = pc.product_id
      INNER JOIN categories c ON c.id = pc.category_id
      WHERE p.is_active = true AND c.is_active = true
      LIMIT 10
    `);
    console.log(`   🔗 Total relações encontradas: ${productCategories.length}`);
    productCategories.forEach(rel => {
      console.log(`   • ${rel.product_name?.slice(0, 30)}... → ${rel.category_name}`);
    });
    
    // 4. Testar a query exata dos facets
    console.log('\n4️⃣ Testando query dos facets:');
    const conditions = ['p.is_active = true', 'c.is_active = true'];
    const whereClause = conditions.join(' AND ');
    
    const categoriesQuery = `
      SELECT 
        c.id, c.name, c.slug, c.parent_id, c.image_url,
        COUNT(DISTINCT p.id) as count
      FROM categories c
      INNER JOIN product_categories pc ON pc.category_id = c.id
      INNER JOIN products p ON p.id = pc.product_id
      WHERE ${whereClause}
      GROUP BY c.id, c.name, c.slug, c.parent_id, c.image_url
      HAVING COUNT(DISTINCT p.id) > 0
      ORDER BY count DESC, c.name ASC
      LIMIT 50
    `;
    
    console.log('📝 Query SQL:');
    console.log(categoriesQuery);
    
    const categoryResults = await db.query(categoriesQuery);
    
    console.log(`📊 Resultados da query de facets: ${categoryResults.length}`);
    
    if (categoryResults.length > 0) {
      console.log('✅ Categorias encontradas na query de facets:');
      categoryResults.slice(0, 10).forEach((cat, index) => {
        console.log(`   ${index + 1}. ${cat.name} (${cat.slug}) - ${cat.count} produtos`);
      });
    } else {
      console.log('❌ Nenhuma categoria encontrada na query de facets!');
    }
    
    // 5. Verificar query mais simples
    console.log('\n5️⃣ Testando query mais simples (sem GROUP BY):');
    const simpleQuery = await db.query(`
      SELECT DISTINCT c.name, c.slug, c.id
      FROM categories c
      INNER JOIN product_categories pc ON pc.category_id = c.id
      INNER JOIN products p ON p.id = pc.product_id
      WHERE p.is_active = true AND c.is_active = true
      LIMIT 10
    `);
    console.log(`   🎯 Categorias com produtos (simples): ${simpleQuery.length}`);
    simpleQuery.forEach(cat => {
      console.log(`   • ${cat.name} (${cat.slug})`);
    });
    
    return json({
      success: true,
      data: {
        totalCategories: categories.length,
        totalProducts: products.length,
        totalRelations: productCategories.length,
        facetResults: categoryResults.length,
        simpleResults: simpleQuery.length,
        categories: categories,
        facetCategories: categoryResults,
        simpleCategories: simpleQuery
      }
    });
    
  } catch (error) {
    console.error('❌ Erro no debug:', error);
    return json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}; 