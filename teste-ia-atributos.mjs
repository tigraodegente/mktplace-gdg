#!/usr/bin/env node

// Script para testar se a IA está gerando atributos corretamente
console.log('🧪 TESTE: IA corrigida para atributos');

// Simular chamada para o produto "Cortina Petit Xadrez"
const testProduct = {
  name: "Cortina Petit Xadrez 1,80m",
  category: "Cortinas Quarto de Bebê", 
  price: 89.90,
  cost: 45.00,
  description: "Cortina decorativa em tecido xadrez para quarto infantil"
};

console.log('📦 Produto de teste:', testProduct.name);

// Fazer requisição para API da IA
async function testAI() {
  try {
    console.log('🤖 Testando enriquecimento de atributos...');
    
    const response = await fetch('http://localhost:5174/api/ai/enrich', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        field: 'attributes',
        currentData: testProduct,
        category: testProduct.category
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Resposta da IA:');
      console.log(JSON.stringify(result.data, null, 2));
      
      // Verificar se os atributos são arrays
      if (typeof result.data === 'object') {
        let hasArrays = false;
        for (const [key, value] of Object.entries(result.data)) {
          if (Array.isArray(value)) {
            console.log(`✅ ${key}: É ARRAY com ${value.length} opções`);
            hasArrays = true;
          } else {
            console.log(`❌ ${key}: NÃO é array (${typeof value})`);
          }
        }
        
        if (hasArrays) {
          console.log('🎉 SUCESSO: IA está gerando atributos com múltiplas opções!');
        } else {
          console.log('❌ PROBLEMA: IA ainda não está gerando arrays');
        }
      }
    } else {
      console.error('❌ Erro na API:', await response.text());
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

// Aguardar um pouco para o servidor iniciar
setTimeout(testAI, 3000); 