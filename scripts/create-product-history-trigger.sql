-- ============================================
-- TRIGGER AUTOMÁTICA PARA HISTÓRICO DE PRODUTOS
-- ============================================

-- 1. Extensão para trabalhar com JSONB
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Função para capturar usuário atual (via context)
CREATE OR REPLACE FUNCTION get_current_user_info()
RETURNS TABLE(user_id UUID, user_name TEXT, user_email TEXT) AS $$
BEGIN
    -- Tentar obter do contexto da sessão
    BEGIN
        RETURN QUERY
        SELECT 
            COALESCE(current_setting('app.current_user_id', true)::UUID, NULL) as user_id,
            COALESCE(current_setting('app.current_user_name', true), 'Sistema') as user_name,
            COALESCE(current_setting('app.current_user_email', true), 'system@marketplace.com') as user_email;
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

-- 3. Função para traduzir nomes de campos para português
CREATE OR REPLACE FUNCTION translate_field_name(field_name TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN CASE field_name
        WHEN 'name' THEN 'Nome'
        WHEN 'slug' THEN 'Slug'
        WHEN 'sku' THEN 'SKU'
        WHEN 'description' THEN 'Descrição'
        WHEN 'short_description' THEN 'Descrição Curta'
        WHEN 'price' THEN 'Preço'
        WHEN 'original_price' THEN 'Preço Original'
        WHEN 'cost' THEN 'Custo'
        WHEN 'quantity' THEN 'Quantidade'
        WHEN 'model' THEN 'Modelo'
        WHEN 'barcode' THEN 'Código de Barras'
        WHEN 'condition' THEN 'Condição'
        WHEN 'weight' THEN 'Peso'
        WHEN 'height' THEN 'Altura'
        WHEN 'width' THEN 'Largura'
        WHEN 'length' THEN 'Comprimento'
        WHEN 'brand_id' THEN 'Marca'
        WHEN 'category_id' THEN 'Categoria'
        WHEN 'seller_id' THEN 'Vendedor'
        WHEN 'is_active' THEN 'Status Ativo'
        WHEN 'featured' THEN 'Produto em Destaque'
        WHEN 'has_free_shipping' THEN 'Frete Grátis'
        WHEN 'track_inventory' THEN 'Controlar Estoque'
        WHEN 'allow_backorder' THEN 'Permitir Pré-venda'
        WHEN 'delivery_days_min' THEN 'Dias de Entrega (Mín)'
        WHEN 'delivery_days_max' THEN 'Dias de Entrega (Máx)'
        WHEN 'attributes' THEN 'Atributos para Filtros'
        WHEN 'specifications' THEN 'Especificações Técnicas'
        WHEN 'tags' THEN 'Tags'
        WHEN 'meta_title' THEN 'Meta Título'
        WHEN 'meta_description' THEN 'Meta Descrição'
        WHEN 'meta_keywords' THEN 'Meta Palavras-chave'
        WHEN 'stock_location' THEN 'Localização no Estoque'
        WHEN 'origin_country' THEN 'País de Origem'
        WHEN 'video_url' THEN 'URL do Vídeo'
        WHEN 'warranty_period' THEN 'Período de Garantia'
        WHEN 'warranty_description' THEN 'Descrição da Garantia'
        WHEN 'min_purchase_quantity' THEN 'Quantidade Mínima de Compra'
        WHEN 'max_purchase_quantity' THEN 'Quantidade Máxima de Compra'
        WHEN 'status' THEN 'Status'
        ELSE INITCAP(REPLACE(field_name, '_', ' '))
    END;
END;
$$ LANGUAGE plpgsql;

-- 4. Função para formatar valores
CREATE OR REPLACE FUNCTION format_field_value(field_name TEXT, value TEXT)
RETURNS TEXT AS $$
BEGIN
    IF value IS NULL OR value = '' THEN
        RETURN '(vazio)';
    END IF;
    
    CASE field_name
        WHEN 'price', 'original_price', 'cost' THEN
            RETURN 'R$ ' || REPLACE(value, '"', '');
        WHEN 'quantity' THEN
            RETURN value || ' unidades';
        WHEN 'weight' THEN
            RETURN value || ' kg';
        WHEN 'height', 'width', 'length' THEN
            RETURN value || ' cm';
        WHEN 'is_active', 'featured', 'has_free_shipping', 'track_inventory', 'allow_backorder' THEN
            RETURN CASE WHEN value::boolean THEN 'Sim' ELSE 'Não' END;
        WHEN 'delivery_days_min', 'delivery_days_max' THEN
            RETURN value || ' dias';
        ELSE
            RETURN REPLACE(value, '"', '');
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- 5. Função principal para registrar alterações
CREATE OR REPLACE FUNCTION log_product_changes()
RETURNS TRIGGER AS $$
DECLARE
    user_info RECORD;
    changes JSONB := '{}';
    field_name TEXT;
    old_value TEXT;
    new_value TEXT;
    change_count INTEGER := 0;
    summary_text TEXT;
    priority_changes TEXT[] := ARRAY[]::TEXT[];
    other_changes TEXT[] := ARRAY[]::TEXT[];
    field_label TEXT;
BEGIN
    -- Obter informações do usuário
    SELECT * INTO user_info FROM get_current_user_info();
    
    -- Comparar OLD e NEW para detectar mudanças
    FOR field_name IN 
        SELECT unnest(ARRAY['name', 'slug', 'sku', 'description', 'short_description', 
                            'price', 'original_price', 'cost', 'quantity', 'model', 'barcode', 
                            'condition', 'weight', 'height', 'width', 'length', 'brand_id', 
                            'category_id', 'seller_id', 'is_active', 'featured', 'has_free_shipping', 
                            'track_inventory', 'allow_backorder', 'delivery_days_min', 'delivery_days_max',
                            'attributes', 'specifications', 'tags', 'meta_title', 'meta_description', 
                            'meta_keywords', 'stock_location', 'origin_country', 'video_url', 
                            'warranty_period', 'warranty_description', 'min_purchase_quantity', 
                            'max_purchase_quantity', 'status'])
    LOOP
        -- Obter valores antigo e novo
        EXECUTE format('SELECT ($1).%I::TEXT', field_name) INTO old_value USING OLD;
        EXECUTE format('SELECT ($1).%I::TEXT', field_name) INTO new_value USING NEW;
        
        -- Normalizar valores nulos
        old_value := COALESCE(old_value, '');
        new_value := COALESCE(new_value, '');
        
        -- Verificar se houve mudança
        IF old_value != new_value THEN
            field_label := translate_field_name(field_name);
            
            -- Adicionar à lista de mudanças
            changes := changes || jsonb_build_object(
                field_name, jsonb_build_object(
                    'old', old_value,
                    'new', new_value,
                    'label', field_label,
                    'formatted_old', format_field_value(field_name, old_value),
                    'formatted_new', format_field_value(field_name, new_value)
                )
            );
            
            change_count := change_count + 1;
            
            -- Classificar mudanças por prioridade
            IF field_name IN ('name', 'price', 'sku', 'quantity', 'is_active') THEN
                priority_changes := priority_changes || field_label;
            ELSE
                other_changes := other_changes || field_label;
            END IF;
        END IF;
    END LOOP;
    
    -- Gerar resumo inteligente
    IF change_count = 0 THEN
        RETURN NEW; -- Nenhuma mudança detectada
    ELSIF change_count = 1 THEN
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

-- 6. Criar trigger para produtos
DROP TRIGGER IF EXISTS trigger_product_history ON products;
CREATE TRIGGER trigger_product_history
    AFTER UPDATE ON products
    FOR EACH ROW
    WHEN (OLD.* IS DISTINCT FROM NEW.*)
    EXECUTE FUNCTION log_product_changes();

-- 7. Função para registrar criação de produto
CREATE OR REPLACE FUNCTION log_product_creation()
RETURNS TRIGGER AS $$
DECLARE
    user_info RECORD;
BEGIN
    -- Obter informações do usuário
    SELECT * INTO user_info FROM get_current_user_info();
    
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
        'created',
        '{}',
        'Produto criado',
        NOW()
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Trigger para criação de produtos
DROP TRIGGER IF EXISTS trigger_product_creation ON products;
CREATE TRIGGER trigger_product_creation
    AFTER INSERT ON products
    FOR EACH ROW
    EXECUTE FUNCTION log_product_creation();

-- 9. Função para definir contexto do usuário (para uso nas APIs)
CREATE OR REPLACE FUNCTION set_user_context(
    p_user_id UUID,
    p_user_name TEXT,
    p_user_email TEXT
) RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_user_id', p_user_id::TEXT, true);
    PERFORM set_config('app.current_user_name', p_user_name, true);
    PERFORM set_config('app.current_user_email', p_user_email, true);
END;
$$ LANGUAGE plpgsql;

-- 10. Função para limpar contexto do usuário
CREATE OR REPLACE FUNCTION clear_user_context() RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_user_id', '', true);
    PERFORM set_config('app.current_user_name', '', true);
    PERFORM set_config('app.current_user_email', '', true);
END;
$$ LANGUAGE plpgsql;

-- 11. Testar se as funções estão funcionando
DO $$
BEGIN
    -- Teste básico
    PERFORM set_user_context(
        'f47ac10b-58cc-4372-a567-0e02b2c3d479'::UUID,
        'Usuário Teste',
        'teste@exemplo.com'
    );
    
    RAISE NOTICE 'Trigger de histórico de produtos criada com sucesso!';
    RAISE NOTICE 'Use set_user_context() antes de fazer alterações para registrar o usuário correto.';
    
    PERFORM clear_user_context();
END $$; 