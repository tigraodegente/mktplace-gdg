-- =====================================================
-- SCHEMA COMPLETO: SHIPPING MODALITIES
-- =====================================================

-- Criar tabela de modalidades de frete
CREATE TABLE IF NOT EXISTS shipping_modalities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price_multiplier DECIMAL(5,3) DEFAULT 1.000 NOT NULL,
    days_multiplier DECIMAL(5,3) DEFAULT 1.000 NOT NULL,
    delivery_days_min INTEGER DEFAULT 3,
    delivery_days_max INTEGER DEFAULT 7,
    min_price DECIMAL(10,2),
    max_price DECIMAL(10,2),
    pricing_type VARCHAR(20) DEFAULT 'per_shipment',
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    priority INTEGER DEFAULT 1,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Inserir modalidades básicas
INSERT INTO shipping_modalities (code, name, description, price_multiplier, days_multiplier, delivery_days_min, delivery_days_max, min_price, max_price, priority) VALUES
('pac', 'PAC', 'Entrega econômica pelos Correios', 0.850, 1.500, 5, 8, 12.90, 25.90, 3),
('sedex', 'SEDEX', 'Entrega padrão pelos Correios', 1.000, 1.000, 2, 4, 18.90, 35.90, 2),
('express', 'SEDEX Express', 'Entrega expressa pelos Correios', 1.400, 0.600, 1, 2, 25.90, 45.90, 1),
('carrier', 'Transportadora', 'Entrega premium por transportadora', 1.200, 0.800, 3, 6, 20.90, 40.90, 4)
ON CONFLICT (code) DO NOTHING;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_shipping_modalities_active ON shipping_modalities(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_shipping_modalities_priority ON shipping_modalities(priority);
CREATE INDEX IF NOT EXISTS idx_shipping_modalities_code ON shipping_modalities(code);

-- Criar trigger para updated_at
CREATE OR REPLACE FUNCTION update_shipping_modalities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_shipping_modalities_updated_at ON shipping_modalities;
CREATE TRIGGER update_shipping_modalities_updated_at
    BEFORE UPDATE ON shipping_modalities
    FOR EACH ROW
    EXECUTE FUNCTION update_shipping_modalities_updated_at();

-- Comentários para documentação
COMMENT ON TABLE shipping_modalities IS 'Modalidades de frete disponíveis (PAC, SEDEX, Express, etc)';
COMMENT ON COLUMN shipping_modalities.code IS 'Código único da modalidade (pac, sedex, express)';
COMMENT ON COLUMN shipping_modalities.price_multiplier IS 'Multiplicador de preço (0.8 = 20% desconto, 1.4 = 40% acréscimo)';
COMMENT ON COLUMN shipping_modalities.days_multiplier IS 'Multiplicador de prazo (0.6 = 40% mais rápido, 1.5 = 50% mais lento)';

-- Dados iniciais de exemplo
INSERT INTO shipping_modalities (code, name, description, price_multiplier, days_multiplier, delivery_days_min, delivery_days_max, min_price, max_price, priority, is_default) VALUES
('pickup', 'Retirada na Loja', 'Retirada gratuita na loja física', 0.000, 0.000, 0, 0, 0.00, 0.00, 5, false)
ON CONFLICT (code) DO NOTHING;

-- Verificar resultado
SELECT 
    'shipping_modalities' as tabela,
    COUNT(*) as total_registros,
    COUNT(*) FILTER (WHERE is_active = true) as ativos,
    MIN(priority) as min_prioridade,
    MAX(priority) as max_prioridade
FROM shipping_modalities; 