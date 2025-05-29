# Implementação de Benefícios no Carrinho

## Visão Geral

Este documento descreve como implementar o sistema completo de benefícios no carrinho, incluindo frete grátis e cupons em 3 níveis (produto, seller, carrinho).

## 1. Frete Grátis

### Níveis de Aplicação

#### 1.1 Produto
```typescript
// No cálculo do frete individual
if (product.shipping_info?.free_shipping || productHasPromotion) {
  item.individualShipping = {
    productId: product.id,
    price: 0,
    estimatedDays: 2
  };
  item.benefits = {
    freeShipping: {
      level: 'product',
      reason: 'Produto com frete grátis'
    }
  };
}
```

#### 1.2 Seller
```typescript
// Verificar se seller tem promoção de frete grátis
if (sellerHasFreeShippingPromo || group.subtotal >= SELLER_FREE_SHIPPING_THRESHOLD) {
  group.shippingCost = 0;
  group.hasFreeShipping = true;
  group.benefits = {
    freeShipping: {
      level: 'seller',
      reason: group.subtotal >= SELLER_FREE_SHIPPING_THRESHOLD 
        ? `Frete grátis para compras acima de R$ ${SELLER_FREE_SHIPPING_THRESHOLD}`
        : 'Promoção de frete grátis do vendedor'
    }
  };
}
```

#### 1.3 Carrinho Total
```typescript
// Verificar condições gerais da loja
if (cartSubtotal >= STORE_FREE_SHIPPING_THRESHOLD || storeHasFreeShippingPromo) {
  // Zerar todos os fretes
  groups.forEach(group => {
    group.shippingCost = 0;
    group.hasFreeShipping = true;
  });
}
```

## 2. Cupons de Desconto

### Estrutura de Cupons

```typescript
interface Coupon {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  scope: 'product' | 'seller' | 'cart';
  description: string;
  minValue?: number;
  maxDiscount?: number;
  includesFreeShipping?: boolean;
  // Condições específicas
  productIds?: string[];      // Para cupons de produto
  sellerIds?: string[];       // Para cupons de seller
  categoryIds?: string[];     // Para cupons de categoria
}
```

### Aplicação por Nível

#### 2.1 Cupom de Produto
```typescript
function applyProductCoupon(item: CartItem, coupon: Coupon) {
  if (coupon.productIds?.includes(item.product.id)) {
    item.appliedCoupon = coupon;
    // Desconto será calculado no componente
  }
}
```

#### 2.2 Cupom de Seller
```typescript
function applySellerCoupon(group: SellerGroup, coupon: Coupon) {
  if (coupon.sellerIds?.includes(group.sellerId)) {
    group.appliedCoupon = coupon;
    group.discount = calculateDiscount(group.subtotal, coupon);
  }
}
```

#### 2.3 Cupom do Carrinho
```typescript
function applyCartCoupon(coupon: Coupon) {
  appliedCoupon.set(coupon);
  // Desconto calculado no derived store cartTotals
}
```

## 3. Cálculo de Totais

### Ordem de Aplicação
1. Descontos de produto
2. Descontos de seller
3. Cálculo de frete (considerando frete grátis)
4. Desconto do carrinho
5. Total final

### Exemplo de Cálculo
```typescript
// No derived store cartTotals
const cartTotals = derived([sellerGroups, appliedCoupon], ([$groups, $coupon]) => {
  // 1. Subtotal com descontos de produto/seller
  const cartSubtotal = $groups.reduce((sum, group) => sum + group.subtotal, 0);
  
  // 2. Total de frete (já considerando frete grátis)
  const totalShipping = $groups.reduce((sum, group) => sum + group.shippingCost, 0);
  
  // 3. Descontos acumulados (produto + seller)
  const totalDiscount = $groups.reduce((sum, group) => sum + group.discount, 0);
  
  // 4. Aplicar cupom do carrinho
  let couponDiscount = 0;
  if ($coupon && $coupon.scope === 'cart') {
    const baseValue = $coupon.scope === 'shipping' ? totalShipping : cartSubtotal;
    couponDiscount = calculateDiscount(baseValue, $coupon);
  }
  
  // 5. Total final
  const cartTotal = cartSubtotal + totalShipping - totalDiscount - couponDiscount;
  
  return {
    cartSubtotal,
    totalShipping,
    totalDiscount: totalDiscount + couponDiscount,
    couponDiscount,
    cartTotal,
    installmentValue: cartTotal / 12
  };
});
```

## 4. Visualização

### Badges de Benefícios
- **Produto**: Badge pequeno próximo ao nome/preço
- **Seller**: Badge médio no cabeçalho do grupo
- **Carrinho**: Badge grande no resumo do pedido

### Cores e Ícones
- **Frete Grátis**: Verde com ícone de caminhão
- **Cupom**: Roxo com ícone de ticket
- **Cashback**: Laranja com ícone de moeda
- **Pontos**: Amarelo com ícone de estrela

### Mensagens Contextuais
- Mostrar economia total
- Indicar origem dos benefícios
- Tooltips explicativos
- Prazo de validade quando aplicável

## 5. Persistência

### LocalStorage
```typescript
// Salvar benefícios aplicados
const STORAGE_KEYS = {
  APPLIED_COUPONS: 'cartAppliedCoupons',
  BENEFITS_CONFIG: 'cartBenefitsConfig'
};

// Estrutura de dados
interface SavedBenefits {
  coupons: {
    product: Record<string, Coupon>;
    seller: Record<string, Coupon>;
    cart: Coupon | null;
  };
  freeShipping: {
    active: boolean;
    reason: string;
  };
}
```

## 6. Validações

### Ao Aplicar Cupom
1. Verificar validade (data)
2. Verificar valor mínimo
3. Verificar limite de uso
4. Verificar compatibilidade com outros cupons
5. Verificar escopo correto

### Ao Calcular Frete
1. Verificar CEP válido
2. Verificar disponibilidade na região
3. Aplicar regras de frete grátis na ordem correta
4. Considerar peso/dimensões se aplicável

## 7. API Integration

### Endpoints Necessários

```typescript
// Validar cupom
POST /api/coupons/validate
{
  code: string;
  cartValue: number;
  items: CartItem[];
}

// Calcular benefícios
POST /api/cart/benefits
{
  items: CartItem[];
  zipCode: string;
  appliedCoupons: string[];
}

// Obter promoções ativas
GET /api/promotions/active
{
  type: 'free_shipping' | 'discount' | 'cashback';
  scope: 'product' | 'seller' | 'cart';
}
```

## 8. Testes

### Cenários de Teste
1. Aplicar múltiplos cupons em diferentes níveis
2. Frete grátis condicional (valor mínimo)
3. Conflito entre benefícios
4. Remoção de itens com benefícios
5. Mudança de CEP com frete grátis
6. Expiração de cupons durante a sessão

### Casos Extremos
- Carrinho vazio com cupom aplicado
- Todos os produtos com frete grátis
- Cupom maior que o valor do carrinho
- Múltiplos sellers com diferentes políticas 