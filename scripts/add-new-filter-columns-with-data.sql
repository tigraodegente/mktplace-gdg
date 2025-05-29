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

-- 10. POPULAR DADOS DE TESTE

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

-- Atualizar localização dos vendedores com distribuição mais realista
UPDATE products p
SET 
  seller_state = CASE 
    WHEN RANDOM() < 0.35 THEN 'SP'  -- 35% São Paulo
    WHEN RANDOM() < 0.50 THEN 'RJ'  -- 15% Rio de Janeiro
    WHEN RANDOM() < 0.65 THEN 'MG'  -- 15% Minas Gerais
    WHEN RANDOM() < 0.75 THEN 'RS'  -- 10% Rio Grande do Sul
    WHEN RANDOM() < 0.85 THEN 'PR'  -- 10% Paraná
    WHEN RANDOM() < 0.90 THEN 'SC'  -- 5% Santa Catarina
    WHEN RANDOM() < 0.93 THEN 'BA'  -- 3% Bahia
    WHEN RANDOM() < 0.96 THEN 'PE'  -- 3% Pernambuco
    WHEN RANDOM() < 0.98 THEN 'CE'  -- 2% Ceará
    ELSE 'DF'                        -- 2% Distrito Federal
  END,
  seller_city = CASE 
    WHEN seller_state = 'SP' THEN 
      CASE 
        WHEN RANDOM() < 0.5 THEN 'São Paulo'
        WHEN RANDOM() < 0.7 THEN 'Campinas'
        WHEN RANDOM() < 0.85 THEN 'Santos'
        ELSE 'São José dos Campos'
      END
    WHEN seller_state = 'RJ' THEN 
      CASE 
        WHEN RANDOM() < 0.6 THEN 'Rio de Janeiro'
        WHEN RANDOM() < 0.8 THEN 'Niterói'
        ELSE 'Petrópolis'
      END
    WHEN seller_state = 'MG' THEN 
      CASE 
        WHEN RANDOM() < 0.5 THEN 'Belo Horizonte'
        WHEN RANDOM() < 0.75 THEN 'Uberlândia'
        ELSE 'Juiz de Fora'
      END
    WHEN seller_state = 'RS' THEN 
      CASE 
        WHEN RANDOM() < 0.6 THEN 'Porto Alegre'
        WHEN RANDOM() < 0.8 THEN 'Caxias do Sul'
        ELSE 'Pelotas'
      END
    WHEN seller_state = 'PR' THEN 
      CASE 
        WHEN RANDOM() < 0.6 THEN 'Curitiba'
        WHEN RANDOM() < 0.8 THEN 'Londrina'
        ELSE 'Maringá'
      END
    WHEN seller_state = 'SC' THEN 
      CASE 
        WHEN RANDOM() < 0.5 THEN 'Florianópolis'
        WHEN RANDOM() < 0.75 THEN 'Joinville'
        ELSE 'Blumenau'
      END
    WHEN seller_state = 'BA' THEN 'Salvador'
    WHEN seller_state = 'PE' THEN 'Recife'
    WHEN seller_state = 'CE' THEN 'Fortaleza'
    ELSE 'Brasília'
  END
WHERE is_active = true;

-- Verificar se as colunas foram criadas e populadas
SELECT 
  'Colunas criadas:' as info,
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'products'
  AND column_name IN ('condition', 'delivery_days', 'seller_state', 'seller_city')
ORDER BY column_name;

-- Mostrar distribuição dos dados
SELECT 'Distribuição de condições:' as info;
SELECT condition, COUNT(*) as total, 
       ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentual
FROM products 
WHERE is_active = true
GROUP BY condition
ORDER BY total DESC;

SELECT 'Distribuição de tempo de entrega:' as info;
SELECT 
  CASE 
    WHEN delivery_days <= 1 THEN 'Entrega em 24h'
    WHEN delivery_days <= 2 THEN 'Até 2 dias'
    WHEN delivery_days <= 3 THEN 'Até 3 dias'
    WHEN delivery_days <= 7 THEN 'Até 7 dias'
    ELSE 'Até 15 dias'
  END as prazo,
  COUNT(*) as total,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentual
FROM products 
WHERE is_active = true
GROUP BY 
  CASE 
    WHEN delivery_days <= 1 THEN 'Entrega em 24h'
    WHEN delivery_days <= 2 THEN 'Até 2 dias'
    WHEN delivery_days <= 3 THEN 'Até 3 dias'
    WHEN delivery_days <= 7 THEN 'Até 7 dias'
    ELSE 'Até 15 dias'
  END
ORDER BY MIN(delivery_days);

SELECT 'Top 10 estados com mais produtos:' as info;
SELECT seller_state, COUNT(*) as total,
       ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentual
FROM products 
WHERE is_active = true AND seller_state IS NOT NULL
GROUP BY seller_state
ORDER BY total DESC
LIMIT 10;

SELECT 'Top 10 cidades com mais produtos:' as info;
SELECT seller_city, seller_state, COUNT(*) as total
FROM products 
WHERE is_active = true AND seller_city IS NOT NULL
GROUP BY seller_city, seller_state
ORDER BY total DESC
LIMIT 10; 