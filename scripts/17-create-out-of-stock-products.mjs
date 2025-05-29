#!/usr/bin/env node

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const { Pool } = pg;

// Configuração do banco de dados
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function createOutOfStockProducts() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Criando produtos sem estoque para teste...');
    
    // Atualizar alguns produtos para ficarem sem estoque
    const result = await client.query(`
      UPDATE products 
      SET quantity = 0
      WHERE id IN (
        SELECT id 
        FROM products 
        WHERE is_active = true
        ORDER BY RANDOM()
        LIMIT 5
      )
      RETURNING name, slug, quantity
    `);
    
    console.log(`✅ ${result.rowCount} produtos marcados como sem estoque:`);
    result.rows.forEach(product => {
      console.log(`   - ${product.name} (${product.slug})`);
    });
    
    // Mostrar estatísticas
    const stats = await client.query(`
      SELECT 
        COUNT(*) FILTER (WHERE quantity > 0) as in_stock,
        COUNT(*) FILTER (WHERE quantity = 0) as out_of_stock,
        COUNT(*) as total
      FROM products
      WHERE is_active = true
    `);
    
    const { in_stock, out_of_stock, total } = stats.rows[0];
    console.log('\n📊 Estatísticas atualizadas:');
    console.log(`   - Total de produtos: ${total}`);
    console.log(`   - Em estoque: ${in_stock} (${Math.round(in_stock/total*100)}%)`);
    console.log(`   - Sem estoque: ${out_of_stock} (${Math.round(out_of_stock/total*100)}%)`);
    
  } catch (error) {
    console.error('❌ Erro:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Executar
createOutOfStockProducts()
  .then(() => {
    console.log('\n✅ Script concluído com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro ao executar script:', error);
    process.exit(1);
  }); 