-- Corrigir trigger problemático que causa erro no checkout
-- O trigger estava tentando acessar NEW.category_id que não existe mais na tabela products

-- 1. Remover o trigger problemático
DROP TRIGGER IF EXISTS update_product_search_index ON products;
DROP FUNCTION IF EXISTS trigger_update_search_index();

-- 2. Criar nova função que funciona com a estrutura atual
CREATE OR REPLACE FUNCTION trigger_update_search_index()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualizar search_index sem referenciar category_id diretamente
  -- Usar a tabela product_categories para obter categorias
  INSERT INTO search_index (
    product_id, 
    search_vector, 
    name_metaphone,
    tags_array,
    category_path,
    brand_name,
    price_range
  )
  SELECT 
    NEW.id,
    to_tsvector('portuguese', 
      COALESCE(NEW.name, '') || ' ' || 
      COALESCE(NEW.description, '') || ' ' || 
      COALESCE(b.name, '') || ' ' ||
      COALESCE(c.name, '') || ' ' ||
      COALESCE(array_to_string(NEW.tags, ' '), '')
    ),
    LOWER(NEW.name), -- Usar lowercase ao invés de metaphone
    NEW.tags,
    ARRAY[c.name, pc.name],
    b.name,
    CASE 
      WHEN NEW.price < 50 THEN 'budget'
      WHEN NEW.price < 200 THEN 'medium'
      WHEN NEW.price < 1000 THEN 'premium'
      ELSE 'luxury'
    END
  FROM brands b
  LEFT JOIN product_categories pcat ON pcat.product_id = NEW.id AND pcat.is_primary = true
  LEFT JOIN categories c ON c.id = pcat.category_id
  LEFT JOIN categories pc ON pc.id = c.parent_id
  WHERE b.id = NEW.brand_id
  ON CONFLICT (product_id)
  DO UPDATE SET
    search_vector = EXCLUDED.search_vector,
    name_metaphone = EXCLUDED.name_metaphone,
    tags_array = EXCLUDED.tags_array,
    category_path = EXCLUDED.category_path,
    brand_name = EXCLUDED.brand_name,
    price_range = EXCLUDED.price_range,
    updated_at = NOW();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Recriar o trigger corrigido
CREATE TRIGGER update_product_search_index
AFTER INSERT OR UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION trigger_update_search_index();

-- 4. Executar uma atualização de teste para verificar se está funcionando
-- (Comentado para não afetar dados em produção)
-- UPDATE products SET updated_at = NOW() WHERE id = (SELECT id FROM products LIMIT 1);

COMMIT; 