# 🛒 Sistema de Checkout e Pagamentos - Arquitetura Completa

## 📊 **Esquema do Banco de Dados**

### Orders (Pedidos)
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  total_amount DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  shipping_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  coupon_code VARCHAR(50),
  
  -- Endereço de entrega
  shipping_address JSONB NOT NULL,
  
  -- Metadados
  payment_method VARCHAR(50),
  payment_status VARCHAR(20) DEFAULT 'pending',
  shipping_tracking VARCHAR(100),
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Order Items
```sql
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  
  -- Snapshot do produto no momento da compra
  product_snapshot JSONB NOT NULL,
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Payments
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  external_id VARCHAR(255), -- ID do gateway de pagamento
  
  method VARCHAR(50) NOT NULL, -- pix, credit_card, boleto
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  amount DECIMAL(10,2) NOT NULL,
  
  -- Dados específicos por método
  payment_data JSONB,
  
  -- Metadados do gateway
  gateway_response JSONB,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Payment Queue (Fila de Processamento)
```sql
CREATE TABLE payment_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id),
  status VARCHAR(20) DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  
  scheduled_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  error_message TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Order Status History
```sql
CREATE TABLE order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  status VARCHAR(20) NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🔄 **Fluxo de Estados**

### Status do Pedido
```
pending → paid → processing → shipped → delivered
   ↓        ↓        ↓          ↓
cancelled ← cancelled ← cancelled ← returned
```

### Status do Pagamento
```
pending → processing → paid
   ↓          ↓         ↓
failed ← timeout ← refunded
```

## 🚀 **APIs REST**

### Checkout
- `POST /api/checkout/validate` - Validar carrinho
- `POST /api/checkout/create-order` - Criar pedido
- `GET /api/checkout/shipping-options` - Opções de frete

### Pagamentos
- `POST /api/payments/process` - Processar pagamento
- `GET /api/payments/[id]` - Status do pagamento
- `POST /api/payments/webhook` - Webhook dos gateways

### Pedidos
- `GET /api/orders` - Listar pedidos do usuário
- `GET /api/orders/[id]` - Detalhes do pedido
- `PUT /api/orders/[id]/status` - Atualizar status

## 🎯 **Sistema de Filas**

### Queue Processor
```typescript
interface QueueJob {
  id: string;
  type: 'payment' | 'email' | 'stock';
  payload: any;
  attempts: number;
  maxAttempts: number;
  scheduledAt: Date;
}
```

### Tipos de Jobs
1. **PaymentJob** - Processar pagamentos
2. **EmailJob** - Enviar emails de confirmação
3. **StockJob** - Atualizar estoque
4. **NotificationJob** - Notificações push

## 💳 **Métodos de Pagamento**

### PIX
- QR Code para pagamento
- Chave PIX para transferência
- Validação automática via webhook

### Cartão de Crédito/Débito
- Tokenização segura
- 3D Secure
- Parcelamento

### Boleto Bancário
- Geração de código de barras
- Vencimento configurável
- Verificação de pagamento

## 🔐 **Segurança**

### Validações
- Verificação de estoque em tempo real
- Validação de preços no servidor
- Rate limiting por usuário
- CSRF protection

### Dados Sensíveis
- Nunca armazenar dados de cartão
- Criptografia de dados pessoais
- Logs de auditoria
- Compliance PCI DSS

## 📱 **UX/UI Components**

### Checkout Flow
1. **Carrinho** → Revisão de itens
2. **Endereço** → Seleção/cadastro
3. **Frete** → Opções de entrega
4. **Pagamento** → Método e dados
5. **Confirmação** → Resumo final
6. **Sucesso** → Confirmação do pedido

### Estados de Loading
- Skeleton screens
- Progress indicators
- Real-time feedback
- Error boundaries

## 🔄 **Integrações Futuras**

### Gateways de Pagamento
- **Mercado Pago** (PIX, cartões, boleto)
- **Stripe** (cartões internacionais)
- **PagSeguro** (múltiplos métodos)
- **Asaas** (PIX e boleto)

### Correios e Logística
- **Frenet** (já integrado)
- **Melhor Envio**
- **Jadlog**
- **Total Express**

### Notificações
- **SendGrid** (emails)
- **Twilio** (SMS)
- **OneSignal** (push notifications)

## 📊 **Monitoramento**

### Métricas
- Taxa de conversão do checkout
- Abandono por etapa
- Métodos de pagamento preferidos
- Tempo médio de processamento

### Alertas
- Falhas de pagamento
- Estoque baixo
- Pedidos não processados
- Tempo de resposta alto 