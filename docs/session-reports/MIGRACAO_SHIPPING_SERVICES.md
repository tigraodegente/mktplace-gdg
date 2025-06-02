# Guia de Migração - Unified Shipping Service

## 🔄 Mudanças Principais

### Serviços Consolidados
- `ShippingCartService` → `UnifiedShippingService`
- `AdvancedShippingService` → `UnifiedShippingService`
- `UniversalShippingService` → `UnifiedShippingService`

### Novos Tipos
```typescript
// Antes
import type { AdvancedShippingOption } from '$lib/services/AdvancedShippingService';
import type { SellerShippingQuote } from '$lib/services/shippingCartService';

// Depois
import type { UnifiedShippingOption, UnifiedShippingQuote } from '$lib/services/unifiedShippingService';
```

### Métodos Principais

#### Calcular frete para carrinho
```typescript
// Antes (ShippingCartService)
const quotes = await ShippingCartService.calculateShippingForCart(postalCode, cartItems);

// Depois
const quotes = await UnifiedShippingService.calculateShippingForCart(platform, postalCode, cartItems);
```

#### Calcular frete para seller
```typescript
// Antes
const result = await ShippingCartService.calculateShippingForSeller(postalCode, items, sellerId);

// Depois
const quote = await UnifiedShippingService.calculateShippingForSeller(platform, {
  postalCode,
  items,
  sellerId,
  useCache: true
});
```

### Métodos Utilitários
Todos os métodos utilitários foram mantidos:
- `getCheapestOption()`
- `getFastestOption()`
- `calculateCartShippingTotal()`
- `validatePostalCode()`
- `formatPostalCode()`

## ✅ Benefícios da Consolidação

1. **Código Unificado**: Uma única fonte de verdade para cálculos de frete
2. **Cache Inteligente**: Sistema de cache integrado para melhor performance
3. **Tipos Consistentes**: Interfaces unificadas em todo o sistema
4. **Menos Duplicação**: Lógica consolidada em um único lugar
5. **Manutenção Simplificada**: Mais fácil adicionar novos recursos

## 🚨 Pontos de Atenção

1. O parâmetro `platform` agora é obrigatório em todos os métodos principais
2. O retorno agora é sempre `UnifiedShippingQuote` com campo `success` para indicar erros
3. O cache está habilitado por padrão (pode ser desabilitado com `useCache: false`)
