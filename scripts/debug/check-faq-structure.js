#!/usr/bin/env node

import pg from 'pg';
const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-raspy-meadow-acds6p80-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

async function checkStructure() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    console.log('📋 Estrutura da tabela faqs:');
    const faqColumns = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'faqs' 
      ORDER BY ordinal_position
    `);
    console.table(faqColumns.rows);

    console.log('\n📋 Estrutura da tabela support_categories:');
    const catColumns = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'support_categories' 
      ORDER BY ordinal_position
    `);
    console.table(catColumns.rows);

    console.log('\n📋 Dados de exemplo das FAQ:');
    const sampleFAQ = await client.query(`
      SELECT * FROM faqs LIMIT 3
    `);
    console.table(sampleFAQ.rows);

    await client.end();
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

checkStructure(); 