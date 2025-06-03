-- Migration: Sistema de Permissões
-- Data: 2025-01-13
-- Descrição: Adiciona sistema completo de permissões com roles flexíveis

-- 1. Criar tabela de permissões
CREATE TABLE IF NOT EXISTS permissions (
  id text PRIMARY KEY DEFAULT ('perm_' || replace(gen_random_uuid()::text, '-', '')),
  name text NOT NULL UNIQUE,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT NOW(),
  updated_at timestamp DEFAULT NOW()
);

-- 2. Criar tabela de permissões por role
CREATE TABLE IF NOT EXISTS role_permissions (
  id text PRIMARY KEY DEFAULT ('rp_' || replace(gen_random_uuid()::text, '-', '')),
  role text NOT NULL,
  permission_id text NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at timestamp DEFAULT NOW(),
  UNIQUE(role, permission_id)
);

-- 3. Expandir tabela users com novos campos
ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_permissions jsonb DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled boolean DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_ip text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at timestamp;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires timestamp;

-- 4. Renomear coluna is_active para manter compatibilidade
UPDATE users SET status = CASE 
  WHEN is_active = true THEN 'active'
  ELSE 'inactive'
END WHERE status = 'active';

-- 5. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_permissions_category ON permissions(category);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);

-- 6. Inserir permissões base do sistema
INSERT INTO permissions (name, description, category) VALUES
  -- Usuários
  ('users.read', 'Visualizar usuários', 'users'),
  ('users.write', 'Criar e editar usuários', 'users'),
  ('users.delete', 'Deletar/desativar usuários', 'users'),
  ('users.manage_permissions', 'Gerenciar permissões customizadas', 'users'),
  ('users.create_admin', 'Criar usuários administradores', 'users'),
  
  -- Produtos
  ('products.read', 'Visualizar produtos', 'products'),
  ('products.write', 'Criar e editar produtos', 'products'),
  ('products.delete', 'Deletar produtos', 'products'),
  ('products.approve', 'Aprovar produtos pendentes', 'products'),
  ('products.bulk_edit', 'Edição em lote de produtos', 'products'),
  
  -- Pedidos
  ('orders.read', 'Visualizar pedidos', 'orders'),
  ('orders.write', 'Editar status de pedidos', 'orders'),
  ('orders.cancel', 'Cancelar pedidos', 'orders'),
  ('orders.fulfill', 'Processar e enviar pedidos', 'orders'),
  ('orders.refund', 'Processar reembolsos', 'orders'),
  
  -- Vendedores
  ('sellers.read', 'Visualizar vendedores', 'sellers'),
  ('sellers.write', 'Editar dados de vendedores', 'sellers'),
  ('sellers.approve', 'Aprovar novos vendedores', 'sellers'),
  ('sellers.suspend', 'Suspender vendedores', 'sellers'),
  ('sellers.commission', 'Alterar comissões', 'sellers'),
  
  -- Categorias e Marcas
  ('categories.read', 'Visualizar categorias', 'catalog'),
  ('categories.write', 'Gerenciar categorias', 'catalog'),
  ('brands.read', 'Visualizar marcas', 'catalog'),
  ('brands.write', 'Gerenciar marcas', 'catalog'),
  
  -- Cupons
  ('coupons.read', 'Visualizar cupons', 'promotions'),
  ('coupons.write', 'Criar e editar cupons', 'promotions'),
  ('coupons.delete', 'Deletar cupons', 'promotions'),
  
  -- Relatórios
  ('reports.read', 'Visualizar relatórios', 'reports'),
  ('reports.export', 'Exportar relatórios', 'reports'),
  ('reports.financial', 'Relatórios financeiros', 'reports'),
  
  -- Sistema
  ('settings.read', 'Visualizar configurações', 'system'),
  ('settings.write', 'Alterar configurações', 'system'),
  ('integrations.read', 'Visualizar integrações', 'system'),
  ('integrations.write', 'Gerenciar integrações', 'system'),
  
  -- Financeiro
  ('financial.read', 'Visualizar dados financeiros', 'financial'),
  ('financial.write', 'Gerenciar dados financeiros', 'financial'),
  ('financial.payouts', 'Processar pagamentos', 'financial');

-- 7. Definir permissões por role
-- Admin tem todas as permissões
INSERT INTO role_permissions (role, permission_id) 
SELECT 'admin', id FROM permissions 
ON CONFLICT (role, permission_id) DO NOTHING;

-- Vendor/Seller - permissões limitadas
INSERT INTO role_permissions (role, permission_id)
SELECT 'vendor', id FROM permissions 
WHERE name IN (
  'products.read', 'products.write', 'products.delete',
  'orders.read', 'orders.fulfill',
  'reports.read',
  'settings.read'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- Customer - sem permissões administrativas (apenas interface pública)
-- Não inserimos permissões para customer pois eles usam a loja pública

-- 8. Criar trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_permissions_updated_at 
  BEFORE UPDATE ON permissions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. Criar função helper para verificar permissões
CREATE OR REPLACE FUNCTION user_has_permission(user_id_param text, permission_name text)
RETURNS boolean AS $$
DECLARE
  has_perm boolean := false;
BEGIN
  -- Verificar permissão por role
  SELECT EXISTS(
    SELECT 1 FROM users u
    JOIN role_permissions rp ON rp.role = u.role
    JOIN permissions p ON p.id = rp.permission_id
    WHERE u.id = user_id_param 
    AND p.name = permission_name
    AND u.status = 'active'
    AND p.is_active = true
  ) INTO has_perm;
  
  -- Se não tem por role, verificar permissões customizadas
  IF NOT has_perm THEN
    SELECT EXISTS(
      SELECT 1 FROM users u
      WHERE u.id = user_id_param
      AND u.status = 'active'
      AND u.custom_permissions ? permission_name
    ) INTO has_perm;
  END IF;
  
  RETURN has_perm;
END;
$$ LANGUAGE plpgsql;

-- 10. Comentários nas tabelas
COMMENT ON TABLE permissions IS 'Sistema de permissões granulares';
COMMENT ON TABLE role_permissions IS 'Mapeamento de permissões por role';
COMMENT ON COLUMN users.custom_permissions IS 'Permissões customizadas específicas do usuário (JSON array)';
COMMENT ON COLUMN users.two_factor_enabled IS 'Se o usuário tem 2FA ativado';
COMMENT ON COLUMN users.status IS 'Status do usuário: active, inactive, pending, suspended'; 