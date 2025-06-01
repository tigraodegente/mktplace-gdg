-- =====================================================
-- SCRIPT PARA CORRIGIR ERROS DOS MÚLTIPLOS ROLES
-- =====================================================

-- 1. CORRIGIR ATUALIZAÇÃO DOS VENDEDORES EXISTENTES
-- =====================================================
UPDATE users SET 
    roles = '{vendor}',
    vendor_data = jsonb_build_object(
        'storeId', 'loja-' || LOWER(REPLACE(name, ' ', '-')),
        'storeName', 'Loja ' || name,
        'commission', 12.0,
        'verified', false
    )
WHERE role = 'seller' AND vendor_data IS NULL;

-- 2. CRIAR TABELA DE SESSÕES COM NOME CORRETO
-- =====================================================
DROP TABLE IF EXISTS user_sessions_multi_role;

CREATE TABLE IF NOT EXISTS user_sessions_multi_role (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    active_role TEXT NOT NULL,  -- Mudado de current_role para active_role
    available_apps TEXT[] NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_sessions_multi_role_token ON user_sessions_multi_role(token);
CREATE INDEX idx_user_sessions_multi_role_user_id ON user_sessions_multi_role(user_id);
CREATE INDEX idx_user_sessions_multi_role_expires_at ON user_sessions_multi_role(expires_at);

-- 3. CORRIGIR VENDEDORES EXISTENTES QUE FORAM MARCADOS COMO CUSTOMER
-- =====================================================
-- Buscar usuários que deveriam ser vendedores baseado na tabela sellers
UPDATE users 
SET roles = '{vendor}',
    vendor_data = jsonb_build_object(
        'storeId', s.id::text,
        'storeName', COALESCE(s.company_name, 'Loja ' || users.name),
        'commission', 12.0,
        'verified', COALESCE(s.is_verified, false)
    )
FROM sellers s 
WHERE users.id = s.user_id 
  AND NOT ('vendor' = ANY(users.roles));

-- 4. VERIFICAR ADMIN EXISTENTE E CORRIGIR SE NECESSÁRIO
-- =====================================================
UPDATE users 
SET roles = '{admin}',
    admin_data = jsonb_build_object(
        'permissions', ARRAY[
            'users.read', 'users.write', 'products.read', 'products.write',
            'orders.read', 'orders.write', 'vendors.read', 'vendors.write'
        ],
        'level', 'manager'
    )
WHERE role = 'admin' AND admin_data IS NULL;

-- 5. FUNÇÃO HELPER ATUALIZADA PARA VERIFICAR ROLES
-- =====================================================
CREATE OR REPLACE FUNCTION user_has_role(user_roles TEXT[], check_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN check_role = ANY(user_roles);
END;
$$ LANGUAGE plpgsql;

-- 6. FUNÇÃO PARA OBTER APPS DISPONÍVEIS POR USUÁRIO
-- =====================================================
CREATE OR REPLACE FUNCTION get_available_apps(user_roles TEXT[])
RETURNS TEXT[] AS $$
DECLARE
    apps TEXT[] := '{}';
BEGIN
    IF 'customer' = ANY(user_roles) THEN
        apps := array_append(apps, 'store');
    END IF;
    
    IF 'vendor' = ANY(user_roles) THEN
        apps := array_append(apps, 'vendor');
    END IF;
    
    IF 'admin' = ANY(user_roles) THEN
        apps := array_append(apps, 'admin');
    END IF;
    
    RETURN apps;
END;
$$ LANGUAGE plpgsql;

-- 7. VERIFICAR RESULTADOS FINAIS
-- =====================================================
SELECT 
    email, 
    name, 
    roles, 
    get_available_apps(roles) as available_apps,
    vendor_data IS NOT NULL as has_vendor_data,
    admin_data IS NOT NULL as has_admin_data,
    customer_data IS NOT NULL as has_customer_data
FROM users 
ORDER BY array_length(roles, 1) DESC, email;

-- 8. ESTATÍSTICAS FINAIS
-- =====================================================
SELECT 
    'Total de usuários' as metric,
    COUNT(*) as value
FROM users

UNION ALL

SELECT 
    'Com múltiplos roles' as metric,
    COUNT(*) as value
FROM users 
WHERE array_length(roles, 1) > 1

UNION ALL

SELECT 
    'Admins' as metric,
    COUNT(*) as value
FROM users 
WHERE 'admin' = ANY(roles)

UNION ALL

SELECT 
    'Vendedores' as metric,
    COUNT(*) as value
FROM users 
WHERE 'vendor' = ANY(roles)

UNION ALL

SELECT 
    'Clientes' as metric,
    COUNT(*) as value
FROM users 
WHERE 'customer' = ANY(roles);

-- =====================================================
-- SCRIPT DE CORREÇÃO COMPLETADO!
-- =====================================================
-- Usuários de teste criados:
-- 1. super@marketplace.com (password: password) - Admin + Vendedor + Cliente
-- 2. admin-cliente@marketplace.com (password: password) - Admin + Cliente
-- 3. vendedor-cliente@marketplace.com (password: password) - Vendedor + Cliente
-- ===================================================== 