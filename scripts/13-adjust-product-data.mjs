import { createDatabase } from '../packages/db-hyperdrive/dist/index.js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.local' });

async function adjustProductData() {
  const db = createDatabase({ DATABASE_URL: process.env.DATABASE_URL });
  
  try {
    console.log('🔧 Ajustando dados dos produtos...\n');
    
    // Remover desconto de alguns produtos (50%)
    console.log('💰 Removendo desconto de alguns produtos...');
    await db.query(`
      UPDATE products 
      SET original_price = NULL
      WHERE id IN (
        SELECT id FROM products 
        ORDER BY RANDOM() 
        LIMIT 12
      )
    `);
    
    // Remover frete grátis de produtos baratos
    console.log('🚚 Removendo frete grátis de produtos baratos...');
    await db.query(`
      UPDATE products 
      SET has_free_shipping = false 
      WHERE price < 500
    `);
    
    // Adicionar alguns produtos fora de estoque
    console.log('📦 Marcando alguns produtos como fora de estoque...');
    await db.query(`
      UPDATE products 
      SET quantity = 0
      WHERE id IN (
        SELECT id FROM products 
        ORDER BY RANDOM() 
        LIMIT 3
      )
    `);
    
    // Verificar resultados
    const stats = await db.query(`
      SELECT 
        'Total de produtos' as metric,
        COUNT(*) as count
      FROM products
      UNION ALL
      SELECT 
        'Com desconto' as metric,
        COUNT(*) as count
      FROM products
      WHERE original_price > 0 AND price < original_price
      UNION ALL
      SELECT 
        'Com frete grátis' as metric,
        COUNT(*) as count
      FROM products
      WHERE has_free_shipping = true
      UNION ALL
      SELECT 
        'Fora de estoque' as metric,
        COUNT(*) as count
      FROM products
      WHERE quantity = 0
    `);
    
    console.log('\n📊 Estatísticas atualizadas:');
    console.table(stats);
    
    console.log('\n✅ Processo concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await db.close();
  }
}

adjustProductData(); 