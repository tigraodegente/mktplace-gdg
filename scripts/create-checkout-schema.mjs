#!/usr/bin/env node

import { readFileSync } from 'fs';
import { Client } from 'pg';
import { config } from 'dotenv';

// Carregar variáveis de ambiente
config({ path: '.env.local' });

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function createCheckoutSchema() {
  try {
    console.log('🚀 Adaptando sistema de checkout (versão simplificada)...\n');
    
    await client.connect();
    console.log('✅ Conectado ao banco de dados\n');
    
    // Ler o arquivo SQL simplificado
    const sql = readFileSync('./scripts/adapt-simple.sql', 'utf8');
    
    console.log('📄 Executando adaptações simplificadas...');
    
    // Executar o script
    await client.query(sql);
    
    console.log('✅ Adaptações aplicadas com sucesso!\n');
    
    // Verificar tabelas criadas/adaptadas
    const result = await client.query(`
      SELECT 
        tablename,
        schemaname
      FROM pg_tables 
      WHERE tablename IN (
        'orders', 'order_items', 'payments', 'payment_queue', 
        'order_status_history', 'email_queue'
      )
      AND schemaname = 'public'
      ORDER BY tablename;
    `);
    
    console.log('📋 Tabelas disponíveis:');
    console.table(result.rows);
    
    // Verificar nova estrutura da tabela orders
    console.log('\n🔍 Novas colunas na tabela orders:');
    const ordersStructure = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
      AND table_schema = 'public'
      AND column_name IN ('coupon_code', 'shipping_tracking', 'shipping_method', 'shipped_at', 'delivered_at')
      ORDER BY column_name;
    `);
    
    console.table(ordersStructure.rows);
    
    // Testar inserção completa
    console.log('\n🧪 Testando inserção completa...');
    
    // Buscar um usuário existente para teste
    const userTest = await client.query(`
      SELECT id FROM users LIMIT 1;
    `);
    
    if (userTest.rows.length > 0) {
      const userId = userTest.rows[0].id;
      const orderNumber = `TEST-${Date.now()}`;
      
      // Criar um pedido de exemplo
      const orderTest = await client.query(`
        INSERT INTO orders (
          user_id, 
          order_number,
          total, 
          subtotal, 
          shipping_address,
          coupon_code
        ) VALUES (
          $1, 
          $2,
          150.50, 
          130.00, 
          '{"street": "Rua Teste", "number": "123", "city": "São Paulo", "state": "SP", "zipCode": "01234567"}'::jsonb,
          'TESTE10'
        ) RETURNING id;
      `, [userId, orderNumber]);
      
      const orderId = orderTest.rows[0].id;
      console.log(`✅ Pedido criado: ${orderNumber} (${orderId})`);
      
      // Criar item do pedido
      const itemTest = await client.query(`
        INSERT INTO order_items (
          order_id,
          product_id,
          quantity,
          unit_price,
          total_price,
          product_snapshot
        ) VALUES (
          $1,
          gen_random_uuid(),
          2,
          65.25,
          130.50,
          '{"name": "Produto Teste", "sku": "TEST-001", "image": "test.jpg"}'::jsonb
        ) RETURNING id;
      `, [orderId]);
      
      const itemId = itemTest.rows[0].id;
      console.log(`✅ Item criado: ${itemId}`);
      
      // Criar pagamento
      const paymentTest = await client.query(`
        INSERT INTO payments (
          order_id,
          method,
          amount,
          payment_data
        ) VALUES (
          $1,
          'pix',
          150.50,
          '{"pix_key": "teste@exemplo.com", "qr_code": "mock_qr_code"}'::jsonb
        ) RETURNING id;
      `, [orderId]);
      
      const paymentId = paymentTest.rows[0].id;
      console.log(`✅ Pagamento criado: ${paymentId}`);
      
      // Testar atualização de status (trigger de histórico)
      await client.query(`
        UPDATE orders SET status = 'paid' WHERE id = $1
      `, [orderId]);
      
      console.log(`✅ Status atualizado para 'paid'`);
      
      // Verificar se tem histórico
      const historyCheck = await client.query(`
        SELECT COUNT(*) as count FROM order_status_history WHERE order_id = $1
      `, [orderId]);
      
      if (historyCheck.rows[0].count > 0) {
        console.log(`✅ Histórico de status funcionando: ${historyCheck.rows[0].count} registro(s)`);
      }
      
      // Limpar dados de teste
      await client.query(`DELETE FROM payments WHERE id = $1`, [paymentId]);
      await client.query(`DELETE FROM order_items WHERE id = $1`, [itemId]);
      await client.query(`DELETE FROM orders WHERE id = $1`, [orderId]);
      console.log('🧹 Dados de teste removidos');
      
    } else {
      console.log('⚠️ Nenhum usuário encontrado para teste');
    }
    
    // Verificar filas
    const queueCounts = await client.query(`
      SELECT 
        'email_queue' as queue_name,
        COUNT(*) as count
      FROM email_queue
      UNION ALL
      SELECT 
        'payment_queue' as queue_name,
        COUNT(*) as count
      FROM payment_queue;
    `);
    
    console.log('\n📊 Status das filas:');
    console.table(queueCounts.rows);
    
    console.log('\n🎉 Sistema de checkout adaptado com sucesso!');
    console.log('\n📚 Estrutura disponível:');
    console.log('   • orders - Pedidos principais');
    console.log('   • order_items - Itens dos pedidos');
    console.log('   • payments - Transações de pagamento');
    console.log('   • payment_queue - Fila de processamento');
    console.log('   • order_status_history - Histórico de mudanças');
    console.log('   • email_queue - Fila de emails');
    
    console.log('\n🔧 Próximos passos:');
    console.log('   1. ✅ Schema do banco adaptado');
    console.log('   2. 🔄 Implementar APIs de checkout');
    console.log('   3. 🎨 Criar página de checkout');
    console.log('   4. 💳 Integrar gateways de pagamento');
    console.log('   5. ⚡ Configurar sistema de filas');
    
  } catch (error) {
    console.error('❌ Erro ao adaptar schema:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Executar apenas se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  createCheckoutSchema();
}

export { createCheckoutSchema }; 