#!/bin/bash

echo "🧪 Teste do Fluxo de Pagamento AppMax"
echo "===================================="

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "\n${BLUE}📊 Status atual dos gateways:${NC}"
psql -U postgres -d mktplace_dev -t << EOF
SELECT 
  name || ': ' || 
  CASE WHEN is_active THEN '✅ Ativo' ELSE '❌ Inativo' END || 
  ' (' || environment || ')' as status
FROM payment_gateways 
ORDER BY priority DESC;
EOF

echo -e "\n${YELLOW}🔧 Simulação de seleção de gateway:${NC}"
psql -U postgres -d mktplace_dev -t << EOF
SELECT 
  '💳 ' || method || ' R$ ' || valor::text || ' → Gateway: ' || 
  select_payment_gateway(method, valor) as simulacao
FROM (
  VALUES 
    ('pix', 50.00),
    ('credit_card', 150.00),
    ('boleto', 300.00),
    ('debit_card', 75.00)
) AS t(method, valor);
EOF

echo -e "\n${GREEN}✅ Configuração de teste concluída!${NC}"
echo -e "\n${YELLOW}📝 Instruções para testar:${NC}"
echo "1. Inicie o servidor local:"
echo "   cd apps/store && pnpm dev"
echo ""
echo "2. Acesse a loja: http://localhost:5173"
echo ""
echo "3. Faça um pedido de teste:"
echo "   - Adicione produtos ao carrinho"
echo "   - Vá para o checkout"
echo "   - Escolha qualquer método de pagamento"
echo ""
echo "4. O sistema usará automaticamente o gateway 'default' (simulação)"
echo ""
echo "5. Monitor os logs no terminal do servidor para ver:"
echo "   - 'Payment gateway selected: default'"
echo "   - 'Processing payment'"
echo "   - 'Payment processed'"

echo -e "\n${BLUE}🔍 Para monitorar transações:${NC}"
echo "psql -U postgres -d mktplace_dev -c \"SELECT id, order_id, gateway, status, method, amount FROM payment_transactions ORDER BY created_at DESC LIMIT 5;\""

echo -e "\n${YELLOW}🚀 Quando tiver credenciais AppMax:${NC}"
cat << 'EOF'
# 1. Ative a AppMax:
psql -U postgres -d mktplace_dev -c "
UPDATE payment_gateways 
SET 
  is_active = true,
  api_key = 'SEU_TOKEN_REAL',
  webhook_secret = 'SEU_SECRET_REAL',
  environment = 'production'
WHERE name = 'appmax';"

# 2. Configure webhook na AppMax:
#    URL: https://seu-site.com/api/payments/appmax/webhook

# 3. Teste com dados reais!
EOF 