# Guia de Desenvolvimento - Marketplace GDG

## Visão Geral

Este guia fornece instruções práticas para desenvolver no projeto Marketplace GDG, cobrindo desde a configuração inicial até o deploy em produção.

## Fluxo de Desenvolvimento

### 1. Configuração Inicial

Antes de começar, certifique-se de ter completado a [Configuração do Ambiente](../setup/ambiente.md).

### 2. Estrutura de Branches

```bash
main          # Produção - código estável
├── develop   # Desenvolvimento - integração
    ├── feature/nome-da-feature    # Novas funcionalidades
    ├── fix/nome-do-bug           # Correções
    └── hotfix/correção-urgente   # Correções urgentes em produção
```

### 3. Iniciando uma Nova Feature

```bash
# Atualize develop
git checkout develop
git pull origin develop

# Crie branch da feature
git checkout -b feature/adicionar-filtros-produtos

# Trabalhe na feature
# ... código ...

# Commit com conventional commits
git add .
git commit -m "feat: adiciona filtros avançados na listagem de produtos"

# Push para o repositório
git push origin feature/adicionar-filtros-produtos
```

## Desenvolvimento por Aplicação

### Store (Loja)

#### Estrutura de Rotas
```
src/routes/
├── +layout.svelte          # Layout principal
├── +page.svelte           # Home
├── produtos/
│   ├── +page.svelte       # Listagem
│   └── [slug]/
│       └── +page.svelte   # Detalhe do produto
├── carrinho/
│   └── +page.svelte       # Carrinho
├── checkout/
│   ├── +page.svelte       # Checkout
│   └── sucesso/
│       └── +page.svelte   # Confirmação
└── conta/
    ├── +page.svelte       # Dashboard
    ├── pedidos/
    └── enderecos/
```

#### Componentes Principais
```typescript
// src/lib/components/ProductCard.svelte
<script lang="ts">
  import type { Product } from '@mktplace/shared-types';
  import { formatCurrency } from '@mktplace/utils';
  import { addToCart } from '$lib/stores/cart';
  
  export let product: Product;
</script>

// src/lib/stores/cart.ts
import { writable } from 'svelte/store';
import type { CartItem } from '@mktplace/shared-types';

function createCartStore() {
  // Implementação do store
}

export const cart = createCartStore();
```

### Admin Panel

#### Funcionalidades Principais
- Dashboard com métricas
- Gerenciamento de produtos
- Gerenciamento de pedidos
- Gerenciamento de usuários
- Configurações do sistema

#### Exemplo de CRUD
```typescript
// src/routes/admin/produtos/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { productService } from '$lib/services/productService';

export const load: PageServerLoad = async ({ url, locals }) => {
  const page = Number(url.searchParams.get('page') || 1);
  const products = await productService.findAll({ page });
  
  return {
    products
  };
};

export const actions: Actions = {
  create: async ({ request, locals }) => {
    const data = await request.formData();
    // Validar e criar produto
  },
  
  delete: async ({ request, locals }) => {
    const data = await request.formData();
    const id = data.get('id') as string;
    await productService.delete(id);
  }
};
```

### Seller Panel

#### Estrutura Específica
```
src/routes/vendedor/
├── dashboard/
├── produtos/
│   ├── novo/
│   └── [id]/editar/
├── pedidos/
├── financeiro/
└── configuracoes/
```

## Trabalhando com Packages Compartilhados

### UI Components

```bash
# Adicionar novo componente
cd packages/ui
pnpm run create:component Button

# Desenvolver com Storybook
pnpm run storybook
```

#### Estrutura de Componente
```typescript
// packages/ui/src/Button/Button.svelte
<script lang="ts">
  export let variant: 'primary' | 'secondary' | 'danger' = 'primary';
  export let size: 'sm' | 'md' | 'lg' = 'md';
  export let disabled = false;
  export let loading = false;
</script>

<button
  class="btn btn-{variant} btn-{size}"
  {disabled}
  on:click
>
  {#if loading}
    <span class="spinner" />
  {/if}
  <slot />
</button>
```

### Shared Types

```typescript
// packages/shared-types/src/index.ts
export * from './models/user';
export * from './models/product';
export * from './models/order';
export * from './api/responses';
```

### Utils

```typescript
// packages/utils/src/formatters.ts
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('pt-BR').format(
    typeof date === 'string' ? new Date(date) : date
  );
}
```

## Integração com Xata.io

### Gerando Tipos

```bash
# Na raiz do projeto
xata codegen

# Ou para uma app específica
cd apps/store
xata codegen --output src/lib/xata.ts
```

### Queries Comuns

```typescript
// Buscar produtos com filtros
const products = await xata.db.products
  .filter({
    is_active: true,
    category_id: categoryId
  })
  .sort('created_at', 'desc')
  .getPaginated({
    pagination: { size: 20, offset: 0 }
  });

// Buscar com relacionamentos
const order = await xata.db.orders
  .filter({ id: orderId })
  .select(['*', 'user.*', 'items.*', 'items.product.*'])
  .getFirst();

// Agregações
const stats = await xata.db.orders
  .filter({ 
    created_at: { $gte: startDate },
    status: 'completed'
  })
  .aggregate({
    totalRevenue: { $sum: 'total' },
    orderCount: { $count: '*' },
    avgOrderValue: { $avg: 'total' }
  });
```

## Autenticação e Autorização

### Implementando Auth

```typescript
// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
import { verifyToken } from '$lib/auth';

export const handle: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get('auth-token');
  
  if (token) {
    try {
      const user = await verifyToken(token);
      event.locals.user = user;
    } catch {
      event.cookies.delete('auth-token');
    }
  }
  
  return resolve(event);
};
```

### Protegendo Rotas

```typescript
// src/routes/admin/+layout.server.ts
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  if (!locals.user || locals.user.role !== 'admin') {
    throw redirect(303, '/login');
  }
  
  return {
    user: locals.user
  };
};
```

## Testes

### Testes Unitários

```typescript
// src/lib/utils/validators.test.ts
import { describe, it, expect } from 'vitest';
import { validateCPF, validateCNPJ } from './validators';

describe('validateCPF', () => {
  it('should validate correct CPF', () => {
    expect(validateCPF('123.456.789-09')).toBe(true);
  });
  
  it('should reject invalid CPF', () => {
    expect(validateCPF('111.111.111-11')).toBe(false);
  });
});
```

### Testes de Integração

```typescript
// src/routes/api/products/products.test.ts
import { describe, it, expect } from 'vitest';

describe('GET /api/products', () => {
  it('should return paginated products', async () => {
    const response = await fetch('/api/products?page=1&limit=10');
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(10);
    expect(data.meta.page).toBe(1);
  });
});
```

### Testes E2E

```typescript
// tests/e2e/checkout.spec.ts
import { test, expect } from '@playwright/test';

test('complete checkout flow', async ({ page }) => {
  // Adicionar produto ao carrinho
  await page.goto('/produtos/notebook-gamer');
  await page.click('button:has-text("Adicionar ao Carrinho")');
  
  // Ir para checkout
  await page.goto('/carrinho');
  await page.click('button:has-text("Finalizar Compra")');
  
  // Preencher dados
  await page.fill('input[name="email"]', 'teste@email.com');
  // ... mais campos
  
  // Confirmar pedido
  await page.click('button:has-text("Confirmar Pedido")');
  
  // Verificar sucesso
  await expect(page).toHaveURL('/checkout/sucesso');
  await expect(page.locator('h1')).toContainText('Pedido Confirmado');
});
```

## Performance

### Otimizações Recomendadas

#### 1. Lazy Loading de Imagens
```svelte
<script>
  import { lazyLoad } from '$lib/actions/lazyLoad';
</script>

<img 
  use:lazyLoad
  data-src={product.image}
  alt={product.name}
  class="w-full h-64 object-cover"
/>
```

#### 2. Paginação Server-Side
```typescript
// +page.server.ts
export const load: PageServerLoad = async ({ url }) => {
  const page = Number(url.searchParams.get('page') || 1);
  const limit = 20;
  
  const { products, total } = await productService.findAll({
    page,
    limit
  });
  
  return {
    products,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};
```

#### 3. Cache de API
```typescript
// src/lib/cache.ts
import { browser } from '$app/environment';

const cache = new Map();
const TTL = 5 * 60 * 1000; // 5 minutos

export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  if (browser && cache.has(key)) {
    const { data, timestamp } = cache.get(key);
    if (Date.now() - timestamp < TTL) {
      return data;
    }
  }
  
  const data = await fetcher();
  
  if (browser) {
    cache.set(key, { data, timestamp: Date.now() });
  }
  
  return data;
}
```

## Deploy

### Build para Produção

```bash
# Build todas as apps
pnpm run build

# Build específica
pnpm --filter ./apps/store build
```

### Deploy no Cloudflare Pages

```bash
# Deploy da store
cd apps/store
wrangler pages deploy .svelte-kit/cloudflare

# Ou via GitHub Actions (automático)
git push origin main
```

### Variáveis de Ambiente

```bash
# Configurar secrets no Cloudflare
wrangler secret put XATA_API_KEY
wrangler secret put AUTH_SECRET
# ... outras variáveis
```

## Debugging

### Ferramentas Úteis

1. **SvelteKit Inspector**: Para debug de rotas e load functions
2. **Xata Studio**: Interface web para queries no banco
3. **Cloudflare Dashboard**: Logs e analytics

### Logs Estruturados

```typescript
// src/lib/logger.ts
export const logger = {
  info: (message: string, data?: any) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      data,
      timestamp: new Date().toISOString()
    }));
  },
  
  error: (message: string, error?: any) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: error?.message || error,
      stack: error?.stack,
      timestamp: new Date().toISOString()
    }));
  }
};
```

## Recursos Adicionais

### Links Úteis
- [SvelteKit Docs](https://kit.svelte.dev/docs)
- [Xata Docs](https://xata.io/docs)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

### Comunidade
- Discord do projeto
- Issues no GitHub
- Documentação interna em `/docs`

### Dicas Finais
1. Sempre rode os testes antes de fazer push
2. Use conventional commits
3. Mantenha a documentação atualizada
4. Peça code review antes de merge
5. Monitore performance em produção 