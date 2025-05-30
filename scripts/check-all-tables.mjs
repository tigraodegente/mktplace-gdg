#!/usr/bin/env node

import { Client } from 'pg';
import { config } from 'dotenv';

config({ path: '.env.local' });

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function checkAllTables() {
  try {
    await client.connect();
    console.log('🔍 Verificando estrutura de todas as tabelas...\n');
    
    const tables = ['orders', 'order_items', 'payments', 'payment_queue', 'order_status_history', 'email_queue'];
    
    for (const table of tables) {
      console.log(`\n📋 Estrutura da tabela ${table}:`);
      
      // Verificar se a tabela existe
      const tableExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [table]);
      
      if (tableExists.rows[0].exists) {
        // Mostrar colunas
        const columns = await client.query(`
          SELECT 
            column_name, 
            data_type, 
            is_nullable,
            column_default
          FROM information_schema.columns 
          WHERE table_name = $1 
          AND table_schema = 'public'
          ORDER BY ordinal_position;
        `, [table]);
        
        console.table(columns.rows);
        
        // Contar registros
        const count = await client.query(`SELECT COUNT(*) as total FROM ${table};`);
        console.log(`📊 Total de registros: ${count.rows[0].total}`);
        
      } else {
        console.log('❌ Tabela não existe');
      }
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await client.end();
  }
}

checkAllTables(); 