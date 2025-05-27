-- =====================================================
-- MIGRAÇÃO DE FORNECEDORES PARA VENDEDORES
-- =====================================================

-- 1. ANÁLISE PRÉVIA
-- =====================================================

-- Verificar fornecedores ativos com email
SELECT 
    COUNT(*) as total_suppliers,
    COUNT(*) FILTER (WHERE is_active = true) as active_suppliers,
    COUNT(*) FILTER (WHERE contact_email IS NOT NULL) as with_email,
    COUNT(*) FILTER (WHERE is_active = true AND contact_email IS NOT NULL) as can_migrate
FROM suppliers;

-- Listar fornecedores que serão migrados
SELECT 
    id,
    name,
    code,
    contact_email,
    contact_phone,
    is_active
FROM suppliers
WHERE is_active = true 
AND contact_email IS NOT NULL
ORDER BY name
LIMIT 10;

-- 2. FUNÇÃO DE MIGRAÇÃO
-- =====================================================

CREATE OR REPLACE FUNCTION migrate_suppliers_to_sellers()
RETURNS TABLE (
    supplier_name TEXT,
    user_created BOOLEAN,
    seller_created BOOLEAN,
    products_updated INTEGER,
    error_message TEXT
) AS $$
DECLARE
    sup RECORD;
    user_id UUID;
    seller_id UUID;
    products_count INTEGER;
    temp_password TEXT;
BEGIN
    -- Loop através de todos os fornecedores
    FOR sup IN 
        SELECT * FROM suppliers 
        ORDER BY name
    LOOP
        BEGIN
            -- Resetar variáveis
            user_id := NULL;
            seller_id := NULL;
            products_count := 0;
            error_message := NULL;
            
            -- Gerar senha temporária
            temp_password := 'temp_' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 8);
            
            -- Tentar criar usuário
            IF sup.contact_email IS NOT NULL AND sup.contact_email != '' THEN
                -- Verificar se usuário já existe
                SELECT id INTO user_id FROM users WHERE email = sup.contact_email;
                
                IF user_id IS NULL THEN
                    INSERT INTO users (
                        email, 
                        password_hash, 
                        name, 
                        phone,
                        role, 
                        is_active,
                        email_verified
                    ) VALUES (
                        sup.contact_email,
                        temp_password, -- Em produção, usar hash real
                        sup.name,
                        sup.contact_phone,
                        'seller',
                        sup.is_active,
                        false -- Email não verificado
                    )
                    RETURNING id INTO user_id;
                END IF;
                
                -- Criar seller se usuário foi criado/encontrado
                IF user_id IS NOT NULL THEN
                    -- Verificar se seller já existe para este supplier
                    SELECT id INTO seller_id FROM sellers WHERE supplier_id = sup.id;
                    
                    IF seller_id IS NULL THEN
                        -- Gerar slug único
                        DECLARE
                            base_slug TEXT;
                            final_slug TEXT;
                            counter INTEGER := 0;
                        BEGIN
                            base_slug := LOWER(REGEXP_REPLACE(sup.name, '[^a-zA-Z0-9]+', '-', 'g'));
                            base_slug := REGEXP_REPLACE(base_slug, '^-|-$', '', 'g');
                            final_slug := base_slug;
                            
                            -- Verificar unicidade do slug
                            WHILE EXISTS (SELECT 1 FROM sellers WHERE store_slug = final_slug) LOOP
                                counter := counter + 1;
                                final_slug := base_slug || '-' || counter;
                            END LOOP;
                            
                            INSERT INTO sellers (
                                user_id,
                                supplier_id,
                                store_name,
                                store_slug,
                                phone,
                                email,
                                status,
                                commission_rate,
                                cnpj,
                                company_name
                            ) VALUES (
                                user_id,
                                sup.id,
                                sup.name,
                                final_slug,
                                COALESCE(sup.contact_phone, 'Não informado'),
                                sup.contact_email,
                                CASE WHEN sup.is_active THEN 'active' ELSE 'suspended' END,
                                10.00, -- Taxa padrão
                                CASE 
                                    WHEN sup.code ~ '^\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}$' THEN sup.code
                                    ELSE NULL
                                END,
                                sup.name
                            )
                            RETURNING id INTO seller_id;
                        END;
                    END IF;
                    
                    -- Atualizar produtos
                    IF seller_id IS NOT NULL THEN
                        UPDATE products 
                        SET seller_id = seller_id
                        WHERE supplier_id = sup.id
                        AND seller_id IS NULL;
                        
                        GET DIAGNOSTICS products_count = ROW_COUNT;
                    END IF;
                END IF;
            ELSE
                error_message := 'Sem email de contato';
            END IF;
            
            -- Retornar resultado
            RETURN QUERY SELECT 
                sup.name::TEXT,
                (user_id IS NOT NULL),
                (seller_id IS NOT NULL),
                products_count,
                error_message;
                
        EXCEPTION WHEN OTHERS THEN
            -- Capturar erro
            error_message := SQLERRM;
            RETURN QUERY SELECT 
                sup.name::TEXT,
                false,
                false,
                0,
                error_message;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 3. EXECUTAR MIGRAÇÃO
-- =====================================================

-- Executar a migração e mostrar resultados
SELECT * FROM migrate_suppliers_to_sellers()
WHERE error_message IS NOT NULL OR products_updated > 0
ORDER BY supplier_name;

-- 4. VERIFICAR RESULTADOS
-- =====================================================

-- Resumo da migração
SELECT 
    'Resumo da Migração' as info,
    COUNT(DISTINCT s.id) as total_sellers_created,
    COUNT(DISTINCT u.id) as total_users_created,
    SUM(
        (SELECT COUNT(*) FROM products WHERE seller_id = s.id)
    ) as total_products_migrated
FROM sellers s
JOIN users u ON s.user_id = u.id
WHERE s.supplier_id IS NOT NULL;

-- Produtos ainda sem seller
SELECT 
    COUNT(*) as products_without_seller,
    COUNT(DISTINCT supplier_id) as unique_suppliers
FROM products
WHERE seller_id IS NULL;

-- Fornecedores não migrados
SELECT 
    s.id,
    s.name,
    s.contact_email,
    s.is_active,
    CASE 
        WHEN s.contact_email IS NULL THEN 'Sem email'
        WHEN NOT s.is_active THEN 'Inativo'
        WHEN EXISTS (SELECT 1 FROM sellers WHERE supplier_id = s.id) THEN 'Já migrado'
        ELSE 'Erro desconhecido'
    END as reason
FROM suppliers s
WHERE NOT EXISTS (
    SELECT 1 FROM sellers sel WHERE sel.supplier_id = s.id
)
ORDER BY s.name;

-- 5. QUERIES ÚTEIS PÓS-MIGRAÇÃO
-- =====================================================

-- Listar vendedores criados com seus produtos
SELECT 
    sel.store_name,
    sel.store_slug,
    u.email,
    sel.status,
    COUNT(p.id) as product_count,
    sel.created_at
FROM sellers sel
JOIN users u ON sel.user_id = u.id
LEFT JOIN products p ON p.seller_id = sel.id
WHERE sel.supplier_id IS NOT NULL
GROUP BY sel.id, sel.store_name, sel.store_slug, u.email, sel.status, sel.created_at
ORDER BY product_count DESC
LIMIT 20; 