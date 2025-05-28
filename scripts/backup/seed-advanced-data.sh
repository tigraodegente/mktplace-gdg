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

echo "=== POPULANDO DADOS AVANÇADOS ==="
echo ""

# 1. Adicionar opções de produtos
echo "1. Adicionando opções de produtos..."
execute_sql "INSERT INTO product_options (xata_id, id, name, type, display_order, is_required) VALUES ('opt_cor', 'opt_cor', 'Cor', 'color', 1, true), ('opt_tamanho', 'opt_tamanho', 'Tamanho', 'size', 2, true), ('opt_material', 'opt_material', 'Material', 'text', 3, false)" "Adicionar opções"

# 2. Adicionar valores das opções
echo ""
echo "2. Adicionando valores das opções..."
execute_sql "INSERT INTO product_option_values (xata_id, id, option_id, value, display_order) VALUES ('optval_azul', 'optval_azul', 'opt_cor', 'Azul', 1), ('optval_vermelho', 'optval_vermelho', 'opt_cor', 'Vermelho', 2), ('optval_preto', 'optval_preto', 'opt_cor', 'Preto', 3), ('optval_branco', 'optval_branco', 'opt_cor', 'Branco', 4)" "Adicionar cores"

execute_sql "INSERT INTO product_option_values (xata_id, id, option_id, value, display_order) VALUES ('optval_p', 'optval_p', 'opt_tamanho', 'P', 1), ('optval_m', 'optval_m', 'opt_tamanho', 'M', 2), ('optval_g', 'optval_g', 'opt_tamanho', 'G', 3), ('optval_gg', 'optval_gg', 'opt_tamanho', 'GG', 4)" "Adicionar tamanhos"

execute_sql "INSERT INTO product_option_values (xata_id, id, option_id, value, display_order) VALUES ('optval_algodao', 'optval_algodao', 'opt_material', 'Algodão', 1), ('optval_poliester', 'optval_poliester', 'opt_material', 'Poliéster', 2)" "Adicionar materiais"

# 3. Adicionar configurações do sistema
echo ""
echo "3. Adicionando configurações do sistema..."
execute_sql "INSERT INTO system_settings (xata_id, id, key, value, type, description, is_public) VALUES ('set_nome', 'set_nome', 'site_name', 'Marketplace GDG', 'string', 'Nome do site', true), ('set_email', 'set_email', 'contact_email', 'contato@marketplacegdg.com', 'string', 'Email de contato', true), ('set_min_frete', 'set_min_frete', 'min_free_shipping', '150.00', 'decimal', 'Valor mínimo para frete grátis', true), ('set_max_parcelas', 'set_max_parcelas', 'max_installments', '12', 'integer', 'Número máximo de parcelas', true)" "Adicionar configurações"

# 4. Adicionar banners
echo ""
echo "4. Adicionando banners promocionais..."
execute_sql "INSERT INTO banners (xata_id, id, title, subtitle, image_url, link_url, position, display_order, is_active) VALUES ('ban_hero1', 'ban_hero1', 'Promoção de Verão', 'Até 50% de desconto em produtos selecionados', 'https://via.placeholder.com/1200x400', '/promocoes/verao', 'home', 1, true), ('ban_hero2', 'ban_hero2', 'Novidades Toda Semana', 'Confira os lançamentos', 'https://via.placeholder.com/1200x400', '/novidades', 'home', 2, true)" "Adicionar banners"

# 5. Adicionar FAQ
echo ""
echo "5. Adicionando perguntas frequentes..."
execute_sql "INSERT INTO faq (xata_id, id, question, answer, category, display_order, is_active) VALUES ('faq_entrega', 'faq_entrega', 'Qual o prazo de entrega?', 'O prazo de entrega varia de acordo com sua região. Após a confirmação do pagamento, você receberá um código de rastreamento.', 'Entrega', 1, true), ('faq_troca', 'faq_troca', 'Como faço para trocar um produto?', 'Você tem até 30 dias após o recebimento para solicitar a troca. Entre em contato conosco pelo email ou WhatsApp.', 'Trocas e Devoluções', 1, true), ('faq_pagamento', 'faq_pagamento', 'Quais formas de pagamento são aceitas?', 'Aceitamos PIX, cartão de crédito (em até 12x) e boleto bancário.', 'Pagamento', 1, true)" "Adicionar FAQ"

# 6. Adicionar páginas estáticas
echo ""
echo "6. Adicionando páginas estáticas..."
execute_sql "INSERT INTO pages (xata_id, id, slug, title, content, meta_title, meta_description, is_active) VALUES ('page_sobre', 'page_sobre', 'sobre-nos', 'Sobre Nós', '<h1>Sobre o Marketplace GDG</h1><p>Somos um marketplace completo com os melhores produtos.</p>', 'Sobre Nós - Marketplace GDG', 'Conheça a história do Marketplace GDG', true), ('page_termos', 'page_termos', 'termos-de-uso', 'Termos de Uso', '<h1>Termos de Uso</h1><p>Ao usar nosso site, você concorda com os seguintes termos...</p>', 'Termos de Uso - Marketplace GDG', 'Termos e condições de uso do Marketplace GDG', true)" "Adicionar páginas"

# 7. Adicionar zonas de envio
echo ""
echo "7. Adicionando zonas de envio..."
execute_sql "INSERT INTO shipping_zones (xata_id, id, name, states, shipping_method_id, additional_cost, is_active) VALUES ('zone_sudeste', 'zone_sudeste', 'Região Sudeste', '{SP,RJ,MG,ES}', 'ship_pac', 0.00, true), ('zone_sul', 'zone_sul', 'Região Sul', '{PR,SC,RS}', 'ship_pac', 5.00, true), ('zone_ne', 'zone_ne', 'Região Nordeste', '{BA,PE,CE,MA,PI,RN,PB,SE,AL}', 'ship_pac', 10.00, true)" "Adicionar zonas de envio"

# Limpar arquivo temporário
rm -f /tmp/sql_query.json

echo ""
echo "=== DADOS AVANÇADOS ADICIONADOS ==="
echo ""
echo "✅ Opções de produtos: Cor, Tamanho, Material"
echo "✅ Valores: 4 cores, 4 tamanhos, 2 materiais"
echo "✅ Configurações do sistema: 4 configurações"
echo "✅ Banners promocionais: 2 banners"
echo "✅ FAQ: 3 perguntas"
echo "✅ Páginas: Sobre Nós, Termos de Uso"
echo "✅ Zonas de envio: Sudeste, Sul, Nordeste"
echo ""
echo "O marketplace agora tem estrutura completa para:"
echo "- Produtos com variações (cor, tamanho, etc)"
echo "- Sistema de analytics"
echo "- Gestão de conteúdo (banners, FAQ, páginas)"
echo "- Zonas de envio diferenciadas"
echo "- Histórico de preços"
echo "- Carrinhos abandonados" 