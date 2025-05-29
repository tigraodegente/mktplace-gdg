#!/usr/bin/env node

import pg from 'pg'

const { Pool } = pg

console.log('🔧 Completando schema do Neon Develop...\n')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

const updates = [
  // 1. Adicionar colunas faltantes na tabela products
  'ALTER TABLE products ADD COLUMN IF NOT EXISTS has_free_shipping BOOLEAN DEFAULT false;',
  'ALTER TABLE products ADD COLUMN IF NOT EXISTS delivery_days INTEGER DEFAULT 7;',
  'ALTER TABLE products ADD COLUMN IF NOT EXISTS condition VARCHAR(50) DEFAULT \'new\';',
  'ALTER TABLE products ADD COLUMN IF NOT EXISTS seller_state VARCHAR(50);',
  'ALTER TABLE products ADD COLUMN IF NOT EXISTS seller_city VARCHAR(100);',
  
  // 2. Criar tabela product_options
  `CREATE TABLE IF NOT EXISTS product_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    values TEXT[],
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );`,
  
  // 3. Criar tabela product_option_values  
  `CREATE TABLE IF NOT EXISTS product_option_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    option_id UUID NOT NULL REFERENCES product_options(id) ON DELETE CASCADE,
    value VARCHAR(255) NOT NULL,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );`,
  
  // 4. Criar tabela popular_searches
  `CREATE TABLE IF NOT EXISTS popular_searches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    term VARCHAR(255) NOT NULL UNIQUE,
    count INTEGER DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );`,
  
  // 5. Criar tabela product_variants
  `CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(255),
    sku VARCHAR(255) UNIQUE,
    price NUMERIC(10,2),
    quantity INTEGER DEFAULT 0,
    attributes JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );`,
  
  // 6. Criar tabela variant_option_values
  `CREATE TABLE IF NOT EXISTS variant_option_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    option_value_id UUID NOT NULL REFERENCES product_option_values(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );`,
  
  // 7. Inserir dados padrão nas novas colunas
  'UPDATE products SET has_free_shipping = true WHERE price >= 100;',
  'UPDATE products SET delivery_days = 3 WHERE price >= 500;',
  'UPDATE products SET condition = \'new\' WHERE condition IS NULL;',
  'UPDATE products SET seller_state = \'SP\' WHERE seller_state IS NULL;',
  'UPDATE products SET seller_city = \'São Paulo\' WHERE seller_city IS NULL;',
  
  // 8. Inserir termos populares padrão
  `INSERT INTO popular_searches (term, count) VALUES 
    ('berço', 50),
    ('saia', 30),
    ('cabana', 25),
    ('almofada', 20),
    ('body', 15)
  ON CONFLICT (term) DO NOTHING;`,
  
  // 9. Criar índices para performance
  'CREATE INDEX IF NOT EXISTS idx_products_has_free_shipping ON products(has_free_shipping);',
  'CREATE INDEX IF NOT EXISTS idx_products_delivery_days ON products(delivery_days);',
  'CREATE INDEX IF NOT EXISTS idx_products_condition ON products(condition);',
  'CREATE INDEX IF NOT EXISTS idx_products_seller_state ON products(seller_state);',
  'CREATE INDEX IF NOT EXISTS idx_popular_searches_count ON popular_searches(count DESC);'
]

try {
  for (const [index, sql] of updates.entries()) {
    console.log(`⚡ Executando update ${index + 1}/${updates.length}...`)
    await pool.query(sql)
  }
  
  console.log('\n✅ Schema completo criado com sucesso!')
  
  // Verificar tabelas finais
  const result = await pool.query(`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY tablename
  `)
  
  console.log(`\n📊 ${result.rows.length} tabelas no banco:`)
  result.rows.forEach(row => console.log(`   - ${row.tablename}`))
  
  // Verificar colunas adicionadas
  const productColumns = await pool.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'products' 
    AND column_name IN ('has_free_shipping', 'delivery_days', 'condition', 'seller_state', 'seller_city')
    ORDER BY column_name
  `)
  
  console.log(`\n📊 ${productColumns.rows.length} colunas adicionadas em products:`)
  productColumns.rows.forEach(col => console.log(`   - ${col.column_name}`))
  
  console.log('\n🎉 Banco Neon Develop completo e pronto!')
  
} catch (error) {
  console.error('❌ Erro:', error.message)
} finally {
  await pool.end()
} 