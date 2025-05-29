-- Script para adicionar colunas necessárias para os novos filtros
-- Execute este script no banco de dados PostgreSQL

-- 1. Adicionar coluna de condição do produto (novo/usado/recondicionado)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS condition VARCHAR(20) DEFAULT 'new' 
CHECK (condition IN ('new', 'used', 'refurbished'));

-- 2. Adicionar coluna de tempo de entrega em dias
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS delivery_days INTEGER DEFAULT 3;

-- 3. Adicionar colunas de localização do vendedor
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS seller_state VARCHAR(2);

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS seller_city VARCHAR(100);

-- 4. Adicionar índice para condição
CREATE INDEX IF NOT EXISTS idx_products_condition 
ON products(condition) 
WHERE is_active = true;

-- 5. Adicionar índice para tempo de entrega
CREATE INDEX IF NOT EXISTS idx_products_delivery_days 
ON products(delivery_days) 
WHERE is_active = true;

-- 6. Adicionar índices para localização
CREATE INDEX IF NOT EXISTS idx_products_seller_state 
ON products(seller_state) 
WHERE is_active = true AND seller_state IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_seller_city 
ON products(seller_city) 
WHERE is_active = true AND seller_city IS NOT NULL;

-- 7. Adicionar índice composto para localização
CREATE INDEX IF NOT EXISTS idx_products_seller_location 
ON products(seller_state, seller_city) 
WHERE is_active = true;

-- 8. Adicionar índice para rating_average (se não existir)
CREATE INDEX IF NOT EXISTS idx_products_rating_average 
ON products(rating_average DESC NULLS LAST) 
WHERE is_active = true;

-- 9. Adicionar índice para seller_id (se não existir)
CREATE INDEX IF NOT EXISTS idx_products_seller_id 
ON products(seller_id) 
WHERE is_active = true;

-- 10. Atualizar alguns produtos com dados de exemplo (opcional)
-- Descomente as linhas abaixo se quiser adicionar dados de teste

/*
-- Atualizar condição de alguns produtos aleatoriamente
UPDATE products 
SET condition = CASE 
  WHEN RANDOM() < 0.7 THEN 'new'
  WHEN RANDOM() < 0.9 THEN 'used'
  ELSE 'refurbished'
END
WHERE is_active = true;

-- Atualizar tempo de entrega aleatoriamente
UPDATE products 
SET delivery_days = CASE 
  WHEN RANDOM() < 0.1 THEN 1  -- 10% entrega em 24h
  WHEN RANDOM() < 0.3 THEN 2  -- 20% em 48h
  WHEN RANDOM() < 0.6 THEN 3  -- 30% em 3 dias
  WHEN RANDOM() < 0.8 THEN 7  -- 20% em 7 dias
  ELSE 15                     -- 20% em 15 dias
END
WHERE is_active = true;

-- Atualizar localização dos vendedores (exemplo com estados brasileiros)
UPDATE products p
SET 
  seller_state = CASE (seller_id::text)::int % 5
    WHEN 0 THEN 'SP'
    WHEN 1 THEN 'RJ'
    WHEN 2 THEN 'MG'
    WHEN 3 THEN 'RS'
    ELSE 'PR'
  END,
  seller_city = CASE (seller_id::text)::int % 5
    WHEN 0 THEN 'São Paulo'
    WHEN 1 THEN 'Rio de Janeiro'
    WHEN 2 THEN 'Belo Horizonte'
    WHEN 3 THEN 'Porto Alegre'
    ELSE 'Curitiba'
  END
WHERE is_active = true;
*/

-- Verificar se as colunas foram criadas
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'products'
  AND column_name IN ('condition', 'delivery_days', 'seller_state', 'seller_city')
ORDER BY column_name; 