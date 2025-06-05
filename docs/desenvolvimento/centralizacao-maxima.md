# Centralização Máxima - Guia de Reutilização de Componentes

## 📊 **Status Atual - O que JÁ está perfeito:**

### ✅ **Componentes UI 100% Centralizados:**
- **DataTable**: Paginação, ordenação, seleção múltipla, ações ✅
- **StatsAccordion**: Estatísticas reutilizáveis ✅
- **FiltersAccordion**: Filtros padronizados ✅
- **Input, Select, Button**: Componentes base ✅
- **MultiSelect**: Seleções hierárquicas ✅
- **ConfirmDialog**: Diálogos padronizados ✅
- **ModernIcon**: Sistema de ícones ✅

### ✅ **Serviços Centralizados:**
- **API Service**: Chamadas padronizadas ✅
- **Toast System**: Notificações ✅
- **Auth Store**: Autenticação ✅

## 🚀 **O que PRECISA ser centralizado antes de criar outras páginas:**

### 1. **AdminPageTemplate** (CRÍTICO)
**Status**: ✅ Criado
**Localização**: `src/lib/components/ui/AdminPageTemplate.svelte`

Este é o componente MAIS IMPORTANTE. Centraliza 90% do código que se repete:
- Header padrão
- Estatísticas
- Filtros
- Tabela com paginação
- Ações em lote
- Autenticação
- Loading states

### 2. **Hook useAdminPage** (RECOMENDADO)
**Status**: 🔄 Criar

```typescript
// src/lib/hooks/useAdminPage.ts
export function useAdminPage(config: AdminPageConfig) {
  // Toda a lógica de estado
  // Funções de carregamento
  // Debounce de busca
  // Paginação
  // etc...
}
```

### 3. **Sistema de Colunas Tipado** (IMPORTANTE)
**Status**: 🔄 Criar

```typescript
// src/lib/types/columns.ts
export interface TableColumn<T = any> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T) => string;
  // ... mais propriedades
}

export const ColumnTemplates = {
  id: (label = 'ID') => ({ key: 'id', label, width: '100px' }),
  name: (label = 'Nome') => ({ key: 'name', label, sortable: true }),
  status: (label = 'Status') => ({ 
    key: 'status', 
    label, 
    render: statusRenderer 
  }),
  date: (key: string, label: string) => ({
    key,
    label,
    render: dateRenderer
  }),
  price: (key: string, label: string) => ({
    key,
    label,
    align: 'right',
    render: priceRenderer
  })
};
```

### 4. **Renders Centralizados** (IMPORTANTE)
**Status**: 🔄 Criar

```typescript
// src/lib/utils/tableRenderers.ts
export const statusRenderer = (value: string) => {
  const configs = {
    active: { class: 'bg-green-100 text-green-800', label: 'Ativo' },
    inactive: { class: 'bg-red-100 text-red-800', label: 'Inativo' },
    // ... mais status
  };
  const config = configs[value] || configs.inactive;
  return `<span class="px-2 py-1 text-xs font-medium rounded-full ${config.class}">${config.label}</span>`;
};

export const priceRenderer = (value: number) => 
  `<span class="font-medium">R$ ${value.toFixed(2)}</span>`;

export const dateRenderer = (value: string) => {
  const date = new Date(value);
  return `<span class="text-sm text-gray-500">${date.toLocaleDateString('pt-BR')}</span>`;
};

export const imageRenderer = (value: string, alt: string) =>
  `<img src="${value}" alt="${alt}" class="w-12 h-12 rounded-lg object-cover" />`;
```

### 5. **Configurações de Páginas** (RECOMENDADO)
**Status**: 🔄 Criar

```typescript
// src/lib/config/pages.ts
export const PageConfigs = {
  produtos: {
    title: 'Produtos',
    entityName: 'produto',
    entityNamePlural: 'produtos',
    apiEndpoint: '/api/products',
    statsEndpoint: '/api/products/stats',
    newItemRoute: '/produtos/novo',
    editItemRoute: (id: string) => `/produtos/${id}`,
    columns: [
      ColumnTemplates.image('Imagem'),
      ColumnTemplates.name('Produto'),
      ColumnTemplates.price('price', 'Preço'),
      ColumnTemplates.status('Status'),
      ColumnTemplates.date('created_at', 'Criado em')
    ]
  },
  
  pedidos: {
    title: 'Pedidos',
    entityName: 'pedido',
    entityNamePlural: 'pedidos',
    apiEndpoint: '/api/orders',
    statsEndpoint: '/api/orders/stats',
    newItemRoute: '/pedidos/novo',
    editItemRoute: (id: string) => `/pedidos/${id}`,
    columns: [
      { key: 'id', label: 'Pedido', render: orderIdRenderer },
      { key: 'customer', label: 'Cliente', render: customerRenderer },
      ColumnTemplates.price('total', 'Total'),
      { key: 'status', label: 'Status', render: orderStatusRenderer },
      ColumnTemplates.date('created_at', 'Data')
    ]
  }
};
```

### 6. **Sistema de Themes/Cores** (OPCIONAL mas RECOMENDADO)
**Status**: 🔄 Criar

```typescript
// src/lib/config/theme.ts
export const AppTheme = {
  colors: {
    primary: '#00BFB3',
    success: '#16A34A',
    warning: '#D97706',
    danger: '#DC2626',
    gray: '#6B7280'
  },
  
  statusColors: {
    active: 'green',
    inactive: 'gray',
    pending: 'yellow',
    error: 'red'
  },
  
  shadows: {
    card: 'shadow-sm',
    modal: 'shadow-xl',
    dropdown: 'shadow-lg'
  }
};
```

## 🏗️ **Como criar uma nova página (APÓS centralização):**

### Exemplo - Página de Usuários (apenas 20 linhas!):

```svelte
<script lang="ts">
  import AdminPageTemplate from '$lib/components/ui/AdminPageTemplate.svelte';
  import { PageConfigs } from '$lib/config/pages';
  
  const config = PageConfigs.usuarios; // Toda configuração em um lugar!
</script>

<AdminPageTemplate {...config} />
```

### Exemplo - Página com customização:

```svelte
<script lang="ts">
  import AdminPageTemplate from '$lib/components/ui/AdminPageTemplate.svelte';
  import { PageConfigs } from '$lib/config/pages';
  
  const config = {
    ...PageConfigs.pedidos,
    customActions: (pedido) => [
      { label: 'Aprovar', icon: 'check', onclick: () => aprovar(pedido) },
      { label: 'Enviar', icon: 'truck', onclick: () => enviar(pedido) }
    ]
  };
  
  function aprovar(pedido) { /* lógica específica */ }
  function enviar(pedido) { /* lógica específica */ }
</script>

<AdminPageTemplate {...config} />
```

## 📝 **Checklist de Centralização Máxima:**

### ✅ **ANTES de criar novas páginas:**
- [ ] Criar `AdminPageTemplate.svelte`
- [ ] Criar `useAdminPage.ts` hook
- [ ] Criar `tableRenderers.ts`
- [ ] Criar `ColumnTemplates`
- [ ] Criar `PageConfigs`
- [ ] Criar sistema de themes (opcional)

### ✅ **Componentes a serem extraídos:**
- [ ] `StatusBadge.svelte` - Para badges de status
- [ ] `ActionButton.svelte` - Para ações da tabela
- [ ] `PageHeader.svelte` - Header padrão das páginas
- [ ] `EmptyState.svelte` - Estado vazio padronizado
- [ ] `LoadingSpinner.svelte` - Loading centralizado

### ✅ **Utils a serem criados:**
- [ ] `formatters.ts` - Formatação de dados
- [ ] `validators.ts` - Validações reutilizáveis
- [ ] `permissions.ts` - Sistema de permissões
- [ ] `exports.ts` - Exportação de dados

## 🎯 **Benefícios da Centralização Máxima:**

### ✅ **Produtividade:**
- Nova página em 5 minutos ⚡
- Apenas configuração, zero código repetido
- Foco apenas na lógica específica

### ✅ **Manutenibilidade:**
- Mudança de cor: 1 arquivo afeta todas as páginas
- Mudança de layout: 1 componente afeta todas as páginas
- Novo filtro: adiciona automaticamente em todas as páginas

### ✅ **Consistência:**
- UX 100% idêntica em todas as páginas
- Comportamentos padronizados
- Performance otimizada

### ✅ **Escalabilidade:**
- 100 páginas diferentes = 100x o mesmo template
- Novos desenvolvedores produtivos no dia 1
- Redução de 90% de bugs de layout

## 🚀 **Próximos Passos:**

1. **Implementar AdminPageTemplate** (prioridade 1)
2. **Migrar página de produtos** para usar template
3. **Criar página de pedidos** usando template
4. **Criar páginas de usuários, relatórios, etc.**
5. **Refinar e otimizar** conforme necessário

## 💡 **Dica Final:**

Sua página de produtos já está 80% centralizada! Só precisa extrair o template para ter 100% de reutilização. Depois disso, cada nova página será criada em minutos, não horas.

**Meta**: 10 páginas administrativas diferentes com 90% de código compartilhado! 