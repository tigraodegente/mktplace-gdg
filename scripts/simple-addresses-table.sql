-- Script SQL simplificado para criar tabela addresses
DROP TABLE IF EXISTS addresses;

CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  street VARCHAR(255) NOT NULL,
  number VARCHAR(50) NOT NULL,
  complement VARCHAR(255),
  neighborhood VARCHAR(255) NOT NULL,
  city VARCHAR(255) NOT NULL,
  state VARCHAR(2) NOT NULL,
  zip_code VARCHAR(10) NOT NULL,
  label VARCHAR(50),
  type VARCHAR(20) NOT NULL DEFAULT 'shipping',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Criar índices
CREATE INDEX idx_addresses_user_id ON addresses(user_id);
CREATE INDEX idx_addresses_type ON addresses(type);
CREATE INDEX idx_addresses_is_default ON addresses(is_default);

-- Inserir alguns dados de exemplo para teste
INSERT INTO addresses (user_id, name, street, number, neighborhood, city, state, zip_code, label, is_default) VALUES 
('00000000-0000-0000-0000-000000000001', 'João Silva', 'Rua das Flores', '123', 'Centro', 'São Paulo', 'SP', '01000-000', 'Casa', true),
('00000000-0000-0000-0000-000000000001', 'João Silva', 'Av. Paulista', '1000', 'Bela Vista', 'São Paulo', 'SP', '01310-000', 'Trabalho', false); 