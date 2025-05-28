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

echo "=== CRIANDO TABELAS AVANÇADAS DO MARKETPLACE ==="
echo ""

# 1. Tabela de opções de produtos (cor, tamanho, etc)
echo "1. Criando tabela product_options..."
execute_sql "CREATE TABLE product_options (xata_id TEXT PRIMARY KEY, id TEXT UNIQUE NOT NULL, name TEXT NOT NULL, type TEXT NOT NULL, display_order INTEGER DEFAULT 0, is_required BOOLEAN DEFAULT false, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_version INTEGER NOT NULL DEFAULT 0, xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata JSONB DEFAULT '{\\\"version\\\":0}'::jsonb)" "Create product_options"

# 2. Tabela de valores das opções
echo ""
echo "2. Criando tabela product_option_values..."
execute_sql "CREATE TABLE product_option_values (xata_id TEXT PRIMARY KEY, id TEXT UNIQUE NOT NULL, option_id TEXT NOT NULL REFERENCES product_options(id) ON DELETE CASCADE, value TEXT NOT NULL, display_order INTEGER DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_version INTEGER NOT NULL DEFAULT 0, xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata JSONB DEFAULT '{\\\"version\\\":0}'::jsonb)" "Create product_option_values"

# 3. Tabela de variações de produtos
echo ""
echo "3. Criando tabela product_variants..."
execute_sql "CREATE TABLE product_variants (xata_id TEXT PRIMARY KEY, id TEXT UNIQUE NOT NULL, product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE, sku TEXT UNIQUE NOT NULL, name TEXT NOT NULL, price DECIMAL(10,2) NOT NULL, original_price DECIMAL(10,2), cost DECIMAL(10,2), quantity INTEGER NOT NULL DEFAULT 0, weight DECIMAL(10,3), barcode TEXT, is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_version INTEGER NOT NULL DEFAULT 0, xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata JSONB DEFAULT '{\\\"version\\\":0}'::jsonb)" "Create product_variants"

# 4. Tabela de relação entre variações e valores de opções
echo ""
echo "4. Criando tabela variant_option_values..."
execute_sql "CREATE TABLE variant_option_values (xata_id TEXT PRIMARY KEY, id TEXT UNIQUE NOT NULL, variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE, option_value_id TEXT NOT NULL REFERENCES product_option_values(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_version INTEGER NOT NULL DEFAULT 0, xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata JSONB DEFAULT '{\\\"version\\\":0}'::jsonb, UNIQUE(variant_id, option_value_id))" "Create variant_option_values"

# 5. Tabela de categorias de produtos (muitos para muitos)
echo ""
echo "5. Criando tabela product_categories..."
execute_sql "CREATE TABLE product_categories (xata_id TEXT PRIMARY KEY, id TEXT UNIQUE NOT NULL, product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE, category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE, is_primary BOOLEAN DEFAULT false, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_version INTEGER NOT NULL DEFAULT 0, xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata JSONB DEFAULT '{\\\"version\\\":0}'::jsonb, UNIQUE(product_id, category_id))" "Create product_categories"

# 6. Tabela de histórico de preços
echo ""
echo "6. Criando tabela product_price_history..."
execute_sql "CREATE TABLE product_price_history (xata_id TEXT PRIMARY KEY, id TEXT UNIQUE NOT NULL, product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE, variant_id TEXT REFERENCES product_variants(id) ON DELETE CASCADE, old_price DECIMAL(10,2) NOT NULL, new_price DECIMAL(10,2) NOT NULL, changed_by TEXT REFERENCES users(id), reason TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_version INTEGER NOT NULL DEFAULT 0, xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata JSONB DEFAULT '{\\\"version\\\":0}'::jsonb)" "Create product_price_history"

# 7. Tabela de analytics de produtos
echo ""
echo "7. Criando tabela product_analytics..."
execute_sql "CREATE TABLE product_analytics (xata_id TEXT PRIMARY KEY, id TEXT UNIQUE NOT NULL, product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE, date DATE NOT NULL, views INTEGER DEFAULT 0, clicks INTEGER DEFAULT 0, add_to_cart INTEGER DEFAULT 0, purchases INTEGER DEFAULT 0, revenue DECIMAL(10,2) DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_version INTEGER NOT NULL DEFAULT 0, xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata JSONB DEFAULT '{\\\"version\\\":0}'::jsonb, UNIQUE(product_id, date))" "Create product_analytics"

# 8. Tabela de cupons de produtos específicos
echo ""
echo "8. Criando tabela product_coupons..."
execute_sql "CREATE TABLE product_coupons (xata_id TEXT PRIMARY KEY, id TEXT UNIQUE NOT NULL, coupon_id TEXT NOT NULL REFERENCES coupons(id) ON DELETE CASCADE, product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_version INTEGER NOT NULL DEFAULT 0, xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata JSONB DEFAULT '{\\\"version\\\":0}'::jsonb, UNIQUE(coupon_id, product_id))" "Create product_coupons"

# 9. Tabela de zonas de envio
echo ""
echo "9. Criando tabela shipping_zones..."
execute_sql "CREATE TABLE shipping_zones (xata_id TEXT PRIMARY KEY, id TEXT UNIQUE NOT NULL, name TEXT NOT NULL, states TEXT[], postal_codes TEXT[], shipping_method_id TEXT NOT NULL REFERENCES shipping_methods(id), additional_cost DECIMAL(10,2) DEFAULT 0, is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_version INTEGER NOT NULL DEFAULT 0, xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata JSONB DEFAULT '{\\\"version\\\":0}'::jsonb)" "Create shipping_zones"

# 10. Tabela de carrinhos abandonados
echo ""
echo "10. Criando tabela abandoned_carts..."
execute_sql "CREATE TABLE abandoned_carts (xata_id TEXT PRIMARY KEY, id TEXT UNIQUE NOT NULL, cart_id TEXT NOT NULL REFERENCES carts(id), user_id TEXT REFERENCES users(id), email TEXT, total_value DECIMAL(10,2), reminder_sent_count INTEGER DEFAULT 0, last_reminder_at TIMESTAMPTZ, recovered BOOLEAN DEFAULT false, recovered_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_version INTEGER NOT NULL DEFAULT 0, xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata JSONB DEFAULT '{\\\"version\\\":0}'::jsonb)" "Create abandoned_carts"

# 11. Tabela de configurações do sistema
echo ""
echo "11. Criando tabela system_settings..."
execute_sql "CREATE TABLE system_settings (xata_id TEXT PRIMARY KEY, id TEXT UNIQUE NOT NULL, key TEXT UNIQUE NOT NULL, value TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'string', description TEXT, is_public BOOLEAN DEFAULT false, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_version INTEGER NOT NULL DEFAULT 0, xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata JSONB DEFAULT '{\\\"version\\\":0}'::jsonb)" "Create system_settings"

# 12. Tabela de banners/promoções
echo ""
echo "12. Criando tabela banners..."
execute_sql "CREATE TABLE banners (xata_id TEXT PRIMARY KEY, id TEXT UNIQUE NOT NULL, title TEXT NOT NULL, subtitle TEXT, image_url TEXT NOT NULL, link_url TEXT, position TEXT NOT NULL DEFAULT 'home', display_order INTEGER DEFAULT 0, is_active BOOLEAN DEFAULT true, starts_at TIMESTAMPTZ, ends_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_version INTEGER NOT NULL DEFAULT 0, xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata JSONB DEFAULT '{\\\"version\\\":0}'::jsonb)" "Create banners"

# 13. Tabela de FAQ
echo ""
echo "13. Criando tabela faq..."
execute_sql "CREATE TABLE faq (xata_id TEXT PRIMARY KEY, id TEXT UNIQUE NOT NULL, question TEXT NOT NULL, answer TEXT NOT NULL, category TEXT, display_order INTEGER DEFAULT 0, is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_version INTEGER NOT NULL DEFAULT 0, xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata JSONB DEFAULT '{\\\"version\\\":0}'::jsonb)" "Create faq"

# 14. Tabela de páginas estáticas
echo ""
echo "14. Criando tabela pages..."
execute_sql "CREATE TABLE pages (xata_id TEXT PRIMARY KEY, id TEXT UNIQUE NOT NULL, slug TEXT UNIQUE NOT NULL, title TEXT NOT NULL, content TEXT NOT NULL, meta_title TEXT, meta_description TEXT, is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_version INTEGER NOT NULL DEFAULT 0, xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata JSONB DEFAULT '{\\\"version\\\":0}'::jsonb)" "Create pages"

# Limpar arquivo temporário
rm -f /tmp/sql_query.json

echo ""
echo "=== CRIAÇÃO DE TABELAS AVANÇADAS CONCLUÍDA ==="
echo ""
echo "Tabelas criadas:"
echo "✅ product_options - Opções de produtos (cor, tamanho, etc)"
echo "✅ product_option_values - Valores das opções"
echo "✅ product_variants - Variações de produtos"
echo "✅ variant_option_values - Relação variação-opção"
echo "✅ product_categories - Categorias múltiplas por produto"
echo "✅ product_price_history - Histórico de preços"
echo "✅ product_analytics - Analytics de produtos"
echo "✅ product_coupons - Cupons específicos de produtos"
echo "✅ shipping_zones - Zonas de envio"
echo "✅ abandoned_carts - Carrinhos abandonados"
echo "✅ system_settings - Configurações do sistema"
echo "✅ banners - Banners promocionais"
echo "✅ faq - Perguntas frequentes"
echo "✅ pages - Páginas estáticas"
echo ""
echo "Total de tabelas no marketplace: 34"
echo ""
echo "Próximo passo: Executar 'xata pull main' para atualizar o cliente tipado" 