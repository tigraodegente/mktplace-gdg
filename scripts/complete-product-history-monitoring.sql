-- ============================================
-- MONITORAMENTO COMPLETO DE PRODUTOS
-- Captura TODOS os campos relevantes
-- ============================================

-- Atualizar função para monitorar TODOS os campos
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
    
    -- ✅ TODOS OS CAMPOS MONITORADOS (exceto campos automáticos como updated_at)
    FOR field_name IN 
        SELECT unnest(ARRAY[
            -- Campos básicos
            'name', 'slug', 'sku', 'description', 'short_description', 'brand', 'model',
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
            'has_free_shipping', 'delivery_days', 'delivery_days_min', 'delivery_days_max', 'requires_shipping',
            -- SEO e marketing
            'meta_title', 'meta_description', 'meta_keywords', 'tags',
            -- Dados estruturados
            'attributes', 'specifications', 'videos',
            -- Localização do vendedor
            'seller_state', 'seller_city',
            -- Publicação e datas
            'published_at',
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
            -- Métricas (importantes para auditoria)
            'view_count', 'sales_count', 'rating_average', 'rating_count'
        ])
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
            IF field_name IN ('name', 'price', 'sku', 'quantity', 'is_active', 'status', 'published_at') THEN
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

-- Atualizar tradução com TODOS os campos
CREATE OR REPLACE FUNCTION translate_field_name(field_name TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN CASE field_name
        -- Campos básicos
        WHEN 'name' THEN 'Nome'
        WHEN 'slug' THEN 'Slug'
        WHEN 'sku' THEN 'SKU'
        WHEN 'description' THEN 'Descrição'
        WHEN 'short_description' THEN 'Descrição Curta'
        WHEN 'brand' THEN 'Marca'
        WHEN 'model' THEN 'Modelo'
        
        -- Preços e custos
        WHEN 'price' THEN 'Preço'
        WHEN 'original_price' THEN 'Preço Original'
        WHEN 'cost' THEN 'Custo'
        WHEN 'currency' THEN 'Moeda'
        
        -- Estoque
        WHEN 'quantity' THEN 'Quantidade'
        WHEN 'stock_location' THEN 'Localização no Estoque'
        WHEN 'track_inventory' THEN 'Controlar Estoque'
        WHEN 'allow_backorder' THEN 'Permitir Pré-venda'
        WHEN 'low_stock_alert' THEN 'Alerta de Estoque Baixo'
        
        -- Dimensões
        WHEN 'weight' THEN 'Peso'
        WHEN 'height' THEN 'Altura'
        WHEN 'width' THEN 'Largura'
        WHEN 'length' THEN 'Comprimento'
        
        -- Status
        WHEN 'status' THEN 'Status'
        WHEN 'is_active' THEN 'Status Ativo'
        WHEN 'featured' THEN 'Produto em Destaque'
        WHEN 'condition' THEN 'Condição'
        WHEN 'is_digital' THEN 'Produto Digital'
        
        -- Relacionamentos
        WHEN 'brand_id' THEN 'ID da Marca'
        WHEN 'seller_id' THEN 'ID do Vendedor'
        
        -- Entrega
        WHEN 'has_free_shipping' THEN 'Frete Grátis'
        WHEN 'delivery_days' THEN 'Dias de Entrega'
        WHEN 'delivery_days_min' THEN 'Dias de Entrega (Mín)'
        WHEN 'delivery_days_max' THEN 'Dias de Entrega (Máx)'
        WHEN 'requires_shipping' THEN 'Requer Envio'
        
        -- SEO
        WHEN 'meta_title' THEN 'Meta Título'
        WHEN 'meta_description' THEN 'Meta Descrição'
        WHEN 'meta_keywords' THEN 'Meta Palavras-chave'
        WHEN 'tags' THEN 'Tags'
        
        -- Dados estruturados
        WHEN 'attributes' THEN 'Atributos para Filtros'
        WHEN 'specifications' THEN 'Especificações Técnicas'
        WHEN 'videos' THEN 'Vídeos do Produto'
        
        -- Localização
        WHEN 'seller_state' THEN 'Estado do Vendedor'
        WHEN 'seller_city' THEN 'Cidade do Vendedor'
        
        -- Datas
        WHEN 'published_at' THEN 'Data de Publicação'
        
        -- Códigos
        WHEN 'barcode' THEN 'Código de Barras'
        WHEN 'ncm_code' THEN 'Código NCM'
        WHEN 'gtin' THEN 'Código GTIN'
        WHEN 'origin' THEN 'Origem'
        
        -- Configurações
        WHEN 'allow_reviews' THEN 'Permitir Avaliações'
        WHEN 'age_restricted' THEN 'Restrito por Idade'
        WHEN 'is_customizable' THEN 'Produto Customizável'
        
        -- Internacional
        WHEN 'manufacturing_country' THEN 'País de Fabricação'
        
        -- Fiscal
        WHEN 'tax_class' THEN 'Classe de Imposto'
        
        -- Documentação
        WHEN 'care_instructions' THEN 'Instruções de Cuidado'
        WHEN 'manual_link' THEN 'Link do Manual'
        WHEN 'internal_notes' THEN 'Notas Internas'
        
        -- Métricas
        WHEN 'view_count' THEN 'Visualizações'
        WHEN 'sales_count' THEN 'Vendas'
        WHEN 'rating_average' THEN 'Avaliação Média'
        WHEN 'rating_count' THEN 'Total de Avaliações'
        
        ELSE INITCAP(REPLACE(field_name, '_', ' '))
    END;
END;
$$ LANGUAGE plpgsql;

-- ✅ EXECUTAR PARA ATIVAR O MONITORAMENTO COMPLETO
SELECT 'Sistema de monitoramento completo ativado! Todos os campos serão capturados.' as status; 