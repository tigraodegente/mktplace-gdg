#!/usr/bin/env node

import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-raspy-meadow-acds6p80-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function checkSchema() {
  try {
    await client.connect();
    
    console.log('📋 SCHEMA - TABELA CATEGORIES:');
    const categoriesSchema = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'categories' 
      ORDER BY ordinal_position
    `);
    categoriesSchema.rows.forEach(col => console.log(`  ${col.column_name}: ${col.data_type}`));
    
    console.log('\n📋 SCHEMA - TABELA PRODUCTS (colunas relacionadas a shipping/delivery):');
    const productsSchema = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'products' 
      AND (column_name ILIKE '%ship%' OR column_name ILIKE '%deliver%' OR column_name ILIKE '%free%')
      ORDER BY ordinal_position
    `);
    productsSchema.rows.forEach(col => console.log(`  ${col.column_name}: ${col.data_type}`));
    
    console.log('\n🔍 CAMPOS RELACIONADOS A PREÇOS E DESCONTOS:');
    const priceFields = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'products' 
      AND (column_name ILIKE '%price%' OR column_name ILIKE '%discount%' OR column_name ILIKE '%promo%')
      ORDER BY ordinal_position
    `);
    priceFields.rows.forEach(col => console.log(`  ${col.column_name}: ${col.data_type}`));
    
    await client.end();
  } catch (error) {
    console.error('Erro:', error);
    process.exit(1);
  }
}

checkSchema(); 