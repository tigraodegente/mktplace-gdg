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

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fixProductOptionsTables() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Verificando e corrigindo tabelas de opções de produtos...\n');
    
    // Verificar estrutura atual das tabelas
    const tables = ['product_options', 'product_option_values', 'product_variants', 'variant_option_values'];
    
    for (const table of tables) {
      console.log(`\n📊 Verificando tabela: ${table}`);
      
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table]);
      
      console.log('  Colunas existentes:');
      columns.rows.forEach(col => {
        console.log(`    - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
      });
    }
    
    // Adicionar colunas faltantes
    console.log('\n🔄 Adicionando colunas faltantes...');
    
    // product_options
    try {
      await client.query(`
        ALTER TABLE product_options 
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
      `);
      console.log('✅ Colunas created_at/updated_at adicionadas em product_options');
    } catch (err) {
      console.log('⚠️  Erro ao adicionar colunas em product_options:', err.message);
    }
    
    // product_option_values
    try {
      await client.query(`
        ALTER TABLE product_option_values 
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
      `);
      console.log('✅ Colunas created_at/updated_at adicionadas em product_option_values');
    } catch (err) {
      console.log('⚠️  Erro ao adicionar colunas em product_option_values:', err.message);
    }
    
    // product_variants
    try {
      await client.query(`
        ALTER TABLE product_variants 
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true
      `);
      console.log('✅ Colunas created_at/updated_at/is_active adicionadas em product_variants');
    } catch (err) {
      console.log('⚠️  Erro ao adicionar colunas em product_variants:', err.message);
    }
    
    // Adicionar constraint única se não existir
    try {
      await client.query(`
        ALTER TABLE product_options 
        ADD CONSTRAINT IF NOT EXISTS unique_product_option_name 
        UNIQUE (product_id, name)
      `);
      console.log('✅ Constraint única adicionada em product_options');
    } catch (err) {
      console.log('⚠️  Erro ao adicionar constraint:', err.message);
    }
    
    try {
      await client.query(`
        ALTER TABLE product_option_values 
        ADD CONSTRAINT IF NOT EXISTS unique_option_value 
        UNIQUE (option_id, value)
      `);
      console.log('✅ Constraint única adicionada em product_option_values');
    } catch (err) {
      console.log('⚠️  Erro ao adicionar constraint:', err.message);
    }
    
    try {
      await client.query(`
        ALTER TABLE variant_option_values 
        ADD CONSTRAINT IF NOT EXISTS unique_variant_option_value 
        UNIQUE (variant_id, option_value_id)
      `);
      console.log('✅ Constraint única adicionada em variant_option_values');
    } catch (err) {
      console.log('⚠️  Erro ao adicionar constraint:', err.message);
    }
    
    // Verificar estrutura final
    console.log('\n📊 Estrutura final das tabelas:');
    
    for (const table of tables) {
      console.log(`\n  ${table}:`);
      
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table]);
      
      columns.rows.forEach(col => {
        console.log(`    - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
      });
    }
    
    console.log('\n✅ Tabelas corrigidas com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Executar
fixProductOptionsTables()
  .then(() => {
    console.log('\n✅ Script concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro ao executar script:', error);
    process.exit(1);
  }); 