# Componentes Reutilizáveis do Admin Panel

Este documento descreve os componentes reutilizáveis criados para o Admin Panel do marketplace, que podem ser utilizados em todas as telas (produtos, pedidos, categorias, etc).

## Componentes Criados

### 1. DataGrid (`/lib/components/shared/DataGrid.svelte`)

Grid de dados completo com paginação, ordenação e loading state.

**Props:**
- `columns: GridColumn[]` - Configuração das colunas
- `data: any[]` - Dados a serem exibidos
- `loading: boolean` - Estado de carregamento
- `emptyMessage: string` - Mensagem quando não há dados
- `currentPage: number` - Página atual
- `totalPages: number` - Total de páginas
- `pageSize: number` - Itens por página
- `sortColumn: string` - Coluna de ordenação atual
- `sortDirection: 'asc' | 'desc'` - Direção da ordenação
- `onPageChange: (page: number) => void` - Callback de mudança de página
- `onSort: (column: string, direction: 'asc' | 'desc') => void` - Callback de ordenação

**Exemplo de uso:**
```svelte
<DataGrid
  columns={[
    {
      key: 'name',
      label: 'Nome',
      sortable: true,
      formatter: (value) => `<strong>${value}</strong>`
    },
    {
      key: 'price',
      label: 'Preço',
      sortable: true,
      formatter: (value) => `R$ ${value.toFixed(2)}`
    }
  ]}
  data={products}
  loading={loading}
  currentPage={currentPage}
  totalPages={totalPages}
  onPageChange={handlePageChange}
  onSort={handleSort}
/>
```

### 2. FilterBar (`/lib/components/shared/FilterBar.svelte`)

Barra de filtros configurável com busca e múltiplos tipos de filtros.

**Props:**
- `searchValue: string` - Valor do campo de busca
- `searchPlaceholder: string` - Placeholder da busca
- `filters: Filter[]` - Configuração dos filtros
- `onSearch: (value: string) => void` - Callback de busca
- `onFilterChange: (filterId: string, value: any) => void` - Callback de mudança de filtro
- `onClearFilters: () => void` - Callback para limpar filtros

**Tipos de filtros suportados:**
- `select` - Dropdown de seleção
- `date` - Seletor de data
- `number` - Campo numérico
- `checkbox` - Caixa de seleção
- `text` - Campo de texto

**Exemplo de uso:**
```svelte
<FilterBar
  bind:searchValue
  searchPlaceholder="Buscar produtos..."
  filters={[
    {
      id: 'category',
      label: 'Categoria',
      type: 'select',
      value: '',
      placeholder: 'Todas',
      options: [
        { value: '1', label: 'Eletrônicos' },
        { value: '2', label: 'Roupas' }
      ]
    },
    {
      id: 'hasStock',
      label: 'Em estoque',
      type: 'checkbox',
      value: false
    }
  ]}
  onSearch={handleSearch}
  onFilterChange={handleFilterChange}
  onClearFilters={handleClearFilters}
/>
```

### 3. StatsCard (`/lib/components/shared/StatsCard.svelte`)

Card de estatísticas com ícone e informações numéricas.

**Props:**
- `title: string` - Título do card
- `value: string | number` - Valor principal
- `subtitle?: string` - Subtítulo opcional
- `icon: keyof typeof MODERN_ICONS` - Nome do ícone
- `iconColor?: string` - Cor do ícone
- `iconBgColor?: string` - Cor de fundo do ícone
- `trend?: number` - Tendência percentual
- `trendLabel?: string` - Label da tendência
- `layout?: 'horizontal' | 'vertical'` - Layout do card
- `size?: 'sm' | 'md' | 'lg'` - Tamanho do card

**Exemplo de uso:**
```svelte
<StatsCard
  title="Total de Produtos"
  value={150}
  icon="product"
  iconColor="primary"
  iconBgColor="bg-[#00BFB3]/10"
  trend={12.5}
  trendLabel="vs mês anterior"
/>
```

### 4. ModernIcon (`/lib/components/shared/ModernIcon.svelte`)

Sistema de ícones SVG modernos e consistentes.

**Props:**
- `name: keyof typeof MODERN_ICONS` - Nome do ícone
- `size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'` - Tamanho
- `color?: string` - Cor (pode usar presets ou classes Tailwind)
- `className?: string` - Classes CSS adicionais

**Ícones disponíveis:**
- Produtos: `product`, `sku`, `stock`, `totalProducts`
- Status: `active`, `inactive`, `draft`, `featured`
- Ações: `add`, `edit`, `delete`, `save`, `search`
- Alertas: `warning`, `info`, `lowStock`, `outOfStock`
- Outros: `price`, `category`, `brand`, `seller`, `more`

**Exemplo de uso:**
```svelte
<ModernIcon name="product" size="lg" color="primary" />
<ModernIcon name="warning" size="sm" color="text-amber-500" />
```

## Serviços

### ProductsService (`/lib/services/products.service.ts`)

Serviço para gerenciar produtos com integração ao Xata.

**Métodos principais:**
- `getProducts()` - Buscar produtos com filtros e paginação
- `getProductStats()` - Obter estatísticas dos produtos
- `getCategories()` - Listar categorias
- `getBrands()` - Listar marcas
- `getSellers()` - Listar vendedores
- `createProduct()` - Criar produto
- `updateProduct()` - Atualizar produto
- `deleteProduct()` - Deletar produto

**Exemplo de uso:**
```typescript
import { productsService } from '$lib/services/products.service';

// Buscar produtos
const response = await productsService.getProducts(
  page,
  pageSize,
  filters,
  { field: 'created_at', direction: 'desc' }
);

// Obter estatísticas
const stats = await productsService.getProductStats(filters);
```

## Configuração do Banco de Dados

1. Configure as variáveis de ambiente no `.env`:
```env
VITE_XATA_API_KEY=xau_xxxxxxxxxxxx
VITE_XATA_BRANCH=main
VITE_XATA_DATABASE=mktplace-gdg
```

2. O cliente Xata está configurado em `/lib/db/xata.ts`

## Padrão de Implementação para Novas Telas

Para implementar uma nova tela (ex: Pedidos), siga este padrão:

1. **Crie os tipos** em `/lib/types/orders.types.ts`:
```typescript
export interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered';
  // ...
}
```

2. **Crie o serviço** em `/lib/services/orders.service.ts`:
```typescript
class OrdersService {
  async getOrders(page, pageSize, filters, sort) {
    // Implementação similar ao ProductsService
  }
}
```

3. **Use os componentes** na página:
```svelte
<script lang="ts">
  import DataGrid from '$lib/components/shared/DataGrid.svelte';
  import FilterBar from '$lib/components/shared/FilterBar.svelte';
  import StatsCard from '$lib/components/shared/StatsCard.svelte';
  
  // Configurar colunas, filtros e usar os componentes
</script>
```

## Benefícios

1. **Consistência Visual**: Todos os componentes seguem o mesmo padrão visual
2. **Reutilização**: Zero duplicação de código entre telas
3. **Manutenibilidade**: Mudanças em um componente afetam todas as telas
4. **Performance**: Componentes otimizados e com loading states
5. **Acessibilidade**: Componentes com suporte a teclado e ARIA labels
6. **Responsividade**: Funciona em todos os tamanhos de tela

## Próximos Passos

Para cada nova entidade (categorias, marcas, vendedores, pedidos, etc):

1. Crie os tipos TypeScript
2. Crie o serviço correspondente
3. Implemente a página usando os componentes reutilizáveis
4. Configure as colunas do grid e filtros específicos
5. Adicione as estatísticas relevantes

O padrão já está estabelecido e testado na página de produtos! 