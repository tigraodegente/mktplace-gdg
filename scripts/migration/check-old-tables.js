#!/usr/bin/env node

import pg from 'pg';
const { Client } = pg;

async function checkOldTables() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-raspy-meadow-acds6p80-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    console.log('🔍 VERIFICANDO TABELAS ANTIGAS:');
    console.log('================================');
    
    const tables = ['shipping_modalities', 'shipping_calculated_options'];
    
    for (const table of tables) {
      try {
        const exists = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = '${table}'
          )
        `);
        
        if (exists.rows[0].exists) {
          const count = await client.query(`SELECT COUNT(*) as total FROM ${table}`);
          console.log(`✅ ${table}: EXISTE (${count.rows[0].total} registros)`);
        } else {
          console.log(`❌ ${table}: NÃO EXISTE (foi removida)`);
        }
      } catch (error) {
        console.log(`❌ ${table}: ERRO (${error.message})`);
      }
    }
    
  } finally {
    await client.end();
  }
}

checkOldTables(); 