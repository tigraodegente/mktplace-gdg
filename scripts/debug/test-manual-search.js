#!/usr/bin/env node

// Teste da busca manual
import fetch from 'node-fetch';

async function testManualSearch() {
  const API_URL = 'http://localhost:5176/api/atendimento/faq/ai-search';
  
  const testQueries = [
    "como cancelar meu pedido",
    "prazo de entrega",
    "problemas com pagamento"
  ];

  console.log('🧪 Testando busca manual...\n');

  for (const query of testQueries) {
    try {
      console.log(`📝 Testando: "${query}"`);
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          user_session: "test_manual_" + Date.now(),
          max_results: 3
        })
      });

      const data = await response.json();
      
      console.log(`   ✅ Status: ${response.status}`);
      console.log(`   📊 Resultados: ${data.success ? data.data.results.length : 0}`);
      
      if (data.success && data.data.results.length > 0) {
        const firstResult = data.data.results[0];
        console.log(`   🎯 Melhor resultado: ${firstResult.question} (${Math.round(firstResult.relevance_score * 100)}%)`);
      }
      
      console.log('');
      
    } catch (error) {
      console.error(`   ❌ Erro: ${error.message}\n`);
    }
  }
}

// Aguardar servidor iniciar
setTimeout(testManualSearch, 5000); 