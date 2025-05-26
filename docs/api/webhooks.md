# Webhooks - Marketplace GDG

## Visão Geral

Os webhooks permitem que aplicações externas recebam notificações em tempo real quando eventos importantes ocorrem no marketplace. Isso é útil para integrações, automações e sincronização de dados.

## Configuração

### Registrar um Webhook

**POST /api/webhooks**

```json
{
  "url": "https://seu-dominio.com/webhook",
  "events": ["order.created", "order.paid"],
  "secret": "seu-secret-seguro",
  "description": "Webhook para processar pedidos"
}
```

### Listar Webhooks

**GET /api/webhooks**

### Atualizar Webhook

**PUT /api/webhooks/:id**

### Deletar Webhook

**DELETE /api/webhooks/:id**

## Eventos Disponíveis

### Pedidos

| Evento | Descrição | Payload |
|--------|-----------|---------|
| `order.created` | Novo pedido criado | Order object |
| `order.paid` | Pagamento confirmado | Order + Payment |
| `order.shipped` | Pedido enviado | Order + Shipping |
| `order.delivered` | Pedido entregue | Order |
| `order.cancelled` | Pedido cancelado | Order + reason |
| `order.refunded` | Pedido reembolsado | Order + Refund |

### Produtos

| Evento | Descrição | Payload |
|--------|-----------|---------|
| `product.created` | Novo produto criado | Product object |
| `product.updated` | Produto atualizado | Product + changes |
| `product.deleted` | Produto removido | Product ID |
| `product.out_of_stock` | Produto sem estoque | Product |
| `product.back_in_stock` | Produto voltou ao estoque | Product |

### Usuários

| Evento | Descrição | Payload |
|--------|-----------|---------|
| `user.registered` | Novo usuário registrado | User object |
| `user.verified` | Email verificado | User |
| `user.updated` | Perfil atualizado | User + changes |
| `user.deleted` | Conta deletada | User ID |

### Vendedores

| Evento | Descrição | Payload |
|--------|-----------|---------|
| `seller.registered` | Novo vendedor | Seller object |
| `seller.verified` | Vendedor verificado | Seller |
| `seller.suspended` | Vendedor suspenso | Seller + reason |
| `seller.activated` | Vendedor ativado | Seller |

### Pagamentos

| Evento | Descrição | Payload |
|--------|-----------|---------|
| `payment.succeeded` | Pagamento aprovado | Payment object |
| `payment.failed` | Pagamento falhou | Payment + error |
| `payment.refunded` | Pagamento reembolsado | Payment + Refund |
| `payment.chargeback` | Chargeback recebido | Payment + details |

### Avaliações

| Evento | Descrição | Payload |
|--------|-----------|---------|
| `review.created` | Nova avaliação | Review object |
| `review.updated` | Avaliação editada | Review |
| `review.deleted` | Avaliação removida | Review ID |

## Formato da Requisição

### Headers

```
Content-Type: application/json
X-Webhook-Event: order.created
X-Webhook-ID: webhook_123
X-Webhook-Timestamp: 1642012800
X-Webhook-Signature: sha256=...
```

### Body

```json
{
  "id": "evt_123",
  "type": "order.created",
  "created_at": "2024-01-15T10:00:00Z",
  "data": {
    // Dados específicos do evento
  }
}
```

## Segurança

### Verificação de Assinatura

Todos os webhooks incluem uma assinatura HMAC SHA256 no header `X-Webhook-Signature`.

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const timestamp = request.headers['x-webhook-timestamp'];
  const message = `${timestamp}.${JSON.stringify(payload)}`;
  
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex');
  
  return `sha256=${expectedSignature}` === signature;
}
```

### Validação de Timestamp

Rejeite webhooks com timestamp muito antigo (> 5 minutos) para prevenir replay attacks.

```javascript
function isTimestampValid(timestamp) {
  const now = Math.floor(Date.now() / 1000);
  const webhookTime = parseInt(timestamp);
  return (now - webhookTime) < 300; // 5 minutos
}
```

## Retry Policy

### Tentativas

- **Máximo de tentativas**: 5
- **Intervalo entre tentativas**: 
  - 1ª tentativa: Imediata
  - 2ª tentativa: 5 segundos
  - 3ª tentativa: 30 segundos
  - 4ª tentativa: 2 minutos
  - 5ª tentativa: 10 minutos

### Códigos de Resposta

| Código | Ação |
|--------|------|
| 200-299 | Sucesso - não retentar |
| 400-499 | Erro do cliente - não retentar |
| 500-599 | Erro do servidor - retentar |
| Timeout | Retentar |

## Exemplos de Implementação

### Node.js/Express

```javascript
const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

app.post('/webhook', (req, res) => {
  // Verificar assinatura
  const signature = req.headers['x-webhook-signature'];
  const timestamp = req.headers['x-webhook-timestamp'];
  
  if (!verifyWebhookSignature(req.body, signature, WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }
  
  if (!isTimestampValid(timestamp)) {
    return res.status(401).send('Invalid timestamp');
  }
  
  // Processar evento
  const { type, data } = req.body;
  
  switch (type) {
    case 'order.created':
      handleNewOrder(data);
      break;
    case 'payment.succeeded':
      handlePaymentSuccess(data);
      break;
    // ... outros eventos
  }
  
  // Responder rapidamente
  res.status(200).send('OK');
  
  // Processar de forma assíncrona se necessário
});

function handleNewOrder(order) {
  console.log('Novo pedido:', order.id);
  // Lógica de processamento
}

function handlePaymentSuccess(payment) {
  console.log('Pagamento aprovado:', payment.id);
  // Lógica de processamento
}
```

### Python/Flask

```python
import hmac
import hashlib
import json
from flask import Flask, request, abort

app = Flask(__name__)
WEBHOOK_SECRET = 'seu-secret'

def verify_webhook_signature(payload, signature, secret):
    timestamp = request.headers.get('X-Webhook-Timestamp')
    message = f"{timestamp}.{json.dumps(payload)}"
    
    expected_signature = hmac.new(
        secret.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return f"sha256={expected_signature}" == signature

@app.route('/webhook', methods=['POST'])
def webhook():
    # Verificar assinatura
    signature = request.headers.get('X-Webhook-Signature')
    
    if not verify_webhook_signature(request.json, signature, WEBHOOK_SECRET):
        abort(401)
    
    # Processar evento
    event_type = request.json['type']
    data = request.json['data']
    
    if event_type == 'order.created':
        handle_new_order(data)
    elif event_type == 'payment.succeeded':
        handle_payment_success(data)
    
    return 'OK', 200
```

## Boas Práticas

### 1. Processamento Assíncrono

Responda rapidamente (< 3 segundos) e processe eventos em background:

```javascript
app.post('/webhook', async (req, res) => {
  // Validar webhook
  if (!isValid(req)) {
    return res.status(401).send('Unauthorized');
  }
  
  // Responder imediatamente
  res.status(200).send('OK');
  
  // Processar em background
  await queue.add('process-webhook', {
    event: req.body
  });
});
```

### 2. Idempotência

Implemente lógica idempotente para lidar com eventos duplicados:

```javascript
async function processOrder(order) {
  // Verificar se já foi processado
  const processed = await db.webhookEvents.findOne({
    eventId: order.eventId
  });
  
  if (processed) {
    console.log('Evento já processado:', order.eventId);
    return;
  }
  
  // Processar evento
  await processNewOrder(order);
  
  // Marcar como processado
  await db.webhookEvents.create({
    eventId: order.eventId,
    processedAt: new Date()
  });
}
```

### 3. Monitoramento

Monitore falhas e latência dos webhooks:

```javascript
const metrics = {
  total: 0,
  success: 0,
  failed: 0,
  latency: []
};

app.post('/webhook', async (req, res) => {
  const start = Date.now();
  metrics.total++;
  
  try {
    await processWebhook(req);
    metrics.success++;
    res.status(200).send('OK');
  } catch (error) {
    metrics.failed++;
    console.error('Webhook error:', error);
    res.status(500).send('Error');
  } finally {
    metrics.latency.push(Date.now() - start);
  }
});
```

### 4. Logs Estruturados

Mantenha logs detalhados para debugging:

```javascript
function logWebhook(event, status, error = null) {
  const log = {
    timestamp: new Date().toISOString(),
    eventId: event.id,
    eventType: event.type,
    status,
    error: error?.message,
    metadata: {
      orderId: event.data?.id,
      userId: event.data?.user_id
    }
  };
  
  console.log(JSON.stringify(log));
}
```

## Testes

### Webhook de Teste

Use o endpoint de teste para verificar sua implementação:

**POST /api/webhooks/:id/test**

```json
{
  "type": "test",
  "data": {
    "message": "Este é um webhook de teste"
  }
}
```

### Ferramenta CLI

```bash
# Enviar webhook de teste
marketplace webhook test --url https://seu-site.com/webhook --event order.created

# Listar eventos recentes
marketplace webhook events --webhook-id webhook_123

# Reenviar evento específico
marketplace webhook resend --event-id evt_123
```

## FAQ

### Como lidar com timeouts?

Configure timeouts apropriados e implemente circuit breakers:

```javascript
const axios = require('axios');

async function sendWebhook(url, data) {
  try {
    const response = await axios.post(url, data, {
      timeout: 3000, // 3 segundos
      maxRetries: 3,
      retryDelay: (retryCount) => retryCount * 1000
    });
    return response;
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.error('Webhook timeout:', url);
    }
    throw error;
  }
}
```

### Como debugar webhooks em desenvolvimento?

Use ferramentas como ngrok para expor localhost:

```bash
# Instalar ngrok
npm install -g ngrok

# Expor porta local
ngrok http 3000

# Use a URL gerada para registrar webhook
# https://abc123.ngrok.io/webhook
```

### Como garantir ordem de eventos?

Webhooks não garantem ordem. Use timestamps e lógica de reconciliação:

```javascript
async function processEvent(event) {
  const entity = await db.findById(event.data.id);
  
  // Verificar se o evento é mais recente
  if (entity.updatedAt > event.created_at) {
    console.log('Evento desatualizado, ignorando');
    return;
  }
  
  // Processar evento
  await updateEntity(entity, event);
}
``` 