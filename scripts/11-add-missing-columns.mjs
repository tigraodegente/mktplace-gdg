import { createDatabase } from '../apps/store/src/lib/db/database.js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.local' });

async function addMissingColumns() {
  const db = createDatabase({ DATABASE_URL: process.env.DATABASE_URL });
  
  try {
    console.log('🔧 Adicionando colunas faltantes na tabela products...\n');
    
    // Adicionar coluna condition
    console.log('📦 Adicionando coluna condition...');
    await db.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS condition VARCHAR(20) 
      DEFAULT 'new' 
      CHECK (condition IN ('new', 'used', 'refurbished'))
    `);
    
    // Adicionar coluna delivery_days
    console.log('🚚 Adicionando coluna delivery_days...');
    await db.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS delivery_days INTEGER 
      DEFAULT 3 
      CHECK (delivery_days >= 0)
    `);
    
    console.log('\n✅ Colunas adicionadas com sucesso!');
    
    // Atualizar alguns produtos com valores variados
    console.log('\n📝 Atualizando produtos com valores de exemplo...');
    
    // Produtos com entrega rápida (24h)
    await db.query(`
      UPDATE products 
      SET delivery_days = 1 
      WHERE featured = true
    `);
    
    // Alguns produtos usados
    await db.query(`
      UPDATE products 
      SET condition = 'used' 
      WHERE id IN (
        SELECT id FROM products 
        WHERE name ILIKE '%usado%' OR price < 1000
      )
    `);
    
    // Alguns produtos recondicionados
    await db.query(`
      UPDATE products 
      SET condition = 'refurbished' 
      WHERE id IN (
        SELECT id FROM products 
        WHERE name ILIKE '%outlet%' OR name ILIKE '%open box%'
      )
    `);
    
    // Variar tempos de entrega
    await db.query(`
      UPDATE products 
      SET delivery_days = CASE 
        WHEN RANDOM() < 0.2 THEN 1  -- 20% entrega em 24h
        WHEN RANDOM() < 0.5 THEN 2  -- 30% entrega em 48h
        WHEN RANDOM() < 0.7 THEN 3  -- 20% entrega em 3 dias
        WHEN RANDOM() < 0.9 THEN 7  -- 20% entrega em 7 dias
        ELSE 15                      -- 10% entrega em 15 dias
      END
      WHERE delivery_days = 3  -- Apenas produtos com valor padrão
    `);
    
    // Verificar resultados
    const stats = await db.query(`
      SELECT 
        condition,
        COUNT(*) as count,
        AVG(price) as avg_price
      FROM products
      GROUP BY condition
      ORDER BY condition
    `);
    
    console.log('\n📊 Estatísticas por condição:');
    console.table(stats);
    
    const deliveryStats = await db.query(`
      SELECT 
        delivery_days,
        COUNT(*) as count,
        CASE 
          WHEN delivery_days <= 1 THEN 'Entrega em 24h'
          WHEN delivery_days <= 2 THEN 'Até 2 dias'
          WHEN delivery_days <= 3 THEN 'Até 3 dias úteis'
          WHEN delivery_days <= 7 THEN 'Até 7 dias úteis'
          ELSE 'Até 15 dias'
        END as delivery_label
      FROM products
      GROUP BY delivery_days
      ORDER BY delivery_days
    `);
    
    console.log('\n🚚 Estatísticas de entrega:');
    console.table(deliveryStats);
    
    // Criar índices para melhor performance
    console.log('\n🔍 Criando índices...');
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_products_condition ON products(condition);
      CREATE INDEX IF NOT EXISTS idx_products_delivery_days ON products(delivery_days);
      CREATE INDEX IF NOT EXISTS idx_products_rating_average ON products(rating_average);
    `);
    
    console.log('\n✅ Processo concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await db.close();
  }
}

addMissingColumns(); 