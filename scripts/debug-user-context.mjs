#!/usr/bin/env node

import postgres from 'postgres';

const DATABASE_URL = 'postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-raspy-meadow-acds6p80-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = postgres(DATABASE_URL, {
  ssl: 'require',
  max: 1
});

console.log('🔍 DEBUG PROFUNDO DO SISTEMA DE CONTEXTO DE USUÁRIO...\n');

try {
  // 1. Verificar funções existentes
  console.log('1/6 Verificando funções de contexto existentes...');
  
  const functions = await sql`
    SELECT routine_name, routine_definition 
    FROM information_schema.routines 
    WHERE routine_name IN ('set_user_context', 'clear_user_context', 'get_current_user_info')
  `;
  
  console.log(`📋 ${functions.length} funções encontradas:`);
  functions.forEach(func => {
    console.log(`   • ${func.routine_name}`);
  });
  
  // 2. Recriar todas as funções de contexto com debug
  console.log('\n2/6 Recriando funções de contexto com debug...');
  
  await sql`
    CREATE OR REPLACE FUNCTION set_user_context(
        p_user_id UUID,
        p_user_name TEXT,
        p_user_email TEXT
    ) RETURNS VOID AS $$
    BEGIN
        -- Debug: mostrar o que está sendo definido
        RAISE NOTICE 'SET_USER_CONTEXT: Definindo contexto para ID=%, Nome=%, Email=%', p_user_id, p_user_name, p_user_email;
        
        -- Definir configurações na sessão atual
        PERFORM set_config('app.current_user_id', COALESCE(p_user_id::TEXT, ''), true);
        PERFORM set_config('app.current_user_name', COALESCE(p_user_name, ''), true);
        PERFORM set_config('app.current_user_email', COALESCE(p_user_email, ''), true);
        
        -- Debug: verificar se foi definido
        RAISE NOTICE 'SET_USER_CONTEXT: Contexto definido. Verificando...';
        RAISE NOTICE 'SET_USER_CONTEXT: app.current_user_id = %', current_setting('app.current_user_id', true);
        RAISE NOTICE 'SET_USER_CONTEXT: app.current_user_name = %', current_setting('app.current_user_name', true);
        RAISE NOTICE 'SET_USER_CONTEXT: app.current_user_email = %', current_setting('app.current_user_email', true);
    END;
    $$ LANGUAGE plpgsql;
  `;
  
  await sql`
    CREATE OR REPLACE FUNCTION get_current_user_info()
    RETURNS TABLE(user_id UUID, user_name TEXT, user_email TEXT) AS $$
    DECLARE
        ctx_user_id TEXT;
        ctx_user_name TEXT;
        ctx_user_email TEXT;
    BEGIN
        -- Debug: tentar obter configurações
        BEGIN
            ctx_user_id := current_setting('app.current_user_id', true);
            ctx_user_name := current_setting('app.current_user_name', true);
            ctx_user_email := current_setting('app.current_user_email', true);
            
            RAISE NOTICE 'GET_USER_INFO: Raw values - ID=%, Name=%, Email=%', ctx_user_id, ctx_user_name, ctx_user_email;
            
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'GET_USER_INFO: Erro ao obter configurações: %', SQLERRM;
            ctx_user_id := '';
            ctx_user_name := '';
            ctx_user_email := '';
        END;
        
        -- Retornar valores processados
        RETURN QUERY
        SELECT 
            CASE 
                WHEN ctx_user_id IS NOT NULL AND ctx_user_id != '' 
                THEN ctx_user_id::UUID 
                ELSE NULL 
            END as user_id,
            CASE 
                WHEN ctx_user_name IS NOT NULL AND ctx_user_name != '' 
                THEN ctx_user_name 
                ELSE 'Sistema' 
            END as user_name,
            CASE 
                WHEN ctx_user_email IS NOT NULL AND ctx_user_email != '' 
                THEN ctx_user_email 
                ELSE 'system@marketplace.com' 
            END as user_email;
            
        RAISE NOTICE 'GET_USER_INFO: Retornando processado - Name=%, Email=%', 
            CASE WHEN ctx_user_name IS NOT NULL AND ctx_user_name != '' THEN ctx_user_name ELSE 'Sistema' END,
            CASE WHEN ctx_user_email IS NOT NULL AND ctx_user_email != '' THEN ctx_user_email ELSE 'system@marketplace.com' END;
    END;
    $$ LANGUAGE plpgsql;
  `;
  
  await sql`
    CREATE OR REPLACE FUNCTION clear_user_context() RETURNS VOID AS $$
    BEGIN
        RAISE NOTICE 'CLEAR_USER_CONTEXT: Limpando contexto...';
        PERFORM set_config('app.current_user_id', '', true);
        PERFORM set_config('app.current_user_name', '', true);
        PERFORM set_config('app.current_user_email', '', true);
        RAISE NOTICE 'CLEAR_USER_CONTEXT: Contexto limpo';
    END;
    $$ LANGUAGE plpgsql;
  `;
  
  console.log('✅ Funções recriadas com debug');
  
  // 3. Limpar contexto primeiro
  console.log('\n3/6 Limpando contexto...');
  await sql`SELECT clear_user_context()`;
  
  // 4. Testar definição de contexto
  console.log('\n4/6 Testando definição de contexto...');
  
  const testUserId = '12345678-1234-1234-1234-123456789012';
  const testUserName = 'João Silva Debug';
  const testUserEmail = 'joao.debug@teste.com';
  
  console.log(`📝 Definindo contexto: ${testUserName} (${testUserEmail})`);
  
  await sql`SELECT set_user_context(${testUserId}::UUID, ${testUserName}, ${testUserEmail})`;
  
  // 5. Testar recuperação de contexto
  console.log('\n5/6 Testando recuperação de contexto...');
  
  const contextResult = await sql`SELECT * FROM get_current_user_info()`;
  const context = contextResult[0];
  
  console.log('📊 Contexto recuperado:');
  console.log(`   • User ID: ${context.user_id}`);
  console.log(`   • User Name: ${context.user_name}`);
  console.log(`   • User Email: ${context.user_email}`);
  
  // 6. Verificar se funciona corretamente
  console.log('\n6/6 Verificando resultado...');
  
  const success = context.user_name === testUserName && context.user_email === testUserEmail;
  
  if (success) {
    console.log('🎉 SUCESSO! Contexto funcionando corretamente');
    console.log('✅ Nome capturado corretamente');
    console.log('✅ E-mail capturado corretamente');
  } else {
    console.log('❌ FALHA! Contexto não funcionando');
    console.log(`   Esperado: ${testUserName} / ${testUserEmail}`);
    console.log(`   Recebido: ${context.user_name} / ${context.user_email}`);
  }
  
  // Limpar contexto de teste
  await sql`SELECT clear_user_context()`;
  
  if (success) {
    console.log('\n🚀 SISTEMA CORRIGIDO!');
    console.log('💡 Agora o histórico deve mostrar nome E e-mail do usuário');
    console.log('🧪 Teste editando um produto no admin panel');
  } else {
    console.log('\n❌ SISTEMA AINDA COM PROBLEMA');
    console.log('💡 Pode ser um problema de permissões ou configuração do PostgreSQL');
  }
  
} catch (error) {
  console.error('❌ Erro no debug:', error);
} finally {
  await sql.end();
} 