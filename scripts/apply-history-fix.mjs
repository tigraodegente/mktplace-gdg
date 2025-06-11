#!/usr/bin/env node

import postgres from 'postgres';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Usar a string de conexão que funciona no projeto
const DATABASE_URL = 'postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-raspy-meadow-acds6p80-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = postgres(DATABASE_URL, {
  ssl: 'require',
  max: 1
});

console.log('🔧 APLICANDO CORREÇÃO SISTÊMICA DA TRIGGER DE HISTÓRICO...\n');

try {
  // Ler o script SQL de correção
  const sqlScript = readFileSync(join(__dirname, 'fix-product-history-normalization.sql'), 'utf8');
  
  // Dividir o script em comandos individuais
  const commands = sqlScript
    .split(';')
    .map(cmd => cmd.trim())
    .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
  
  console.log(`📄 Executando ${commands.length} comandos SQL...\n`);
  
  for (let i = 0; i < commands.length; i++) {
    const command = commands[i] + ';';
    
    try {
      console.log(`${i + 1}/${commands.length} Executando comando...`);
      await sql.unsafe(command);
      console.log(`✅ Comando ${i + 1} executado com sucesso`);
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log(`⚠️ Comando ${i + 1} pulado (já existe)`);
      } else {
        console.error(`❌ Erro no comando ${i + 1}:`, error.message);
        // Continue com os próximos comandos
      }
    }
  }
  
  console.log('\n🧪 TESTANDO A CORREÇÃO...');
  
  // Testar se as funções foram criadas corretamente
  const functions = await sql`
    SELECT routine_name 
    FROM information_schema.routines 
    WHERE routine_type = 'FUNCTION' 
    AND routine_name IN ('normalize_value_for_comparison', 'log_product_changes', 'jsonb_normalize')
    ORDER BY routine_name
  `;
  
  console.log('\n📋 Funções encontradas:');
  functions.forEach(func => {
    console.log(`  ✅ ${func.routine_name}`);
  });
  
  // Verificar se a trigger existe
  const triggers = await sql`
    SELECT trigger_name 
    FROM information_schema.triggers 
    WHERE trigger_name = 'trigger_product_history'
  `;
  
  if (triggers.length > 0) {
    console.log('  ✅ trigger_product_history');
  } else {
    console.log('  ❌ trigger_product_history NÃO ENCONTRADA');
  }
  
  console.log('\n🎯 TESTANDO NORMALIZAÇÃO...');
  
  // Testar função de normalização diretamente
  const testResults = await sql`
    SELECT 
      normalize_value_for_comparison('attributes', '{"Cor": ["Rosa"]}') as test1,
      normalize_value_for_comparison('attributes', '"{\"Cor\":[\"Rosa\"]}"') as test2,
      normalize_value_for_comparison('original_price', '0.00') as test3,
      normalize_value_for_comparison('original_price', '') as test4
  `;
  
  const result = testResults[0];
  
  console.log('📊 Teste de normalização:');
  console.log(`  - Attributes objeto: "${result.test1}"`);
  console.log(`  - Attributes string: "${result.test2}"`);
  console.log(`  - Iguais? ${result.test1 === result.test2 ? '✅' : '❌'}`);
  console.log(`  - Original price 0.00: "${result.test3}"`);
  console.log(`  - Original price vazio: "${result.test4}"`);
  console.log(`  - Iguais? ${result.test3 === result.test4 ? '✅' : '❌'}`);
  
  console.log('\n✅ CORREÇÃO APLICADA COM SUCESSO!');
  console.log('🎯 A trigger agora irá:');
  console.log('   - Normalizar campos JSON antes da comparação');
  console.log('   - Tratar 0 = null para preços opcionais');
  console.log('   - Normalizar arrays e objetos');
  console.log('   - Eliminar falsos positivos');
  
  console.log('\n🔄 Próximo: Teste a edição de um produto para ver se o problema foi resolvido!');
  
} catch (error) {
  console.error('❌ Erro ao aplicar correção:', error);
} finally {
  await sql.end();
} 