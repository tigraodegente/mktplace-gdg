#!/usr/bin/env node

import pg from 'pg';
const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-raspy-meadow-acds6p80-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

async function checkAllTables() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    console.log('📋 Todas as tabelas no banco:');
    const allTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name LIKE '%faq%' OR table_name LIKE '%support%')
      ORDER BY table_name
    `);
    console.table(allTables.rows);

    // Verificar se faq_items existe
    console.log('\n📋 Verificando se faq_items existe:');
    const faqItemsExists = await client.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_name = 'faq_items'
    `);
    console.log('faq_items existe:', faqItemsExists.rows[0].count > 0);

    // Verificar se faq_categories existe  
    console.log('\n📋 Verificando se faq_categories existe:');
    const faqCatsExists = await client.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_name = 'faq_categories'
    `);
    console.log('faq_categories existe:', faqCatsExists.rows[0].count > 0);

    await client.end();
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

checkAllTables(); 