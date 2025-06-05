#!/usr/bin/env node

import pg from 'pg';
const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-raspy-meadow-acds6p80-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

async function checkFAQData() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    const tables = ['faq', 'faq_items', 'faqs'];
    
    for (const table of tables) {
      try {
        console.log(`\n📋 Verificando tabela: ${table}`);
        
        const count = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`Total de registros: ${count.rows[0].count}`);
        
        if (count.rows[0].count > 0) {
          const sample = await client.query(`SELECT * FROM ${table} LIMIT 1`);
          console.log('Estrutura da tabela:');
          console.log(Object.keys(sample.rows[0] || {}));
          
          console.log('Dados de exemplo:');
          console.table([sample.rows[0]]);
        }
      } catch (error) {
        console.log(`❌ Erro ao acessar ${table}:`, error.message);
      }
    }

    await client.end();
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

checkFAQData(); 