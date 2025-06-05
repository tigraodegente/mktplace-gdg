#!/usr/bin/env node

// Teste direto do endpoint de AI search
import fetch from 'node-fetch';

async function testAISearch() {
  const API_URL = 'http://localhost:5174/api/atendimento/faq/ai-search';
  
  const testQuery = {
    query: "como cancelar pedido",
    user_session: "test_session_123",
    max_results: 3
  };

  try {
    console.log('🧪 Testando endpoint de AI search...');
    console.log('Query:', testQuery);

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testQuery)
    });

    const data = await response.text();
    
    console.log('\n📡 Response Status:', response.status);
    console.log('📋 Response Data:');
    
    try {
      const jsonData = JSON.parse(data);
      console.log(JSON.stringify(jsonData, null, 2));
    } catch (e) {
      console.log('Raw response:', data);
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

// Aguardar um pouco para o servidor iniciar
setTimeout(testAISearch, 3000); 