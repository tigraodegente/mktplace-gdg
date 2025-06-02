-- =====================================================
-- SCRIPT PARA IMPLEMENTAR MÚLTIPLOS ROLES NO BANCO
-- =====================================================

-- 1. VERIFICAR ESTRUTURA ATUAL
-- =====================================================
\d users;

-- 2. BACKUP DA ESTRUTURA ATUAL
-- =====================================================
CREATE TABLE users_backup_roles AS SELECT * FROM users;

-- 3. ADICIONAR COLUNA PARA MÚLTIPLOS ROLES
-- =====================================================
-- Adicionar nova coluna para array de roles
ALTER TABLE users ADD COLUMN roles TEXT[] DEFAULT '{customer}';

-- Migrar dados existentes para novo formato
UPDATE users SET roles = ARRAY[role] WHERE roles IS NULL OR roles = '{}';

-- Adicionar dados específicos para vendedores e admins
ALTER TABLE users ADD COLUMN vendor_data JSONB DEFAULT NULL;
ALTER TABLE users ADD COLUMN admin_data JSONB DEFAULT NULL;
ALTER TABLE users ADD COLUMN customer_data JSONB DEFAULT '{"addresses": []}';

-- 4. CRIAR USUÁRIOS DE EXEMPLO COM MÚLTIPLOS ROLES
-- =====================================================

-- Admin que também é cliente
INSERT INTO users (
    email, password_hash, name, roles, admin_data, customer_data,
    is_active, email_verified, created_at, updated_at
) VALUES (
    'admin-cliente@marketplace.com',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: password
    'Admin João',
    '{admin,customer}',
    '{"permissions": ["users.read", "users.write", "products.read", "products.write", "orders.read", "orders.write", "vendors.read", "vendors.write"], "level": "super"}',
    '{"phone": "+5511999999999", "addresses": []}',
    true,
    true,
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    roles = '{admin,customer}',
    admin_data = '{"permissions": ["users.read", "users.write", "products.read", "products.write", "orders.read", "orders.write", "vendors.read", "vendors.write"], "level": "super"}',
    customer_data = '{"phone": "+5511999999999", "addresses": []}';

-- Vendedor que também é cliente
INSERT INTO users (
    email, password_hash, name, roles, vendor_data, customer_data,
    is_active, email_verified, created_at, updated_at
) VALUES (
    'vendedor-cliente@marketplace.com',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: password
    'Vendedor Maria',
    '{vendor,customer}',
    '{"storeId": "loja-maria", "storeName": "Loja da Maria", "commission": 15.0, "verified": true}',
    '{"phone": "+5511888888888", "addresses": []}',
    true,
    true,
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    roles = '{vendor,customer}',
    vendor_data = '{"storeId": "loja-maria", "storeName": "Loja da Maria", "commission": 15.0, "verified": true}',
    customer_data = '{"phone": "+5511888888888", "addresses": []}';

-- Super usuário com todos os roles
INSERT INTO users (
    email, password_hash, name, roles, admin_data, vendor_data, customer_data,
    is_active, email_verified, created_at, updated_at
) VALUES (
    'super@marketplace.com',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: password
    'Super User',
    '{admin,vendor,customer}',
    '{"permissions": ["users.read", "users.write", "products.read", "products.write", "orders.read", "orders.write", "vendors.read", "vendors.write", "reports.read", "reports.export", "settings.read", "settings.write"], "level": "super"}',
    '{"storeId": "super-store", "storeName": "Super Store", "commission": 10.0, "verified": true}',
    '{"phone": "+5511777777777", "addresses": []}',
    true,
    true,
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET
    roles = '{admin,vendor,customer}',
    admin_data = '{"permissions": ["users.read", "users.write", "products.read", "products.write", "orders.read", "orders.write", "vendors.read", "vendors.write", "reports.read", "reports.export", "settings.read", "settings.write"], "level": "super"}',
    vendor_data = '{"storeId": "super-store", "storeName": "Super Store", "commission": 10.0, "verified": true}',
    customer_data = '{"phone": "+5511777777777", "addresses": []}';

-- 5. ATUALIZAR USUÁRIOS EXISTENTES
-- =====================================================

-- Atualizar admin existente
UPDATE users SET 
    roles = '{admin}',
    admin_data = '{"permissions": ["users.read", "users.write", "products.read", "products.write", "orders.read", "orders.write", "vendors.read", "vendors.write"], "level": "manager"}'
WHERE role = 'admin' AND admin_data IS NULL;

-- Atualizar vendedores existentes
UPDATE users SET 
    roles = '{vendor}',
    vendor_data = '{"storeId": "loja-" || LOWER(REPLACE(name, " ", "-")), "storeName": "Loja " || name, "commission": 12.0, "verified": false}'
WHERE role = 'seller' AND vendor_data IS NULL;

-- Atualizar clientes existentes  
UPDATE users SET 
    roles = '{customer}',
    customer_data = '{"addresses": []}'
WHERE role = 'customer' AND customer_data IS NULL;

-- 6. CRIAR TABELA PARA SESSÕES COM MÚLTIPLOS ROLES
-- =====================================================
CREATE TABLE IF NOT EXISTS user_sessions_multi_role (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    current_role TEXT NOT NULL,
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

-- 7. CRIAR ÍNDICES PARA PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_users_roles ON users USING GIN(roles);
CREATE INDEX IF NOT EXISTS idx_users_vendor_data ON users USING GIN(vendor_data);
CREATE INDEX IF NOT EXISTS idx_users_admin_data ON users USING GIN(admin_data);

-- 8. FUNÇÃO HELPER PARA VERIFICAR ROLES
-- =====================================================
CREATE OR REPLACE FUNCTION user_has_role(user_roles TEXT[], check_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN check_role = ANY(user_roles);
END;
$$ LANGUAGE plpgsql;

-- 9. VERIFICAR RESULTADOS
-- =====================================================
SELECT 
    email, 
    name, 
    roles, 
    vendor_data IS NOT NULL as has_vendor_data,
    admin_data IS NOT NULL as has_admin_data,
    customer_data IS NOT NULL as has_customer_data
FROM users 
ORDER BY array_length(roles, 1) DESC, email;

-- 10. MOSTRAR ESTATÍSTICAS
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
-- SCRIPT COMPLETADO!
-- =====================================================
-- Para testar:
-- 1. Login com super@marketplace.com (password: password)
-- 2. Deve mostrar seletor de roles: Admin, Vendedor, Cliente
-- 3. Pode alternar entre contextos sem logout
-- ===================================================== 