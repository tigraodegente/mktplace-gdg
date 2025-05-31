-- =====================================================
-- PRODUTOS EM DESTAQUE REAIS PARA PÁGINA PRINCIPAL
-- =====================================================

-- Verificar se há usuários no banco para usar como vendedores
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users LIMIT 1) THEN
        RAISE EXCEPTION 'Nenhum usuário encontrado no banco. Execute primeiro o script de dados básicos.';
    END IF;
END $$;

-- Inserir categorias básicas se não existirem
INSERT INTO categories (id, name, slug, description, is_active, created_at, updated_at) VALUES
('bebe-categoria-001', 'Bebê', 'bebe', 'Produtos para bebês e recém-nascidos', true, NOW(), NOW()),
('infantil-categoria-002', 'Infantil', 'infantil', 'Produtos para crianças', true, NOW(), NOW()),
('quarto-categoria-003', 'Quarto', 'quarto', 'Móveis e decoração para quarto', true, NOW(), NOW()),
('organizacao-categoria-004', 'Organização', 'organizacao', 'Produtos para organização', true, NOW(), NOW()),
('brinquedos-categoria-005', 'Brinquedos', 'brinquedos', 'Brinquedos educativos e recreativos', true, NOW(), NOW()),
('decoracao-categoria-006', 'Decoração', 'decoracao', 'Itens de decoração', true, NOW(), NOW())
ON CONFLICT (slug) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Inserir marcas básicas se não existirem
INSERT INTO brands (id, name, slug, description, is_active, created_at, updated_at) VALUES
('grao-de-gente-brand', 'Grão de Gente', 'grao-de-gente', 'Marca principal da loja', true, NOW(), NOW()),
('baby-comfort-brand', 'Baby Comfort', 'baby-comfort', 'Produtos confortáveis para bebês', true, NOW(), NOW()),
('kids-joy-brand', 'Kids Joy', 'kids-joy', 'Alegria e diversão para crianças', true, NOW(), NOW())
ON CONFLICT (slug) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Inserir produtos em destaque
INSERT INTO products (
    id, name, slug, description, price, original_price, 
    category_id, seller_id, brand_id, sku, 
    quantity, stock_alert_threshold, tags, featured,
    is_active, sales_count, rating_average, rating_count,
    weight, height, width, length,
    created_at, updated_at
) VALUES

-- Kit Berço Completo
(
    'produto-destaque-001',
    'Kit Berço Completo Ursinhos Azul',
    'kit-berco-completo-ursinhos-azul',
    'Kit completo para berço com 8 peças, tema ursinhos em tons de azul. Inclui: edredom, protetor de berço, travesseiro, fronha, lençol com elástico, lençol de cobrir e 2 almofadas decorativas. Tecido 100% algodão, hipoalergênico.',
    299.99,
    399.99,
    'bebe-categoria-001',
    (SELECT id FROM users WHERE role = 'seller' LIMIT 1),
    'baby-comfort-brand',
    'KB-URS-AZ-001',
    15,
    5,
    ARRAY['100% ALGODÃO', 'HIPOALERGÊNICO', '8 PEÇAS', 'LAVÁVEL'],
    true,
    true,
    47,
    4.8,
    23,
    2.5, 15, 60, 45,
    NOW() - INTERVAL '30 days',
    NOW()
),

-- Jogo de Lençol Infantil
(
    'produto-destaque-002',
    'Jogo de Lençol Infantil Dinossauros',
    'jogo-lencol-infantil-dinossauros',
    'Jogo de lençol para cama infantil com estampa divertida de dinossauros. Inclui: lençol com elástico, fronha e lençol de cobrir. Tecido microfibra de alta qualidade, macio e resistente.',
    149.99,
    189.99,
    'infantil-categoria-002',
    (SELECT id FROM users WHERE role = 'seller' LIMIT 1),
    'kids-joy-brand',
    'JL-DIN-VRD-002',
    32,
    10,
    ARRAY['MICROFIBRA', '3 PEÇAS', 'ANTI-ALÉRGICO', 'FÁCIL LAVAGEM'],
    true,
    true,
    89,
    4.6,
    41,
    1.2, 8, 50, 40,
    NOW() - INTERVAL '20 days',
    NOW()
),

-- Organizador de Brinquedos
(
    'produto-destaque-003',
    'Organizador de Brinquedos MDF Colorido',
    'organizador-brinquedos-mdf-colorido',
    'Organizador de brinquedos em MDF com 6 nichos coloridos. Design alegre e funcional para organizar brinquedos, livros e materiais escolares. Pintura atóxica e bordas arredondadas para segurança.',
    189.99,
    249.99,
    'organizacao-categoria-004',
    (SELECT id FROM users WHERE role = 'seller' LIMIT 1),
    'grao-de-gente-brand',
    'ORG-MDF-COL-003',
    8,
    3,
    ARRAY['MDF', '6 NICHOS', 'PINTURA ATÓXICA', 'MONTAGEM FÁCIL'],
    true,
    true,
    23,
    4.9,
    12,
    8.5, 60, 80, 30,
    NOW() - INTERVAL '15 days',
    NOW()
),

-- Tapete Educativo
(
    'produto-destaque-004',
    'Tapete Infantil Educativo ABC Números',
    'tapete-infantil-educativo-abc-numeros',
    'Tapete educativo em EVA com 36 peças destacáveis (26 letras + 10 números). Estimula o aprendizado de forma lúdica. Material atóxico, lavável e antiderrapante.',
    129.99,
    169.99,
    'brinquedos-categoria-005',
    (SELECT id FROM users WHERE role = 'seller' LIMIT 1),
    'kids-joy-brand',
    'TAP-ABC-NUM-004',
    25,
    8,
    ARRAY['EVA', '36 PEÇAS', 'EDUCATIVO', 'ANTIDERRAPANTE'],
    true,
    true,
    156,
    4.7,
    67,
    1.8, 2, 180, 120,
    NOW() - INTERVAL '25 days',
    NOW()
),

-- Prateleira Decorativa
(
    'produto-destaque-005',
    'Prateleira Nuvem Decorativa Branca',
    'prateleira-nuvem-decorativa-branca',
    'Prateleira em formato de nuvem para decoração de quarto infantil. Material MDF branco, ideal para expor livros, brinquedos pequenos e objetos decorativos. Inclui kit de fixação.',
    79.99,
    99.99,
    'decoracao-categoria-006',
    (SELECT id FROM users WHERE role = 'seller' LIMIT 1),
    'grao-de-gente-brand',
    'PRT-NUV-BCO-005',
    18,
    5,
    ARRAY['MDF', 'FORMATO NUVEM', 'KIT FIXAÇÃO', 'DECORATIVO'],
    true,
    true,
    72,
    4.5,
    31,
    1.5, 15, 40, 25,
    NOW() - INTERVAL '10 days',
    NOW()
),

-- Mobile Musical
(
    'produto-destaque-006',
    'Mobile Musical Estrelas e Lua',
    'mobile-musical-estrelas-lua',
    'Mobile musical com estrelas e lua para berço. Toca 5 melodias clássicas relaxantes. Movimento giratório suave e cores pastéis que acalmam o bebê. Fácil instalação no berço.',
    159.99,
    199.99,
    'bebe-categoria-001',
    (SELECT id FROM users WHERE role = 'seller' LIMIT 1),
    'baby-comfort-brand',
    'MOB-MUS-EST-006',
    12,
    4,
    ARRAY['MUSICAL', '5 MELODIAS', 'MOVIMENTO GIRATÓRIO', 'CORES PASTÉIS'],
    true,
    true,
    34,
    4.8,
    18,
    0.8, 25, 35, 35,
    NOW() - INTERVAL '5 days',
    NOW()
),

-- Kit Higiene
(
    'produto-destaque-007',
    'Kit Higiene Bebê Porcelana Rosa',
    'kit-higiene-bebe-porcelana-rosa',
    'Kit higiene para bebê em porcelana com 4 peças: 2 potes com tampa, 1 molhadeira e 1 garrafa térmica. Cor rosa com detalhes delicados. Ideal para decorar o quarto e organizar itens de higiene.',
    219.99,
    279.99,
    'bebe-categoria-001',
    (SELECT id FROM users WHERE role = 'seller' LIMIT 1),
    'baby-comfort-brand',
    'KH-POR-RSA-007',
    6,
    2,
    ARRAY['PORCELANA', '4 PEÇAS', 'COR ROSA', 'GARRAFA TÉRMICA'],
    true,
    true,
    15,
    4.9,
    8,
    2.2, 20, 30, 25,
    NOW() - INTERVAL '12 days',
    NOW()
),

-- Luminária Infantil
(
    'produto-destaque-008',
    'Luminária Infantil Unicórnio LED',
    'luminaria-infantil-unicornio-led',
    'Luminária LED em formato de unicórnio com 7 cores diferentes. Controle touch para mudança de cores e intensidade. Funciona com bateria recarregável USB. Cria ambiente aconchegante no quarto.',
    89.99,
    119.99,
    'decoracao-categoria-006',
    (SELECT id FROM users WHERE role = 'seller' LIMIT 1),
    'kids-joy-brand',
    'LUM-UNI-LED-008',
    20,
    6,
    ARRAY['LED', '7 CORES', 'TOUCH', 'USB RECARREGÁVEL'],
    true,
    true,
    63,
    4.6,
    28,
    0.5, 12, 18, 15,
    NOW() - INTERVAL '8 days',
    NOW()
)

ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    original_price = EXCLUDED.original_price,
    quantity = EXCLUDED.quantity,
    featured = EXCLUDED.featured,
    updated_at = NOW();

-- Inserir imagens dos produtos
INSERT INTO product_images (id, product_id, url, alt_text, position, created_at) VALUES

-- Imagens Kit Berço
('img-kit-berco-001', 'produto-destaque-001', '/api/placeholder/800/800?text=Kit+Berço+Ursinhos&bg=E3F2FD&color=1976D2', 'Kit Berço Completo Ursinhos Azul - Vista Principal', 1, NOW()),
('img-kit-berco-002', 'produto-destaque-001', '/api/placeholder/800/800?text=Detalhe+Ursinhos&bg=E8F5E8&color=388E3C', 'Kit Berço - Detalhe dos Ursinhos', 2, NOW()),

-- Imagens Lençol Dinossauros
('img-lencol-din-001', 'produto-destaque-002', '/api/placeholder/800/800?text=Lençol+Dinossauros&bg=F3E5F5&color=7B1FA2', 'Jogo de Lençol Infantil Dinossauros - Vista Principal', 1, NOW()),
('img-lencol-din-002', 'produto-destaque-002', '/api/placeholder/800/800?text=Detalhe+Dinossauros&bg=FFF3E0&color=F57C00', 'Lençol - Estampa de Dinossauros', 2, NOW()),

-- Imagens Organizador
('img-org-mdf-001', 'produto-destaque-003', '/api/placeholder/800/800?text=Organizador+MDF&bg=FFEBEE&color=C62828', 'Organizador de Brinquedos MDF Colorido', 1, NOW()),

-- Imagens Tapete
('img-tapete-abc-001', 'produto-destaque-004', '/api/placeholder/800/800?text=Tapete+ABC&bg=E0F2F1&color=00695C', 'Tapete Educativo ABC e Números', 1, NOW()),

-- Imagens Prateleira
('img-prat-nuvem-001', 'produto-destaque-005', '/api/placeholder/800/800?text=Prateleira+Nuvem&bg=F5F5F5&color=424242', 'Prateleira Nuvem Decorativa Branca', 1, NOW()),

-- Imagens Mobile
('img-mobile-001', 'produto-destaque-006', '/api/placeholder/800/800?text=Mobile+Musical&bg=FFF8E1&color=FF8F00', 'Mobile Musical Estrelas e Lua', 1, NOW()),

-- Imagens Kit Higiene
('img-kit-hig-001', 'produto-destaque-007', '/api/placeholder/800/800?text=Kit+Higiene&bg=FCE4EC&color=AD1457', 'Kit Higiene Bebê Porcelana Rosa', 1, NOW()),

-- Imagens Luminária
('img-lum-uni-001', 'produto-destaque-008', '/api/placeholder/800/800?text=Luminária+Unicórnio&bg=F3E5F5&color=8E24AA', 'Luminária Infantil Unicórnio LED', 1, NOW())

ON CONFLICT (id) DO NOTHING;

-- Verificação final
SELECT 'Produtos em destaque inseridos com sucesso!' as status;

SELECT 
    'Produtos em destaque: ' || COUNT(*) as info
FROM products 
WHERE featured = true AND is_active = true;

SELECT 
    p.name,
    p.price,
    p.original_price,
    p.quantity,
    c.name as categoria,
    b.name as marca
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN brands b ON p.brand_id = b.id
WHERE p.featured = true AND p.is_active = true
ORDER BY p.created_at DESC; 