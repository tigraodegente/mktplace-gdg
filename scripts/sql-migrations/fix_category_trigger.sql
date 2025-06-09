-- Corrigir trigger que tenta acessar category_id que não existe mais
-- O sistema agora usa relação many-to-many através de product_categories

DROP TRIGGER IF EXISTS update_product_search_index ON products;
DROP FUNCTION IF EXISTS trigger_update_search_index();

-- Criar nova função que funciona com a estrutura many-to-many
CREATE OR REPLACE FUNCTION trigger_update_search_index()
RETURNS TRIGGER AS $$
BEGIN
  -- Primeiro, deletar entrada existente se houver
  DELETE FROM search_index WHERE product_id = NEW.id;
  
  -- Inserir nova entrada usando a relação many-to-many
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
    LOWER(NEW.name),
    NEW.tags,
    ARRAY[c.name, pc.name],
    b.name,
    CASE 
      WHEN NEW.price < 50 THEN 'budget'
      WHEN NEW.price < 200 THEN 'medium'
      WHEN NEW.price < 1000 THEN 'premium'
      ELSE 'luxury'
    END
  FROM product_categories pcat
  LEFT JOIN categories c ON c.id = pcat.category_id
  LEFT JOIN categories pc ON pc.id = c.parent_id
  LEFT JOIN brands b ON b.id = NEW.brand_id
  WHERE pcat.product_id = NEW.id 
    AND pcat.is_primary = true
  LIMIT 1;
  
  -- Se não encontrou categoria primária, usar qualquer categoria
  IF NOT FOUND THEN
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
        COALESCE(array_to_string(NEW.tags, ' '), '')
      ),
      LOWER(NEW.name),
      NEW.tags,
      ARRAY[]::text[],
      b.name,
      CASE 
        WHEN NEW.price < 50 THEN 'budget'
        WHEN NEW.price < 200 THEN 'medium'
        WHEN NEW.price < 1000 THEN 'premium'
        ELSE 'luxury'
      END
    FROM brands b 
    WHERE b.id = NEW.brand_id;
  END IF;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recriar trigger
CREATE TRIGGER update_product_search_index
    AFTER INSERT OR UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_search_index(); 