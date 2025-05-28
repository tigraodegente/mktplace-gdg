-- Adicionar um produto de teste na categoria Brinquedos
INSERT INTO products (
    id, 
    name, 
    slug, 
    description, 
    price, 
    original_price,
    category_id, 
    quantity, 
    is_active,
    created_at,
    updated_at
)
VALUES (
    'prod_test_brinquedo_001',
    'Blocos de Montar Educativos',
    'blocos-montar-educativos',
    'Conjunto de blocos coloridos para estimular a criatividade e coordenação motora',
    89.90,
    119.90,
    (SELECT id FROM categories WHERE slug = 'brinquedos'),
    50,
    true,
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING; 