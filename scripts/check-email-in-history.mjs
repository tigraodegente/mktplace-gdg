#!/usr/bin/env node

import postgres from 'postgres';

const DATABASE_URL = 'postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-raspy-meadow-acds6p80-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = postgres(DATABASE_URL, {
  ssl: 'require',
  max: 1
});

console.log('🔍 VERIFICANDO E-MAIL NO HISTÓRICO DE PRODUTOS...\n');

try {
  // 1. Verificar estrutura da tabela de histórico
  console.log('1/3 Verificando estrutura da tabela product_history...');
  
  const columns = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns 
    WHERE table_name = 'product_history'
    ORDER BY ordinal_position
  `;
  
  console.log('📋 Colunas da tabela product_history:');
  columns.forEach(col => {
    const nullable = col.is_nullable === 'YES' ? '(opcional)' : '(obrigatório)';
    console.log(`   • ${col.column_name}: ${col.data_type} ${nullable}`);
  });
  
  // 2. Verificar registros recentes
  console.log('\n2/3 Verificando registros recentes...');
  
  const recentHistory = await sql`
    SELECT 
      user_name,
      user_email,
      summary,
      created_at
    FROM product_history 
    ORDER BY created_at DESC 
    LIMIT 5
  `;
  
  console.log('📊 Últimos 5 registros de histórico:');
  recentHistory.forEach((record, index) => {
    const date = record.created_at.toLocaleString('pt-BR');
    console.log(`\n   ${index + 1}. ${date}`);
    console.log(`      👤 Nome: ${record.user_name}`);
    console.log(`      📧 E-mail: ${record.user_email}`);
    console.log(`      📝 Ação: ${record.summary}`);
  });
  
  // 3. Verificar se há registros com e-mail preenchido
  console.log('\n3/3 Analisando dados de e-mail...');
  
  const emailStats = await sql`
    SELECT 
      COUNT(*) as total_records,
      COUNT(CASE WHEN user_email IS NOT NULL AND user_email != '' AND user_email != 'system@marketplace.com' THEN 1 END) as with_real_email,
      COUNT(CASE WHEN user_email = 'system@marketplace.com' THEN 1 END) as with_system_email,
      COUNT(CASE WHEN user_email IS NULL OR user_email = '' THEN 1 END) as without_email
    FROM product_history
  `;
  
  const stats = emailStats[0];
  
  console.log('📈 Estatísticas de e-mail no histórico:');
  console.log(`   • Total de registros: ${stats.total_records}`);
  console.log(`   • Com e-mail real: ${stats.with_real_email}`);
  console.log(`   • Com e-mail sistema: ${stats.with_system_email}`);
  console.log(`   • Sem e-mail: ${stats.without_email}`);
  
  if (stats.with_real_email > 0) {
    console.log('\n✅ E-MAILS REAIS ENCONTRADOS NO HISTÓRICO!');
    
    // Mostrar exemplos de e-mails reais
    const realEmails = await sql`
      SELECT DISTINCT user_name, user_email
      FROM product_history 
      WHERE user_email IS NOT NULL 
      AND user_email != '' 
      AND user_email != 'system@marketplace.com'
      LIMIT 3
    `;
    
    console.log('📧 Exemplos de e-mails reais capturados:');
    realEmails.forEach(user => {
      console.log(`   • ${user.user_name} → ${user.user_email}`);
    });
    
  } else {
    console.log('\n⚠️ NENHUM E-MAIL REAL ENCONTRADO');
    console.log('💡 Isso pode indicar que:');
    console.log('   • O sistema ainda está usando valores padrão');
    console.log('   • O middleware não está capturando o e-mail corretamente');
    console.log('   • É necessário fazer uma nova edição para testar');
  }
  
  console.log('\n🧪 PRÓXIMO PASSO:');
  console.log('   1. Faça login no admin panel');
  console.log('   2. Edite um produto (pode ser uma mudança pequena)');
  console.log('   3. Verifique se o e-mail aparece no histórico');
  
} catch (error) {
  console.error('❌ Erro ao verificar e-mail no histórico:', error);
} finally {
  await sql.end();
} 