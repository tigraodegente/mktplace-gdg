import { createDatabase } from '../packages/db-hyperdrive/dist/index.js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.local' });

async function debugCategories() {
  const db = createDatabase({ DATABASE_URL: process.env.DATABASE_URL });
  
  try {
    console.log('🔍 Verificando categorias e produtos...\n');
    
    // 1. Listar todas as categorias
    const categories = await db.query(`
      SELECT id, name, slug, parent_id, is_active
      FROM categories
      ORDER BY name
    `);
    
    console.log('📁 Categorias encontradas:');
    console.table(categories.map(c => ({
      id: c.id.substring(0, 8) + '...',
      name: c.name,
      slug: c.slug,
      parent_id: c.parent_id ? c.parent_id.substring(0, 8) + '...' : null,
      is_active: c.is_active
    })));
    
    // 2. Verificar produtos por categoria
    const productsByCategory = await db.query(`
      SELECT 
        c.name as category_name,
        c.slug as category_slug,
        COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.is_active = true
      WHERE c.is_active = true
      GROUP BY c.id, c.name, c.slug
      HAVING COUNT(p.id) > 0
      ORDER BY COUNT(p.id) DESC
    `);
    
    console.log('\n📊 Produtos por categoria:');
    console.table(productsByCategory);
    
    // 3. Verificar especificamente PlayStation
    const playstationCategory = categories.find(c => 
      c.name.toLowerCase().includes('playstation') || 
      c.slug === 'playstation'
    );
    
    if (playstationCategory) {
      console.log('\n🎮 Categoria PlayStation encontrada:');
      console.log('ID:', playstationCategory.id);
      console.log('Nome:', playstationCategory.name);
      console.log('Slug:', playstationCategory.slug);
      
      // Buscar produtos desta categoria
      const playstationProducts = await db.query(`
        SELECT id, name, slug, price, is_active, quantity
        FROM products
        WHERE category_id = $1
        LIMIT 10
      `, playstationCategory.id);
      
      console.log('\n🎮 Produtos PlayStation:');
      console.table(playstationProducts.map(p => ({
        id: p.id.substring(0, 8) + '...',
        name: p.name,
        slug: p.slug,
        price: `R$ ${p.price}`,
        is_active: p.is_active,
        stock: p.quantity
      })));
    }
    
    // 4. Verificar se há produtos ativos
    const activeProductsCount = await db.query(`
      SELECT COUNT(*) as total FROM products WHERE is_active = true
    `);
    
    console.log('\n📈 Total de produtos ativos:', activeProductsCount[0].total);
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await db.close();
  }
}

debugCategories(); 