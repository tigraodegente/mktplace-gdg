-- Script para corrigir erro: materialized view "product_counts" has not been populated
-- Este erro ocorre quando a view materializada foi criada mas não foi populada

-- Popula a view materializada
REFRESH MATERIALIZED VIEW product_counts;

-- Verifica se foi populada corretamente
SELECT COUNT(*) FROM product_counts;

-- Caso queira recriar a view completamente:
-- DROP MATERIALIZED VIEW IF EXISTS product_counts;
-- CREATE MATERIALIZED VIEW product_counts AS
-- SELECT 
--   category_id,
--   COUNT(*) as product_count
-- FROM products
-- WHERE is_active = true
-- GROUP BY category_id; 