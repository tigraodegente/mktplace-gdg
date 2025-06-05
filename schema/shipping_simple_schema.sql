-- Schema simplificado para sistema de frete
-- Sem dependencies que ainda não existem

-- Dropar tabelas que vamos recriar
DROP TABLE IF EXISTS shipping_base_rates CASCADE;
DROP TABLE IF EXISTS shipments CASCADE;
DROP TABLE IF EXISTS shipping_quotes CASCADE;
DROP TABLE IF EXISTS shipping_carriers CASCADE;
DROP TABLE IF EXISTS shipping_zones CASCADE;

-- 1. SHIPPING_CARRIERS (Transportadoras)
CREATE TABLE shipping_carriers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    cnpj VARCHAR(18) UNIQUE,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    api_integration BOOLEAN DEFAULT false,
    api_url TEXT,
    api_key VARCHAR(255),
    coverage_type VARCHAR(50) DEFAULT 'regional',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. SHIPPING_ZONES (Zonas de Frete)
CREATE TABLE shipping_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    states TEXT[],
    cep_ranges TEXT[],
    region VARCHAR(50),
    coverage_percentage INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. SHIPPING_BASE_RATES (Tarifas Base) - SEM foreign keys por enquanto
CREATE TABLE shipping_base_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID,
    carrier_id UUID,
    shipping_method_id UUID,
    min_weight DECIMAL(10,3) DEFAULT 0,
    max_weight DECIMAL(10,3) DEFAULT 30,
    base_price DECIMAL(10,2) NOT NULL,
    price_per_kg DECIMAL(10,2) DEFAULT 0,
    min_delivery_days INTEGER DEFAULT 1,
    max_delivery_days INTEGER DEFAULT 7,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. SHIPMENTS (Envios/Remessas) - SEM foreign keys por enquanto
CREATE TABLE shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_code VARCHAR(50) UNIQUE NOT NULL,
    order_id UUID,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(20),
    shipping_method_id UUID,
    carrier_id UUID,
    
    origin_address TEXT,
    origin_city VARCHAR(100),
    origin_state VARCHAR(2),
    origin_cep VARCHAR(10),
    
    destination_address TEXT NOT NULL,
    destination_city VARCHAR(100) NOT NULL,
    destination_state VARCHAR(2) NOT NULL,
    destination_cep VARCHAR(10) NOT NULL,
    
    weight DECIMAL(10,3),
    dimensions_length DECIMAL(10,2),
    dimensions_width DECIMAL(10,2), 
    dimensions_height DECIMAL(10,2),
    declared_value DECIMAL(10,2),
    
    status VARCHAR(50) DEFAULT 'pending',
    shipped_at TIMESTAMP,
    estimated_delivery TIMESTAMP,
    delivered_at TIMESTAMP,
    
    shipping_cost DECIMAL(10,2),
    insurance_cost DECIMAL(10,2) DEFAULT 0,
    total_cost DECIMAL(10,2),
    
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. SHIPPING_QUOTES (Cotações de Frete) - SEM foreign keys por enquanto
CREATE TABLE shipping_quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_code VARCHAR(50) UNIQUE,
    
    customer_email VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255),
    customer_phone VARCHAR(20),
    
    origin_cep VARCHAR(10) NOT NULL,
    origin_city VARCHAR(100),
    origin_state VARCHAR(2),
    destination_cep VARCHAR(10) NOT NULL,
    destination_city VARCHAR(100),
    destination_state VARCHAR(2),
    
    total_weight DECIMAL(10,3) NOT NULL,
    total_value DECIMAL(10,2),
    package_count INTEGER DEFAULT 1,
    dimensions_info JSONB,
    
    quoted_methods JSONB,
    best_price DECIMAL(10,2),
    best_method_id UUID,
    selected_method_id UUID,
    
    status VARCHAR(50) DEFAULT 'pending',
    expires_at TIMESTAMP,
    quoted_at TIMESTAMP,
    selected_at TIMESTAMP,
    
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ÍNDICES básicos
CREATE INDEX idx_shipping_carriers_active ON shipping_carriers(is_active) WHERE is_active = true;
CREATE INDEX idx_shipping_zones_active ON shipping_zones(is_active) WHERE is_active = true;
CREATE INDEX idx_shipping_base_rates_zone ON shipping_base_rates(zone_id);
CREATE INDEX idx_shipping_base_rates_carrier ON shipping_base_rates(carrier_id);
CREATE INDEX idx_shipments_tracking ON shipments(tracking_code);
CREATE INDEX idx_shipments_status ON shipments(status);
CREATE INDEX idx_shipping_quotes_email ON shipping_quotes(customer_email);
CREATE INDEX idx_shipping_quotes_status ON shipping_quotes(status);

-- TRIGGER função (só se não existir)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $func$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $func$ language 'plpgsql';
    END IF;
END $$;

-- TRIGGERS para UPDATED_AT
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

-- DADOS INICIAIS
INSERT INTO shipping_carriers (name, description, cnpj, contact_email, contact_phone, api_integration, coverage_type, is_active) VALUES
('Correios', 'Empresa Brasileira de Correios e Telégrafos', '34028316000103', 'atendimento@correios.com.br', '(11) 3003-0100', true, 'national', true),
('Jadlog', 'Jadlog Logística S.A.', '04884082000119', 'contato@jadlog.com.br', '(11) 4002-7733', true, 'national', true),
('Total Express', 'Total Express Logística', '17155730000164', 'comercial@totalexpress.com.br', '(11) 3003-4455', false, 'regional', true),
('Loggi', 'Loggi Tecnologia Ltda', '18188182000176', 'suporte@loggi.com', '(11) 3090-1030', true, 'metropolitan', true),
('Azul Cargo Express', 'Azul Cargo Express', '09296295000160', 'atendimento@azulcargo.com.br', '(11) 4003-8000', false, 'national', false);

INSERT INTO shipping_zones (name, description, states, region, is_active) VALUES
('Sudeste', 'Estados do Sudeste - SP, RJ, MG, ES', ARRAY['SP', 'RJ', 'MG', 'ES'], 'sudeste', true),
('Sul', 'Estados do Sul - RS, SC, PR', ARRAY['RS', 'SC', 'PR'], 'sul', true),
('Nordeste', 'Estados do Nordeste', ARRAY['BA', 'PE', 'CE', 'MA', 'PI', 'RN', 'PB', 'SE', 'AL'], 'nordeste', true),
('Norte', 'Estados do Norte', ARRAY['AM', 'PA', 'AC', 'RO', 'RR', 'AP', 'TO'], 'norte', true),
('Centro-Oeste', 'Estados do Centro-Oeste', ARRAY['GO', 'MT', 'MS', 'DF'], 'centro_oeste', true);

-- DADOS DE EXEMPLO para shipping_base_rates (usando IDs das transportadoras e zonas criadas)
INSERT INTO shipping_base_rates (zone_id, carrier_id, base_price, price_per_kg, min_delivery_days, max_delivery_days, is_active)
SELECT 
    z.id as zone_id,
    c.id as carrier_id,
    15.90 as base_price,
    2.50 as price_per_kg,
    2 as min_delivery_days,
    5 as max_delivery_days,
    true as is_active
FROM shipping_zones z, shipping_carriers c 
WHERE z.name = 'Sudeste' AND c.name = 'Correios'
LIMIT 1;

-- DADOS DE EXEMPLO para shipments
INSERT INTO shipments (tracking_code, customer_name, destination_address, destination_city, destination_state, destination_cep, status, is_active)
VALUES 
('BR123456789BR', 'João Silva', 'Rua das Flores, 123', 'São Paulo', 'SP', '01234567', 'shipped', true),
('BR987654321BR', 'Maria Santos', 'Av. Paulista, 1000', 'São Paulo', 'SP', '01310100', 'delivered', true);

-- DADOS DE EXEMPLO para shipping_quotes
INSERT INTO shipping_quotes (quote_code, customer_email, customer_name, origin_cep, destination_cep, total_weight, status, is_active)
VALUES 
('COT2024001', 'joao@exemplo.com', 'João Silva', '01000000', '04000000', 2.5, 'quoted', true),
('COT2024002', 'maria@exemplo.com', 'Maria Santos', '01000000', '20000000', 5.0, 'selected', true);

SELECT 'Schema simplificado de frete executado com sucesso!' as status; 