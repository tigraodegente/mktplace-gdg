# 📋 Guia Visual de Migração Manual - Passo a Passo

## 🎯 Opção 1: Via Xata Dashboard (Mais Fácil)

### 1. Acesse o Xata Dashboard
- 🔗 Link: https://app.xata.io
- Faça login com suas credenciais
- Selecione o workspace: `GUSTAVO-FERRO-s-workspace`
- Selecione o banco: `mktplace-gdg`

### 2. Acesse o SQL Editor
- No menu lateral, procure por "SQL Editor" ou "Query"
- Ou acesse diretamente: https://app.xata.io/workspaces/GUSTAVO-FERRO-s-workspace-787mk0/dbs/mktplace-gdg:us-east-1/query

### 3. Execute os Scripts

**⚠️ IMPORTANTE: Execute cada bloco separadamente e aguarde a confirmação antes de prosseguir**

#### 📦 Bloco 1: Criar tabela users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  cpf TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'customer',
  is_active BOOLEAN NOT NULL DEFAULT true,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_role CHECK (role IN ('customer', 'seller', 'admin'))
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```
✅ Aguarde mensagem de sucesso

#### 📦 Bloco 2: Criar tabela sellers
```sql
CREATE TABLE sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id),
  store_name TEXT NOT NULL,
  store_slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  cnpj TEXT,
  company_name TEXT,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  rating NUMERIC(3,2),
  total_sales INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_status CHECK (status IN ('pending', 'active', 'suspended', 'banned'))
);

CREATE INDEX idx_sellers_user_id ON sellers(user_id);
CREATE INDEX idx_sellers_status ON sellers(status);
CREATE INDEX idx_sellers_store_slug ON sellers(store_slug);
```
✅ Aguarde mensagem de sucesso

#### 📦 Bloco 3: Criar tabela orders
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  subtotal NUMERIC(10,2) NOT NULL,
  shipping NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_order_status CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
  CONSTRAINT check_payment_status CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'))
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
```
✅ Aguarde mensagem de sucesso

#### 📦 Bloco 4: Criar tabela order_items
```sql
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  seller_id UUID NOT NULL REFERENCES sellers(id),
  price NUMERIC(10,2) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  total NUMERIC(10,2) NOT NULL,
  commission_amount NUMERIC(10,2),
  seller_amount NUMERIC(10,2),
  fulfillment_status TEXT DEFAULT 'pending',
  tracking_info JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_seller_id ON order_items(seller_id);
```
✅ Aguarde mensagem de sucesso

#### 📦 Bloco 5: Criar tabelas addresses e cart_items
```sql
CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('shipping', 'billing')),
  is_default BOOLEAN DEFAULT false,
  name TEXT NOT NULL,
  street TEXT NOT NULL,
  number TEXT NOT NULL,
  complement TEXT,
  district TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'BR',
  postal_code TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);
```
✅ Aguarde mensagem de sucesso

#### 📦 Bloco 6: Adicionar colunas nas tabelas existentes
```sql
ALTER TABLE products ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES sellers(id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS position INTEGER;
ALTER TABLE product_images ADD COLUMN IF NOT EXISTS alt TEXT;
```
✅ Aguarde mensagem de sucesso

#### 📦 Bloco 7: Copiar dados e criar admin
```sql
UPDATE categories SET position = display_order WHERE position IS NULL;
UPDATE product_images SET alt = alt_text WHERE alt IS NULL;
UPDATE products SET featured = is_visible WHERE featured IS NULL;

INSERT INTO users (email, password_hash, name, role, is_active, email_verified)
VALUES ('admin@marketplace.com', 'CHANGE_THIS_PASSWORD', 'Administrador', 'admin', true, true)
ON CONFLICT (email) DO NOTHING;
```
✅ Aguarde mensagem de sucesso

### 4. Verificar a Migração

Execute este script para verificar se tudo foi criado corretamente:

```sql
-- Verificar tabelas criadas
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'sellers', 'orders', 'order_items', 'addresses', 'cart_items')
ORDER BY tablename;

-- Verificar contagem de registros originais
SELECT 
    'products' as table_name, COUNT(*) as count FROM products
UNION ALL
SELECT 'categories', COUNT(*) FROM categories
UNION ALL
SELECT 'brands', COUNT(*) FROM brands;

-- Verificar se admin foi criado
SELECT * FROM users WHERE role = 'admin';
```

## 🎯 Opção 2: Via Terminal (psql)

### 1. Instalar PostgreSQL Client (se necessário)
```bash
# macOS
brew install postgresql

# Ubuntu/Debian
sudo apt-get install postgresql-client

# Windows
# Baixe de: https://www.postgresql.org/download/windows/
```

### 2. Conectar ao Banco
```bash
psql "postgresql://DB_USER:DB_PASSWORD@DB_HOST/DB_NAME?sslmode=require"
```

### 3. Executar o Script
```sql
\i /Users/guga/apps/mktplace-gdg/scripts/execute-migration-step-by-step.sql
```

## ✅ Checklist de Verificação

Após executar todos os passos, verifique:

- [ ] 6 novas tabelas criadas (users, sellers, orders, order_items, addresses, cart_items)
- [ ] 5 novas colunas adicionadas nas tabelas existentes
- [ ] Usuário admin criado
- [ ] Nenhum dado perdido (11.563 produtos, 158 brands, etc.)

## 🚨 Em Caso de Problemas

1. **Erro de permissão**: Verifique se está usando as credenciais corretas
2. **Erro de sintaxe**: Execute cada bloco separadamente
3. **Erro de constraint**: Verifique se as tabelas referenciadas existem
4. **Para reverter**: Use o backup criado anteriormente

## 📞 Suporte

- Documentação Xata: https://xata.io/docs
- SQL Reference: https://www.postgresql.org/docs/current/sql.html 