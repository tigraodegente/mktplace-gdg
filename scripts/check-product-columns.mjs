import { createDatabase } from '../packages/db-hyperdrive/dist/index.js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.local' });

async function checkProductColumns() {
  const db = createDatabase({ DATABASE_URL: process.env.DATABASE_URL });
  
  try {
    console.log('🔍 Verificando colunas da tabela products...\n');
    
    // Buscar informações das colunas
    const columns = await db.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'products'
      ORDER BY ordinal_position
    `);
    
    console.log('📊 Colunas da tabela products:');
    console.table(columns);
    
    // Verificar se as colunas necessárias existem
    const requiredColumns = ['rating_average', 'condition', 'delivery_days'];
    const existingColumns = columns.map(c => c.column_name);
    
    console.log('\n✅ Verificando colunas necessárias:');
    requiredColumns.forEach(col => {
      if (existingColumns.includes(col)) {
        console.log(`✓ ${col} - existe`);
      } else {
        console.log(`✗ ${col} - NÃO EXISTE`);
      }
    });
    
    // Verificar alguns produtos de exemplo
    const sampleProducts = await db.query(`
      SELECT 
        id,
        name,
        rating_average,
        rating_count,
        condition,
        delivery_days
      FROM products
      LIMIT 5
    `);
    
    console.log('\n📦 Produtos de exemplo:');
    console.table(sampleProducts);
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await db.close();
  }
}

checkProductColumns(); 