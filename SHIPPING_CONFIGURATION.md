# Configuração do Sistema de Transportadoras

Sistema genérico e extensível para integração com transportadoras.

## **Arquitetura**

- **Reaproveitável**: Funciona com qualquer transportadora
- **Otimizado**: Cache, retry automático, fallback
- **Extensível**: Adicionar novas transportadoras é simples
- **Configurável**: Liga/desliga via variáveis de ambiente

## **Variáveis de Ambiente**

### **Sistema Principal**
```bash
# Sistema principal
SHIPPING_INTEGRATION_ENABLED=false                # true para habilitar o sistema
SHIPPING_DEFAULT_PROVIDER=cubbo                   # Provider principal
SHIPPING_FALLBACK_PROVIDER=correios               # Provider de backup (opcional)
SHIPPING_MAX_RETRY_ATTEMPTS=3                     # Máximo de tentativas
SHIPPING_RETRY_INTERVALS=5,30,120                 # Intervalos de retry em minutos
SHIPPING_CACHE_TTL=30                             # TTL do cache em minutos
SHIPPING_WEBHOOK_SECRET=your_webhook_secret_here   # Segredo para webhooks
```

### **Configuração Cubbo**
```bash
SHIPPING_CUBBO_ENABLED=false
SHIPPING_CUBBO_API_URL=https://api.cubbo.com/v1/shipments
SHIPPING_CUBBO_API_KEY=your_cubbo_api_key_here
SHIPPING_CUBBO_STORE_ID=8252
SHIPPING_CUBBO_TIMEOUT=30000
SHIPPING_CUBBO_RETRY_ATTEMPTS=3
SHIPPING_CUBBO_RETRY_DELAY=5000
SHIPPING_CUBBO_TEST_MODE=true
SHIPPING_CUBBO_WEBHOOK_URL=https://yourdomain.com/api/webhooks/cubbo
```

### **Configuração Correios**
```bash
SHIPPING_CORREIOS_ENABLED=false
SHIPPING_CORREIOS_API_URL=https://api.correios.com.br/v1
SHIPPING_CORREIOS_API_KEY=your_correios_api_key_here
SHIPPING_CORREIOS_STORE_ID=your_store_id
SHIPPING_CORREIOS_TIMEOUT=30000
SHIPPING_CORREIOS_RETRY_ATTEMPTS=3
SHIPPING_CORREIOS_RETRY_DELAY=5000
SHIPPING_CORREIOS_TEST_MODE=true
SHIPPING_CORREIOS_WEBHOOK_URL=https://yourdomain.com/api/webhooks/correios
```

## **Setup Rápido**

### **1. Executar Migration**
```bash
# Aplicar migration para adicionar campos na tabela orders
psql -d your_database -f add_shipping_integration_fields.sql
```

### **2. Configurar para Desenvolvimento**
```bash
# No seu arquivo .env
SHIPPING_INTEGRATION_ENABLED=true
SHIPPING_CUBBO_ENABLED=true
SHIPPING_CUBBO_TEST_MODE=true
SHIPPING_CUBBO_API_URL=https://sandbox.cubbo.com/v1/shipments
SHIPPING_CUBBO_API_KEY=test_key_12345
SHIPPING_CUBBO_STORE_ID=8252
```

### **3. Configurar para Produção**
```bash
# No seu arquivo .env de produção
SHIPPING_INTEGRATION_ENABLED=true
SHIPPING_CUBBO_ENABLED=true
SHIPPING_CUBBO_TEST_MODE=false
SHIPPING_CUBBO_API_URL=https://api.cubbo.com/v1/shipments
SHIPPING_CUBBO_API_KEY=live_key_abcdef123456
SHIPPING_CUBBO_STORE_ID=8252
```

## **Como Funciona**

### **Fluxo Automático**
1. Cliente finaliza pedido no checkout
2. Pedido é salvo no banco (SEMPRE)
3. Sistema envia para transportadora (se habilitado)
4. Se falhar, tenta fallback automaticamente
5. Se ainda falhar, agenda retry automático
6. Cliente recebe confirmação imediata (não aguarda transportadora)

### **Retry Inteligente**
- **Tentativa 1**: Imediata
- **Tentativa 2**: 5 minutos depois
- **Tentativa 3**: 30 minutos depois
- **Tentativa 4**: 2 horas depois

### **Códigos de Status**
- `pending`: Aguardando envio
- `sending`: Enviando para transportadora
- `sent`: Enviado com sucesso
- `failed`: Falhou após todas as tentativas
- `cancelled`: Cancelado manualmente

## **Adicionar Nova Transportadora**

### **1. Criar Provider**
```typescript
// apps/store/src/lib/services/shipping/providers/minha-transportadora.ts
export class MinhaTransportadoraProvider implements IShippingProvider {
  name = 'minha_transportadora' as const;
  // ... implementar métodos obrigatórios
}
```

### **2. Registrar no Factory**
```typescript
// apps/store/src/lib/services/shipping/provider-factory.ts
const PROVIDER_REGISTRY: Record<ShippingProvider, ProviderConstructor> = {
  cubbo: CubboProvider,
  correios: CorreiosProvider,
  minha_transportadora: MinhaTransportadoraProvider, // Adicionar aqui
};
```

### **3. Adicionar Types**
```typescript
// apps/store/src/lib/types/shipping.ts
export type ShippingProvider = 'cubbo' | 'correios' | 'minha_transportadora';
```

### **4. Configurar Variáveis**
```bash
SHIPPING_MINHA_TRANSPORTADORA_ENABLED=true
SHIPPING_MINHA_TRANSPORTADORA_API_URL=https://api.minhatransportadora.com
# ... outras variáveis
```

## **Logs e Debugging**

### **Logs Estruturados**
```
[SHIPPING:MP123456] Iniciando envio para transportadora...
[SHIPPING:MP123456:cubbo] Tentativa 1 iniciada...
[SHIPPING:MP123456:cubbo] Resultado: { success: true, duration_ms: 1500 }
[SHIPPING:DB] Status atualizado para pedido abc123: { provider: "cubbo", status: "sent" }
```

### **Debug Helpers**
```typescript
import { ShippingDebug } from '$lib/services/shipping';

// Ver configuração atual
ShippingDebug.logConfiguration();

// Testar providers
await ShippingDebug.testProviders();

// Simular envio
await ShippingDebug.simulateOrder('MP12345');
```

## **APIs Disponíveis**

### **Consultar Status**
```typescript
import ShippingIntegration from '$lib/services/shipping';

const status = await ShippingIntegration.getStatus(orderId, platform);
```

### **Cancelar Envio**
```typescript
const cancelled = await ShippingIntegration.cancel(orderId, platform);
```

### **Estatísticas**
```typescript
const stats = ShippingIntegration.getSystemStats();
// { activeProviders: ['cubbo'], queuedRetries: 2, cacheSize: 15 }
```

## **Campos no Banco**

### **Novos Campos na Tabela `orders`**
- `shipping_provider`: Nome do provider (cubbo, correios, etc.)
- `shipping_provider_id`: ID do pedido na transportadora
- `shipping_status`: Status da integração
- `shipping_response`: Resposta completa da API
- `shipping_attempts`: Número de tentativas
- `last_shipping_attempt`: Timestamp da última tentativa
- `shipping_error`: Último erro
- `shipping_webhook_data`: Dados de webhooks

## **Performance**

### **Otimizações Implementadas**
- **Cache em memória**: Evita reenvios duplicados
- **Operação assíncrona**: Não bloqueia checkout
- **Timeout inteligente**: 30s para criação, 15s para consultas
- **Retry exponencial**: Intervalos crescentes
- **Fallback automático**: Usa provider secundário se principal falhar

### **Métricas Esperadas**
- **Checkout**: < 3 segundos (não aguarda transportadora)
- **Integração**: < 30 segundos (primeira tentativa)
- **Cache hit**: < 50ms
- **Retry**: Automático em background

## **Monitoramento**

### **Logs a Monitorar**
- `[SHIPPING] ✅`: Sucessos
- `[SHIPPING] ⚠️`: Avisos (falhas com retry)
- `[SHIPPING] ❌`: Erros críticos
- `[SHIPPING:DB]`: Operações de banco

### **Alertas Sugeridos**
- Taxa de falha > 10% em 1 hora
- Retry queue > 100 pedidos
- Provider indisponível > 5 minutos

## **Segurança**

### **Validações Implementadas**
- ✅ Timeout em todas as requisições
- ✅ Validação de configuração na inicialização
- ✅ Rate limiting implícito (via retry)
- ✅ Logs sem dados sensíveis
- ✅ Webhook signature verification (se configurado)

### **Dados Sensíveis**
- API keys são mascaradas nos logs
- Dados pessoais seguem formato mínimo necessário
- Responses completas salvas apenas em desenvolvimento

## **Troubleshooting**

### **Sistema Não Envia**
1. Verificar `SHIPPING_INTEGRATION_ENABLED=true`
2. Verificar se provider está habilitado
3. Verificar API key e URL
4. Checar logs para erros de configuração

### **Pedidos Ficam em Retry**
1. Verificar conectividade com API da transportadora
2. Verificar se dados do pedido estão válidos
3. Verificar rate limiting da transportadora
4. Checar timeout configuration

### **Performance Lenta**
1. Verificar timeout configuration
2. Monitorar cache hit rate
3. Verificar se retry queue não está saturada
4. Considerar aumentar cache TTL

Pronto! Sistema totalmente operacional e extensível. 🚚 