import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const { Client } = pg;

async function checkCategoryStructure() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('✅ Conectado ao banco de dados\n');

    // Verificar categorias com produtos
    const categoriesWithProducts = await client.query(`
      SELECT c.id, c.name, c.slug, c.parent_id, pc.name as parent_name
      FROM categories c
      LEFT JOIN categories pc ON c.parent_id = pc.id
      WHERE c.slug IN ('smartphones', 'notebooks', 'tvs', 'fones-ouvido', 'playstation')
    `);
    
    console.log('📁 Categorias que têm produtos:');
    categoriesWithProducts.rows.forEach(cat => {
      console.log(`  - ${cat.name} (${cat.slug})`);
      console.log(`    Parent: ${cat.parent_name || 'NENHUM (é categoria principal)'}`);
      console.log(`    Parent ID: ${cat.parent_id || 'NULL'}\n`);
    });

    // Verificar estrutura completa
    console.log('\n🌳 Estrutura completa de categorias:');
    const allCategories = await client.query(`
      WITH RECURSIVE category_tree AS (
        -- Categorias raiz
        SELECT id, name, slug, parent_id, 0 as level
        FROM categories
        WHERE parent_id IS NULL AND is_active = true
        
        UNION ALL
        
        -- Subcategorias
        SELECT c.id, c.name, c.slug, c.parent_id, ct.level + 1
        FROM categories c
        JOIN category_tree ct ON c.parent_id = ct.id
        WHERE c.is_active = true
      )
      SELECT 
        ct.*,
        COUNT(p.id) as product_count
      FROM category_tree ct
      LEFT JOIN products p ON p.category_id = ct.id AND p.is_active = true
      GROUP BY ct.id, ct.name, ct.slug, ct.parent_id, ct.level
      ORDER BY ct.level, ct.name
    `);

    let currentLevel = -1;
    allCategories.rows.forEach(cat => {
      if (cat.level !== currentLevel) {
        currentLevel = cat.level;
        console.log(`\n${'  '.repeat(cat.level)}Nível ${cat.level}:`);
      }
      console.log(`${'  '.repeat(cat.level + 1)}- ${cat.name} (${cat.slug}) - ${cat.product_count} produtos`);
    });

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await client.end();
  }
}

checkCategoryStructure(); 