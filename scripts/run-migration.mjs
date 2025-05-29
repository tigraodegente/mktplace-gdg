#!/usr/bin/env node

import postgres from 'postgres';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Executando migração para adicionar colunas dos filtros avançados...\n');

// Obter DATABASE_URL do ambiente ou usar padrão local
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres@localhost/mktplace_dev';

console.log('📊 Conectando ao banco de dados...');
console.log(`   URL: ${DATABASE_URL.replace(/:[^:@]+@/, ':****@')}\n`); // Oculta a senha

try {
  // Conectar ao banco
  const sql = postgres(DATABASE_URL);
  
  // Ler o arquivo SQL
  const migrationSQL = readFileSync(
    join(__dirname, 'add-new-filter-columns-with-data.sql'), 
    'utf8'
  );
  
  console.log('📝 Aplicando alterações no banco de dados...\n');
  
  // Executar a migração
  await sql.unsafe(migrationSQL);
  
  console.log('✅ Migração executada com sucesso!\n');
  console.log('As seguintes alterações foram aplicadas:');
  console.log('- Coluna "condition" adicionada (novo/usado/recondicionado)');
  console.log('- Coluna "delivery_days" adicionada (tempo de entrega)');
  console.log('- Colunas "seller_state" e "seller_city" adicionadas (localização)');
  console.log('- Índices otimizados criados');
  console.log('- Dados de teste populados\n');
  
  // Verificar algumas estatísticas
  const stats = await sql`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN condition = 'new' THEN 1 END) as novos,
      COUNT(CASE WHEN condition = 'used' THEN 1 END) as usados,
      COUNT(CASE WHEN condition = 'refurbished' THEN 1 END) as recondicionados,
      COUNT(CASE WHEN delivery_days <= 2 THEN 1 END) as entrega_rapida,
      COUNT(DISTINCT seller_state) as estados,
      COUNT(DISTINCT seller_city) as cidades
    FROM products 
    WHERE is_active = true
  `;
  
  const stat = stats[0];
  console.log('📊 Estatísticas dos dados:');
  console.log(`   Total de produtos: ${stat.total}`);
  console.log(`   - Novos: ${stat.novos}`);
  console.log(`   - Usados: ${stat.usados}`);
  console.log(`   - Recondicionados: ${stat.recondicionados}`);
  console.log(`   - Com entrega rápida (até 48h): ${stat.entrega_rapida}`);
  console.log(`   - Estados diferentes: ${stat.estados}`);
  console.log(`   - Cidades diferentes: ${stat.cidades}\n`);
  
  console.log('🎉 Os filtros avançados estão prontos para uso!');
  
  await sql.end();
  process.exit(0);
  
} catch (error) {
  console.error('❌ Erro ao executar a migração:', error.message);
  
  if (error.message.includes('does not exist')) {
    console.error('\n⚠️  Parece que o banco de dados ou tabela não existe.');
    console.error('   Verifique se o banco está criado e as tabelas existem.');
  } else if (error.message.includes('authentication failed')) {
    console.error('\n⚠️  Erro de autenticação.');
    console.error('   Verifique suas credenciais de acesso ao banco.');
  }
  
  process.exit(1);
} 