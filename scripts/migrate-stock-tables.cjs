const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://mktplace_gdg_owner:mktplace@ep-dawn-darkness-a5lgnh8b.us-east-2.aws.neon.tech/mktplace_gdg?sslmode=require'
  });
  
  try {
    await client.connect();
    console.log('🔗 Conectado ao banco de dados');
    
    const sql = fs.readFileSync(path.join(__dirname, 'create-missing-tables.sql'), 'utf8');
    await client.query(sql);
    
    console.log('✅ SISTEMA DE ESTOQUE CRIADO COM SUCESSO!');
    console.log('');
    console.log('📦 Tabelas criadas:');
    console.log('   ✓ stock_movements - Histórico de movimentações');
    console.log('   ✓ stock_alerts - Alertas de estoque baixo');
    console.log('   ✓ notification_settings - Configurações de notificação'); 
    console.log('   ✓ stock_forecasts - Previsões de reposição');
    console.log('');
    console.log('🔧 Funcionalidades ativadas:');
    console.log('   ✓ Triggers automáticos para alertas');
    console.log('   ✓ Cálculos de previsão');
    console.log('   ✓ Índices para performance');
    console.log('');
    console.log('🎯 Sistema pronto para uso!');
    
  } catch (error) {
    console.error('❌ Erro na migração:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration(); 