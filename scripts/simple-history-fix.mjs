#!/usr/bin/env node

import postgres from 'postgres';

const DATABASE_URL = 'postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-raspy-meadow-acds6p80-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = postgres(DATABASE_URL, {
  ssl: 'require',
  max: 1
});

console.log('🔧 APLICANDO CORREÇÃO SIMPLES DA TRIGGER DE HISTÓRICO...\n');

try {
  // 1. Função para normalizar valores
  console.log('1/4 Criando função de normalização...');
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
            -- CAMPOS JSON: Garantir formato consistente
            WHEN 'attributes', 'specifications' THEN
                BEGIN
                    -- Se é objeto JSON válido, normalizar serialização
                    IF value ~ '^[{[].*[}]]$' THEN
                        RETURN value::jsonb::text;
                    ELSE
                        RETURN '{}';
                    END IF;
                EXCEPTION WHEN OTHERS THEN
                    RETURN '{}';
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
  console.log('✅ Função de normalização criada');

  // 2. Atualizar função principal da trigger
  console.log('2/4 Atualizando função principal da trigger...');
  await sql`
    CREATE OR REPLACE FUNCTION log_product_changes()
    RETURNS TRIGGER AS $$
    DECLARE
        user_info RECORD;
        changes JSONB := '{}';
        field_name TEXT;
        old_value TEXT;
        new_value TEXT;
        normalized_old TEXT;
        normalized_new TEXT;
        change_count INTEGER := 0;
        summary_text TEXT;
        priority_changes TEXT[] := ARRAY[]::TEXT[];
        other_changes TEXT[] := ARRAY[]::TEXT[];
        field_label TEXT;
    BEGIN
        -- Obter informações do usuário
        SELECT * INTO user_info FROM get_current_user_info();
        
        -- TODOS OS CAMPOS MONITORADOS COM NORMALIZAÇÃO
        FOR field_name IN 
            SELECT unnest(ARRAY[
                'name', 'slug', 'sku', 'description', 'short_description', 'model',
                'price', 'original_price', 'cost', 'currency',
                'quantity', 'stock_location', 'track_inventory', 'allow_backorder', 'low_stock_alert',
                'weight', 'height', 'width', 'length',
                'status', 'is_active', 'featured', 'condition', 'is_digital',
                'brand_id', 'seller_id',
                'has_free_shipping', 'delivery_days', 'requires_shipping',
                'meta_title', 'meta_description', 'meta_keywords', 'tags',
                'attributes', 'specifications', 'videos',
                'barcode', 'ncm_code', 'gtin', 'origin',
                'allow_reviews', 'age_restricted', 'is_customizable',
                'manufacturing_country', 'tax_class',
                'care_instructions', 'manual_link', 'internal_notes',
                'published_at'
            ])
        LOOP
            -- Obter valores antigo e novo (RAW)
            EXECUTE format('SELECT ($1).%I::TEXT', field_name) INTO old_value USING OLD;
            EXECUTE format('SELECT ($1).%I::TEXT', field_name) INTO new_value USING NEW;
            
            -- APLICAR NORMALIZAÇÃO ROBUSTA
            normalized_old := normalize_value_for_comparison(field_name, old_value);
            normalized_new := normalize_value_for_comparison(field_name, new_value);
            
            -- Verificar se houve mudança REAL após normalização
            IF normalized_old != normalized_new THEN
                field_label := translate_field_name(field_name);
                
                -- Adicionar à lista de mudanças
                changes := changes || jsonb_build_object(
                    field_name, jsonb_build_object(
                        'old', normalized_old,
                        'new', normalized_new,
                        'label', field_label,
                        'formatted_old', format_field_value(field_name, normalized_old),
                        'formatted_new', format_field_value(field_name, normalized_new)
                    )
                );
                
                change_count := change_count + 1;
                
                -- Classificar mudanças por prioridade
                IF field_name IN ('name', 'price', 'sku', 'quantity', 'is_active', 'status') THEN
                    priority_changes := priority_changes || field_label;
                ELSE
                    other_changes := other_changes || field_label;
                END IF;
            END IF;
        END LOOP;
        
        -- Só registrar histórico se há alterações REAIS
        IF change_count = 0 THEN
            RETURN NEW;
        END IF;
        
        -- Gerar resumo inteligente
        IF change_count = 1 THEN
            summary_text := (priority_changes || other_changes)[1] || ' alterado';
        ELSIF change_count = 2 THEN
            summary_text := array_to_string(priority_changes || other_changes, ' e ') || ' alterados';
        ELSIF change_count <= 3 THEN
            summary_text := array_to_string(priority_changes || other_changes, ', ') || ' alterados';
        ELSE
            -- Para mais de 3 mudanças, priorizar campos importantes
            IF array_length(priority_changes, 1) > 0 THEN
                IF array_length(priority_changes, 1) = 1 THEN
                    summary_text := priority_changes[1] || ' e outros ' || (change_count - 1) || ' campos alterados';
                ELSE
                    summary_text := array_to_string(priority_changes[1:2], ', ') || ' e outros ' || (change_count - 2) || ' campos alterados';
                END IF;
            ELSE
                summary_text := other_changes[1] || ' e outros ' || (change_count - 1) || ' campos alterados';
            END IF;
        END IF;
        
        -- Inserir registro no histórico
        INSERT INTO product_history (
            product_id,
            user_id,
            user_name,
            user_email,
            action,
            changes,
            summary,
            created_at
        ) VALUES (
            NEW.id,
            user_info.user_id,
            user_info.user_name,
            user_info.user_email,
            'updated',
            changes,
            summary_text,
            NOW()
        );
        
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `;
  console.log('✅ Função principal atualizada');

  // 3. Recriar trigger
  console.log('3/4 Recriando trigger...');
  await sql`DROP TRIGGER IF EXISTS trigger_product_history ON products`;
  await sql`
    CREATE TRIGGER trigger_product_history
        AFTER UPDATE ON products
        FOR EACH ROW
        WHEN (OLD.* IS DISTINCT FROM NEW.*)
        EXECUTE FUNCTION log_product_changes();
  `;
  console.log('✅ Trigger recriada');

  // 4. Testar normalização
  console.log('4/4 Testando normalização...');
  
  const testResults = await sql`
    SELECT 
      normalize_value_for_comparison('attributes', '{"Cor": ["Rosa"]}') as test1,
      normalize_value_for_comparison('attributes', '"{\"Cor\":[\"Rosa\"]}"') as test2,
      normalize_value_for_comparison('original_price', '0.00') as test3,
      normalize_value_for_comparison('original_price', '') as test4
  `;
  
  const result = testResults[0];
  
  console.log('\n📊 Teste de normalização:');
  console.log(`  - Attributes objeto: "${result.test1}"`);
  console.log(`  - Attributes string: "${result.test2}"`);
  console.log(`  - Iguais? ${result.test1 === result.test2 ? '✅' : '❌'}`);
  console.log(`  - Original price 0.00: "${result.test3}"`);
  console.log(`  - Original price vazio: "${result.test4}"`);
  console.log(`  - Iguais? ${result.test3 === result.test4 ? '✅' : '❌'}`);
  
  console.log('\n✅ CORREÇÃO APLICADA COM SUCESSO!');
  console.log('🎯 A trigger agora eliminará falsos positivos para:');
  console.log('   ✅ Campos JSON (attributes/specifications)');
  console.log('   ✅ Preços opcionais (0 = null)');
  console.log('   ✅ Campos booleanos');
  console.log('   ✅ Outros tipos de dados');
  
  console.log('\n🔄 Teste agora editando um produto - não devem aparecer mais falsos positivos!');
  
} catch (error) {
  console.error('❌ Erro ao aplicar correção:', error);
} finally {
  await sql.end();
} 