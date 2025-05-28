# Sistema de Carrinho - Marketplace GDG

## Visão Geral

O sistema de carrinho é um conjunto modular de componentes que gerencia todo o fluxo de compras do marketplace. Foi desenvolvido com foco em performance, acessibilidade e experiência do usuário.

## Arquitetura

### Store Principal
- **advancedCartStore.ts**: Store Svelte que gerencia o estado global do carrinho
  - Persistência em localStorage
  - Cálculo automático de fretes
  - Sistema de cupons
  - Agrupamento por vendedor

### Componentes

#### CartPreview.svelte
Componente principal que renderiza o carrinho lateral (slide-in).

**Props:**
- `isOpen: boolean` - Controla visibilidade
- `class?: string` - Classes CSS adicionais

**Features:**
- Animações suaves de entrada/saída
- Scroll customizado
- Responsivo

#### CartItem.svelte
Renderiza um item individual do carrinho.

**Props:**
- `item: CartItem` - Dados do produto
- `estimatedDays?: number` - Prazo de entrega
- `shippingMode?: 'express' | 'grouped'` - Modo de entrega
- `onUpdateQuantity: (quantity: number) => void`
- `onRemove: () => void`

**Features:**
- Controle de quantidade com validação de estoque
- Alerta de estoque baixo
- Modal de confirmação para remoção
- Exibição de prazo de entrega

#### SellerGroup.svelte
Agrupa produtos por vendedor.

**Props:**
- `group: SellerGroup` - Dados do grupo
- `onUpdateQuantity: (productId: string, quantity: number) => void`
- `onRemoveItem: (productId: string) => void`

#### ShippingCalculator.svelte
Calcula frete e gerencia endereços.

**Features:**
- Integração com ViaCEP
- Endereços salvos
- Validação de CEP

#### ShippingModeSelector.svelte
Seleção entre entrega agrupada ou expressa.

**Props:**
- `shippingMode: ShippingMode`
- `onModeChange: (mode: ShippingMode) => void`
- `sellerGroups?: SellerGroup[]`

#### CouponSection.svelte
Gerencia aplicação de cupons de desconto.

**Features:**
- Lista de cupons disponíveis
- Validação em tempo real
- Feedback visual

#### CartFooter.svelte
Exibe totais e botão de checkout.

**Props:**
- `subtotal: number`
- `shipping: number`
- `discount: number`
- `total: number`
- `installmentValue: number`
- `onCheckout: () => void`
- `isCheckoutDisabled?: boolean`
- `checkoutDisabledReason?: string`

## Fluxo de Dados

```
advancedCartStore
    ↓
CartPreview
    ├── CartHeader
    ├── ShippingCalculator
    ├── ShippingModeSelector
    ├── SellerGroup[]
    │   └── CartItem[]
    ├── CouponSection
    └── CartFooter
```

## Tipos TypeScript

```typescript
interface CartItem {
  product: Product;
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
  sellerId: string;
  sellerName: string;
  individualShipping?: ProductShipping;
}

interface SellerGroup {
  sellerId: string;
  sellerName: string;
  items: CartItem[];
  subtotal: number;
  shippingOptions: ShippingOption[];
  shippingCost: number;
  discount: number;
  total: number;
  groupedShipping?: { price: number; estimatedDays: number };
  expressShipping?: { price: number; estimatedDays: number };
}
```

## Funcionalidades

### 1. Gestão de Produtos
- Adicionar/remover produtos
- Atualizar quantidades
- Validação de estoque
- Alertas de última unidade

### 2. Sistema de Frete
- **Entrega Agrupada**: Produtos do mesmo vendedor em uma entrega
- **Entrega Expressa**: Cada produto enviado separadamente
- Cálculo automático baseado em CEP
- Cache de resultados

### 3. Cupons de Desconto
- Cupons gerais do carrinho
- Validação de valor mínimo
- Aplicação automática

### 4. Persistência
- LocalStorage para carrinho
- CEP salvo
- Modo de entrega preferido

## Acessibilidade

- Navegação por teclado completa
- ARIA labels apropriados
- Modais com foco gerenciado
- Contraste adequado
- Mensagens de erro claras

## Responsividade Mobile

### Breakpoints
- Mobile: < 640px (padrão)
- Desktop: >= 640px (prefixo `sm:`)

### Otimizações Mobile

#### Tamanhos de Fonte
- Títulos: `text-lg` → `text-base sm:text-lg`
- Texto normal: `text-sm` → `text-xs sm:text-sm`
- Texto pequeno: `text-xs` → `text-[10px] sm:text-xs`
- Texto mínimo: `text-[10px]` → `text-[9px] sm:text-[10px]`

#### Espaçamentos
- Padding containers: `p-6` → `p-4 sm:p-6`
- Padding items: `p-3` → `p-2 sm:p-3`
- Gaps: `gap-4` → `gap-3 sm:gap-4`
- Margins: `mb-3` → `mb-2 sm:mb-3`

#### Componentes
- Imagens de produto: `w-20 h-20` → `w-16 h-16 sm:w-20 sm:h-20`
- Botões de quantidade: `w-7 h-7` → `w-6 h-6 sm:w-7 sm:h-7`
- Ícones: `w-4 h-4` → `w-3.5 h-3.5 sm:w-4 sm:h-4`
- Modais: padding reduzido e margens laterais

#### Textos Mobile
- Truncate em textos longos
- Versões abreviadas (ex: "Cupom" vs "Desconto do cupom")
- Ocultar textos secundários em telas pequenas
- Prazo de entrega: "7d úteis" vs "Entrega em até 7 dias úteis"

## Performance

- Lazy loading de componentes
- Debounce em cálculos
- Cache de frete
- Animações otimizadas com CSS

## Estilização

- Tailwind CSS para estilos utilitários
- Cores do tema: `#00BFB3` (principal), `#00A89D` (hover)
- Responsivo mobile-first
- Animações suaves

## Uso

```svelte
<script>
  import CartPreview from '$lib/components/CartPreview.svelte';
  
  let cartOpen = $state(false);
</script>

<button onclick={() => cartOpen = true}>
  Abrir Carrinho
</button>

<CartPreview bind:isOpen={cartOpen} />
```

## Manutenção

### Adicionar novo campo ao produto
1. Atualizar tipo `Product` em `shared-types`
2. Atualizar `CartItem` se necessário
3. Adicionar lógica no `CartItem.svelte`

### Modificar cálculo de frete
1. Editar `calculateShipping` em `advancedCartStore.ts`
2. Atualizar cache se estrutura mudar

### Adicionar novo tipo de cupom
1. Atualizar tipo `Coupon` em `cart.ts`
2. Adicionar lógica em `validateCoupon`
3. Atualizar UI em `CouponSection.svelte`

## Testes Recomendados

- [ ] Adicionar/remover produtos
- [ ] Alterar quantidades
- [ ] Validação de estoque
- [ ] Cálculo de frete
- [ ] Aplicação de cupons
- [ ] Navegação por teclado
- [ ] Responsividade mobile
- [ ] Persistência após reload

## Melhorias Futuras

1. Integração com API real de frete
2. Sistema de favoritos integrado
3. Recomendações no carrinho vazio
4. Compartilhamento de carrinho
5. Salvamento de carrinhos 