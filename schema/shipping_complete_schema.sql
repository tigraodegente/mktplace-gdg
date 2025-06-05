-- Schema completo para sistema de frete
-- Conectar todas as APIs ao banco PostgreSQL/Xata.io

-- 1. SHIPPING_CARRIERS (Transportadoras)
CREATE TABLE IF NOT EXISTS shipping_carriers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    cnpj VARCHAR(18) UNIQUE,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    api_integration BOOLEAN DEFAULT false,
    api_url TEXT,
    api_key VARCHAR(255),
    coverage_type VARCHAR(50) DEFAULT 'regional', -- 'national', 'regional', 'metropolitan', 'local'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. SHIPPING_ZONES (Zonas de Frete)
CREATE TABLE IF NOT EXISTS shipping_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    states TEXT[], -- Array de estados: ['SP', 'RJ', 'MG']
    cep_ranges TEXT[], -- Array de faixas: ['01000000-19999999', '20000000-28999999']
    region VARCHAR(50), -- 'norte', 'nordeste', 'centro_oeste', 'sudeste', 'sul'
    coverage_percentage INTEGER DEFAULT 100, -- Percentual de cobertura da zona
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. SHIPPING_BASE_RATES (Tarifas Base)
CREATE TABLE IF NOT EXISTS shipping_base_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID REFERENCES shipping_zones(id) ON DELETE CASCADE,
    carrier_id UUID REFERENCES shipping_carriers(id) ON DELETE CASCADE,
    shipping_method_id UUID REFERENCES shipping_methods(id) ON DELETE CASCADE,
    min_weight DECIMAL(10,3) DEFAULT 0, -- Peso mínimo em kg
    max_weight DECIMAL(10,3) DEFAULT 30, -- Peso máximo em kg
    base_price DECIMAL(10,2) NOT NULL, -- Preço base fixo
    price_per_kg DECIMAL(10,2) DEFAULT 0, -- Preço por kg adicional
    min_delivery_days INTEGER DEFAULT 1,
    max_delivery_days INTEGER DEFAULT 7,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0, -- Para ordenação
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Índices únicos para evitar duplicatas
    UNIQUE(zone_id, carrier_id, shipping_method_id, min_weight, max_weight)
);

-- 4. SHIPMENTS (Envios/Remessas)
CREATE TABLE IF NOT EXISTS shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_code VARCHAR(50) UNIQUE NOT NULL,
    order_id UUID, -- Pode referenciar orders se existir
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(20),
    shipping_method_id UUID REFERENCES shipping_methods(id),
    carrier_id UUID REFERENCES shipping_carriers(id),
    
    -- Endereço de origem
    origin_address TEXT,
    origin_city VARCHAR(100),
    origin_state VARCHAR(2),
    origin_cep VARCHAR(10),
    
    -- Endereço de destino
    destination_address TEXT NOT NULL,
    destination_city VARCHAR(100) NOT NULL,
    destination_state VARCHAR(2) NOT NULL,
    destination_cep VARCHAR(10) NOT NULL,
    
    -- Dados do envio
    weight DECIMAL(10,3),
    dimensions_length DECIMAL(10,2),
    dimensions_width DECIMAL(10,2), 
    dimensions_height DECIMAL(10,2),
    declared_value DECIMAL(10,2),
    
    -- Status e datas
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'shipped', 'in_transit', 'delivered', 'failed', 'cancelled'
    shipped_at TIMESTAMP,
    estimated_delivery TIMESTAMP,
    delivered_at TIMESTAMP,
    
    -- Custos
    shipping_cost DECIMAL(10,2),
    insurance_cost DECIMAL(10,2) DEFAULT 0,
    total_cost DECIMAL(10,2),
    
    -- Metadados
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. SHIPPING_QUOTES (Cotações de Frete)
CREATE TABLE IF NOT EXISTS shipping_quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_code VARCHAR(50) UNIQUE, -- Código único da cotação
    
    -- Dados do solicitante
    customer_email VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255),
    customer_phone VARCHAR(20),
    
    -- Origem e destino
    origin_cep VARCHAR(10) NOT NULL,
    origin_city VARCHAR(100),
    origin_state VARCHAR(2),
    destination_cep VARCHAR(10) NOT NULL,
    destination_city VARCHAR(100),
    destination_state VARCHAR(2),
    
    -- Dados da carga
    total_weight DECIMAL(10,3) NOT NULL,
    total_value DECIMAL(10,2),
    package_count INTEGER DEFAULT 1,
    dimensions_info JSONB, -- Dimensões dos pacotes em JSON
    
    -- Cotação
    quoted_methods JSONB, -- Array com todas as opções cotadas
    best_price DECIMAL(10,2), -- Menor preço encontrado
    best_method_id UUID REFERENCES shipping_methods(id),
    selected_method_id UUID REFERENCES shipping_methods(id),
    
    -- Status e validade
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'quoted', 'selected', 'expired', 'cancelled'
    expires_at TIMESTAMP, -- Data de expiração da cotação
    quoted_at TIMESTAMP,
    selected_at TIMESTAMP,
    
    -- Metadados
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_shipping_carriers_active ON shipping_carriers(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_shipping_carriers_cnpj ON shipping_carriers(cnpj) WHERE cnpj IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shipping_zones_active ON shipping_zones(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_shipping_zones_region ON shipping_zones(region);

CREATE INDEX IF NOT EXISTS idx_shipping_base_rates_zone ON shipping_base_rates(zone_id);
CREATE INDEX IF NOT EXISTS idx_shipping_base_rates_carrier ON shipping_base_rates(carrier_id);
CREATE INDEX IF NOT EXISTS idx_shipping_base_rates_method ON shipping_base_rates(shipping_method_id);
CREATE INDEX IF NOT EXISTS idx_shipping_base_rates_active ON shipping_base_rates(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_shipments_tracking ON shipments(tracking_code);
CREATE INDEX IF NOT EXISTS idx_shipments_order ON shipments(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_customer_email ON shipments(customer_email);
CREATE INDEX IF NOT EXISTS idx_shipments_shipped_at ON shipments(shipped_at) WHERE shipped_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shipping_quotes_email ON shipping_quotes(customer_email);
CREATE INDEX IF NOT EXISTS idx_shipping_quotes_status ON shipping_quotes(status);
CREATE INDEX IF NOT EXISTS idx_shipping_quotes_expires ON shipping_quotes(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shipping_quotes_ceps ON shipping_quotes(origin_cep, destination_cep);

-- TRIGGERS PARA UPDATED_AT
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_shipping_carriers_updated_at BEFORE UPDATE ON shipping_carriers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shipping_zones_updated_at BEFORE UPDATE ON shipping_zones  
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shipping_base_rates_updated_at BEFORE UPDATE ON shipping_base_rates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shipments_updated_at BEFORE UPDATE ON shipments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shipping_quotes_updated_at BEFORE UPDATE ON shipping_quotes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- DADOS INICIAIS PARA TRANSPORTADORAS
INSERT INTO shipping_carriers (name, description, cnpj, contact_email, contact_phone, api_integration, coverage_type, is_active) VALUES
('Correios', 'Empresa Brasileira de Correios e Telégrafos', '34028316000103', 'atendimento@correios.com.br', '(11) 3003-0100', true, 'national', true),
('Jadlog', 'Jadlog Logística S.A.', '04884082000119', 'contato@jadlog.com.br', '(11) 4002-7733', true, 'national', true),
('Total Express', 'Total Express Logística', '17155730000164', 'comercial@totalexpress.com.br', '(11) 3003-4455', false, 'regional', true),
('Loggi', 'Loggi Tecnologia Ltda', '18188182000176', 'suporte@loggi.com', '(11) 3090-1030', true, 'metropolitan', true),
('Azul Cargo Express', 'Azul Cargo Express', '09296295000160', 'atendimento@azulcargo.com.br', '(11) 4003-8000', false, 'national', false)
ON CONFLICT (cnpj) DO NOTHING;

-- DADOS INICIAIS PARA ZONAS
INSERT INTO shipping_zones (name, description, states, region, is_active) VALUES
('Sudeste', 'Estados do Sudeste - SP, RJ, MG, ES', ARRAY['SP', 'RJ', 'MG', 'ES'], 'sudeste', true),
('Sul', 'Estados do Sul - RS, SC, PR', ARRAY['RS', 'SC', 'PR'], 'sul', true),
('Nordeste', 'Estados do Nordeste', ARRAY['BA', 'PE', 'CE', 'MA', 'PI', 'RN', 'PB', 'SE', 'AL'], 'nordeste', true),
('Norte', 'Estados do Norte', ARRAY['AM', 'PA', 'AC', 'RO', 'RR', 'AP', 'TO'], 'norte', true),
('Centro-Oeste', 'Estados do Centro-Oeste', ARRAY['GO', 'MT', 'MS', 'DF'], 'centro_oeste', true);

-- COMENTÁRIOS PARA DOCUMENTAÇÃO
COMMENT ON TABLE shipping_carriers IS 'Transportadoras/operadores logísticos';
COMMENT ON TABLE shipping_zones IS 'Zonas de frete organizadas por região/estado';
COMMENT ON TABLE shipping_base_rates IS 'Tarifas base por zona, transportadora e método';
COMMENT ON TABLE shipments IS 'Envios/remessas com rastreamento';
COMMENT ON TABLE shipping_quotes IS 'Cotações de frete solicitadas por clientes';

-- VIEWS ÚTEIS
CREATE OR REPLACE VIEW active_shipping_overview AS
SELECT 
    'carriers' as entity,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE is_active = true) as active,
    COUNT(*) FILTER (WHERE is_active = false) as inactive
FROM shipping_carriers
UNION ALL
SELECT 
    'zones' as entity,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE is_active = true) as active,
    COUNT(*) FILTER (WHERE is_active = false) as inactive
FROM shipping_zones
UNION ALL  
SELECT 
    'methods' as entity,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE is_active = true) as active,
    COUNT(*) FILTER (WHERE is_active = false) as inactive
FROM shipping_methods
UNION ALL
SELECT 
    'rates' as entity,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE is_active = true) as active,
    COUNT(*) FILTER (WHERE is_active = false) as inactive
FROM shipping_base_rates;

-- Status do schema
SELECT 'Schema de frete completo criado com sucesso!' as status; 