#!/usr/bin/env node

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config({ path: join(__dirname, '..', '..', '.env') });

const { Pool } = pg;

// Configurar pool do PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : {
    rejectUnauthorized: false
  }
});

async function deactivateProducts() {
  const client = await pool.connect();
  
  try {
    console.log('\n🔧 Desativando todos os produtos exceto os 2 com categorias\n');
    
    // IDs dos produtos que devem permanecer ativos
    const keepActiveIds = [
      'c6b3d5de-4b56-4a9a-92b9-842f0b15f0b2', // Cortina Petit Xadrez 1,80m
      '7499aaf6-3ccd-4a7f-a7f2-106870b9b32e'  // Quadro Amiguinha Maçã Verde 40cm
    ];
    
    // 1. Verificar status atual
    const currentStatus = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN is_active = true THEN 1 END) as ativos,
        COUNT(CASE WHEN is_active = false THEN 1 END) as inativos
      FROM products
    `);
    
    console.log('📊 Status atual:', {
      total: currentStatus.rows[0].total,
      ativos: currentStatus.rows[0].ativos,
      inativos: currentStatus.rows[0].inativos
    });
    
    // 2. Verificar os produtos que vão permanecer ativos
    const keepActiveResult = await client.query(`
      SELECT id, name, is_active
      FROM products 
      WHERE id = ANY($1)
    `, [keepActiveIds]);
    
    console.log('\n✅ Produtos que permanecerão ativos:');
    keepActiveResult.rows.forEach(product => {
      console.log(`   - ${product.name} (${product.is_active ? 'ATIVO' : 'INATIVO'})`);
    });
    
    // 3. Contar produtos que serão desativados
    const toDeactivateResult = await client.query(`
      SELECT COUNT(*) as count
      FROM products 
      WHERE is_active = true 
      AND id != ALL($1)
    `, [keepActiveIds]);
    
    const toDeactivateCount = toDeactivateResult.rows[0].count;
    console.log(`\n⚠️  ${toDeactivateCount} produtos serão desativados`);
    
    // 4. Executar a desativação
    await client.query('BEGIN');
    
    try {
      const updateResult = await client.query(`
        UPDATE products 
        SET is_active = false, updated_at = NOW()
        WHERE is_active = true 
        AND id != ALL($1)
      `, [keepActiveIds]);
      
      console.log(`\n✅ ${updateResult.rowCount} produtos desativados com sucesso!`);
      
      // 5. Verificar resultado final
      const finalStatus = await client.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN is_active = true THEN 1 END) as ativos,
          COUNT(CASE WHEN is_active = false THEN 1 END) as inativos
        FROM products
      `);
      
      console.log('\n📊 Status final:', {
        total: finalStatus.rows[0].total,
        ativos: finalStatus.rows[0].ativos,
        inativos: finalStatus.rows[0].inativos
      });
      
      // 6. Listar produtos ativos restantes
      const activeProducts = await client.query(`
        SELECT p.id, p.name, c.name as categoria
        FROM products p
        LEFT JOIN product_categories pc ON pc.product_id = p.id
        LEFT JOIN categories c ON c.id = pc.category_id
        WHERE p.is_active = true
        ORDER BY p.name
      `);
      
      console.log('\n✅ Produtos ativos restantes:');
      activeProducts.rows.forEach(product => {
        console.log(`   - ${product.name} ${product.categoria ? `(${product.categoria})` : '(sem categoria)'}`);
      });
      
      await client.query('COMMIT');
      console.log('\n✅ Operação confirmada!');
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('\n❌ Erro durante a atualização:', error.message);
      throw error;
    }
    
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar desativação
deactivateProducts()
  .then(() => {
    console.log('\n✅ Desativação concluída!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro fatal:', error);
    process.exit(1);
  }); 