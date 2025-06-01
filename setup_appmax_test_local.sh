#!/bin/bash

echo "🚀 Configurando AppMax para teste local..."

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configurações do banco local
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="mktplace_dev"
DB_USER="postgres"

echo -e "${YELLOW}📦 Passo 1: Executando script SQL...${NC}"

# Executar script SQL
PGPASSWORD=$PGPASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f scripts/sql-migrations/add-appmax-integration.sql

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Tabelas criadas com sucesso!${NC}"
else
    echo -e "${RED}❌ Erro ao criar tabelas${NC}"
    exit 1
fi

echo -e "\n${YELLOW}📦 Passo 2: Configurando credenciais de teste...${NC}"

# Configurar AppMax para sandbox com token de teste
PGPASSWORD=$PGPASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << EOF
-- Configurar AppMax para modo sandbox
UPDATE payment_gateways 
SET 
  api_key = 'test_token_appmax_sandbox_2024',
  webhook_secret = 'test_webhook_secret_local',
  environment = 'sandbox',
  is_active = false, -- Desativado por padrão
  is_sandbox = true,
  config = '{
    "pixExpirationMinutes": 30,
    "boletoExpirationDays": 3,
    "testMode": true,
    "webhookEvents": ["payment.approved", "payment.declined", "payment.refunded", "payment.cancelled"]
  }'::jsonb
WHERE name = 'appmax';

-- Ativar gateway padrão para simulação
UPDATE payment_gateways 
SET 
  is_active = true,
  priority = 10
WHERE name = 'default';

-- Mostrar configuração atual
SELECT 
  name,
  display_name,
  is_active,
  environment,
  priority,
  supported_methods
FROM payment_gateways
ORDER BY priority DESC;
EOF

echo -e "\n${YELLOW}📦 Passo 3: Criando dados de teste...${NC}"

# Inserir alguns registros de teste
PGPASSWORD=$PGPASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << EOF
-- Inserir transação de teste (opcional)
INSERT INTO payment_transactions (order_id, gateway, external_transaction_id, amount, status, method, response_data)
SELECT 
  o.id,
  'default',
  'TEST_' || o.id || '_' || extract(epoch from now())::integer,
  o.total,
  'completed',
  o.payment_method,
  '{"test": true, "approved": true}'::jsonb
FROM orders o
WHERE o.payment_status = 'pending'
LIMIT 1;

-- Mostrar estatísticas
SELECT 
  'Gateways configurados:' as info,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE is_active) as ativos
FROM payment_gateways

UNION ALL

SELECT 
  'Transações de teste:',
  COUNT(*),
  COUNT(*) FILTER (WHERE gateway = 'default')
FROM payment_transactions;
EOF

echo -e "\n${GREEN}✅ Configuração concluída!${NC}"
echo -e "${YELLOW}📋 Status atual:${NC}"
echo "  - Gateway 'default' ativo para simulação"
echo "  - AppMax configurado mas desativado"
echo "  - Tabelas criadas e prontas"

echo -e "\n${YELLOW}💡 Para testar:${NC}"
echo "1. Faça um pedido na loja"
echo "2. Escolha qualquer método de pagamento"
echo "3. O sistema usará o gateway 'default' (simulação)"
echo "4. Pagamento será aprovado em 90% dos casos"

echo -e "\n${YELLOW}🔄 Para ativar AppMax:${NC}"
echo "Quando tiver as credenciais reais, execute:"
echo -e "${GREEN}psql -d $DB_NAME -c \"UPDATE payment_gateways SET is_active = true, api_key = 'SEU_TOKEN_REAL' WHERE name = 'appmax';\"${NC}"

echo -e "\n${YELLOW}📊 Para monitorar:${NC}"
echo "Ver logs de pagamento:"
echo -e "${GREEN}psql -d $DB_NAME -c \"SELECT * FROM payment_transactions ORDER BY created_at DESC LIMIT 5;\"${NC}"

# Criar arquivo de teste para verificar integração
cat > test_appmax_integration.sql << 'EOF'
-- Script para testar se a integração está funcionando

-- 1. Verificar gateways
SELECT '=== GATEWAYS CONFIGURADOS ===' as info;
SELECT name, display_name, is_active, environment, priority 
FROM payment_gateways 
ORDER BY priority DESC;

-- 2. Testar função de seleção
SELECT '=== TESTE DE SELEÇÃO DE GATEWAY ===' as info;
SELECT 
  'PIX com R$ 100' as teste,
  select_payment_gateway('pix', 100.00) as gateway_selecionado
UNION ALL
SELECT 
  'Cartão com R$ 500',
  select_payment_gateway('credit_card', 500.00)
UNION ALL  
SELECT 
  'Boleto com R$ 50',
  select_payment_gateway('boleto', 50.00);

-- 3. Verificar tabelas
SELECT '=== ESTRUTURA DAS TABELAS ===' as info;
SELECT 
  table_name,
  COUNT(*) as total_colunas
FROM information_schema.columns
WHERE table_name IN ('payment_gateways', 'payment_transactions', 'webhook_logs', 'payment_gateways_metadata')
GROUP BY table_name;
EOF

echo -e "\n${GREEN}✨ Script de teste criado: test_appmax_integration.sql${NC}"
echo "Execute com: psql -d $DB_NAME -f test_appmax_integration.sql" 