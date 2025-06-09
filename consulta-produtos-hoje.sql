-- CONSULTAR PRODUTOS INSERIDOS HOJE PELO SCRIPT
-- Data: 05/06/2025

-- Produtos criados hoje com detalhes completos
SELECT 
    p.id,
    p.sku,
    p.name,
    p.price,
    p.quantity,
    p.brand,
    p.is_active,
    p.status,
    COUNT(pi.id) as total_imagens,
    p.created_at,
    p.updated_at
FROM products p
LEFT JOIN product_images pi ON p.id = pi.product_id
WHERE DATE(p.created_at) = CURRENT_DATE
GROUP BY p.id, p.sku, p.name, p.price, p.quantity, p.brand, p.is_active, p.status, p.created_at, p.updated_at
ORDER BY p.created_at DESC;

-- Apenas contagem simples de produtos inseridos hoje
SELECT 
    COUNT(*) as produtos_inseridos_hoje,
    MIN(created_at) as primeiro_produto,
    MAX(created_at) as ultimo_produto
FROM products 
WHERE DATE(created_at) = CURRENT_DATE;

-- Produtos de hoje com URLs das imagens
SELECT 
    p.sku,
    p.name,
    p.price,
    pi.url as imagem_url,
    pi.is_primary,
    p.created_at
FROM products p
LEFT JOIN product_images pi ON p.id = pi.product_id
WHERE DATE(p.created_at) = CURRENT_DATE
ORDER BY p.created_at DESC, pi.position ASC;

-- Verificar se há produtos criados nas últimas 2 horas (mais específico)
SELECT 
    p.sku,
    p.name,
    p.price,
    p.created_at,
    EXTRACT(EPOCH FROM (NOW() - p.created_at))/60 as minutos_atras
FROM products p
WHERE p.created_at >= NOW() - INTERVAL '2 hours'
ORDER BY p.created_at DESC;

-- Resumo por hora de criação hoje
SELECT 
    EXTRACT(HOUR FROM created_at) as hora,
    COUNT(*) as produtos_criados,
    STRING_AGG(sku, ', ') as skus
FROM products 
WHERE DATE(created_at) = CURRENT_DATE
GROUP BY EXTRACT(HOUR FROM created_at)
ORDER BY hora DESC; 