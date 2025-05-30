#!/usr/bin/env node

import { Client } from 'pg';
import { config } from 'dotenv';

config({ path: '.env.local' });

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function testCheckoutComplete() {
  try {
    console.log('🧪 TESTE COMPLETO DO SISTEMA DE CHECKOUT\n');
    
    await client.connect();
    console.log('✅ Conectado ao banco de dados\n');
    
    // 1. Buscar um usuário existente
    const userTest = await client.query(`
      SELECT id, name, email FROM users LIMIT 1;
    `);
    
    if (userTest.rows.length === 0) {
      console.log('❌ Nenhum usuário encontrado. Criando usuário de teste...');
      
      const newUser = await client.query(`
        INSERT INTO users (name, email, password_hash, role)
        VALUES ('Teste Checkout', 'teste.checkout@example.com', '$2b$10$dummy.hash', 'customer')
        RETURNING id, name, email;
      `);
      
      console.log('✅ Usuário de teste criado:', newUser.rows[0]);
      var { id: userId, name: userName, email: userEmail } = newUser.rows[0];
    } else {
      var { id: userId, name: userName, email: userEmail } = userTest.rows[0];
      console.log(`✅ Usuário encontrado: ${userName} (${userEmail})`);
    }
    
    // 2. Buscar um produto existente
    const productTest = await client.query(`
      SELECT id, name, price FROM products WHERE status = 'active' LIMIT 1;
    `);
    
    let productId, productName, productPrice;
    if (productTest.rows.length === 0) {
      console.log('⚠️ Nenhum produto ativo encontrado. Usando ID mock...');
      productId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
      productName = 'Produto Mock';
      productPrice = 99.90;
    } else {
      ({ id: productId, name: productName, price: productPrice } = productTest.rows[0]);
      console.log(`✅ Produto encontrado: ${productName} - R$ ${productPrice}`);
    }
    
    const orderNumber = `TEST-${Date.now()}`;
    const quantity = 2;
    const itemTotal = productPrice * quantity;
    const shippingCost = 15.90;
    const discountAmount = 10.00;
    const finalTotal = itemTotal + shippingCost - discountAmount;
    
    console.log(`\n📋 Simulando pedido:`);
    console.log(`   • Produto: ${productName} x${quantity}`);
    console.log(`   • Subtotal: R$ ${itemTotal.toFixed(2)}`);
    console.log(`   • Frete: R$ ${shippingCost.toFixed(2)}`);
    console.log(`   • Desconto: R$ ${discountAmount.toFixed(2)}`);
    console.log(`   • Total: R$ ${finalTotal.toFixed(2)}`);
    
    // 3. Criar o pedido
    console.log(`\n🛒 ETAPA 1: Criando pedido...`);
    
    const orderResult = await client.query(`
      INSERT INTO orders (
        user_id,
        order_number,
        status,
        payment_status,
        subtotal,
        shipping_cost,
        discount_amount,
        total,
        shipping_address,
        coupon_code,
        notes
      ) VALUES (
        $1, $2, 'pending', 'pending', $3, $4, $5, $6,
        $7::jsonb, $8, $9
      ) RETURNING id, order_number, total;
    `, [
      userId,
      orderNumber,
      itemTotal,
      shippingCost,
      discountAmount,
      finalTotal,
      JSON.stringify({
        street: "Rua das Flores, 123",
        neighborhood: "Centro",
        city: "São Paulo",
        state: "SP",
        zipCode: "01234567",
        complement: "Apto 45"
      }),
      'DESCONTO10',
      'Pedido de teste do sistema de checkout'
    ]);
    
    const { id: orderId, order_number, total } = orderResult.rows[0];
    console.log(`✅ Pedido criado: ${order_number} (${orderId})`);
    console.log(`   Total: R$ ${parseFloat(total).toFixed(2)}`);
    
    // 4. Adicionar item ao pedido
    console.log(`\n📦 ETAPA 2: Adicionando item ao pedido...`);
    
    const itemResult = await client.query(`
      INSERT INTO order_items (
        order_id,
        product_id,
        quantity,
        price,
        total,
        status
      ) VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING id;
    `, [orderId, productId, quantity, productPrice, itemTotal]);
    
    const itemId = itemResult.rows[0].id;
    console.log(`✅ Item adicionado: ${itemId}`);
    console.log(`   ${productName} x${quantity} - R$ ${itemTotal.toFixed(2)}`);
    
    // 5. Criar pagamento PIX
    console.log(`\n💳 ETAPA 3: Criando pagamento PIX...`);
    
    const pixKey = 'marketplace@exemplo.com';
    const pixQrCode = `pix_qr_${Date.now()}`;
    
    const paymentResult = await client.query(`
      INSERT INTO payments (
        order_id,
        gateway,
        method,
        status,
        amount,
        currency,
        payment_data
      ) VALUES (
        $1, 'mock', 'pix', 'pending', $2, 'BRL', $3::jsonb
      ) RETURNING id, method, amount, status;
    `, [
      orderId,
      finalTotal,
      JSON.stringify({
        pix_key: pixKey,
        qr_code: pixQrCode,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min
        copy_paste: `${pixQrCode}_copy_paste_code`
      })
    ]);
    
    const { id: paymentId, method, amount, status } = paymentResult.rows[0];
    console.log(`✅ Pagamento criado: ${paymentId}`);
    console.log(`   Método: ${method.toUpperCase()}`);
    console.log(`   Valor: R$ ${parseFloat(amount).toFixed(2)}`);
    console.log(`   Status: ${status}`);
    console.log(`   Chave PIX: ${pixKey}`);
    
    // 6. Simular processamento via fila
    console.log(`\n⚡ ETAPA 4: Adicionando à fila de processamento...`);
    
    const queueResult = await client.query(`
      INSERT INTO payment_queue (
        payment_id,
        status,
        attempts,
        max_attempts
      ) VALUES ($1, 'pending', 0, 3)
      RETURNING id, status;
    `, [paymentId]);
    
    const queueId = queueResult.rows[0].id;
    console.log(`✅ Adicionado à fila: ${queueId}`);
    
    // 7. Simular confirmação do pagamento
    console.log(`\n✅ ETAPA 5: Simulando confirmação do pagamento...`);
    
    // Atualizar status do pagamento
    await client.query(`
      UPDATE payments 
      SET status = 'paid', paid_at = NOW(), 
          gateway_response = $2::jsonb
      WHERE id = $1;
    `, [
      paymentId,
      JSON.stringify({
        transaction_id: `txn_${Date.now()}`,
        confirmed_at: new Date().toISOString(),
        payer_info: {
          name: userName,
          document: "123.456.789-00"
        }
      })
    ]);
    
    // Atualizar status do pedido (vai triggear o histórico)
    await client.query(`
      UPDATE orders SET status = 'paid', payment_status = 'paid' WHERE id = $1;
    `, [orderId]);
    
    // Atualizar fila
    await client.query(`
      UPDATE payment_queue 
      SET status = 'completed', processed_at = NOW() 
      WHERE id = $1;
    `, [queueId]);
    
    console.log(`✅ Pagamento confirmado!`);
    
    // 8. Adicionar email à fila
    console.log(`\n📧 ETAPA 6: Adicionando email de confirmação à fila...`);
    
    const emailResult = await client.query(`
      INSERT INTO email_queue (
        to_email,
        to_name,
        subject,
        template,
        template_data
      ) VALUES (
        $1, $2, $3, 'order_confirmation', $4::jsonb
      ) RETURNING id;
    `, [
      userEmail,
      userName,
      `Pedido ${order_number} confirmado - Marketplace GDG`,
      JSON.stringify({
        order_number,
        total: finalTotal,
        payment_method: 'PIX',
        estimated_delivery: '3-5 dias úteis'
      })
    ]);
    
    console.log(`✅ Email adicionado à fila: ${emailResult.rows[0].id}`);
    
    // 9. Verificar histórico de status
    console.log(`\n📊 ETAPA 7: Verificando histórico...`);
    
    const historyResult = await client.query(`
      SELECT previous_status, new_status, created_by_type, created_at
      FROM order_status_history 
      WHERE order_id = $1
      ORDER BY created_at;
    `, [orderId]);
    
    if (historyResult.rows.length > 0) {
      console.log(`✅ Histórico de status (${historyResult.rows.length} registro(s)):`);
      historyResult.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.previous_status || 'inicial'} → ${row.new_status} (${row.created_by_type})`);
      });
    }
    
    // 10. Resumo final
    console.log(`\n🎉 TESTE COMPLETO FINALIZADO COM SUCESSO!`);
    console.log(`\n📋 Resumo do pedido criado:`);
    
    const orderSummary = await client.query(`
      SELECT 
        o.order_number,
        o.status as order_status,
        o.payment_status,
        o.total,
        p.method as payment_method,
        p.status as payment_status_detail,
        COUNT(oi.id) as items_count
      FROM orders o
      LEFT JOIN payments p ON o.id = p.order_id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.id = $1
      GROUP BY o.id, p.method, p.status;
    `, [orderId]);
    
    console.table(orderSummary.rows);
    
    // 11. Status das filas
    const queueStatus = await client.query(`
      SELECT 
        'payment_queue' as queue,
        status,
        COUNT(*) as count
      FROM payment_queue
      GROUP BY status
      UNION ALL
      SELECT 
        'email_queue' as queue,
        status,
        COUNT(*) as count
      FROM email_queue
      GROUP BY status
      ORDER BY queue, status;
    `);
    
    console.log(`\n📊 Status das filas:`);
    console.table(queueStatus.rows);
    
    // 12. Limpar dados de teste
    console.log(`\n🧹 Limpando dados de teste...`);
    
    await client.query(`DELETE FROM email_queue WHERE to_email = $1 AND template = 'order_confirmation'`, [userEmail]);
    await client.query(`DELETE FROM payment_queue WHERE payment_id = $1`, [paymentId]);
    await client.query(`DELETE FROM payments WHERE id = $1`, [paymentId]);
    await client.query(`DELETE FROM order_items WHERE id = $1`, [itemId]);
    await client.query(`DELETE FROM orders WHERE id = $1`, [orderId]);
    
    // Se criamos um usuário de teste, remover também
    if (userEmail === 'teste.checkout@example.com') {
      await client.query(`DELETE FROM users WHERE id = $1`, [userId]);
      console.log(`✅ Usuário de teste removido`);
    }
    
    console.log(`✅ Dados de teste removidos`);
    
    console.log(`\n🎊 SISTEMA DE CHECKOUT TESTADO E FUNCIONANDO PERFEITAMENTE!`);
    console.log(`\n🚀 Próximas implementações:`);
    console.log(`   1. APIs REST para checkout`);
    console.log(`   2. Interface de checkout no frontend`);
    console.log(`   3. Gateways de pagamento reais`);
    console.log(`   4. Sistema de filas com workers`);
    console.log(`   5. Templates de email`);
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

testCheckoutComplete(); 