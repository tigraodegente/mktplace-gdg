import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const { Client } = pg;

async function checkCategories() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('✅ Conectado ao banco de dados\n');

    // Verificar produtos
    const productsResult = await client.query('SELECT COUNT(*) FROM products WHERE is_active = true');
    console.log(`📦 Produtos ativos: ${productsResult.rows[0].count}`);

    // Verificar categorias
    const categoriesResult = await client.query('SELECT COUNT(*) FROM categories WHERE is_active = true');
    console.log(`📁 Categorias ativas: ${categoriesResult.rows[0].count}`);

    // Verificar produtos com categorias
    const productsWithCats = await client.query(`
      SELECT COUNT(*) 
      FROM products p 
      JOIN categories c ON p.category_id = c.id 
      WHERE p.is_active = true AND c.is_active = true
    `);
    console.log(`🔗 Produtos com categorias ativas: ${productsWithCats.rows[0].count}`);

    // Listar algumas categorias
    const sampleCategories = await client.query(`
      SELECT c.id, c.name, c.slug, COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.is_active = true
      WHERE c.is_active = true
      GROUP BY c.id, c.name, c.slug
      ORDER BY product_count DESC
      LIMIT 10
    `);
    
    console.log('\n📊 Top 10 categorias por número de produtos:');
    sampleCategories.rows.forEach(cat => {
      console.log(`  - ${cat.name} (${cat.slug}): ${cat.product_count} produtos`);
    });

    // Verificar se há produtos sem categoria
    const productsWithoutCat = await client.query(`
      SELECT COUNT(*) 
      FROM products p 
      WHERE p.is_active = true 
      AND (p.category_id IS NULL OR p.category_id NOT IN (SELECT id FROM categories WHERE is_active = true))
    `);
    console.log(`\n⚠️  Produtos sem categoria válida: ${productsWithoutCat.rows[0].count}`);

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await client.end();
  }
}

checkCategories(); 