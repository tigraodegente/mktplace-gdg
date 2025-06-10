-- ================================
-- SISTEMA DE HISTÓRICO DE PRODUTOS
-- Marketplace GDG - Setup Completo
-- ================================

-- 1. Criar tabela de histórico de produtos
CREATE TABLE IF NOT EXISTS product_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL,
    user_id UUID,
    user_name VARCHAR(255),
    user_email VARCHAR(255),
    action VARCHAR(50) NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'published', 'unpublished', 'duplicated')),
    changes JSONB NOT NULL DEFAULT '{}',
    summary TEXT NOT NULL DEFAULT '',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar índices para alta performance
CREATE INDEX IF NOT EXISTS idx_product_history_product_id ON product_history(product_id);
CREATE INDEX IF NOT EXISTS idx_product_history_created_at ON product_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_history_action ON product_history(action);
CREATE INDEX IF NOT EXISTS idx_product_history_user_id ON product_history(user_id);
CREATE INDEX IF NOT EXISTS idx_product_history_composite ON product_history(product_id, created_at DESC);

-- 3. Adicionar foreign keys (se as tabelas existirem)
DO $$
BEGIN
    -- Verificar se tabela products existe antes de criar FK
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
        ALTER TABLE product_history 
        ADD CONSTRAINT fk_product_history_product_id 
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
    END IF;
    
    -- Verificar se tabela users existe antes de criar FK
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        ALTER TABLE product_history 
        ADD CONSTRAINT fk_product_history_user_id 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN 
        NULL; -- Ignorar se as constraints já existem
END $$;

-- 4. Comentários para documentação
COMMENT ON TABLE product_history IS 'Histórico completo de alterações dos produtos com rastreamento avançado';
COMMENT ON COLUMN product_history.product_id IS 'ID do produto alterado';
COMMENT ON COLUMN product_history.user_id IS 'ID do usuário que fez a alteração';
COMMENT ON COLUMN product_history.user_name IS 'Nome do usuário (cache para performance)';
COMMENT ON COLUMN product_history.user_email IS 'Email do usuário (cache para performance)';
COMMENT ON COLUMN product_history.action IS 'Tipo de ação: created, updated, deleted, published, unpublished, duplicated';
COMMENT ON COLUMN product_history.changes IS 'Detalhes das alterações em formato JSON com before/after';
COMMENT ON COLUMN product_history.summary IS 'Resumo legível das alterações para timeline';
COMMENT ON COLUMN product_history.ip_address IS 'IP de origem da alteração';
COMMENT ON COLUMN product_history.user_agent IS 'User agent do navegador';
COMMENT ON COLUMN product_history.created_at IS 'Data e hora exata da alteração';

-- 5. Função para auto-gerar resumo de alterações
CREATE OR REPLACE FUNCTION generate_change_summary(
    p_action VARCHAR(50),
    p_changes JSONB
) RETURNS TEXT AS $$
DECLARE
    summary_text TEXT;
    changed_fields TEXT[];
    field_name TEXT;
    field_display TEXT;
BEGIN
    -- Ações simples
    CASE p_action
        WHEN 'created' THEN RETURN 'Produto criado';
        WHEN 'deleted' THEN RETURN 'Produto excluído';
        WHEN 'published' THEN RETURN 'Produto publicado';
        WHEN 'unpublished' THEN RETURN 'Produto despublicado';
        WHEN 'duplicated' THEN RETURN 'Produto duplicado';
    END CASE;
    
    -- Para updates, analisar campos alterados
    IF p_action = 'updated' THEN
        SELECT array_agg(
            CASE key
                WHEN 'name' THEN 'Nome'
                WHEN 'sku' THEN 'SKU'
                WHEN 'price' THEN 'Preço'
                WHEN 'original_price' THEN 'Preço original'
                WHEN 'cost' THEN 'Custo'
                WHEN 'description' THEN 'Descrição'
                WHEN 'short_description' THEN 'Descrição curta'
                WHEN 'quantity' THEN 'Estoque'
                WHEN 'is_active' THEN 'Status'
                WHEN 'featured' THEN 'Destaque'
                WHEN 'category_id' THEN 'Categoria'
                WHEN 'brand_id' THEN 'Marca'
                WHEN 'tags' THEN 'Tags'
                WHEN 'weight' THEN 'Peso'
                WHEN 'height' THEN 'Altura'
                WHEN 'width' THEN 'Largura'
                WHEN 'length' THEN 'Comprimento'
                WHEN 'meta_title' THEN 'Título SEO'
                WHEN 'meta_description' THEN 'Descrição SEO'
                WHEN 'meta_keywords' THEN 'Palavras-chave'
                WHEN 'attributes' THEN 'Atributos'
                WHEN 'specifications' THEN 'Especificações'
                WHEN 'images' THEN 'Imagens'
                ELSE initcap(replace(key, '_', ' '))
            END
        ) INTO changed_fields
        FROM jsonb_each(p_changes);
        
        IF array_length(changed_fields, 1) = 1 THEN
            RETURN changed_fields[1] || ' alterado';
        ELSIF array_length(changed_fields, 1) = 2 THEN
            RETURN changed_fields[1] || ' e ' || changed_fields[2] || ' alterados';
        ELSIF array_length(changed_fields, 1) <= 5 THEN
            RETURN array_to_string(changed_fields[1:array_length(changed_fields,1)-1], ', ') || 
                   ' e ' || changed_fields[array_length(changed_fields,1)] || ' alterados';
        ELSE
            RETURN array_length(changed_fields, 1)::TEXT || ' campos alterados';
        END IF;
    END IF;
    
    RETURN 'Alteração registrada';
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger para auto-gerar summary se não fornecido
CREATE OR REPLACE FUNCTION trigger_generate_summary() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.summary = '' OR NEW.summary IS NULL THEN
        NEW.summary := generate_change_summary(NEW.action, NEW.changes);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_product_history_summary
    BEFORE INSERT ON product_history
    FOR EACH ROW
    EXECUTE FUNCTION trigger_generate_summary();

-- 7. View para consultas otimizadas
CREATE OR REPLACE VIEW v_product_history_detailed AS
SELECT 
    ph.*,
    p.name as product_name,
    p.sku as product_sku,
    CASE 
        WHEN ph.user_name IS NOT NULL THEN ph.user_name
        WHEN u.name IS NOT NULL THEN u.name
        ELSE 'Sistema'
    END as display_user_name,
    CASE 
        WHEN ph.user_email IS NOT NULL THEN ph.user_email
        WHEN u.email IS NOT NULL THEN u.email
        ELSE 'system@marketplace.com'
    END as display_user_email
FROM product_history ph
LEFT JOIN products p ON p.id = ph.product_id
LEFT JOIN users u ON u.id = ph.user_id;

-- 8. Função para inserir histórico facilmente
CREATE OR REPLACE FUNCTION log_product_change(
    p_product_id UUID,
    p_user_id UUID DEFAULT NULL,
    p_user_name VARCHAR DEFAULT NULL,
    p_user_email VARCHAR DEFAULT NULL,
    p_action VARCHAR DEFAULT 'updated',
    p_changes JSONB DEFAULT '{}',
    p_summary TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    new_id UUID;
BEGIN
    INSERT INTO product_history (
        product_id, user_id, user_name, user_email, action, 
        changes, summary, ip_address, user_agent
    ) VALUES (
        p_product_id, p_user_id, p_user_name, p_user_email, p_action,
        p_changes, COALESCE(p_summary, ''), p_ip_address, p_user_agent
    ) RETURNING id INTO new_id;
    
    RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- 9. Inserir alguns registros de exemplo para produtos existentes
INSERT INTO product_history (product_id, user_name, action, changes, summary)
SELECT 
    p.id,
    'Sistema',
    'created',
    jsonb_build_object('initial', jsonb_build_object('old', null, 'new', 'produto criado automaticamente')),
    'Produto criado no sistema'
FROM products p 
WHERE NOT EXISTS (
    SELECT 1 FROM product_history ph WHERE ph.product_id = p.id
)
LIMIT 10;

-- 10. Mensagem de sucesso
DO $$
BEGIN
    RAISE NOTICE '✅ Sistema de Histórico de Produtos configurado com sucesso!';
    RAISE NOTICE '📊 Funcionalidades incluídas:';
    RAISE NOTICE '   • Tabela product_history com índices otimizados';
    RAISE NOTICE '   • Função de auto-geração de resumo';
    RAISE NOTICE '   • Trigger automático para summary';
    RAISE NOTICE '   • View otimizada para consultas';
    RAISE NOTICE '   • Função helper para logging';
    RAISE NOTICE '   • Registros de exemplo criados';
    RAISE NOTICE '🚀 Pronto para usar!';
END $$; 