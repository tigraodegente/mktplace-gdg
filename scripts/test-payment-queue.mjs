#!/usr/bin/env node

async function testPaymentQueue() {
  console.log('🧪 TESTE DO PROCESSADOR DE FILA DE PAGAMENTOS\n');

  const BASE_URL = 'http://localhost:5173';
  
  try {
    console.log('🔄 Executando processador de fila...');
    
    const response = await fetch(`${BASE_URL}/api/payments/process-queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const result = await response.json();
    
    console.log(`📊 Status: ${response.status}`);
    console.log(`📋 Resultado:`, JSON.stringify(result, null, 2));
    
    if (result.success) {
      const { processed, results } = result.data;
      
      console.log(`\n✅ Processamento concluído:`);
      console.log(`   • Itens processados: ${processed}`);
      
      if (results && results.length > 0) {
        console.log(`\n📄 Detalhes dos processamentos:`);
        results.forEach((item, index) => {
          console.log(`   ${index + 1}. ${item.status.toUpperCase()}`);
          console.log(`      Queue ID: ${item.queueId}`);
          console.log(`      Payment ID: ${item.paymentId}`);
          console.log(`      Tentativas: ${item.attempts}`);
          
          if (item.status === 'retrying' && item.nextAttempt) {
            console.log(`      Próxima tentativa: ${new Date(item.nextAttempt).toLocaleString()}`);
          }
          
          if (item.error) {
            console.log(`      Erro: ${item.error}`);
          }
          console.log('');
        });
      }
      
      if (processed === 0) {
        console.log('ℹ️ Nenhum item na fila para processar');
      }
      
    } else {
      console.error('❌ Erro no processamento:', result.error);
    }
    
    console.log('\n🎊 Teste concluído!');
    console.log('\n📋 O que acontece quando um pagamento falha:');
    console.log('   1. Primeira falha → attempts = 1, status = "retrying", retry em 1min');
    console.log('   2. Segunda falha → attempts = 2, status = "retrying", retry em 2min');
    console.log('   3. Terceira falha → attempts = 3, status = "failed", não retenta mais');
    console.log('   4. Pedido é cancelado e estoque é restaurado');
    console.log('   5. Email de falha é enviado ao cliente');

  } catch (error) {
    console.error('❌ Erro na conexão:', error.message);
    console.log('\n💡 Certifique-se de que o servidor está rodando:');
    console.log('   npm run dev');
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  testPaymentQueue();
}

export { testPaymentQueue }; 