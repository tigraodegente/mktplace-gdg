-- Primeiro, vamos verificar se a categoria Brinquedos existe
-- Se não existir, vamos criá-la
INSERT INTO categories (id, name, slug, description, parent_id, is_active, position, created_at, updated_at)
SELECT 
    'cat_brinquedos',
    'Brinquedos',
    'brinquedos',
    'Brinquedos educativos e divertidos para todas as idades',
    NULL,
    true,
    2,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM categories WHERE slug = 'brinquedos'
);

-- Agora vamos adicionar algumas subcategorias para Brinquedos
INSERT INTO categories (id, name, slug, description, parent_id, is_active, position, created_at, updated_at)
VALUES 
    ('cat_brinquedos_educativos', 'Brinquedos Educativos', 'brinquedos-educativos', 'Brinquedos que estimulam o aprendizado', 
     (SELECT id FROM categories WHERE slug = 'brinquedos'), true, 1, NOW(), NOW()),
    
    ('cat_brinquedos_madeira', 'Brinquedos de Madeira', 'brinquedos-madeira', 'Brinquedos sustentáveis em madeira', 
     (SELECT id FROM categories WHERE slug = 'brinquedos'), true, 2, NOW(), NOW()),
    
    ('cat_brinquedos_musicais', 'Brinquedos Musicais', 'brinquedos-musicais', 'Instrumentos e brinquedos sonoros', 
     (SELECT id FROM categories WHERE slug = 'brinquedos'), true, 3, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Vamos também adicionar subcategorias para Cestos Organizadores
INSERT INTO categories (id, name, slug, description, parent_id, is_active, position, created_at, updated_at)
VALUES 
    ('cat_cestos_tecido', 'Cestos de Tecido', 'cestos-tecido', 'Cestos organizadores em tecido', 
     (SELECT id FROM categories WHERE slug = 'cestos-organizadores'), true, 1, NOW(), NOW()),
    
    ('cat_cestos_vime', 'Cestos de Vime', 'cestos-vime', 'Cestos naturais em vime', 
     (SELECT id FROM categories WHERE slug = 'cestos-organizadores'), true, 2, NOW(), NOW())
ON CONFLICT (id) DO NOTHING; 