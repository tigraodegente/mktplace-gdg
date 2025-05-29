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

async function addUniqueConstraints() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Adicionando constraints únicas nas tabelas de opções...\n');
    
    // Verificar constraints existentes
    const constraints = await client.query(`
      SELECT 
        tc.table_name,
        tc.constraint_name,
        tc.constraint_type
      FROM information_schema.table_constraints tc
      WHERE tc.table_name IN ('product_options', 'product_option_values', 'variant_option_values')
        AND tc.constraint_type IN ('UNIQUE', 'PRIMARY KEY')
      ORDER BY tc.table_name, tc.constraint_name
    `);
    
    console.log('📊 Constraints existentes:');
    constraints.rows.forEach(c => {
      console.log(`  - ${c.table_name}.${c.constraint_name} (${c.constraint_type})`);
    });
    
    console.log('\n🔄 Adicionando constraints únicas...');
    
    // product_options - unique (product_id, name)
    try {
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'unique_product_option_name'
          ) THEN
            ALTER TABLE product_options 
            ADD CONSTRAINT unique_product_option_name 
            UNIQUE (product_id, name);
          END IF;
        END $$;
      `);
      console.log('✅ Constraint única adicionada em product_options (product_id, name)');
    } catch (err) {
      console.log('⚠️  Erro em product_options:', err.message);
    }
    
    // product_option_values - unique (option_id, value)
    try {
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'unique_option_value'
          ) THEN
            ALTER TABLE product_option_values 
            ADD CONSTRAINT unique_option_value 
            UNIQUE (option_id, value);
          END IF;
        END $$;
      `);
      console.log('✅ Constraint única adicionada em product_option_values (option_id, value)');
    } catch (err) {
      console.log('⚠️  Erro em product_option_values:', err.message);
    }
    
    // variant_option_values - unique (variant_id, option_value_id)
    try {
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'unique_variant_option_value'
          ) THEN
            ALTER TABLE variant_option_values 
            ADD CONSTRAINT unique_variant_option_value 
            UNIQUE (variant_id, option_value_id);
          END IF;
        END $$;
      `);
      console.log('✅ Constraint única adicionada em variant_option_values (variant_id, option_value_id)');
    } catch (err) {
      console.log('⚠️  Erro em variant_option_values:', err.message);
    }
    
    // product_variants - unique (sku)
    try {
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'unique_variant_sku'
          ) THEN
            ALTER TABLE product_variants 
            ADD CONSTRAINT unique_variant_sku 
            UNIQUE (sku);
          END IF;
        END $$;
      `);
      console.log('✅ Constraint única adicionada em product_variants (sku)');
    } catch (err) {
      console.log('⚠️  Erro em product_variants:', err.message);
    }
    
    // Verificar constraints finais
    const finalConstraints = await client.query(`
      SELECT 
        tc.table_name,
        tc.constraint_name,
        tc.constraint_type,
        string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as columns
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.table_name IN ('product_options', 'product_option_values', 'variant_option_values', 'product_variants')
        AND tc.constraint_type IN ('UNIQUE', 'PRIMARY KEY')
      GROUP BY tc.table_name, tc.constraint_name, tc.constraint_type
      ORDER BY tc.table_name, tc.constraint_name
    `);
    
    console.log('\n📊 Constraints finais:');
    finalConstraints.rows.forEach(c => {
      console.log(`  - ${c.table_name}.${c.constraint_name} (${c.constraint_type}) em [${c.columns}]`);
    });
    
    console.log('\n✅ Constraints adicionadas com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Executar
addUniqueConstraints()
  .then(() => {
    console.log('\n✅ Script concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro ao executar script:', error);
    process.exit(1);
  }); 