-- SCRIPT DE NORMALIZAÇÃO: ATTRIBUTES COMO ARRAYS
-- Este script converte todos os attributes de strings para arrays
-- mantendo specifications como strings (conforme arquitetura)

-- 1. BACKUP DOS DADOS ATUAIS
CREATE TABLE IF NOT EXISTS products_attributes_backup AS 
SELECT id, attributes, specifications, updated_at
FROM products 
WHERE attributes IS NOT NULL 
   OR specifications IS NOT NULL;

-- 2. NORMALIZAR ATTRIBUTES PARA ARRAYS
UPDATE products 
SET attributes = (
  SELECT jsonb_object_agg(
    key,
    CASE 
      -- Se já é array, manter como está
      WHEN jsonb_typeof(value) = 'array' THEN value
      -- Se é string, converter para array com um elemento
      WHEN jsonb_typeof(value) = 'string' THEN 
        jsonb_build_array(value #>> '{}')
      -- Se é null, converter para array vazio
      WHEN value IS NULL OR value = 'null'::jsonb THEN 
        '[]'::jsonb
      -- Outros tipos: converter para string e depois array
      ELSE 
        jsonb_build_array(value #>> '{}')
    END
  )
  FROM jsonb_each(attributes) AS attr(key, value)
)
WHERE attributes IS NOT NULL 
  AND attributes != '{}'::jsonb;

-- 3. GARANTIR QUE SPECIFICATIONS SEJAM STRINGS
UPDATE products 
SET specifications = (
  SELECT jsonb_object_agg(
    key,
    CASE 
      -- Se é array com um elemento, extrair o primeiro
      WHEN jsonb_typeof(value) = 'array' AND jsonb_array_length(value) > 0 THEN 
        value -> 0
      -- Se é array vazio, converter para string vazia
      WHEN jsonb_typeof(value) = 'array' AND jsonb_array_length(value) = 0 THEN 
        '""'::jsonb
      -- Se já é string, manter
      WHEN jsonb_typeof(value) = 'string' THEN value
      -- Se é null, converter para string vazia
      WHEN value IS NULL OR value = 'null'::jsonb THEN 
        '""'::jsonb
      -- Outros tipos: converter para string
      ELSE 
        to_jsonb(value #>> '{}')
    END
  )
  FROM jsonb_each(specifications) AS spec(key, value)
)
WHERE specifications IS NOT NULL 
  AND specifications != '{}'::jsonb;

-- 4. VERIFICAR RESULTADOS
SELECT 
  'VERIFICAÇÃO PÓS-MIGRAÇÃO' as status,
  COUNT(*) as total_produtos,
  COUNT(CASE WHEN attributes IS NOT NULL THEN 1 END) as produtos_com_attributes,
  COUNT(CASE WHEN specifications IS NOT NULL THEN 1 END) as produtos_com_specifications
FROM products;

-- 5. MOSTRAR EXEMPLOS DE ATTRIBUTES (devem ser arrays)
SELECT 
  'EXEMPLOS ATTRIBUTES (arrays)' as tipo,
  id,
  name,
  attributes
FROM products 
WHERE attributes IS NOT NULL 
  AND attributes != '{}'::jsonb
LIMIT 3;

-- 6. MOSTRAR EXEMPLOS DE SPECIFICATIONS (devem ser strings)
SELECT 
  'EXEMPLOS SPECIFICATIONS (strings)' as tipo,
  id,
  name,
  specifications
FROM products 
WHERE specifications IS NOT NULL 
  AND specifications != '{}'::jsonb
LIMIT 3;

-- 7. IDENTIFICAR POSSÍVEIS PROBLEMAS
SELECT 
  'PROBLEMAS DETECTADOS' as status,
  id,
  name,
  'attributes contém strings' as problema,
  attributes
FROM products 
WHERE attributes IS NOT NULL 
  AND EXISTS (
    SELECT 1 
    FROM jsonb_each(attributes) AS attr(key, value)
    WHERE jsonb_typeof(value) != 'array'
  )
LIMIT 5; 