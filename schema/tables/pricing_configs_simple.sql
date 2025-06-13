-- Tabela de configurações dinâmicas de pricing (versão simplificada)
-- Remove foreign key constraints para evitar problemas

CREATE TABLE IF NOT EXISTS pricing_configs (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL,
    config_value JSONB NOT NULL,
    
    -- Scoping para aplicar regras específicas (sem foreign keys)
    category_id INTEGER NULL,
    seller_id VARCHAR(255) NULL,
    user_segment VARCHAR(50) NULL, -- 'premium', 'standard', 'new'
    
    -- Validade temporal
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE NULL,
    
    -- Controle
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0, -- Para resolver conflitos (maior = prioridade)
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255) NULL,
    updated_by VARCHAR(255) NULL,
    
    -- Índices compostos para performance
    CONSTRAINT unique_config_scope UNIQUE (config_key, category_id, seller_id, user_segment)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_pricing_configs_key_active ON pricing_configs(config_key, is_active);
CREATE INDEX IF NOT EXISTS idx_pricing_configs_category ON pricing_configs(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pricing_configs_seller ON pricing_configs(seller_id) WHERE seller_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pricing_configs_validity ON pricing_configs(valid_from, valid_until);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_pricing_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_pricing_configs_updated_at
    BEFORE UPDATE ON pricing_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_pricing_configs_updated_at();

-- Seeds com valores iniciais (valores atuais do sistema)
INSERT INTO pricing_configs (config_key, config_value, created_by) VALUES
-- Configurações gerais de PIX
('pix_discount_percent', '5', 'system'),
('pix_enabled', 'true', 'system'),

-- Configurações de parcelamento
('installments_default', '12', 'system'),
('installments_max', '24', 'system'),
('installments_min_value', '20', 'system'),
('installments_interest_free_up_to', '2', 'system'),
('installments_interest_rate_monthly', '2.99', 'system'),

-- Configurações de desconto
('boleto_discount_percent', '3', 'system'),
('debit_discount_percent', '2', 'system'),

-- Configurações de frete
('free_shipping_threshold', '199', 'system'),
('express_shipping_fee', '15', 'system'),

-- Configurações de taxa
('processing_fee_percent', '3.79', 'system'),
('convenience_fee_boleto', '3', 'system'),

-- Configurações promocionais
('black_friday_multiplier', '1.5', 'system'),
('cyber_monday_discount', '10', 'system')

ON CONFLICT (config_key, category_id, seller_id, user_segment) 
DO UPDATE SET 
    config_value = EXCLUDED.config_value,
    updated_at = NOW(),
    updated_by = EXCLUDED.updated_by; 