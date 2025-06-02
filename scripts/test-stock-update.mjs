#!/usr/bin/env node

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config({ path: join(__dirname, '..', '.env') });

const { Pool } = pg;

// Configurar pool do PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : {
    rejectUnauthorized: false
  }
});

async function testStockUpdate() {
  const client = await pool.connect();
  
  try {
    console.log('\n🧪 Teste de Atualização de Estoque\n');
    
    // 1. Buscar um produto de teste
    const productResult = await client.query(`
      SELECT id, name, quantity, price 
      FROM products 
      WHERE is_active = true AND quantity > 0 
      LIMIT 1
    `);
    
    if (productResult.rows.length === 0) {
      console.log('❌ Nenhum produto ativo com estoque encontrado');
      return;
    }
    
    const product = productResult.rows[0];
    console.log('📦 Produto selecionado:', {
      id: product.id,
      name: product.name,
      estoque_atual: product.quantity
    });
    
    // 2. Simular uma venda
    const quantityToSell = 1;
    const newQuantity = Math.max(0, product.quantity - quantityToSell);
    
    console.log(`\n🛒 Simulando venda de ${quantityToSell} unidade(s)...`);
    
    // 3. Testar UPDATE simples (compatível com Cloudflare)
    console.log('\n📝 Testando UPDATE simples do estoque...');
    
    await client.query('BEGIN');
    
    try {
      // UPDATE simples
      const updateResult = await client.query(`
        UPDATE products 
        SET quantity = $1
        WHERE id = $2
      `, [newQuantity, product.id]);
      
      console.log('✅ UPDATE executado com sucesso!');
      console.log(`   Novo estoque: ${newQuantity}`);
      
      // 4. Criar movimento de estoque
      console.log('\n📊 Criando movimento de estoque...');
      
      // Buscar um usuário para o teste
      const userResult = await client.query(`
        SELECT id FROM users WHERE role = 'customer' LIMIT 1
      `);
      
      const userId = userResult.rows[0]?.id || '00000000-0000-0000-0000-000000000000';
      
      const movementResult = await client.query(`
        INSERT INTO stock_movements (
          product_id,
          type,
          quantity,
          reason,
          reference_id,
          notes,
          created_by
        ) VALUES (
          $1, -- product_id
          $2, -- type
          $3, -- quantity
          $4, -- reason
          $5, -- reference_id
          $6, -- notes
          $7  -- created_by
        ) RETURNING id
      `, [
        product.id,
        'out',
        quantityToSell,
        'Venda',
        '00000000-0000-0000-0000-000000000000', // ID fictício do pedido
        'Teste de atualização de estoque',
        userId
      ]);
      
      console.log('✅ Movimento de estoque criado!');
      console.log(`   ID do movimento: ${movementResult.rows[0].id}`);
      
      // 5. Verificar o estoque atualizado
      const checkResult = await client.query(`
        SELECT quantity FROM products WHERE id = $1
      `, [product.id]);
      
      console.log('\n🔍 Verificação final:');
      console.log(`   Estoque anterior: ${product.quantity}`);
      console.log(`   Estoque atual: ${checkResult.rows[0].quantity}`);
      console.log(`   Diferença: ${product.quantity - checkResult.rows[0].quantity}`);
      
      // Reverter transação (é apenas um teste)
      await client.query('ROLLBACK');
      console.log('\n⏪ Transação revertida (teste concluído)');
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('\n❌ Erro durante o teste:', error.message);
      
      // Detalhes adicionais do erro
      if (error.code) {
        console.error('   Código do erro:', error.code);
      }
      if (error.detail) {
        console.error('   Detalhe:', error.detail);
      }
      if (error.hint) {
        console.error('   Dica:', error.hint);
      }
    }
    
    // 6. Testar sintaxe alternativas (para debug)
    console.log('\n🧪 Testando sintaxes alternativas...');
    
    // Teste com SET múltiplo
    try {
      await client.query('BEGIN');
      await client.query(`
        UPDATE products 
        SET quantity = $1
        WHERE id = $2
      `, [newQuantity, product.id]);
      await client.query('ROLLBACK');
      console.log('✅ UPDATE com placeholder funcionou!');
    } catch (error) {
      await client.query('ROLLBACK');
      console.log('❌ UPDATE com placeholder falhou:', error.message);
    }
    
    // Teste com template string
    try {
      await client.query('BEGIN');
      await client.query(`
        UPDATE products 
        SET quantity = ${newQuantity}
        WHERE id = '${product.id}'
      `);
      await client.query('ROLLBACK');
      console.log('✅ UPDATE com template string funcionou!');
    } catch (error) {
      await client.query('ROLLBACK');
      console.log('❌ UPDATE com template string falhou:', error.message);
    }
    
  } finally {
    client.release();
  }
}

// Executar teste
testStockUpdate()
  .then(() => {
    console.log('\n✅ Teste concluído!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro fatal:', error);
    process.exit(1);
  }); 