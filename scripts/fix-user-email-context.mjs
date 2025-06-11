#!/usr/bin/env node

import postgres from 'postgres';

const DATABASE_URL = 'postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-raspy-meadow-acds6p80-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = postgres(DATABASE_URL, {
  ssl: 'require',
  max: 1
});

console.log('🔧 VERIFICANDO E CORRIGINDO CAPTURA DE E-MAIL DO USUÁRIO...\n');

try {
  // 1. Verificar função atual
  console.log('1/4 Verificando função get_current_user_info atual...');
  
  const currentFunction = await sql`
    SELECT routine_definition 
    FROM information_schema.routines 
    WHERE routine_name = 'get_current_user_info'
  `;
  
  if (currentFunction.length > 0) {
    console.log('📋 Função atual encontrada');
  } else {
    console.log('❌ Função get_current_user_info não encontrada');
  }
  
  // 2. Atualizar função para garantir captura correta do e-mail
  console.log('2/4 Atualizando função para capturar e-mail corretamente...');
  
  await sql`
    CREATE OR REPLACE FUNCTION get_current_user_info()
    RETURNS TABLE(user_id UUID, user_name TEXT, user_email TEXT) AS $$
    BEGIN
        -- Tentar obter do contexto da sessão
        BEGIN
            RETURN QUERY
            SELECT 
                COALESCE(
                    CASE 
                        WHEN current_setting('app.current_user_id', true) != '' 
                        THEN current_setting('app.current_user_id', true)::UUID 
                        ELSE NULL 
                    END, 
                    NULL
                ) as user_id,
                COALESCE(
                    CASE 
                        WHEN current_setting('app.current_user_name', true) != '' 
                        THEN current_setting('app.current_user_name', true) 
                        ELSE 'Sistema' 
                    END, 
                    'Sistema'
                ) as user_name,
                COALESCE(
                    CASE 
                        WHEN current_setting('app.current_user_email', true) != '' 
                        THEN current_setting('app.current_user_email', true) 
                        ELSE 'system@marketplace.com' 
                    END, 
                    'system@marketplace.com'
                ) as user_email;
        EXCEPTION WHEN OTHERS THEN
            -- Se não conseguir obter do contexto, usar valores padrão
            RETURN QUERY
            SELECT 
                NULL::UUID as user_id,
                'Sistema'::TEXT as user_name,
                'system@marketplace.com'::TEXT as user_email;
        END;
    END;
    $$ LANGUAGE plpgsql;
  `;
  
  console.log('✅ Função get_current_user_info atualizada');
  
  // 3. Testar as funções de contexto
  console.log('3/4 Testando funções de contexto...');
  
  // Definir um contexto de teste
  await sql`SELECT set_user_context('12345678-1234-1234-1234-123456789012'::UUID, 'João Silva', 'joao@teste.com')`;
  
  // Verificar se o contexto foi definido corretamente
  const testContext = await sql`SELECT * FROM get_current_user_info()`;
  const context = testContext[0];
  
  console.log('📊 Teste do contexto:');
  console.log(`   • User ID: ${context.user_id}`);
  console.log(`   • User Name: ${context.user_name}`);
  console.log(`   • User Email: ${context.user_email}`);
  
  if (context.user_email === 'joao@teste.com') {
    console.log('✅ E-mail capturado corretamente!');
  } else {
    console.log(`❌ E-mail não capturado. Esperado: joao@teste.com, Recebido: ${context.user_email}`);
  }
  
  // 4. Limpar contexto de teste
  console.log('4/4 Limpando contexto de teste...');
  await sql`SELECT clear_user_context()`;
  
  // Verificar se foi limpo
  const cleanContext = await sql`SELECT * FROM get_current_user_info()`;
  const clean = cleanContext[0];
  
  console.log('📊 Contexto após limpeza:');
  console.log(`   • User Name: ${clean.user_name}`);
  console.log(`   • User Email: ${clean.user_email}`);
  
  if (clean.user_name === 'Sistema' && clean.user_email === 'system@marketplace.com') {
    console.log('✅ Contexto limpo corretamente - valores padrão');
  }
  
  console.log('\n🎉 CORREÇÃO CONCLUÍDA!');
  console.log('💡 O que foi corrigido:');
  console.log('   ✅ Função get_current_user_info melhorada');
  console.log('   ✅ Captura robusta do e-mail do usuário');
  console.log('   ✅ Tratamento de erros aprimorado');
  console.log('   ✅ Valores padrão seguros');
  
  console.log('\n🧪 Teste agora editando um produto:');
  console.log('   • Faça login no admin panel');
  console.log('   • Edite qualquer produto');
  console.log('   • Verifique o histórico - deve aparecer seu nome E e-mail!');
  
} catch (error) {
  console.error('❌ Erro ao corrigir captura de e-mail:', error);
} finally {
  await sql.end();
} 