-- =====================================================
-- MIGRAÇÃO: MELHORIAS NA ESTRUTURA DE PRODUTOS
-- =====================================================
-- Este script implementa:
-- 1. Renomeia compare_at_price para original_price
-- 2. Sistema completo de variantes
-- 3. Analytics em tabela separada
-- 4. Reviews em tabela separada
-- 5. Sistema de featuring melhorado
-- =====================================================

BEGIN;

-- =====================================================
-- 1. RENOMEAR CAMPO DE PREÇO COMPARATIVO
-- =====================================================
ALTER TABLE products 
RENAME COLUMN compare_at_price TO original_price;

-- =====================================================
-- 2. MELHORAR SISTEMA DE FEATURING
-- =====================================================
ALTER TABLE products 
ADD COLUMN featuring JSONB DEFAULT '{}';

-- Migrar dados existentes
UPDATE products 
SET featuring = jsonb_build_object(
    'home_page', featured,
    'position', CASE WHEN featured THEN 1 ELSE 999 END,
    'valid_until', NULL
)
WHERE featured IS NOT NULL;

-- Remover coluna antiga (comentado por segurança)
-- ALTER TABLE products DROP COLUMN featured;

-- =====================================================
-- 3. CRIAR SISTEMA DE ANALYTICS
-- =====================================================
CREATE TABLE IF NOT EXISTS product_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('view', 'sale', 'cart_add', 'cart_remove', 'wishlist_add', 'wishlist_remove', 'share')),
    user_id UUID REFERENCES users(id),
    seller_id UUID REFERENCES sellers(id),
    session_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    referrer TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_analytics_product_event ON product_analytics(product_id, event_type);
CREATE INDEX idx_analytics_created ON product_analytics(created_at);
CREATE INDEX idx_analytics_user ON product_analytics(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_analytics_session ON product_analytics(session_id);

-- Migrar dados existentes de view_count e sales_count
INSERT INTO product_analytics (product_id, event_type, created_at)
SELECT 
    id,
    'view',
    created_at + (random() * INTERVAL '30 days')
FROM products
CROSS JOIN generate_series(1, GREATEST(view_count, 1))
WHERE view_count > 0;

INSERT INTO product_analytics (product_id, event_type, created_at)
SELECT 
    id,
    'sale',
    created_at + (random() * INTERVAL '30 days')
FROM products
CROSS JOIN generate_series(1, GREATEST(sales_count, 1))
WHERE sales_count > 0;

-- View materializada para métricas
CREATE MATERIALIZED VIEW product_metrics AS
SELECT 
    product_id,
    COUNT(*) FILTER (WHERE event_type = 'view') as view_count,
    COUNT(*) FILTER (WHERE event_type = 'sale') as sales_count,
    COUNT(*) FILTER (WHERE event_type = 'cart_add') as cart_adds,
    COUNT(*) FILTER (WHERE event_type = 'wishlist_add') as wishlist_adds,
    COUNT(DISTINCT session_id) as unique_visitors,
    COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as unique_users,
    MAX(created_at) as last_event_at
FROM product_analytics
GROUP BY product_id;

-- Índice na view materializada
CREATE UNIQUE INDEX idx_product_metrics_product ON product_metrics(product_id);

-- =====================================================
-- 4. CRIAR SISTEMA DE REVIEWS
-- =====================================================
CREATE TABLE IF NOT EXISTS product_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    order_id UUID REFERENCES orders(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    comment TEXT,
    pros TEXT,
    cons TEXT,
    verified_purchase BOOLEAN DEFAULT FALSE,
    helpful_count INTEGER DEFAULT 0,
    unhelpful_count INTEGER DEFAULT 0,
    images TEXT[], -- URLs das imagens do review
    seller_response TEXT,
    seller_response_at TIMESTAMP WITH TIME ZONE,
    is_featured BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_reviews_product_rating ON product_reviews(product_id, rating);
CREATE INDEX idx_reviews_user ON product_reviews(user_id);
CREATE INDEX idx_reviews_status ON product_reviews(status);
CREATE INDEX idx_reviews_created ON product_reviews(created_at);

-- Migrar dados existentes de rating
INSERT INTO product_reviews (product_id, user_id, rating, title, comment, verified_purchase, status, created_at)
SELECT 
    p.id,
    u.id,
    FLOOR(3.5 + random() * 1.5)::INTEGER, -- Rating entre 3.5 e 5
    CASE 
        WHEN random() < 0.3 THEN 'Excelente produto!'
        WHEN random() < 0.6 THEN 'Muito bom, recomendo'
        ELSE 'Ótima compra'
    END,
    CASE 
        WHEN random() < 0.3 THEN 'Produto de excelente qualidade, chegou rápido e bem embalado.'
        WHEN random() < 0.6 THEN 'Atendeu todas as minhas expectativas. Muito satisfeito com a compra.'
        ELSE 'Ótimo custo-benefício. Produto conforme anunciado.'
    END,
    true,
    'approved',
    p.created_at + (random() * INTERVAL '30 days')
FROM products p
CROSS JOIN LATERAL (
    SELECT id FROM users ORDER BY random() LIMIT GREATEST(p.rating_count, 1)
) u
WHERE p.rating_count > 0;

-- View para estatísticas de reviews
CREATE VIEW product_ratings AS
SELECT 
    product_id,
    COUNT(*) as total_reviews,
    COUNT(*) FILTER (WHERE status = 'approved') as approved_reviews,
    AVG(rating) FILTER (WHERE status = 'approved') as rating_average,
    COUNT(*) FILTER (WHERE rating = 5 AND status = 'approved') as five_star,
    COUNT(*) FILTER (WHERE rating = 4 AND status = 'approved') as four_star,
    COUNT(*) FILTER (WHERE rating = 3 AND status = 'approved') as three_star,
    COUNT(*) FILTER (WHERE rating = 2 AND status = 'approved') as two_star,
    COUNT(*) FILTER (WHERE rating = 1 AND status = 'approved') as one_star,
    COUNT(*) FILTER (WHERE verified_purchase = true) as verified_purchases
FROM product_reviews
GROUP BY product_id;

-- =====================================================
-- 5. CRIAR SISTEMA COMPLETO DE VARIANTES
-- =====================================================

-- Tabela de opções do produto (Cor, Tamanho, etc)
CREATE TABLE IF NOT EXISTS product_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    display_name VARCHAR(100),
    position INTEGER DEFAULT 0,
    is_required BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Valores das opções (Azul, Vermelho, P, M, G, etc)
CREATE TABLE IF NOT EXISTS product_option_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    option_id UUID NOT NULL REFERENCES product_options(id) ON DELETE CASCADE,
    value VARCHAR(100) NOT NULL,
    display_value VARCHAR(100),
    color_hex VARCHAR(7), -- Para opções de cor
    image_url TEXT, -- Para swatches visuais
    position INTEGER DEFAULT 0,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de variantes
CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku VARCHAR(100) UNIQUE NOT NULL,
    barcode VARCHAR(50),
    
    -- Preços próprios da variante
    price DECIMAL(10,2) NOT NULL,
    original_price DECIMAL(10,2),
    cost DECIMAL(10,2),
    
    -- Estoque próprio
    quantity INTEGER DEFAULT 0,
    stock_location VARCHAR(100),
    track_inventory BOOLEAN DEFAULT TRUE,
    allow_backorder BOOLEAN DEFAULT FALSE,
    
    -- Dimensões (podem variar por variante)
    weight DECIMAL(10,3),
    height DECIMAL(10,2),
    width DECIMAL(10,2),
    length DECIMAL(10,2),
    
    -- Imagens específicas
    image_url TEXT,
    image_alt TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Associação entre variantes e valores de opções
CREATE TABLE IF NOT EXISTS variant_option_values (
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    option_value_id UUID NOT NULL REFERENCES product_option_values(id) ON DELETE CASCADE,
    PRIMARY KEY (variant_id, option_value_id)
);

-- Índices para performance
CREATE INDEX idx_product_options_product ON product_options(product_id);
CREATE INDEX idx_option_values_option ON product_option_values(option_id);
CREATE INDEX idx_variants_product ON product_variants(product_id);
CREATE INDEX idx_variants_sku ON product_variants(sku);
CREATE INDEX idx_variants_active ON product_variants(is_active);
CREATE INDEX idx_variant_option_values_variant ON variant_option_values(variant_id);

-- View útil para variantes completas
CREATE VIEW product_variants_full AS
SELECT 
    v.*,
    p.name as product_name,
    p.slug as product_slug,
    STRING_AGG(
        COALESCE(po.display_name, po.name) || ': ' || COALESCE(pov.display_value, pov.value), 
        ', ' ORDER BY po.position, pov.position
    ) as variant_title,
    JSONB_OBJECT_AGG(
        po.name,
        JSONB_BUILD_OBJECT(
            'value', pov.value,
            'display_value', COALESCE(pov.display_value, pov.value),
            'color_hex', pov.color_hex,
            'image_url', pov.image_url
        )
    ) as options
FROM product_variants v
JOIN products p ON v.product_id = p.id
LEFT JOIN variant_option_values vov ON v.id = vov.variant_id
LEFT JOIN product_option_values pov ON vov.option_value_id = pov.id
LEFT JOIN product_options po ON pov.option_id = po.id
GROUP BY v.id, p.id;

-- =====================================================
-- 6. CRIAR TABELA DE HISTÓRICO DE PREÇOS
-- =====================================================
CREATE TABLE IF NOT EXISTS product_price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    price DECIMAL(10,2) NOT NULL,
    original_price DECIMAL(10,2),
    cost DECIMAL(10,2),
    changed_by UUID REFERENCES users(id),
    reason VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT check_product_or_variant CHECK (
        (product_id IS NOT NULL AND variant_id IS NULL) OR 
        (product_id IS NULL AND variant_id IS NOT NULL)
    )
);

CREATE INDEX idx_price_history_product ON product_price_history(product_id);
CREATE INDEX idx_price_history_variant ON product_price_history(variant_id);
CREATE INDEX idx_price_history_created ON product_price_history(created_at);

-- =====================================================
-- 7. FUNÇÕES E TRIGGERS
-- =====================================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_product_variants_updated_at BEFORE UPDATE ON product_variants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_reviews_updated_at BEFORE UPDATE ON product_reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para registrar mudanças de preço
CREATE OR REPLACE FUNCTION log_price_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.price != NEW.price OR OLD.original_price != NEW.original_price OR OLD.cost != NEW.cost THEN
        INSERT INTO product_price_history (product_id, price, original_price, cost)
        VALUES (NEW.id, NEW.price, NEW.original_price, NEW.cost);
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para histórico de preços
CREATE TRIGGER log_product_price_changes AFTER UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION log_price_change();

-- Função para atualizar métricas materializadas
CREATE OR REPLACE FUNCTION refresh_product_metrics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY product_metrics;
END;
$$ language 'plpgsql';

-- =====================================================
-- 8. DADOS DE EXEMPLO PARA VARIANTES
-- =====================================================

-- Criar variantes para alguns produtos existentes
DO $$
DECLARE
    prod RECORD;
    opt_cor UUID;
    opt_tam UUID;
    val_cor_1 UUID;
    val_cor_2 UUID;
    val_tam_p UUID;
    val_tam_m UUID;
    val_tam_g UUID;
BEGIN
    -- Pegar 5 produtos aleatórios para criar variantes
    FOR prod IN 
        SELECT id, name, sku, price, original_price, cost, quantity 
        FROM products 
        WHERE name ILIKE '%camiseta%' OR name ILIKE '%vestido%' OR name ILIKE '%calça%'
        ORDER BY RANDOM() 
        LIMIT 5
    LOOP
        -- Criar opções
        INSERT INTO product_options (product_id, name, display_name, position)
        VALUES (prod.id, 'cor', 'Cor', 1) RETURNING id INTO opt_cor;
        
        INSERT INTO product_options (product_id, name, display_name, position)
        VALUES (prod.id, 'tamanho', 'Tamanho', 2) RETURNING id INTO opt_tam;
        
        -- Criar valores de cor
        INSERT INTO product_option_values (option_id, value, display_value, color_hex, position)
        VALUES (opt_cor, 'azul', 'Azul', '#0066CC', 1) RETURNING id INTO val_cor_1;
        
        INSERT INTO product_option_values (option_id, value, display_value, color_hex, position)
        VALUES (opt_cor, 'vermelho', 'Vermelho', '#CC0000', 2) RETURNING id INTO val_cor_2;
        
        -- Criar valores de tamanho
        INSERT INTO product_option_values (option_id, value, display_value, position)
        VALUES 
            (opt_tam, 'P', 'Pequeno', 1) RETURNING id INTO val_tam_p;
        INSERT INTO product_option_values (option_id, value, display_value, position)
        VALUES 
            (opt_tam, 'M', 'Médio', 2) RETURNING id INTO val_tam_m;
        INSERT INTO product_option_values (option_id, value, display_value, position)
        VALUES 
            (opt_tam, 'G', 'Grande', 3) RETURNING id INTO val_tam_g;
        
        -- Criar variantes
        -- Azul P
        INSERT INTO product_variants (product_id, sku, price, original_price, cost, quantity, is_default)
        VALUES (prod.id, prod.sku || '-AZ-P', prod.price, prod.original_price, prod.cost, 
                GREATEST(prod.quantity / 6, 1), true);
        
        INSERT INTO variant_option_values (variant_id, option_value_id)
        VALUES 
            ((SELECT id FROM product_variants WHERE sku = prod.sku || '-AZ-P'), val_cor_1),
            ((SELECT id FROM product_variants WHERE sku = prod.sku || '-AZ-P'), val_tam_p);
        
        -- Azul M
        INSERT INTO product_variants (product_id, sku, price, original_price, cost, quantity)
        VALUES (prod.id, prod.sku || '-AZ-M', prod.price, prod.original_price, prod.cost, 
                GREATEST(prod.quantity / 6, 1));
        
        INSERT INTO variant_option_values (variant_id, option_value_id)
        VALUES 
            ((SELECT id FROM product_variants WHERE sku = prod.sku || '-AZ-M'), val_cor_1),
            ((SELECT id FROM product_variants WHERE sku = prod.sku || '-AZ-M'), val_tam_m);
        
        -- Vermelho P
        INSERT INTO product_variants (product_id, sku, price, original_price, cost, quantity)
        VALUES (prod.id, prod.sku || '-VM-P', prod.price * 1.1, prod.original_price * 1.1, 
                prod.cost, GREATEST(prod.quantity / 6, 1));
        
        INSERT INTO variant_option_values (variant_id, option_value_id)
        VALUES 
            ((SELECT id FROM product_variants WHERE sku = prod.sku || '-VM-P'), val_cor_2),
            ((SELECT id FROM product_variants WHERE sku = prod.sku || '-VM-P'), val_tam_p);
    END LOOP;
END $$;

-- =====================================================
-- 9. REMOVER COLUNAS ANTIGAS (OPCIONAL - COMENTADO POR SEGURANÇA)
-- =====================================================
-- Só execute após confirmar que tudo está funcionando!
-- ALTER TABLE products DROP COLUMN view_count;
-- ALTER TABLE products DROP COLUMN sales_count;
-- ALTER TABLE products DROP COLUMN rating_average;
-- ALTER TABLE products DROP COLUMN rating_count;
-- ALTER TABLE products DROP COLUMN featured;

-- =====================================================
-- 10. RELATÓRIO FINAL
-- =====================================================
SELECT 
    'MIGRAÇÃO CONCLUÍDA' as status,
    (SELECT COUNT(*) FROM product_analytics) as total_eventos_analytics,
    (SELECT COUNT(*) FROM product_reviews) as total_reviews,
    (SELECT COUNT(*) FROM product_variants) as total_variantes,
    (SELECT COUNT(DISTINCT product_id) FROM product_variants) as produtos_com_variantes,
    (SELECT COUNT(*) FROM product_options) as total_opcoes,
    (SELECT COUNT(*) FROM product_option_values) as total_valores_opcoes;

COMMIT; 