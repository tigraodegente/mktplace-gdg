#!/bin/bash

# Configurações
API_KEY="xau_4YkLfHkfKWwzMmUzfLWuv1IfbS6M0r9D0"
DB_URL="https://GUSTAVO-FERRO-s-workspace-787mk0.us-east-1.xata.sh/db/mktplace-gdg:main/sql"

# Função para executar SQL
execute_sql() {
    local sql="$1"
    local description="$2"
    
    echo "Executando: $description"
    
    echo "{\"statement\": \"$sql\"}" > /tmp/sql_query.json
    
    response=$(curl -s -X POST "$DB_URL" \
        -H "Authorization: Bearer $API_KEY" \
        -H "Content-Type: application/json" \
        -d @/tmp/sql_query.json)
    
    if echo "$response" | grep -q '"message"'; then
        echo "❌ Erro: $response"
        return 1
    else
        echo "✅ Sucesso"
        return 0
    fi
}

echo "=== CRIANDO TABELAS DO MARKETPLACE ==="
echo ""

# 1. Tabela de endereços
echo "1. Criando tabela addresses..."
execute_sql "CREATE TABLE addresses (xata_id TEXT PRIMARY KEY, id TEXT UNIQUE NOT NULL, user_id TEXT NOT NULL REFERENCES users(id), type TEXT NOT NULL DEFAULT 'shipping', street TEXT NOT NULL, number TEXT NOT NULL, complement TEXT, neighborhood TEXT NOT NULL, city TEXT NOT NULL, state TEXT NOT NULL, country TEXT NOT NULL DEFAULT 'BR', postal_code TEXT NOT NULL, is_default BOOLEAN DEFAULT false, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_version INTEGER NOT NULL DEFAULT 0, xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata JSONB DEFAULT '{\\\"version\\\":0}'::jsonb)" "Create addresses"

# 2. Tabela de carrinho
echo ""
echo "2. Criando tabela carts..."
execute_sql "CREATE TABLE carts (xata_id TEXT PRIMARY KEY, id TEXT UNIQUE NOT NULL, user_id TEXT REFERENCES users(id), session_id TEXT, status TEXT NOT NULL DEFAULT 'active', expires_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_version INTEGER NOT NULL DEFAULT 0, xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata JSONB DEFAULT '{\\\"version\\\":0}'::jsonb)" "Create carts"

# 3. Tabela de itens do carrinho
echo ""
echo "3. Criando tabela cart_items..."
execute_sql "CREATE TABLE cart_items (xata_id TEXT PRIMARY KEY, id TEXT UNIQUE NOT NULL, cart_id TEXT NOT NULL REFERENCES carts(id) ON DELETE CASCADE, product_id TEXT NOT NULL REFERENCES products(id), quantity INTEGER NOT NULL DEFAULT 1, price DECIMAL(10,2) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_version INTEGER NOT NULL DEFAULT 0, xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata JSONB DEFAULT '{\\\"version\\\":0}'::jsonb)" "Create cart_items"

# 4. Tabela de pedidos
echo ""
echo "4. Criando tabela orders..."
execute_sql "CREATE TABLE orders (xata_id TEXT PRIMARY KEY, id TEXT UNIQUE NOT NULL, order_number TEXT UNIQUE NOT NULL, user_id TEXT NOT NULL REFERENCES users(id), status TEXT NOT NULL DEFAULT 'pending', subtotal DECIMAL(10,2) NOT NULL, shipping_cost DECIMAL(10,2) NOT NULL DEFAULT 0, discount DECIMAL(10,2) NOT NULL DEFAULT 0, tax DECIMAL(10,2) NOT NULL DEFAULT 0, total DECIMAL(10,2) NOT NULL, payment_status TEXT NOT NULL DEFAULT 'pending', payment_method TEXT, shipping_address_id TEXT, billing_address_id TEXT, notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_version INTEGER NOT NULL DEFAULT 0, xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata JSONB DEFAULT '{\\\"version\\\":0}'::jsonb)" "Create orders"

# 5. Tabela de itens do pedido
echo ""
echo "5. Criando tabela order_items..."
execute_sql "CREATE TABLE order_items (xata_id TEXT PRIMARY KEY, id TEXT UNIQUE NOT NULL, order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE, product_id TEXT NOT NULL REFERENCES products(id), seller_id TEXT REFERENCES sellers(id), quantity INTEGER NOT NULL, price DECIMAL(10,2) NOT NULL, discount DECIMAL(10,2) DEFAULT 0, total DECIMAL(10,2) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_version INTEGER NOT NULL DEFAULT 0, xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata JSONB DEFAULT '{\\\"version\\\":0}'::jsonb)" "Create order_items"

# 6. Tabela de avaliações
echo ""
echo "6. Criando tabela reviews..."
execute_sql "CREATE TABLE reviews (xata_id TEXT PRIMARY KEY, id TEXT UNIQUE NOT NULL, product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id), order_item_id TEXT REFERENCES order_items(id), rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5), title TEXT, comment TEXT, is_verified_purchase BOOLEAN DEFAULT false, helpful_count INTEGER DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_version INTEGER NOT NULL DEFAULT 0, xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata JSONB DEFAULT '{\\\"version\\\":0}'::jsonb)" "Create reviews"

# 7. Tabela de favoritos
echo ""
echo "7. Criando tabela wishlists..."
execute_sql "CREATE TABLE wishlists (xata_id TEXT PRIMARY KEY, id TEXT UNIQUE NOT NULL, user_id TEXT NOT NULL REFERENCES users(id), product_id TEXT NOT NULL REFERENCES products(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_version INTEGER NOT NULL DEFAULT 0, xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata JSONB DEFAULT '{\\\"version\\\":0}'::jsonb, UNIQUE(user_id, product_id))" "Create wishlists"

# 8. Tabela de cupons
echo ""
echo "8. Criando tabela coupons..."
execute_sql "CREATE TABLE coupons (xata_id TEXT PRIMARY KEY, id TEXT UNIQUE NOT NULL, code TEXT UNIQUE NOT NULL, description TEXT, type TEXT NOT NULL DEFAULT 'percentage', value DECIMAL(10,2) NOT NULL, minimum_amount DECIMAL(10,2), maximum_discount DECIMAL(10,2), usage_limit INTEGER, used_count INTEGER DEFAULT 0, is_active BOOLEAN DEFAULT true, valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(), valid_until TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_version INTEGER NOT NULL DEFAULT 0, xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata JSONB DEFAULT '{\\\"version\\\":0}'::jsonb)" "Create coupons"

# 9. Tabela de uso de cupons
echo ""
echo "9. Criando tabela coupon_usage..."
execute_sql "CREATE TABLE coupon_usage (xata_id TEXT PRIMARY KEY, id TEXT UNIQUE NOT NULL, coupon_id TEXT NOT NULL REFERENCES coupons(id), user_id TEXT NOT NULL REFERENCES users(id), order_id TEXT REFERENCES orders(id), used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_version INTEGER NOT NULL DEFAULT 0, xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata JSONB DEFAULT '{\\\"version\\\":0}'::jsonb)" "Create coupon_usage"

# 10. Tabela de notificações
echo ""
echo "10. Criando tabela notifications..."
execute_sql "CREATE TABLE notifications (xata_id TEXT PRIMARY KEY, id TEXT UNIQUE NOT NULL, user_id TEXT NOT NULL REFERENCES users(id), type TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL, data JSONB, is_read BOOLEAN DEFAULT false, read_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_version INTEGER NOT NULL DEFAULT 0, xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata JSONB DEFAULT '{\\\"version\\\":0}'::jsonb)" "Create notifications"

# 11. Tabela de sessões
echo ""
echo "11. Criando tabela sessions..."
execute_sql "CREATE TABLE sessions (xata_id TEXT PRIMARY KEY, id TEXT UNIQUE NOT NULL, user_id TEXT NOT NULL REFERENCES users(id), token TEXT UNIQUE NOT NULL, ip_address TEXT, user_agent TEXT, expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_version INTEGER NOT NULL DEFAULT 0, xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata JSONB DEFAULT '{\\\"version\\\":0}'::jsonb)" "Create sessions"

# 12. Tabela de métodos de pagamento
echo ""
echo "12. Criando tabela payment_methods..."
execute_sql "CREATE TABLE payment_methods (xata_id TEXT PRIMARY KEY, id TEXT UNIQUE NOT NULL, name TEXT NOT NULL, type TEXT NOT NULL, is_active BOOLEAN DEFAULT true, configuration JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_version INTEGER NOT NULL DEFAULT 0, xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata JSONB DEFAULT '{\\\"version\\\":0}'::jsonb)" "Create payment_methods"

# 13. Tabela de transações de pagamento
echo ""
echo "13. Criando tabela payment_transactions..."
execute_sql "CREATE TABLE payment_transactions (xata_id TEXT PRIMARY KEY, id TEXT UNIQUE NOT NULL, order_id TEXT NOT NULL REFERENCES orders(id), payment_method_id TEXT REFERENCES payment_methods(id), transaction_id TEXT, status TEXT NOT NULL DEFAULT 'pending', amount DECIMAL(10,2) NOT NULL, currency TEXT NOT NULL DEFAULT 'BRL', gateway_response JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_version INTEGER NOT NULL DEFAULT 0, xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata JSONB DEFAULT '{\\\"version\\\":0}'::jsonb)" "Create payment_transactions"

# 14. Tabela de métodos de envio
echo ""
echo "14. Criando tabela shipping_methods..."
execute_sql "CREATE TABLE shipping_methods (xata_id TEXT PRIMARY KEY, id TEXT UNIQUE NOT NULL, name TEXT NOT NULL, description TEXT, base_cost DECIMAL(10,2) NOT NULL, cost_per_kg DECIMAL(10,2) DEFAULT 0, estimated_days_min INTEGER, estimated_days_max INTEGER, is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_version INTEGER NOT NULL DEFAULT 0, xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata JSONB DEFAULT '{\\\"version\\\":0}'::jsonb)" "Create shipping_methods"

# Limpar arquivo temporário
rm -f /tmp/sql_query.json

echo ""
echo "=== CRIAÇÃO DE TABELAS CONCLUÍDA ==="
echo ""
echo "Tabelas criadas:"
echo "✅ addresses - Endereços dos usuários"
echo "✅ carts - Carrinhos de compra"
echo "✅ cart_items - Itens do carrinho"
echo "✅ orders - Pedidos"
echo "✅ order_items - Itens dos pedidos"
echo "✅ reviews - Avaliações de produtos"
echo "✅ wishlists - Lista de favoritos"
echo "✅ coupons - Cupons de desconto"
echo "✅ coupon_usage - Uso de cupons"
echo "✅ notifications - Notificações"
echo "✅ sessions - Sessões de usuário"
echo "✅ payment_methods - Métodos de pagamento"
echo "✅ payment_transactions - Transações de pagamento"
echo "✅ shipping_methods - Métodos de envio"
echo ""
echo "Próximo passo: Executar 'xata pull main' para atualizar o cliente tipado" 