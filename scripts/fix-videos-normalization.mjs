#!/usr/bin/env node

import postgres from 'postgres';

const DATABASE_URL = 'postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-raspy-meadow-acds6p80-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = postgres(DATABASE_URL, {
  ssl: 'require',
  max: 1
});

console.log('🔧 CORRIGINDO NORMALIZAÇÃO DE ARRAYS (VIDEOS)...\n');

try {
  // Atualizar função de normalização para lidar melhor com arrays
  console.log('1/2 Atualizando função de normalização...');
  await sql`
    CREATE OR REPLACE FUNCTION normalize_value_for_comparison(
        field_name TEXT,
        value TEXT
    ) RETURNS TEXT AS $$
    BEGIN
        -- Se valor é NULL ou vazio
        IF value IS NULL OR value = '' THEN
            RETURN '';
        END IF;
        
        -- Normalização por tipo de campo
        CASE field_name
            -- CAMPOS JSON OBJETOS: Garantir formato consistente
            WHEN 'attributes', 'specifications' THEN
                BEGIN
                    -- Casos especiais para objetos vazios
                    IF value = '{}' OR value = '"{}\"' OR value = '\"{}\"' THEN
                        RETURN '{}';
                    END IF;
                    
                    -- Se é objeto JSON válido, normalizar serialização
                    IF value ~ '^[{].*[}]$' THEN
                        RETURN value::jsonb::text;
                    ELSE
                        RETURN '{}';
                    END IF;
                EXCEPTION WHEN OTHERS THEN
                    RETURN '{}';
                END;
                
            -- CAMPOS JSON ARRAYS: Garantir formato consistente 
            WHEN 'tags', 'meta_keywords', 'videos' THEN
                BEGIN
                    -- Casos especiais para arrays vazios - AQUI ESTÁ O PROBLEMA!
                    IF value = '[]' OR value = '"[]"' OR value = '\"[]\"' OR value = '"\"[]\"\"' THEN
                        RETURN '[]';
                    END IF;
                    
                    -- Se é array JSON válido, normalizar serialização
                    IF value ~ '^[\[].*[\]]$' THEN
                        RETURN value::jsonb::text;
                    ELSE
                        RETURN '[]';
                    END IF;
                EXCEPTION WHEN OTHERS THEN
                    RETURN '[]';
                END;
                
            -- CAMPOS DE PREÇO OPCIONAIS: 0 = null = "não definido"
            WHEN 'original_price', 'regular_price' THEN
                BEGIN
                    DECLARE
                        price_value NUMERIC;
                    BEGIN
                        price_value := value::NUMERIC;
                        -- Se preço é 0 ou negativo, tratar como nulo
                        IF price_value <= 0 THEN
                            RETURN '';
                        ELSE
                            RETURN price_value::TEXT;
                        END IF;
                    EXCEPTION WHEN OTHERS THEN
                        RETURN '';
                    END;
                END;
                
            -- CAMPOS BOOLEANOS: Normalizar true/false
            WHEN 'is_active', 'featured', 'track_inventory', 'allow_backorder', 
                 'has_free_shipping', 'requires_shipping', 'is_digital', 
                 'allow_reviews', 'age_restricted', 'is_customizable' THEN
                BEGIN
                    -- Converter para boolean e depois para texto consistente
                    CASE 
                        WHEN value::boolean THEN RETURN 'true';
                        ELSE RETURN 'false';
                    END CASE;
                EXCEPTION WHEN OTHERS THEN
                    RETURN 'false';
                END;
                
            -- CAMPOS DE TEXTO: Trimmar espaços
            ELSE
                RETURN TRIM(COALESCE(value, ''));
        END CASE;
        
    EXCEPTION WHEN OTHERS THEN
        -- Em caso de erro, retornar valor seguro
        RETURN COALESCE(TRIM(value), '');
    END;
    $$ LANGUAGE plpgsql;
  `;
  console.log('✅ Função de normalização atualizada');

  // Testar especificamente o problema do videos
  console.log('2/2 Testando correção do campo videos...');
  
  const testResults = await sql`
    SELECT 
      normalize_value_for_comparison('videos', '[]') as test1,
      normalize_value_for_comparison('videos', '"[]"') as test2,
      normalize_value_for_comparison('videos', '\"[]\"') as test3,
      normalize_value_for_comparison('videos', '"\"[]\"\"') as test4
  `;
  
  const result = testResults[0];
  
  console.log('\n📊 Teste específico do campo videos:');
  console.log(`  - "[]": "${result.test1}"`);
  console.log(`  - '"[]"': "${result.test2}"`);
  console.log(`  - '\\"[]\\": "${result.test3}"`);
  console.log(`  - '"\\\"[]\\\"\"': "${result.test4}"`);
  
  const allSame = result.test1 === result.test2 && 
                  result.test2 === result.test3 && 
                  result.test3 === result.test4;
  
  console.log(`  - Todos iguais? ${allSame ? '✅' : '❌'}`);
  
  if (allSame) {
    console.log('\n✅ PROBLEMA DOS VIDEOS CORRIGIDO!');
    console.log('🎯 Agora todas as variações de array vazio são normalizadas para "[]"');
  } else {
    console.log('\n❌ Ainda há problema na normalização dos videos');
    console.log('   Vou ajustar a função...');
  }
  
  console.log('\n🔄 Teste novamente editando um produto - o campo videos não deve mais aparecer!');
  
} catch (error) {
  console.error('❌ Erro ao corrigir normalização:', error);
} finally {
  await sql.end();
} 