-- Script para corrigir colunas faltantes no banco local
-- Problema: shipping_zones e shipping_modalities não tem delivery_days_min/max

-- Adicionar colunas na tabela shipping_zones
ALTER TABLE shipping_zones 
ADD COLUMN IF NOT EXISTS delivery_days_min INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS delivery_days_max INTEGER DEFAULT 7;

-- Adicionar colunas na tabela shipping_modalities  
ALTER TABLE shipping_modalities
ADD COLUMN IF NOT EXISTS delivery_days_min INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS delivery_days_max INTEGER DEFAULT 7;

-- Atualizar valores padrão baseado no que já existe
UPDATE shipping_zones 
SET delivery_days_min = 1, delivery_days_max = 3 
WHERE zone_type = 'express' OR name ILIKE '%express%';

UPDATE shipping_zones 
SET delivery_days_min = 3, delivery_days_max = 7 
WHERE zone_type = 'standard' OR delivery_days_min IS NULL;

UPDATE shipping_modalities
SET delivery_days_min = FLOOR(3 * days_multiplier)::INTEGER,
    delivery_days_max = FLOOR(7 * days_multiplier)::INTEGER
WHERE delivery_days_min IS NULL;

-- Garantir que valores mínimos sejam consistentes
UPDATE shipping_zones SET delivery_days_min = 1 WHERE delivery_days_min < 1;
UPDATE shipping_zones SET delivery_days_max = delivery_days_min + 2 WHERE delivery_days_max <= delivery_days_min;

UPDATE shipping_modalities SET delivery_days_min = 1 WHERE delivery_days_min < 1;  
UPDATE shipping_modalities SET delivery_days_max = delivery_days_min + 2 WHERE delivery_days_max <= delivery_days_min;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_shipping_zones_delivery_days ON shipping_zones(delivery_days_min, delivery_days_max);
CREATE INDEX IF NOT EXISTS idx_shipping_modalities_delivery_days ON shipping_modalities(delivery_days_min, delivery_days_max);

-- Verificar o resultado
SELECT 'shipping_zones' as tabela, count(*) as total, 
       min(delivery_days_min) as min_days, max(delivery_days_max) as max_days
FROM shipping_zones
UNION ALL
SELECT 'shipping_modalities' as tabela, count(*) as total,
       min(delivery_days_min) as min_days, max(delivery_days_max) as max_days  
FROM shipping_modalities; 