-- Script para exportar lista de vendedores que precisam resetar senha
-- Execute este script para gerar um CSV com os dados dos vendedores

\copy (
  SELECT 
    ROW_NUMBER() OVER (ORDER BY s.store_name) as numero,
    s.store_name as nome_loja,
    s.email as email_vendedor,
    COALESCE(s.phone, 'Não informado') as telefone,
    COALESCE(s.cnpj, 'Não informado') as cnpj,
    u.email as email_temporario,
    'https://marketplace.com/reset-senha?seller_id=' || s.id as link_reset,
    s.id as seller_id,
    u.id as user_id
  FROM sellers s
  JOIN users u ON s.user_id = u.id
  WHERE u.email LIKE '%@temp.marketplace.com'
  ORDER BY s.store_name
) TO '/tmp/vendedores_para_reset.csv' WITH CSV HEADER;

-- Contar total de vendedores
SELECT 
    COUNT(*) as total_vendedores_para_reset
FROM sellers s
JOIN users u ON s.user_id = u.id
WHERE u.email LIKE '%@temp.marketplace.com';

-- Mostrar primeiros 20 vendedores
SELECT 
    s.store_name as nome_loja,
    s.email as email_vendedor,
    COALESCE(s.phone, 'Não informado') as telefone,
    u.email as email_temporario
FROM sellers s
JOIN users u ON s.user_id = u.id
WHERE u.email LIKE '%@temp.marketplace.com'
ORDER BY s.store_name
LIMIT 20; 