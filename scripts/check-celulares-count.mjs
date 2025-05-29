import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const { Client } = pg;

async function checkCelularesCount() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('✅ Conectado ao banco de dados\n');

    // Verificar categoria Celulares
    const celularesResult = await client.query(`
      SELECT 
        c.id, 
        c.name, 
        c.slug, 
        c.parent_id,
        (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = true) as direct_products,
        (SELECT COUNT(*) FROM products p 
         JOIN categories sub ON p.category_id = sub.id 
         WHERE sub.parent_id = c.id AND p.is_active = true) as subcategory_products
      FROM categories c 
      WHERE c.slug = 'celulares'
    `);
    
    const celulares = celularesResult.rows[0];
    console.log('📱 Categoria Celulares:');
    console.log(`   ID: ${celulares.id}`);
    console.log(`   Produtos diretos: ${celulares.direct_products}`);
    console.log(`   Produtos em subcategorias: ${celulares.subcategory_products}`);
    console.log(`   Total: ${parseInt(celulares.direct_products) + parseInt(celulares.subcategory_products)}`);

    // Listar subcategorias
    console.log('\n📂 Subcategorias de Celulares:');
    const subcategoriesResult = await client.query(`
      SELECT 
        c.name, 
        c.slug, 
        COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.is_active = true
      WHERE c.parent_id = $1
      GROUP BY c.id, c.name, c.slug
      ORDER BY c.name
    `, [celulares.id]);

    subcategoriesResult.rows.forEach(sub => {
      console.log(`   - ${sub.name} (${sub.slug}): ${sub.product_count} produtos`);
    });

    // Listar produtos diretos da categoria Celulares
    console.log('\n📦 Produtos diretos em Celulares:');
    const directProductsResult = await client.query(`
      SELECT p.name, p.slug, p.price
      FROM products p
      WHERE p.category_id = $1 AND p.is_active = true
      ORDER BY p.name
    `, [celulares.id]);

    if (directProductsResult.rows.length > 0) {
      directProductsResult.rows.forEach(prod => {
        console.log(`   - ${prod.name} (R$ ${prod.price})`);
      });
    } else {
      console.log('   Nenhum produto direto');
    }

    // Verificar como a API está calculando
    console.log('\n🔍 Verificando query da API:');
    const apiQuery = await client.query(`
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
        AND c.slug = 'celulares'
      GROUP BY c.id, c.name, c.slug, c.parent_id
    `);

    if (apiQuery.rows.length > 0) {
      console.log('   Resultado da query de facetas:', apiQuery.rows[0]);
    } else {
      console.log('   A query de facetas não retorna nada para Celulares (esperado se não há produtos diretos)');
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await client.end();
  }
}

checkCelularesCount(); 