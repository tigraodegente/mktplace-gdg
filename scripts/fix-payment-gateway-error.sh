#!/bin/bash

echo "🔧 Corrigindo erro de typo 'credit_car' nos gateways de pagamento..."
echo ""

# Carregar variáveis de ambiente
source .env.local 2>/dev/null || source .env 2>/dev/null

if [ -z "$NEON_DATABASE_URL" ]; then
    echo "❌ Erro: NEON_DATABASE_URL não encontrada no .env"
    exit 1
fi

# Executar correção
echo "📊 Status atual dos gateways:"
psql "$NEON_DATABASE_URL" -c "
SELECT 
  name,
  supported_methods,
  CASE 
    WHEN supported_methods::text LIKE '%credit_car%' THEN '❌ TEM ERRO'
    ELSE '✅ OK'
  END as status
FROM payment_gateways
WHERE is_active = true;
"

echo ""
echo "🔄 Aplicando correção..."
psql "$NEON_DATABASE_URL" -c "
UPDATE payment_gateways
SET supported_methods = REPLACE(supported_methods::text, 'credit_car', 'credit_card')::jsonb
WHERE supported_methods::text LIKE '%credit_car%';
"

echo ""
echo "✅ Correção aplicada! Status final:"
psql "$NEON_DATABASE_URL" -c "
SELECT 
  name,
  supported_methods
FROM payment_gateways
WHERE is_active = true
ORDER BY priority DESC;
"

echo ""
echo "✅ Processo concluído!" 