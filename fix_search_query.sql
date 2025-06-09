-- TESTE DIRETO: Buscar adesivos como deveria
-- Execute no banco para testar a busca correta

-- 1. Produto atual que estamos testando
SELECT 'PRODUTO ATUAL:' as tipo, id, name, sku, brand_id 
FROM products 
WHERE id = '3f5acc10-3642-4da7-a512-89a6778515ca';

-- 2. Como a busca DEVERIA funcionar (só por palavra-chave)
SELECT 'BUSCA CORRETA:' as tipo, id, name, sku, price, brand_id
FROM products 
WHERE id != '3f5acc10-3642-4da7-a512-89a6778515ca'
  AND is_active = true 
  AND quantity > 0
  AND name ILIKE '%adesivo%'  -- Só produtos com "adesivo" no nome
ORDER BY name
LIMIT 10;

-- 3. Buscar especificamente por "estrela" 
SELECT 'BUSCA ESTRELA:' as tipo, id, name, sku, price
FROM products 
WHERE id != '3f5acc10-3642-4da7-a512-89a6778515ca'
  AND is_active = true 
  AND name ILIKE '%estrela%'
ORDER BY name;

-- 4. Buscar adesivos de parede
SELECT 'ADESIVOS PAREDE:' as tipo, id, name, sku, price
FROM products 
WHERE id != '3f5acc10-3642-4da7-a512-89a6778515ca'
  AND is_active = true 
  AND name ILIKE '%adesivo%'
  AND name ILIKE '%parede%'
ORDER BY name;

-- 5. Verificar se o "Adesivo Estrela Amarela" está ativo
SELECT 'ESTRELA AMARELA:' as tipo, id, name, sku, price, is_active, quantity
FROM products 
WHERE name ILIKE '%estrela%amarela%'
   OR name ILIKE '%amarela%estrela%'; 