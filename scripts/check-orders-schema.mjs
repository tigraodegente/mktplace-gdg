#!/usr/bin/env node

import { Client } from 'pg';
import { config } from 'dotenv';

config({ path: '.env.local' });

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function checkOrdersSchema() {
  try {
    await client.connect();
    console.log('🔍 Verificando estrutura da tabela orders...\n');
    
    // Verificar colunas da tabela orders
    const result = await client.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable, 
        column_default 
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Estrutura da tabela orders:');
    console.table(result.rows);
    
    // Verificar se a tabela existe
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'orders'
      );
    `);
    
    console.log(`\n📊 Tabela orders existe: ${tableExists.rows[0].exists}`);
    
    // Tentar um SELECT simples para ver se há dados
    try {
      const count = await client.query(`SELECT COUNT(*) as total FROM orders;`);
      console.log(`📈 Total de registros: ${count.rows[0].total}`);
    } catch (error) {
      console.log(`❌ Erro ao contar registros: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await client.end();
  }
}

checkOrdersSchema(); 