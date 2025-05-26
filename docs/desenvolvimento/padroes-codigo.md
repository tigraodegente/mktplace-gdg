# Padrões de Código - Marketplace GDG

## TypeScript

### Configuração Base
```typescript
// tsconfig.base.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "allowJs": true,
    "checkJs": true,
    "noEmit": true,
    "moduleResolution": "node"
  }
}
```

### Tipos e Interfaces

#### Preferências
```typescript
// ✅ BOM: Use interface para objetos
interface User {
  id: string;
  name: string;
  email: string;
}

// ✅ BOM: Use type para unions, intersections, e tipos utilitários
type Status = 'pending' | 'active' | 'inactive';
type ID = string | number;
type UserWithPosts = User & { posts: Post[] };

// ❌ EVITE: any
let data: any; // Evite

// ✅ BOM: Use unknown quando o tipo é desconhecido
let data: unknown;
if (typeof data === 'string') {
  console.log(data.toUpperCase());
}
```

#### Nomenclatura de Tipos
```typescript
// Interfaces: PascalCase, sem prefixo I
interface Product { }
interface OrderItem { }

// Types: PascalCase
type PaymentMethod = 'card' | 'pix' | 'boleto';

// Enums: PascalCase para nome, UPPER_CASE para valores
enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed'
}

// Generics: Uma letra maiúscula ou nome descritivo
type Result<T> = { data: T } | { error: Error };
type ApiResponse<TData, TError = Error> = 
  | { success: true; data: TData }
  | { success: false; error: TError };
```

### Funções

#### Tipagem de Funções
```typescript
// ✅ BOM: Tipos explícitos para parâmetros e retorno
function calculateTotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

// ✅ BOM: Arrow functions tipadas
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

// ✅ BOM: Funções assíncronas
async function fetchUser(id: string): Promise<User | null> {
  try {
    const response = await api.get<User>(`/users/${id}`);
    return response.data;
  } catch {
    return null;
  }
}
```

#### Parâmetros Opcionais e Default
```typescript
interface SearchOptions {
  query: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'price' | 'date';
}

function searchProducts({
  query,
  page = 1,
  limit = 20,
  sortBy = 'name'
}: SearchOptions): Promise<Product[]> {
  // implementação
}
```

## Componentes Svelte

### Estrutura Básica
```svelte
<!-- ProductCard.svelte -->
<script lang="ts">
  import type { Product } from '$lib/types';
  import { formatCurrency } from '$lib/utils';
  import { addToCart } from '$lib/stores/cart';
  
  // Props
  export let product: Product;
  export let showActions = true;
  
  // Estado local
  let isLoading = false;
  
  // Computed
  $: discountPercentage = product.compareAtPrice
    ? Math.round((1 - product.price / product.compareAtPrice) * 100)
    : 0;
  
  // Handlers
  async function handleAddToCart() {
    isLoading = true;
    try {
      await addToCart(product.id);
    } finally {
      isLoading = false;
    }
  }
</script>

<article class="product-card">
  <!-- template -->
</article>

<style>
  /* Estilos locais apenas quando necessário */
  .product-card {
    /* Use Tailwind sempre que possível */
  }
</style>
```

### Props e Eventos
```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Product } from '$lib/types';
  
  // Props tipadas
  export let product: Product;
  export let variant: 'card' | 'list' = 'card';
  export let loading = false;
  
  // Eventos customizados
  const dispatch = createEventDispatcher<{
    select: { product: Product };
    delete: { id: string };
  }>();
  
  function handleSelect() {
    dispatch('select', { product });
  }
</script>
```

### Slots Tipados
```svelte
<!-- Layout.svelte -->
<script lang="ts">
  export let title: string;
</script>

<div class="layout">
  <header>
    <slot name="header">
      <h1>{title}</h1>
    </slot>
  </header>
  
  <main>
    <slot />
  </main>
  
  <footer>
    <slot name="footer" />
  </footer>
</div>
```

## Stores

### Writable Stores
```typescript
// stores/user.ts
import { writable, derived } from 'svelte/store';
import type { User } from '$lib/types';

function createUserStore() {
  const { subscribe, set, update } = writable<User | null>(null);
  
  return {
    subscribe,
    login: async (credentials: LoginCredentials) => {
      const user = await authService.login(credentials);
      set(user);
      return user;
    },
    logout: () => {
      authService.logout();
      set(null);
    },
    updateProfile: (data: Partial<User>) => {
      update(user => user ? { ...user, ...data } : null);
    }
  };
}

export const user = createUserStore();
```

### Derived Stores
```typescript
// stores/cart.ts
import { writable, derived } from 'svelte/store';
import type { CartItem } from '$lib/types';

const items = writable<CartItem[]>([]);

export const cart = {
  subscribe: items.subscribe,
  addItem: (item: CartItem) => {
    items.update(currentItems => {
      const existing = currentItems.find(i => i.id === item.id);
      if (existing) {
        existing.quantity += item.quantity;
        return currentItems;
      }
      return [...currentItems, item];
    });
  },
  removeItem: (id: string) => {
    items.update(currentItems => 
      currentItems.filter(item => item.id !== id)
    );
  },
  clear: () => items.set([])
};

// Derived values
export const cartTotal = derived(items, $items =>
  $items.reduce((sum, item) => sum + item.price * item.quantity, 0)
);

export const cartCount = derived(items, $items =>
  $items.reduce((sum, item) => sum + item.quantity, 0)
);
```

## API e Services

### Service Pattern
```typescript
// services/productService.ts
import { xata } from '$lib/xata';
import type { Product, CreateProductDTO, UpdateProductDTO } from '$lib/types';

class ProductService {
  async findAll(options?: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
  }): Promise<{ products: Product[]; total: number }> {
    const { page = 1, limit = 20, category, search } = options || {};
    
    let query = xata.db.products.filter({ is_active: true });
    
    if (category) {
      query = query.filter({ category_id: category });
    }
    
    if (search) {
      query = query.filter({
        $any: [
          { name: { $contains: search } },
          { description: { $contains: search } }
        ]
      });
    }
    
    const results = await query
      .getPaginated({
        pagination: { size: limit, offset: (page - 1) * limit }
      });
    
    return {
      products: results.records,
      total: results.meta.total
    };
  }
  
  async findById(id: string): Promise<Product | null> {
    return xata.db.products.read(id);
  }
  
  async create(data: CreateProductDTO): Promise<Product> {
    return xata.db.products.create({
      ...data,
      created_at: new Date(),
      updated_at: new Date()
    });
  }
  
  async update(id: string, data: UpdateProductDTO): Promise<Product> {
    return xata.db.products.update(id, {
      ...data,
      updated_at: new Date()
    });
  }
  
  async delete(id: string): Promise<void> {
    await xata.db.products.update(id, { is_active: false });
  }
}

export const productService = new ProductService();
```

### API Routes (SvelteKit)
```typescript
// routes/api/products/+server.ts
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { productService } from '$lib/services/productService';
import { z } from 'zod';

const searchSchema = z.object({
  page: z.coerce.number().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  category: z.string().optional(),
  search: z.string().optional()
});

export const GET: RequestHandler = async ({ url, locals }) => {
  try {
    const params = Object.fromEntries(url.searchParams);
    const validated = searchSchema.parse(params);
    
    const result = await productService.findAll(validated);
    
    return json({
      success: true,
      data: result.products,
      meta: {
        total: result.total,
        page: validated.page || 1,
        limit: validated.limit || 20
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json(
        { success: false, error: { code: 'VALIDATION_ERROR', details: error.errors } },
        { status: 400 }
      );
    }
    
    return json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Erro ao buscar produtos' } },
      { status: 500 }
    );
  }
};
```

## Tratamento de Erros

### Error Handling Pattern
```typescript
// utils/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} não encontrado`, 'NOT_FOUND', 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Não autorizado') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

// Helper para tratamento de erros
export function handleError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }
  
  if (error instanceof Error) {
    return new AppError(error.message, 'UNKNOWN_ERROR');
  }
  
  return new AppError('Erro desconhecido', 'UNKNOWN_ERROR');
}
```

### Uso em Componentes
```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { notifications } from '$lib/stores/notifications';
  import type { Product } from '$lib/types';
  
  let products: Product[] = [];
  let loading = true;
  let error: Error | null = null;
  
  onMount(async () => {
    try {
      const response = await fetch('/api/products');
      if (!response.ok) {
        throw new Error('Falha ao carregar produtos');
      }
      const data = await response.json();
      products = data.data;
    } catch (err) {
      error = err as Error;
      notifications.error('Erro ao carregar produtos');
    } finally {
      loading = false;
    }
  });
</script>

{#if loading}
  <div class="loading">Carregando...</div>
{:else if error}
  <div class="error">
    <p>{error.message}</p>
    <button on:click={() => location.reload()}>Tentar novamente</button>
  </div>
{:else}
  <!-- Conteúdo -->
{/if}
```

## Testes

### Testes Unitários
```typescript
// tests/utils/formatters.test.ts
import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate, slugify } from '$lib/utils/formatters';

describe('formatCurrency', () => {
  it('should format number as BRL currency', () => {
    expect(formatCurrency(1234.56)).toBe('R$ 1.234,56');
    expect(formatCurrency(0)).toBe('R$ 0,00');
    expect(formatCurrency(1000000)).toBe('R$ 1.000.000,00');
  });
});

describe('slugify', () => {
  it('should convert string to slug', () => {
    expect(slugify('Hello World')).toBe('hello-world');
    expect(slugify('Ação & Aventura')).toBe('acao-aventura');
    expect(slugify('  Multiple   Spaces  ')).toBe('multiple-spaces');
  });
});
```

### Testes de Componentes
```typescript
// tests/components/ProductCard.test.ts
import { render, fireEvent } from '@testing-library/svelte';
import { vi } from 'vitest';
import ProductCard from '$lib/components/ProductCard.svelte';
import type { Product } from '$lib/types';

const mockProduct: Product = {
  id: '1',
  name: 'Test Product',
  price: 99.90,
  // ... outros campos
};

describe('ProductCard', () => {
  it('should render product information', () => {
    const { getByText } = render(ProductCard, {
      props: { product: mockProduct }
    });
    
    expect(getByText('Test Product')).toBeInTheDocument();
    expect(getByText('R$ 99,90')).toBeInTheDocument();
  });
  
  it('should emit select event when clicked', async () => {
    const { component, getByRole } = render(ProductCard, {
      props: { product: mockProduct }
    });
    
    const handleSelect = vi.fn();
    component.$on('select', handleSelect);
    
    const button = getByRole('button', { name: /adicionar/i });
    await fireEvent.click(button);
    
    expect(handleSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { product: mockProduct }
      })
    );
  });
});
```

## Performance

### Lazy Loading
```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  
  let ProductList: any;
  
  onMount(async () => {
    // Carrega componente apenas quando necessário
    const module = await import('$lib/components/ProductList.svelte');
    ProductList = module.default;
  });
</script>

{#if ProductList}
  <svelte:component this={ProductList} />
{:else}
  <div class="skeleton">Carregando...</div>
{/if}
```

### Memoização
```typescript
// utils/memo.ts
export function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map();
  
  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

// Uso
const expensiveCalculation = memoize((data: number[]) => {
  return data.reduce((sum, n) => sum + n, 0);
});
```

## Segurança

### Validação de Input
```typescript
// utils/validation.ts
import { z } from 'zod';

export const userSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres')
});

export const productSchema = z.object({
  name: z.string().min(3).max(200),
  description: z.string().max(2000),
  price: z.number().positive(),
  stock: z.number().int().nonnegative()
});

// Uso em API
export async function POST({ request }) {
  try {
    const data = await request.json();
    const validated = productSchema.parse(data);
    // Processa dados validados
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json({ errors: error.errors }, { status: 400 });
    }
    throw error;
  }
}
```

### Sanitização
```typescript
// utils/sanitize.ts
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target']
  });
}

export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };
  return text.replace(/[&<>"'/]/g, char => map[char]);
}
``` 