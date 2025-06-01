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
