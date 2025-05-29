import { createDatabase } from '../packages/db-hyperdrive/dist/index.js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.local' });

async function addFreeShippingColumn() {
  const db = createDatabase({ DATABASE_URL: process.env.DATABASE_URL });
  
  try {
    console.log('🚚 Adicionando coluna has_free_shipping...\n');
    
    // Adicionar coluna has_free_shipping
    await db.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS has_free_shipping BOOLEAN 
      DEFAULT false
    `);
    
    console.log('✅ Coluna adicionada com sucesso!');
    
    // Atualizar alguns produtos com frete grátis
    console.log('\n📝 Atualizando produtos com frete grátis...');
    
    // Produtos caros têm frete grátis
    await db.query(`
      UPDATE products 
      SET has_free_shipping = true 
      WHERE price >= 1000
    `);
    
    // Produtos em promoção têm frete grátis
    await db.query(`
      UPDATE products 
      SET has_free_shipping = true 
      WHERE original_price > 0 AND price < original_price
    `);
    
    // Produtos featured têm frete grátis
    await db.query(`
      UPDATE products 
      SET has_free_shipping = true 
      WHERE featured = true
    `);
    
    // Verificar resultados
    const stats = await db.query(`
      SELECT 
        has_free_shipping,
        COUNT(*) as count,
        AVG(price) as avg_price
      FROM products
      GROUP BY has_free_shipping
      ORDER BY has_free_shipping
    `);
    
    console.log('\n📊 Estatísticas de frete grátis:');
    console.table(stats);
    
    // Criar índice para melhor performance
    console.log('\n🔍 Criando índice...');
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_products_has_free_shipping ON products(has_free_shipping);
    `);
    
    console.log('\n✅ Processo concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await db.close();
  }
}

addFreeShippingColumn(); 