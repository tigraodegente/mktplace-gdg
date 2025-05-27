-- =====================================================
-- EXPORTAR CREDENCIAIS DOS VENDEDORES
-- =====================================================

-- Lista completa de vendedores com suas credenciais e informações
SELECT 
    s.store_name as "Nome da Loja",
    s.store_slug as "URL da Loja",
    u.email as "Email Temporário",
    'temp_password' as "Senha Temporária",
    s.cnpj as "CNPJ",
    s.phone as "Telefone",
    s.commission_rate || '%' as "Comissão",
    COUNT(p.id) as "Produtos",
    s.status as "Status",
    TO_CHAR(s.created_at, 'DD/MM/YYYY') as "Criado em"
FROM sellers s
JOIN users u ON s.user_id = u.id
LEFT JOIN products p ON p.seller_id = s.id
WHERE s.supplier_id IS NOT NULL
GROUP BY s.id, s.store_name, s.store_slug, u.email, s.cnpj, s.phone, s.commission_rate, s.status, s.created_at
ORDER BY COUNT(p.id) DESC, s.store_name; 