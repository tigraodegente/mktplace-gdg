#!/usr/bin/env node

/**
 * Script para popular dados de FAQ no banco de dados
 * USO: node scripts/populate-faq.js [URL_BASE]
 * 
 * Exemplo:
 * node scripts/populate-faq.js http://localhost:5173
 * node scripts/populate-faq.js https://store.graodegente.com
 */

const fetch = require('node-fetch');

async function populateFAQ() {
  const baseUrl = process.argv[2] || 'http://localhost:5173';
  const endpoint = `${baseUrl}/api/admin/populate-faq`;
  
  console.log('🌱 Populando dados de FAQ...');
  console.log(`📡 Endpoint: ${endpoint}`);
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        adminKey: 'gdg-populate-2024'
      })
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Dados populados com sucesso!');
      console.log('📊 Dados inseridos:');
      console.log(`   • Categorias FAQ: ${data.data.faq_categories}`);
      console.log(`   • Itens FAQ: ${data.data.faq_items}`);
      console.log(`   • Categorias Suporte: ${data.data.support_categories}`);
      console.log(`   • Feedbacks: ${data.data.faq_feedbacks}`);
      console.log('\n🎉 Pronto! Acesse /atendimento para ver os dados.');
    } else {
      console.error('❌ Erro:', data.error);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Erro ao conectar:', error.message);
    console.error('\n💡 Verifique se:');
    console.error('   1. O servidor está rodando');
    console.error('   2. A URL está correta');
    console.error('   3. O banco de dados está configurado');
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  populateFAQ();
}

module.exports = { populateFAQ }; 