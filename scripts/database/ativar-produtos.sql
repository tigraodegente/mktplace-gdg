-- Script para ativar todos os produtos publicados
-- Isso fará com que a busca de similares funcione corretamente

-- Verificar situação atual
SELECT 
  COUNT(*) as total_produtos,
  COUNT(CASE WHEN is_active = true THEN 1 END) as produtos_ativos,
  COUNT(CASE WHEN status = 'published' THEN 1 END) as produtos_publicados
FROM products;

-- Ativar todos os produtos publicados
UPDATE products 
SET is_active = true 
WHERE status = 'published';

-- Verificar resultado
SELECT 
  COUNT(*) as total_produtos,
  COUNT(CASE WHEN is_active = true THEN 1 END) as produtos_ativos_depois,
  COUNT(CASE WHEN status = 'published' THEN 1 END) as produtos_publicados
FROM products; 