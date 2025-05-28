-- Script para popular produtos e variações

-- Inserir produtos de exemplo
INSERT INTO products (
  id, name, slug, description, brand_id, price, 
  compare_at_price, sku, barcode, track_inventory, 
  is_active, is_digital, requires_shipping, is_featured, 
  is_taxable, published_at, created_at, updated_at
)
        END LOOP;
      END LOOP;
    END IF;
    
  END LOOP;
  
  -- Inserir contagem na tabela de migração
  INSERT INTO temp_migration_ids (id, type)
  VALUES (product_count::text, 'Total de Produtos');
  
  INSERT INTO temp_migration_ids (id, type)
  VALUES (variant_count::text, 'Total de Variações');
  
  -- Mensagem de log
  RAISE NOTICE 'Foram inseridos % produtos e % variações', product_count, variant_count;
  
END $$;

-- Adicionar imagens de exemplo para os produtos
INSERT INTO product_images (product_id, image_url, alt_text, display_order, is_primary, created_at, updated_at)
SELECT 
  p.id,
  'https://example.com/products/' || p.slug || '.jpg',
  p.name || ' - Imagem principal',
  1,
  true,
  NOW(),
  NOW()
FROM products p
LEFT JOIN product_images pi ON p.id = pi.product_id
WHERE pi.id IS NULL;

-- Adicionar imagens adicionais para alguns produtos
WITH additional_images AS (
  SELECT 
    p.id as product_id,
    'https://example.com/products/' || p.slug || '-2.jpg' as image_url,
    p.name || ' - Detalhe' as alt_text,
    2 as display_order,
    false as is_primary
  FROM products p
  WHERE p.id IN ('prod_camisa_basica', 'prod_tenis_esportivo', 'prod_sapato_social')
)
INSERT INTO product_images (product_id, image_url, alt_text, display_order, is_primary, created_at, updated_at)
SELECT 
  product_id,
  image_url,
  alt_text,
  display_order,
  is_primary,
  NOW(),
  NOW()
FROM additional_images;

-- Atualizar contagem de produtos nas categorias
UPDATE categories c
SET product_count = (
  SELECT COUNT(*) 
  FROM product_categories pc 
  WHERE pc.category_id = c.id
  GROUP BY pc.category_id
)
WHERE id IN (
  SELECT DISTINCT category_id 
  FROM product_categories
);

\echo '✅ Produtos, variações e imagens inseridos com sucesso'
