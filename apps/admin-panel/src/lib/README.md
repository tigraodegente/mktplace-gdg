# Biblioteca Centralizada do Admin Panel

## Estrutura

```
lib/
├── components/
│   ├── ui/               # Componentes base reutilizáveis
│   │   ├── Button.svelte
│   │   ├── Input.svelte
│   │   ├── Select.svelte
│   │   ├── DataTable.svelte
│   │   ├── Toast.svelte
│   │   └── index.ts
│   ├── shared/           # Componentes compartilhados
│   │   └── ModernIcon.svelte
│   └── produtos/         # Componentes específicos de produtos
├── services/             # Serviços de API
│   ├── api.ts           # Cliente API centralizado
│   └── productService.ts
├── stores/              # Stores globais
│   └── toast.ts         # Sistema de notificações
├── types/               # Types TypeScript
│   └── index.ts         # Interfaces das entidades
├── hooks/               # Hooks/Composables
│   └── useDebounce.ts
├── utils/               # Utilitários
│   └── cn.ts           # Merge de classes CSS
└── icons-modern.ts      # Sistema de ícones

```

## Como Usar

### 1. Componentes UI

```svelte
<script>
  import { Button, Input, Select, DataTable } from '$lib/components/ui';
</script>

<Button variant="primary" icon="Plus" onclick={handleClick}>
  Novo Item
</Button>

<Input 
  label="Nome" 
  placeholder="Digite o nome"
  bind:value={name}
  error={nameError}
/>

<Select
  label="Status"
  options={statusOptions}
  bind:value={status}
/>
```

### 2. DataTable

```svelte
<DataTable
  columns={[
    { key: 'name', label: 'Nome', sortable: true },
    { key: 'price', label: 'Preço', align: 'right' },
  ]}
  data={items}
  loading={loading}
  selectable={true}
  bind:selectedIds
  page={page}
  pageSize={20}
  totalItems={total}
  onPageChange={(p) => page = p}
  actions={(row) => [
    { label: 'Editar', icon: 'Edit', onclick: () => edit(row) }
  ]}
/>
```

### 3. API Service

```typescript
import { api } from '$lib/services/api';

// GET
const products = await api.get('/products');

// POST com notificação de sucesso
await api.post('/products', productData, {
  showSuccess: true,
  successMessage: 'Produto criado!'
});

// Tratamento de erro automático
try {
  await api.delete(`/products/${id}`);
} catch (error) {
  // Toast de erro é mostrado automaticamente
}
```

### 4. Toast/Notificações

```typescript
import { toast } from '$lib/stores/toast';

// Sucesso
toast.success('Operação realizada!');

// Erro
toast.error('Erro', 'Detalhes do erro');

// Aviso
toast.warning('Atenção', 'Mensagem de aviso');

// Info
toast.info('Informação', 'Mensagem informativa');
```

### 5. Types

```typescript
import type { Product, Category, User } from '$lib/types';

const product: Product = {
  id: '123',
  name: 'Produto',
  price: 99.90,
  // ...
};
```

### 6. Hooks

```typescript
import { useDebounce } from '$lib/hooks/useDebounce';

const debouncedSearch = useDebounce(() => {
  searchProducts();
}, 500);
```

## Padrões de Uso

### Criar Nova Página CRUD

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$lib/services/api';
  import { DataTable, Button, Input } from '$lib/components/ui';
  import type { YourEntity } from '$lib/types';
  
  let items = $state<YourEntity[]>([]);
  let loading = $state(true);
  
  async function loadItems() {
    loading = true;
    try {
      const response = await api.get('/your-endpoint');
      items = response.data;
    } finally {
      loading = false;
    }
  }
  
  onMount(loadItems);
</script>

<DataTable
  columns={columns}
  data={items}
  {loading}
/>
```

## Benefícios

1. **Consistência Visual**: Todos os componentes seguem o mesmo padrão
2. **Reusabilidade**: Componentes prontos para usar
3. **Manutenção Fácil**: Mudanças em um lugar afetam todo o sistema
4. **Type Safety**: TypeScript em todos os componentes
5. **Performance**: Componentes otimizados
6. **DX Melhorada**: Desenvolvimento mais rápido 