-- Script para popular a tabela product_images com imagens placeholder
-- Este script adiciona imagens para todos os produtos ativos

-- Função para gerar URLs de imagens placeholder baseadas no nome do produto
CREATE OR REPLACE FUNCTION generate_placeholder_url(product_name TEXT, image_index INT) 
RETURNS TEXT AS $$
DECLARE
    colors CONSTANT TEXT[] := ARRAY['3B82F6', '10B981', 'F59E0B', 'EF4444', '8B5CF6', 'EC4899', '14B8A6', 'F97316'];
    color TEXT;
    encoded_name TEXT;
BEGIN
    -- Selecionar cor baseada no hash do nome do produto
    color := colors[1 + (hashtext(product_name) % array_length(colors, 1))];
    
    -- Codificar o nome para URL
    encoded_name := replace(product_name, ' ', '+');
    
    -- Retornar URL do placeholder
    RETURN format('https://via.placeholder.com/600x800/%s/FFFFFF?text=%s', color, encoded_name);
END;
$$ LANGUAGE plpgsql;

-- Inserir imagens para produtos que não têm imagens
WITH products_without_images AS (
    SELECT p.id, p.name
    FROM products p
    LEFT JOIN product_images pi ON p.id = pi.product_id
    WHERE p.is_active = true
    AND pi.id IS NULL
    LIMIT 1000 -- Processar 1000 produtos por vez
),
image_data AS (
    SELECT 
        p.id as product_id,
        p.name,
        generate_series(1, 3) as image_num -- 3 imagens por produto
    FROM products_without_images p
)
INSERT INTO product_images (
    id,
    product_id,
    image_url,
    alt_text,
    display_order,
    is_primary,
    created_at,
    updated_at
)
SELECT
    gen_random_uuid()::text,
    product_id,
    generate_placeholder_url(name, image_num),
    format('%s - Imagem %s', name, image_num),
    image_num,
    CASE WHEN image_num = 1 THEN true ELSE false END,
    NOW(),
    NOW()
FROM image_data;

-- Verificar quantas imagens foram inseridas
SELECT 
    COUNT(DISTINCT product_id) as produtos_com_imagens,
    COUNT(*) as total_imagens
FROM product_images;

-- Limpar função temporária
DROP FUNCTION IF EXISTS generate_placeholder_url(TEXT, INT); 