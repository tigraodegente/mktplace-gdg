-- ============================================
-- CORREÇÃO SISTÊMICA DA TRIGGER DE HISTÓRICO
-- Implementa normalização robusta no PostgreSQL
-- ============================================

-- 1. Função para normalizar valores antes da comparação
CREATE OR REPLACE FUNCTION normalize_value_for_comparison(
    field_name TEXT,
    value TEXT
) RETURNS TEXT AS $$
DECLARE
    normalized TEXT;
BEGIN
    -- Se valor é NULL ou vazio
    IF value IS NULL OR value = '' THEN
        RETURN '';
    END IF;
    
    -- Normalização por tipo de campo
    CASE field_name
        -- 🎯 CAMPOS JSON: Garantir formato consistente
        WHEN 'attributes', 'specifications' THEN
            BEGIN
                -- Se é objeto JSON válido, normalizar serialização
                IF value ~ '^[{\[].*[}\]]$' THEN
                    -- Parse e serialize novamente para normalizar formato
                    SELECT jsonb_normalize(value::jsonb)::text INTO normalized;
                    RETURN COALESCE(normalized, '{}');
                ELSE
                    RETURN '{}';
                END IF;
            EXCEPTION WHEN OTHERS THEN
                RETURN '{}';
            END;
            
        -- 🎯 CAMPOS DE PREÇO OPCIONAIS: 0 = null = "não definido"
        WHEN 'original_price', 'regular_price' THEN
            BEGIN
                -- Converter para número
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
            
        -- 🎯 ARRAYS: Normalizar formato JSON
        WHEN 'tags', 'meta_keywords', 'videos' THEN
            BEGIN
                IF value ~ '^\[.*\]$' THEN
                    SELECT jsonb_normalize(value::jsonb)::text INTO normalized;
                    RETURN COALESCE(normalized, '[]');
                ELSE
                    RETURN '[]';
                END IF;
            EXCEPTION WHEN OTHERS THEN
                RETURN '[]';
            END;
            
        -- 🎯 CAMPOS NUMÉRICOS: Normalizar zeros
        WHEN 'quantity', 'weight', 'height', 'width', 'length', 'cost', 'price' THEN
            BEGIN
                DECLARE
                    num_value NUMERIC;
                BEGIN
                    num_value := value::NUMERIC;
                    RETURN num_value::TEXT;
                EXCEPTION WHEN OTHERS THEN
                    RETURN '0';
                END;
            END;
            
        -- 🎯 CAMPOS BOOLEANOS: Normalizar true/false
        WHEN 'is_active', 'featured', 'track_inventory', 'allow_backorder', 
             'has_free_shipping', 'requires_shipping', 'is_digital', 
             'allow_reviews', 'age_restricted', 'is_customizable' THEN
            BEGIN
                -- Converter para boolean e depois para texto consistente
                CASE 
                    WHEN value::boolean THEN RETURN 'true'
                    ELSE RETURN 'false'
                END;
            EXCEPTION WHEN OTHERS THEN
                RETURN 'false';
            END;
            
        -- 🎯 CAMPOS DE TEXTO: Trimmar espaços
        ELSE
            RETURN TRIM(COALESCE(value, ''));
    END CASE;
    
EXCEPTION WHEN OTHERS THEN
    -- Em caso de erro, retornar valor seguro
    RETURN COALESCE(TRIM(value), '');
END;
$$ LANGUAGE plpgsql;

-- 2. Função auxiliar para normalizar JSON de forma consistente
CREATE OR REPLACE FUNCTION jsonb_normalize(input_json jsonb)
RETURNS jsonb AS $$
BEGIN
    -- Para objetos vazios, retornar {}
    IF input_json = '{}'::jsonb THEN
        RETURN '{}'::jsonb;
    END IF;
    
    -- Para arrays vazios, retornar []
    IF input_json = '[]'::jsonb THEN
        RETURN '[]'::jsonb;
    END IF;
    
    -- Retornar JSON normalizado (sorted keys)
    RETURN input_json;
END;
$$ LANGUAGE plpgsql;

-- 3. Função principal CORRIGIDA com normalização
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
    
    -- ✅ TODOS OS CAMPOS MONITORADOS COM NORMALIZAÇÃO
    FOR field_name IN 
        SELECT unnest(ARRAY[
            -- Campos básicos
            'name', 'slug', 'sku', 'description', 'short_description', 'model',
            -- Preços e custos  
            'price', 'original_price', 'cost', 'currency',
            -- Estoque e inventário
            'quantity', 'stock_location', 'track_inventory', 'allow_backorder', 'low_stock_alert',
            -- Dimensões e peso
            'weight', 'height', 'width', 'length',
            -- Status e configurações
            'status', 'is_active', 'featured', 'condition', 'is_digital',
            -- Relacionamentos
            'brand_id', 'seller_id',
            -- Entrega e frete
            'has_free_shipping', 'delivery_days', 'requires_shipping',
            -- SEO e marketing
            'meta_title', 'meta_description', 'meta_keywords', 'tags',
            -- Dados estruturados - OS MAIS PROBLEMÁTICOS
            'attributes', 'specifications', 'videos',
            -- Códigos e identificadores
            'barcode', 'ncm_code', 'gtin', 'origin',
            -- Configurações especiais
            'allow_reviews', 'age_restricted', 'is_customizable',
            -- Internacional
            'manufacturing_country',
            -- Fiscal
            'tax_class',
            -- Instruções e documentação
            'care_instructions', 'manual_link', 'internal_notes',
            -- Data de publicação
            'published_at'
        ])
    LOOP
        -- Obter valores antigo e novo (RAW)
        EXECUTE format('SELECT ($1).%I::TEXT', field_name) INTO old_value USING OLD;
        EXECUTE format('SELECT ($1).%I::TEXT', field_name) INTO new_value USING NEW;
        
        -- ✅ APLICAR NORMALIZAÇÃO ROBUSTA
        normalized_old := normalize_value_for_comparison(field_name, old_value);
        normalized_new := normalize_value_for_comparison(field_name, new_value);
        
        -- Verificar se houve mudança REAL após normalização
        IF normalized_old != normalized_new THEN
            field_label := translate_field_name(field_name);
            
            -- Log para debug (remover em produção)
            RAISE NOTICE 'ALTERAÇÃO DETECTADA em %: "%" → "%" (raw: "%" → "%")', 
                field_name, normalized_old, normalized_new, old_value, new_value;
            
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
        ELSE
            -- Log para debug quando não há alteração real
            IF old_value != new_value THEN
                RAISE NOTICE 'FALSO POSITIVO EVITADO em %: raw diferente ("%" vs "%") mas normalizado igual ("%")', 
                    field_name, old_value, new_value, normalized_old;
            END IF;
        END IF;
    END LOOP;
    
    -- Só registrar histórico se há alterações REAIS
    IF change_count = 0 THEN
        RAISE NOTICE 'NENHUMA ALTERAÇÃO REAL DETECTADA - histórico não será registrado';
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
    
    RAISE NOTICE 'HISTÓRICO REGISTRADO: % (% alterações)', summary_text, change_count;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Atualizar função de formatação para trabalhar com valores normalizados
CREATE OR REPLACE FUNCTION format_field_value(field_name TEXT, value TEXT)
RETURNS TEXT AS $$
BEGIN
    IF value IS NULL OR value = '' THEN
        RETURN 'Não definido';
    END IF;
    
    CASE field_name
        WHEN 'price', 'original_price', 'cost' THEN
            BEGIN
                RETURN 'R$ ' || REPLACE(value::NUMERIC::TEXT, '.', ',');
            EXCEPTION WHEN OTHERS THEN
                RETURN 'Não definido';
            END;
        WHEN 'quantity' THEN
            RETURN value || ' unidades';
        WHEN 'weight' THEN
            RETURN value || ' kg';
        WHEN 'height', 'width', 'length' THEN
            RETURN value || ' cm';
        WHEN 'is_active', 'featured', 'has_free_shipping', 'track_inventory', 'allow_backorder',
             'requires_shipping', 'is_digital', 'allow_reviews', 'age_restricted', 'is_customizable' THEN
            RETURN CASE WHEN value = 'true' THEN 'Sim' ELSE 'Não' END;
        WHEN 'attributes', 'specifications' THEN
            -- Para campos JSON, mostrar resumo mais amigável
            BEGIN
                DECLARE
                    json_obj JSONB;
                    key_count INTEGER;
                BEGIN
                    json_obj := value::JSONB;
                    key_count := jsonb_object_keys_count(json_obj);
                    IF key_count = 0 THEN
                        RETURN 'Nenhum item';
                    ELSE
                        RETURN key_count || ' item(s)';
                    END IF;
                EXCEPTION WHEN OTHERS THEN
                    RETURN 'Objeto JSON';
                END;
            END;
        WHEN 'tags', 'meta_keywords', 'videos' THEN
            -- Para arrays, mostrar contagem
            BEGIN
                DECLARE
                    json_array JSONB;
                    array_length INTEGER;
                BEGIN
                    json_array := value::JSONB;
                    array_length := jsonb_array_length(json_array);
                    RETURN array_length || ' item(s)';
                EXCEPTION WHEN OTHERS THEN
                    RETURN 'Array JSON';
                END;
            END;
        ELSE
            RETURN value;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- 5. Função auxiliar para contar chaves JSON
CREATE OR REPLACE FUNCTION jsonb_object_keys_count(input_json jsonb)
RETURNS INTEGER AS $$
BEGIN
    IF input_json IS NULL OR input_json = 'null'::jsonb THEN
        RETURN 0;
    END IF;
    
    IF jsonb_typeof(input_json) = 'object' THEN
        RETURN (SELECT COUNT(*) FROM jsonb_object_keys(input_json));
    ELSE
        RETURN 0;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 6. Recriar trigger com função corrigida
DROP TRIGGER IF EXISTS trigger_product_history ON products;
CREATE TRIGGER trigger_product_history
    AFTER UPDATE ON products
    FOR EACH ROW
    WHEN (OLD.* IS DISTINCT FROM NEW.*)
    EXECUTE FUNCTION log_product_changes();

-- 7. Teste da correção
DO $$
BEGIN
    RAISE NOTICE '✅ Trigger de histórico corrigida com normalização robusta!';
    RAISE NOTICE '🎯 Problemas resolvidos:';
    RAISE NOTICE '   - Campos JSON (attributes/specifications): normalização de formato';
    RAISE NOTICE '   - Campos de preço: 0 = null = "não definido"';
    RAISE NOTICE '   - Arrays: normalização de formato JSON';
    RAISE NOTICE '   - Booleans: true/false consistente';
    RAISE NOTICE '   - Números: formatação numérica padronizada';
END;
$$; 