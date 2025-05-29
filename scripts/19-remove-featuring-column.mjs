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

async function removeFeaturingColumn() {
  const client = await pool.connect();
  
  try {
    console.log('🗑️  Removendo coluna "featuring" (vazia e não utilizada)\n');
    
    // Verificar uma última vez se está realmente vazia
    const check = await client.query(`
      SELECT COUNT(*) as with_data
      FROM products
      WHERE featuring IS NOT NULL AND featuring::text != '{}'
    `);
    
    if (check.rows[0].with_data > 0) {
      console.log('❌ ABORTAR: A coluna featuring tem dados!');
      return;
    }
    
    console.log('✅ Confirmado: coluna featuring está vazia');
    console.log('🔄 Removendo coluna...');
    
    // Remover a coluna
    await client.query('ALTER TABLE products DROP COLUMN featuring');
    
    console.log('✅ Coluna "featuring" removida com sucesso!');
    
    // Verificar estrutura atualizada
    const columns = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'products' AND column_name IN ('attributes', 'specifications', 'featuring')
      ORDER BY column_name
    `);
    
    console.log('\n📊 Colunas JSONB restantes:');
    columns.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Executar
removeFeaturingColumn()
  .then(() => {
    console.log('\n✅ Script concluído com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro ao executar script:', error);
    process.exit(1);
  }); 