import { createDatabase } from '../apps/store/src/lib/db/database.js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.local' });

async function debugProductsByBrand() {
  const db = createDatabase({ DATABASE_URL: process.env.DATABASE_URL });
  
  try {
    console.log('🔍 Verificando produtos por marca...\n');
    
    // Buscar produtos Samsung
    const samsungProducts = await db.query(`
      SELECT p.id, p.name, p.slug, p.price, c.name as category_name, b.name as brand_name
      FROM products p
      JOIN categories c ON p.category_id = c.id
      JOIN brands b ON p.brand_id = b.id
      WHERE b.slug = 'samsung'
      ORDER BY p.name
    `);
    
    console.log('📱 Produtos Samsung:');
    console.table(samsungProducts.map(p => ({
      name: p.name,
      category: p.category_name,
      price: `R$ ${p.price}`
    })));
    
    // Buscar produtos por categoria e marca
    const productsByCategory = await db.query(`
      SELECT 
        c.name as category,
        b.name as brand,
        COUNT(*) as count
      FROM products p
      JOIN categories c ON p.category_id = c.id
      JOIN brands b ON p.brand_id = b.id
      GROUP BY c.name, b.name
      ORDER BY c.name, b.name
    `);
    
    console.log('\n📊 Produtos por Categoria e Marca:');
    console.table(productsByCategory);
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await db.close();
  }
}

debugProductsByBrand(); 