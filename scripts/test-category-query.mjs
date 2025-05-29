import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const { Client } = pg;

async function testCategoryQuery() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('✅ Conectado ao banco de dados\n');

    // Query simplificada primeiro
    console.log('🔍 Testando query simplificada:');
    const simpleQuery = `
      SELECT 
        c.id, 
        c.name, 
        c.slug,
        c.parent_id,
        COUNT(DISTINCT p.id) as count
      FROM categories c
      INNER JOIN products p ON p.category_id = c.id
      WHERE 
        p.is_active = true 
        AND c.is_active = true
      GROUP BY c.id, c.name, c.slug, c.parent_id
      HAVING COUNT(DISTINCT p.id) > 0
      ORDER BY count DESC, c.name
    `;
    
    const simpleResult = await client.query(simpleQuery);
    console.log(`Categorias encontradas: ${simpleResult.rows.length}`);
    simpleResult.rows.forEach(row => {
      console.log(`  - ${row.name} (${row.slug}): ${row.count} produtos`);
    });

    // Agora testar a query completa com CTE
    console.log('\n🔍 Testando query completa com subcategorias:');
    const fullQuery = `
      WITH category_counts AS (
        SELECT 
          c.id, 
          c.name, 
          c.slug,
          c.parent_id,
          COUNT(DISTINCT p.id) as count
        FROM categories c
        INNER JOIN products p ON p.category_id = c.id
        WHERE 
          p.is_active = true 
          AND c.is_active = true
        GROUP BY c.id, c.name, c.slug, c.parent_id
        HAVING COUNT(DISTINCT p.id) > 0
      )
      SELECT 
        cc.id,
        cc.name,
        cc.slug,
        cc.parent_id,
        cc.count,
        CASE 
          WHEN cc.parent_id IS NULL THEN
            COALESCE(
              (
                SELECT json_agg(
                  json_build_object(
                    'id', sub.id,
                    'name', sub.name,
                    'slug', sub.slug,
                    'count', sub.count
                  ) ORDER BY sub.count DESC, sub.name
                )
                FROM category_counts sub
                WHERE sub.parent_id = cc.id
              ),
              '[]'::json
            )
          ELSE NULL
        END as subcategories
      FROM category_counts cc
      WHERE cc.parent_id IS NULL
      ORDER BY cc.count DESC, cc.name
    `;
    
    const fullResult = await client.query(fullQuery);
    console.log(`\nCategorias principais encontradas: ${fullResult.rows.length}`);
    fullResult.rows.forEach(row => {
      console.log(`\n📁 ${row.name} (${row.slug}): ${row.count} produtos`);
      if (row.subcategories && row.subcategories.length > 0) {
        console.log('  Subcategorias:');
        row.subcategories.forEach(sub => {
          console.log(`    - ${sub.name} (${sub.slug}): ${sub.count} produtos`);
        });
      }
    });

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await client.end();
  }
}

testCategoryQuery(); 