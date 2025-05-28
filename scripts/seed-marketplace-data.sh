#!/bin/bash

# Configurações
API_KEY="xau_4YkLfHkfKWwzMmUzfLWuv1IfbS6M0r9D0"
DB_URL="https://GUSTAVO-FERRO-s-workspace-787mk0.us-east-1.xata.sh/db/mktplace-gdg:main/sql"

# Função para executar SQL
execute_sql() {
    local sql="$1"
    local description="$2"
    
    echo "Executando: $description"
    
    cat > /tmp/sql_query.json << EOF
{
  "statement": "$sql"
}
EOF
    
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

echo "=== POPULANDO DADOS DE EXEMPLO ==="
echo ""

# 1. Adicionar métodos de pagamento
echo "1. Adicionando métodos de pagamento..."
execute_sql "INSERT INTO payment_methods (xata_id, id, name, type, is_active) VALUES ('pm_pix', 'pm_pix', 'PIX', 'instant', true), ('pm_credit', 'pm_credit', 'Cartão de Crédito', 'credit_card', true), ('pm_boleto', 'pm_boleto', 'Boleto Bancário', 'boleto', true)" "Adicionar métodos de pagamento"

# 2. Adicionar métodos de envio
echo ""
echo "2. Adicionando métodos de envio..."
execute_sql "INSERT INTO shipping_methods (xata_id, id, name, description, base_cost, cost_per_kg, estimated_days_min, estimated_days_max, is_active) VALUES ('ship_pac', 'ship_pac', 'PAC', 'Encomenda Normal dos Correios', 15.00, 2.50, 5, 10, true), ('ship_sedex', 'ship_sedex', 'SEDEX', 'Encomenda Expressa dos Correios', 25.00, 5.00, 2, 4, true), ('ship_local', 'ship_local', 'Retirada na Loja', 'Retire seu pedido em nossa loja', 0.00, 0.00, 0, 0, true)" "Adicionar métodos de envio"

# 3. Adicionar cupons de exemplo
echo ""
echo "3. Adicionando cupons de desconto..."
execute_sql "INSERT INTO coupons (xata_id, id, code, description, type, value, minimum_amount, usage_limit, valid_until) VALUES ('coup_welcome', 'coup_welcome', 'BEMVINDO10', 'Desconto de boas-vindas', 'percentage', 10, 50.00, 1000, NOW() + INTERVAL '30 days'), ('coup_frete', 'coup_frete', 'FRETEGRATIS', 'Frete grátis', 'fixed', 25.00, 100.00, 500, NOW() + INTERVAL '15 days')" "Adicionar cupons"

# 4. Adicionar endereço de exemplo para o admin
echo ""
echo "4. Adicionando endereço de exemplo..."
execute_sql "INSERT INTO addresses (xata_id, id, user_id, type, street, number, complement, neighborhood, city, state, postal_code, is_default) SELECT 'addr_' || u.id, 'addr_' || u.id, u.id, 'shipping', 'Rua Exemplo', '123', 'Apto 101', 'Centro', 'São Paulo', 'SP', '01000-000', true FROM users u WHERE u.email = 'admin@marketplace.com' LIMIT 1" "Adicionar endereço"

# 5. Adicionar algumas avaliações de exemplo
echo ""
echo "5. Adicionando avaliações de produtos..."
execute_sql "INSERT INTO reviews (xata_id, id, product_id, user_id, rating, title, comment, is_verified_purchase) SELECT 'rev_' || p.id || '_1', 'rev_' || p.id || '_1', p.id, u.id, 5, 'Excelente produto!', 'Superou minhas expectativas. Recomendo!', true FROM products p CROSS JOIN users u WHERE u.email = 'admin@marketplace.com' ORDER BY RANDOM() LIMIT 5" "Adicionar avaliações 5 estrelas"

execute_sql "INSERT INTO reviews (xata_id, id, product_id, user_id, rating, title, comment, is_verified_purchase) SELECT 'rev_' || p.id || '_2', 'rev_' || p.id || '_2', p.id, u.id, 4, 'Muito bom', 'Produto de qualidade, entrega rápida.', true FROM products p CROSS JOIN users u WHERE u.email = 'admin@marketplace.com' ORDER BY RANDOM() LIMIT 5" "Adicionar avaliações 4 estrelas"

# 6. Atualizar contagem de avaliações nos produtos
echo ""
echo "6. Atualizando estatísticas de produtos..."
execute_sql "UPDATE products SET rating_average = 4.5, rating_count = 2 WHERE id IN (SELECT DISTINCT product_id FROM reviews)" "Atualizar rating dos produtos"

# Limpar arquivo temporário
rm -f /tmp/sql_query.json

echo ""
echo "=== DADOS DE EXEMPLO ADICIONADOS ==="
echo ""
echo "✅ Métodos de pagamento: PIX, Cartão de Crédito, Boleto"
echo "✅ Métodos de envio: PAC, SEDEX, Retirada na Loja"
echo "✅ Cupons: BEMVINDO10 (10% off), FRETEGRATIS"
echo "✅ Endereço de exemplo para admin"
echo "✅ 10 avaliações de produtos"
echo ""
echo "O marketplace está pronto para uso!" 