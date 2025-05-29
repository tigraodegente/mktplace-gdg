-- Corrigir função update_search_index sem metaphone
CREATE OR REPLACE FUNCTION update_search_index()
RETURNS void AS $$
BEGIN
  INSERT INTO search_index (
    product_id, 
    search_vector, 
    name_metaphone,
    tags_array,
    category_path,
    brand_name,
    price_range,
    attributes
  )
  SELECT 
    p.id,
    to_tsvector('portuguese', 
      COALESCE(p.name, '') || ' ' || 
      COALESCE(p.description, '') || ' ' || 
      COALESCE(b.name, '') || ' ' ||
      COALESCE(c.name, '') || ' ' ||
      COALESCE(array_to_string(p.tags, ' '), '')
    ),
    LOWER(p.name), -- Usar lowercase ao invés de metaphone
    p.tags,
    ARRAY[c.name, pc.name],
    b.name,
    CASE 
      WHEN p.price < 50 THEN 'budget'
      WHEN p.price < 200 THEN 'medium'
      WHEN p.price < 1000 THEN 'premium'
      ELSE 'luxury'
    END,
    jsonb_build_object(
      'color', p.specifications->>'color',
      'size', p.specifications->>'size',
      'material', p.specifications->>'material'
    )
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN categories pc ON pc.id = c.parent_id
  LEFT JOIN brands b ON b.id = p.brand_id
  WHERE p.is_active = true
  ON CONFLICT (product_id)
  DO UPDATE SET
    search_vector = EXCLUDED.search_vector,
    name_metaphone = EXCLUDED.name_metaphone,
    tags_array = EXCLUDED.tags_array,
    category_path = EXCLUDED.category_path,
    brand_name = EXCLUDED.brand_name,
    price_range = EXCLUDED.price_range,
    attributes = EXCLUDED.attributes,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Corrigir trigger também
CREATE OR REPLACE FUNCTION trigger_update_search_index()
RETURNS TRIGGER AS $$
BEGIN
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
  FROM categories c
  LEFT JOIN categories pc ON pc.id = c.parent_id
  LEFT JOIN brands b ON b.id = NEW.brand_id
  WHERE c.id = NEW.category_id
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

-- Executar indexação
SELECT update_search_index();

-- Verificar resultado
SELECT COUNT(*) as produtos_indexados FROM search_index; 