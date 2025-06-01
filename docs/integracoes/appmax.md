# Integração AppMax - Guia de Configuração

## Visão Geral

A AppMax é uma plataforma de processamento de pagamentos que oferece suporte para cartões de crédito/débito, PIX e boleto bancário. Esta integração permite que o marketplace processe pagamentos de forma segura e transparente.

## Pré-requisitos

1. Conta ativa na AppMax
2. Credenciais de API (Token)
3. Webhook configurado na AppMax

## Configuração no Banco de Dados

### 1. Adicionar Gateway de Pagamento

Execute o seguinte SQL para adicionar a AppMax como gateway:

```sql
INSERT INTO payment_gateways (
  name,
  display_name,
  api_key,
  environment,
  webhook_secret,
  is_active,
  supported_methods,
  created_at
) VALUES (
  'appmax',
  'AppMax',
  'SEU_TOKEN_API_AQUI',
  'sandbox', -- ou 'production'
  'SEU_WEBHOOK_SECRET_AQUI',
  true,
  '["credit_card", "debit_card", "pix", "boleto"]',
  NOW()
);
```

### 2. Criar Tabelas Necessárias

```sql
-- Tabela para armazenar metadados de usuários na AppMax
CREATE TABLE IF NOT EXISTS payment_gateways_metadata (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  gateway VARCHAR(50),
  external_customer_id VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, gateway)
);

-- Tabela para logs de webhooks
CREATE TABLE IF NOT EXISTS webhook_logs (
  id SERIAL PRIMARY KEY,
  gateway VARCHAR(50),
  event_id VARCHAR(255),
  event_type VARCHAR(100),
  payload JSONB,
  signature TEXT,
  processed_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_webhook_event (gateway, event_id)
);

-- Tabela para transações de pagamento
CREATE TABLE IF NOT EXISTS payment_transactions (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  gateway VARCHAR(50),
  external_transaction_id VARCHAR(255),
  amount DECIMAL(10,2),
  status VARCHAR(50),
  method VARCHAR(50),
  response_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_payment_order (order_id),
  INDEX idx_payment_external (gateway, external_transaction_id)
);

-- Adicionar campos na tabela orders se necessário
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS external_order_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;
```

## Configuração na AppMax

### 1. Obter Token de API

1. Acesse o painel da AppMax
2. Vá em **Configurações > API**
3. Gere ou copie seu token de API
4. Guarde em local seguro

### 2. Configurar Webhook

1. No painel AppMax, vá em **Configurações > Webhooks**
2. Clique em **Novo Webhook**
3. Configure:
   - **URL**: `https://seu-dominio.com/api/payments/appmax/webhook`
   - **Eventos**: Selecione todos os eventos de pagamento
   - **Secret**: Gere um secret seguro
4. Salve e teste o webhook

### 3. Configurar URLs de Retorno

Configure as URLs de retorno para redirecionamento após pagamento:
- **URL de Sucesso**: `/checkout/success`
- **URL de Erro**: `/checkout/error`
- **URL de Cancelamento**: `/checkout/cancel`

## Variáveis de Ambiente

Adicione ao seu `.env`:

```env
# AppMax
APPMAX_API_KEY=seu_token_aqui
APPMAX_WEBHOOK_SECRET=seu_secret_aqui
APPMAX_ENVIRONMENT=sandbox # ou production
```

## Fluxo de Integração

### 1. Criação de Cliente

Quando um usuário faz o primeiro pedido:
1. Sistema cria/atualiza cliente na AppMax
2. Armazena ID externo para referências futuras

### 2. Processamento de Pagamento

1. Cliente finaliza pedido
2. Sistema cria pedido na AppMax
3. Sistema processa pagamento
4. AppMax retorna status
5. Sistema atualiza pedido conforme resultado

### 3. Webhooks

AppMax envia notificações para:
- Pagamento aprovado
- Pagamento recusado
- Pagamento reembolsado
- Pagamento cancelado

## APIs Disponíveis

### Criar Pagamento

```http
POST /api/payments/appmax/create
Content-Type: application/json

{
  "orderId": "123",
  "paymentMethod": "credit_card",
  "installments": 1,
  "cardData": {
    "number": "4111111111111111",
    "holder": "NOME TITULAR",
    "expiry": "12/25",
    "cvv": "123"
  }
}
```

### Webhook

```http
POST /api/payments/appmax/webhook
X-AppMax-Signature: assinatura_hmac

{
  "id": "evt_123",
  "event": "payment.approved",
  "data": {
    "payment": {
      "id": "pay_123",
      "status": "approved",
      "amount": 10000,
      "metadata": {
        "internalOrderId": "123"
      }
    }
  }
}
```

## Métodos de Pagamento

### Cartão de Crédito/Débito

- Suporta tokenização para pagamentos futuros
- Validação de dados em tempo real
- Parcelamento disponível

### PIX

- QR Code gerado instantaneamente
- Validade configurável
- Confirmação em tempo real via webhook

### Boleto

- Geração de boleto bancário
- Data de vencimento configurável
- Instruções personalizadas

## Segurança

1. **Tokens**: Nunca exponha tokens no frontend
2. **HTTPS**: Sempre use conexões seguras
3. **Validação**: Valide todos os dados antes de enviar
4. **Webhooks**: Sempre valide assinatura HMAC
5. **PCI**: Não armazene dados de cartão

## Troubleshooting

### Erro de Autenticação

- Verifique se o token está correto
- Confirme o ambiente (sandbox/production)
- Verifique se a conta está ativa

### Webhook não Recebido

- Confirme URL está acessível publicamente
- Verifique logs de erro no painel AppMax
- Teste com ferramenta como ngrok localmente

### Pagamento Recusado

- Verifique dados do cartão
- Confirme limite disponível
- Verifique logs de resposta da API

## Suporte

- Documentação AppMax: https://docs.appmax.com.br
- Suporte técnico: suporte@appmax.com.br
- Status da API: https://status.appmax.com.br 