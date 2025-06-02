# Correção: Tabela payment_gateways

## Problema
O sistema estava tentando acessar a tabela `payment_gateways` que não existia no banco de produção.

## Solução
Foi criado um endpoint temporário para criar a tabela e inserir os dados iniciais.

## Como executar

1. Após o deploy ser concluído (aguarde ~5 minutos), acesse:
   ```
   https://[seu-deploy-id].mktplace-store.pages.dev/api/fix-payment-gateways
   ```

2. Você deve receber a resposta:
   ```json
   {
     "success": true,
     "message": "Tabela payment_gateways criada com sucesso!"
   }
   ```

3. A tabela será criada com:
   - Gateway padrão (ativo)
   - AppMax (desativado para configuração posterior)

## Após executar
- O endpoint pode ser removido após a criação da tabela
- Para ativar a AppMax, atualize os campos `api_key`, `webhook_secret` e `is_active` na tabela

## Estrutura da tabela
- `id`: UUID único
- `name`: Nome único do gateway
- `display_name`: Nome de exibição
- `is_active`: Se está ativo
- `supported_methods`: Métodos de pagamento suportados (JSONB)
- `priority`: Prioridade na seleção (maior = mais prioridade)
- E outros campos de configuração... 