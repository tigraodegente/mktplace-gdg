-- ============================================
-- CORRIGIR CAMPOS DA TRIGGER DE HISTÓRICO
-- ============================================

-- Recriar função com campos que existem realmente na tabela products
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
    
    -- Comparar OLD e NEW para detectar mudanças (apenas campos que existem)
    FOR field_name IN 
        SELECT unnest(ARRAY['name', 'slug', 'sku', 'description', 'short_description', 
                            'price', 'original_price', 'cost', 'quantity', 'model', 'barcode', 
                            'condition', 'weight', 'height', 'width', 'length', 'brand_id', 
                            'seller_id', 'is_active', 'featured', 'has_free_shipping', 
                            'track_inventory', 'allow_backorder', 'delivery_days_min', 'delivery_days_max',
                            'attributes', 'specifications', 'tags', 'meta_title', 'meta_description', 
                            'meta_keywords', 'stock_location', 'brand', 'is_digital', 'delivery_days',
                            'seller_state', 'seller_city', 'currency', 'status'])
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

-- Atualizar função de tradução para incluir campos corretos
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
        WHEN 'brand_id' THEN 'ID da Marca'
        WHEN 'brand' THEN 'Marca'
        WHEN 'seller_id' THEN 'ID do Vendedor'
        WHEN 'is_active' THEN 'Status Ativo'
        WHEN 'featured' THEN 'Produto em Destaque'
        WHEN 'has_free_shipping' THEN 'Frete Grátis'
        WHEN 'track_inventory' THEN 'Controlar Estoque'
        WHEN 'allow_backorder' THEN 'Permitir Pré-venda'
        WHEN 'delivery_days_min' THEN 'Dias de Entrega (Mín)'
        WHEN 'delivery_days_max' THEN 'Dias de Entrega (Máx)'
        WHEN 'delivery_days' THEN 'Dias de Entrega'
        WHEN 'attributes' THEN 'Atributos para Filtros'
        WHEN 'specifications' THEN 'Especificações Técnicas'
        WHEN 'tags' THEN 'Tags'
        WHEN 'meta_title' THEN 'Meta Título'
        WHEN 'meta_description' THEN 'Meta Descrição'
        WHEN 'meta_keywords' THEN 'Meta Palavras-chave'
        WHEN 'stock_location' THEN 'Localização no Estoque'
        WHEN 'is_digital' THEN 'Produto Digital'
        WHEN 'seller_state' THEN 'Estado do Vendedor'
        WHEN 'seller_city' THEN 'Cidade do Vendedor'
        WHEN 'currency' THEN 'Moeda'
        WHEN 'status' THEN 'Status'
        ELSE INITCAP(REPLACE(field_name, '_', ' '))
    END;
END;
$$ LANGUAGE plpgsql; 