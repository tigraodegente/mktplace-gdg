#!/usr/bin/env node

// Script para adicionar coluna videos na tabela products
// Usage: node scripts/active/add-videos-column.mjs

import { Client } from 'pg';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.local' });
dotenv.config();

async function addVideosColumn() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 Conectando ao banco de dados...');
    await client.connect();

    console.log('📊 Verificando se coluna videos já existe...');
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'videos'
    `);

    if (checkColumn.rows.length > 0) {
      console.log('✅ Coluna videos já existe na tabela products!');
      return;
    }

    console.log('🔧 Adicionando coluna videos...');
    await client.query(`
      ALTER TABLE products 
      ADD COLUMN videos jsonb DEFAULT '[]'::jsonb
    `);

    console.log('💬 Adicionando comentário na coluna...');
    await client.query(`
      COMMENT ON COLUMN products.videos IS 'Array of video URLs for product media'
    `);

    console.log('🔄 Atualizando produtos existentes...');
    const updateResult = await client.query(`
      UPDATE products 
      SET videos = '[]'::jsonb 
      WHERE videos IS NULL
    `);

    console.log(`✅ Migration concluída com sucesso!`);
    console.log(`📈 ${updateResult.rowCount} produtos atualizados`);

    // Verificar resultado
    const verifyResult = await client.query(`
      SELECT COUNT(*) as total_products, 
             COUNT(videos) as products_with_videos
      FROM products
    `);

    console.log('\n📊 RESULTADO:');
    console.log(`   Total de produtos: ${verifyResult.rows[0].total_products}`);
    console.log(`   Com campo videos: ${verifyResult.rows[0].products_with_videos}`);

  } catch (error) {
    console.error('❌ Erro na migration:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Conexão fechada');
  }
}

// Executar
addVideosColumn().catch(console.error); 