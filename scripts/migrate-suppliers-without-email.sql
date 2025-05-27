-- =====================================================
-- MIGRAÇÃO DE FORNECEDORES SEM EMAIL
-- =====================================================

-- 1. CRIAR FUNÇÃO DE MIGRAÇÃO ALTERNATIVA
-- =====================================================

CREATE OR REPLACE FUNCTION migrate_suppliers_without_email()
RETURNS TABLE (
    supplier_name TEXT,
    user_created BOOLEAN,
    seller_created BOOLEAN,
    products_updated INTEGER,
    generated_email TEXT
) AS $$
DECLARE
    sup RECORD;
    user_id UUID;
    seller_id UUID;
    products_count INTEGER;
    temp_email TEXT;
    temp_password TEXT;
    base_slug TEXT;
    final_slug TEXT;
    counter INTEGER;
BEGIN
    -- Loop através de todos os fornecedores ativos
    FOR sup IN 
        SELECT * FROM suppliers 
        WHERE is_active = true
        ORDER BY name
    LOOP
        BEGIN
            -- Resetar variáveis
            user_id := NULL;
            seller_id := NULL;
            products_count := 0;
            
            -- Gerar email temporário baseado no código ou nome
            IF sup.code IS NOT NULL AND sup.code != '' THEN
                temp_email := LOWER(REGEXP_REPLACE(sup.code, '[^a-zA-Z0-9]', '', 'g')) || '@marketplace-temp.com';
            ELSE
                temp_email := LOWER(REGEXP_REPLACE(sup.name, '[^a-zA-Z0-9]', '', 'g')) || '@marketplace-temp.com';
            END IF;
            
            -- Garantir unicidade do email
            counter := 1;
            WHILE EXISTS (SELECT 1 FROM users WHERE email = temp_email) LOOP
                IF sup.code IS NOT NULL AND sup.code != '' THEN
                    temp_email := LOWER(REGEXP_REPLACE(sup.code, '[^a-zA-Z0-9]', '', 'g')) || counter || '@marketplace-temp.com';
                ELSE
                    temp_email := LOWER(REGEXP_REPLACE(sup.name, '[^a-zA-Z0-9]', '', 'g')) || counter || '@marketplace-temp.com';
                END IF;
                counter := counter + 1;
            END LOOP;
            
            -- Gerar senha temporária
            temp_password := 'temp_' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 8);
            
            -- Criar usuário
            INSERT INTO users (
                email, 
                password_hash, 
                name, 
                phone,
                role, 
                is_active,
                email_verified
            ) VALUES (
                temp_email,
                temp_password, -- Em produção, usar hash real
                sup.name,
                COALESCE(sup.contact_phone, 'Não informado'),
                'seller',
                sup.is_active,
                false -- Email não verificado
            )
            RETURNING id INTO user_id;
            
            -- Criar seller
            IF user_id IS NOT NULL THEN
                -- Gerar slug único
                base_slug := LOWER(REGEXP_REPLACE(sup.name, '[^a-zA-Z0-9]+', '-', 'g'));
                base_slug := REGEXP_REPLACE(base_slug, '^-|-$', '', 'g');
                final_slug := base_slug;
                counter := 0;
                
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
                    COALESCE(sup.contact_email, temp_email),
                    'active', -- Todos ativos já que filtramos apenas ativos
                    10.00, -- Taxa padrão
                    CASE 
                        WHEN sup.code ~ '^\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}$' THEN sup.code
                        ELSE NULL
                    END,
                    sup.name
                )
                RETURNING id INTO seller_id;
                
                -- Atualizar produtos
                IF seller_id IS NOT NULL THEN
                    UPDATE products 
                    SET seller_id = seller_id
                    WHERE supplier_id = sup.id
                    AND seller_id IS NULL;
                    
                    GET DIAGNOSTICS products_count = ROW_COUNT;
                END IF;
            END IF;
            
            -- Retornar resultado
            RETURN QUERY SELECT 
                sup.name::TEXT,
                (user_id IS NOT NULL),
                (seller_id IS NOT NULL),
                products_count,
                temp_email;
                
        EXCEPTION WHEN OTHERS THEN
            -- Em caso de erro, continuar com próximo
            RAISE NOTICE 'Erro ao migrar %: %', sup.name, SQLERRM;
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 2. EXECUTAR MIGRAÇÃO
-- =====================================================

-- Executar a migração
SELECT * FROM migrate_suppliers_without_email()
WHERE products_updated > 0
ORDER BY products_updated DESC, supplier_name
LIMIT 50;

-- 3. VERIFICAR RESULTADOS
-- =====================================================

-- Total de vendedores criados
SELECT COUNT(*) as sellers_created FROM sellers WHERE supplier_id IS NOT NULL;

-- Total de produtos migrados
SELECT COUNT(*) as products_with_seller FROM products WHERE seller_id IS NOT NULL;

-- Top 10 vendedores por quantidade de produtos
SELECT 
    s.store_name,
    s.store_slug,
    u.email,
    COUNT(p.id) as product_count,
    s.commission_rate,
    s.status
FROM sellers s
JOIN users u ON s.user_id = u.id
LEFT JOIN products p ON p.seller_id = s.id
WHERE s.supplier_id IS NOT NULL
GROUP BY s.id, s.store_name, s.store_slug, u.email, s.commission_rate, s.status
ORDER BY product_count DESC
LIMIT 10;

-- 4. CRIAR ARQUIVO COM CREDENCIAIS
-- =====================================================

-- Exportar credenciais temporárias para arquivo
\COPY (
    SELECT 
        s.store_name,
        s.store_slug,
        u.email as temp_email,
        'temp_password' as temp_password,
        s.cnpj,
        s.phone,
        COUNT(p.id) as products
    FROM sellers s
    JOIN users u ON s.user_id = u.id
    LEFT JOIN products p ON p.seller_id = s.id
    WHERE s.supplier_id IS NOT NULL
    GROUP BY s.id, s.store_name, s.store_slug, u.email, s.cnpj, s.phone
    ORDER BY s.store_name
) TO '/tmp/sellers_credentials.csv' WITH CSV HEADER;

-- Mensagem final
SELECT 'Migração concluída! Credenciais temporárias salvas em /tmp/sellers_credentials.csv' as message; 