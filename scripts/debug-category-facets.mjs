import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const { Client } = pg;

async function debugCategoryFacets() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('✅ Conectado ao banco de dados\n');

    // Query exata da API
    const categoryFacetsQuery = `
      WITH category_counts AS (
        -- Contar produtos diretos de cada categoria
        SELECT 
          c.id, 
          c.name, 
          c.slug,
          c.parent_id,
          COUNT(DISTINCT p.id) as direct_count
        FROM categories c
        INNER JOIN products p ON p.category_id = c.id
        WHERE 
          p.is_active = true 
          AND c.is_active = true
        GROUP BY c.id, c.name, c.slug, c.parent_id
      ),
      -- Contar produtos de subcategorias para categorias pai
      subcategory_counts AS (
        SELECT 
          parent.id,
          COUNT(DISTINCT p.id) as subcategory_count
        FROM categories parent
        INNER JOIN categories child ON child.parent_id = parent.id
        INNER JOIN products p ON p.category_id = child.id
        WHERE 
          p.is_active = true 
          AND parent.is_active = true
          AND child.is_active = true
        GROUP BY parent.id
      ),
      -- Combinar contagens
      combined_counts AS (
        SELECT 
          c.id,
          c.name,
          c.slug,
          c.parent_id,
          COALESCE(cc.direct_count, 0) + COALESCE(sc.subcategory_count, 0) as count
        FROM categories c
        LEFT JOIN category_counts cc ON cc.id = c.id
        LEFT JOIN subcategory_counts sc ON sc.id = c.id
        WHERE c.is_active = true
          AND (cc.direct_count > 0 OR sc.subcategory_count > 0)
      )
      SELECT * FROM combined_counts
      WHERE slug = 'celulares'
      ORDER BY count DESC
    `;

    const result = await client.query(categoryFacetsQuery);
    
    console.log('🔍 Resultado da query de facetas para Celulares:');
    console.log(result.rows[0]);

    // Debugar contagens separadamente
    console.log('\n📊 Debug detalhado:');
    
    // Produtos diretos
    const directResult = await client.query(`
      SELECT COUNT(DISTINCT p.id) as count
      FROM categories c
      INNER JOIN products p ON p.category_id = c.id
      WHERE p.is_active = true 
        AND c.is_active = true
        AND c.slug = 'celulares'
    `);
    console.log(`Produtos diretos: ${directResult.rows[0].count}`);

    // Produtos em subcategorias
    const subcategoryResult = await client.query(`
      SELECT 
        parent.slug as parent_slug,
        COUNT(DISTINCT p.id) as count
      FROM categories parent
      INNER JOIN categories child ON child.parent_id = parent.id
      INNER JOIN products p ON p.category_id = child.id
      WHERE p.is_active = true 
        AND parent.is_active = true
        AND child.is_active = true
        AND parent.slug = 'celulares'
      GROUP BY parent.slug
    `);
    console.log(`Produtos em subcategorias: ${subcategoryResult.rows[0]?.count || 0}`);

    // Verificar se há duplicação
    console.log('\n🔍 Verificando possível duplicação:');
    const detailResult = await client.query(`
      SELECT 
        child.name as subcategoria,
        COUNT(DISTINCT p.id) as produtos
      FROM categories parent
      INNER JOIN categories child ON child.parent_id = parent.id
      INNER JOIN products p ON p.category_id = child.id
      WHERE parent.slug = 'celulares'
        AND p.is_active = true
      GROUP BY child.name
      ORDER BY child.name
    `);
    
    console.log('Produtos por subcategoria:');
    detailResult.rows.forEach(row => {
      console.log(`  - ${row.subcategoria}: ${row.produtos} produtos`);
    });

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await client.end();
  }
}

debugCategoryFacets(); 