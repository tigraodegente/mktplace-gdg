import pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const { Client } = pg;

// URL de desenvolvimento do Neon
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-raspy-meadow-acds6p80-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

async function checkCategories() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { 
      rejectUnauthorized: false 
    }
  });

  try {
    await client.connect();
    console.log('🔌 Conectado ao banco de dados\n');
    
    // Buscar estatísticas
    const { rows: stats } = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE parent_id IS NULL) as principais,
        COUNT(*) FILTER (WHERE parent_id IS NOT NULL) as subcategorias
      FROM categories
    `);
    
    console.log('📊 Estatísticas:');
    console.log(`   Total de categorias: ${stats[0].total}`);
    console.log(`   Categorias principais: ${stats[0].principais}`);
    console.log(`   Subcategorias: ${stats[0].subcategorias}\n`);
    
    // Buscar estrutura hierárquica
    const { rows: categories } = await client.query(`
      WITH RECURSIVE category_tree AS (
        SELECT 
          id, name, slug, parent_id, 
          0 as level,
          ARRAY[name]::varchar[] as path
        FROM categories
        WHERE parent_id IS NULL
        
        UNION ALL
        
        SELECT 
          c.id, c.name, c.slug, c.parent_id,
          ct.level + 1,
          ct.path || c.name::varchar
        FROM categories c
        INNER JOIN category_tree ct ON c.parent_id = ct.id
      )
      SELECT * FROM category_tree
      ORDER BY path
    `);
    
    console.log('🌳 Estrutura de Categorias:');
    categories.forEach(cat => {
      const indent = '  '.repeat(cat.level);
      console.log(`${indent}${cat.level > 0 ? '└─ ' : ''}${cat.name} (${cat.slug})`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await client.end();
    console.log('\n✨ Finalizado!');
  }
}

checkCategories(); 