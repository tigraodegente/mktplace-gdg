-- ============================================================================
-- FIX: Corrigir typo "credit_car" nos gateways de pagamento
-- ============================================================================

-- 1. Verificar gateways com o problema
SELECT 
  id,
  name,
  supported_methods,
  CASE 
    WHEN supported_methods::text LIKE '%credit_car%' THEN 'TEM ERRO'
    ELSE 'OK'
  END as status
FROM payment_gateways
WHERE is_active = true;

-- 2. Corrigir o typo em todos os gateways afetados
UPDATE payment_gateways
SET supported_methods = REPLACE(supported_methods::text, 'credit_car', 'credit_card')::jsonb
WHERE supported_methods::text LIKE '%credit_car%';

-- 3. Verificar correção
SELECT 
  id,
  name,
  supported_methods
FROM payment_gateways
WHERE is_active = true
ORDER BY priority DESC;

-- 4. Garantir que os gateways principais têm os métodos corretos
UPDATE payment_gateways
SET supported_methods = '["pix", "credit_card", "debit_card", "boleto"]'::jsonb
WHERE name = 'appmax' AND is_active = true;

UPDATE payment_gateways
SET supported_methods = '["credit_card", "debit_card"]'::jsonb
WHERE name = 'stripe' AND is_active = true;

UPDATE payment_gateways
SET supported_methods = '["pix"]'::jsonb
WHERE name = 'pix_gateway' AND is_active = true;

-- 5. Mensagem de conclusão
SELECT 
  COUNT(*) as total_gateways,
  COUNT(CASE WHEN supported_methods::text LIKE '%credit_car%' THEN 1 END) as gateways_com_erro,
  COUNT(CASE WHEN supported_methods::text LIKE '%credit_card%' THEN 1 END) as gateways_corretos
FROM payment_gateways
WHERE is_active = true; 