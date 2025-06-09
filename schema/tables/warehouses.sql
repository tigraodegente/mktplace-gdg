-- Tabela de Armazéns (Warehouses)
-- Utilizada para gerenciar múltiplos armazéns e centros de distribuição

CREATE TABLE IF NOT EXISTS warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL DEFAULT 'main' CHECK (type IN ('main', 'branch', 'distribution', 'storage')),
    
    -- Endereço
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(10),
    country VARCHAR(5) DEFAULT 'BR',
    postal_code VARCHAR(20),
    
    -- Contato
    phone VARCHAR(20),
    email VARCHAR(255),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_warehouses_code ON warehouses(code);
CREATE INDEX IF NOT EXISTS idx_warehouses_type ON warehouses(type);
CREATE INDEX IF NOT EXISTS idx_warehouses_city ON warehouses(city);
CREATE INDEX IF NOT EXISTS idx_warehouses_is_active ON warehouses(is_active);
CREATE INDEX IF NOT EXISTS idx_warehouses_is_default ON warehouses(is_default);

-- Garantir que apenas um armazém seja padrão
CREATE UNIQUE INDEX IF NOT EXISTS idx_warehouses_single_default 
ON warehouses(is_default) WHERE is_default = true;

-- Comentários
COMMENT ON TABLE warehouses IS 'Armazéns e centros de distribuição';
COMMENT ON COLUMN warehouses.code IS 'Código único do armazém';
COMMENT ON COLUMN warehouses.type IS 'Tipo: main (principal), branch (filial), distribution (distribuição), storage (armazenagem)';
COMMENT ON COLUMN warehouses.is_default IS 'Armazém padrão/principal do sistema';

-- Inserir armazém padrão se não existir
INSERT INTO warehouses (name, code, type, city, state, is_active, is_default)
SELECT 'Armazém Principal', 'MAIN', 'main', 'São Paulo', 'SP', true, true
WHERE NOT EXISTS (SELECT 1 FROM warehouses WHERE is_default = true); 