# ResponsiveTable - Exemplo de Uso

## Como migrar de table-modern para ResponsiveTable

### 1. Importar o componente

```svelte
import ResponsiveTable from '$lib/components/ResponsiveTable.svelte';
```

### 2. Configurar as colunas

```typescript
const tableColumns = [
  {
    key: 'name',
    label: 'Nome',
  },
  {
    key: 'email',
    label: 'E-mail',
    mobileHidden: true // Esconde no mobile
  },
  {
    key: 'status',
    label: 'Status',
    render: (value: string) => `
      <span class="badge badge-${value === 'active' ? 'success' : 'danger'}">
        ${value === 'active' ? 'Ativo' : 'Inativo'}
      </span>
    `
  },
  {
    key: 'total',
    label: 'Total',
    align: 'right',
    render: (value: number) => formatPrice(value)
  }
];
```

### 3. Usar o componente

```svelte
<ResponsiveTable
  columns={tableColumns}
  data={items}
  keyField="id"
  selectable={true}
  selectedRows={selectedItems}
  onRowSelect={toggleItemSelection}
  onSelectAll={toggleAllItems}
  loading={loading}
  emptyMessage="Nenhum item encontrado"
  emptyDescription="Tente ajustar os filtros de busca"
>
  <!-- Slot para ações em cada linha -->
  <svelte:fragment slot="actions" let:row>
    <button onclick={() => editItem(row)}>
      Editar
    </button>
    <button onclick={() => deleteItem(row)}>
      Excluir
    </button>
  </svelte:fragment>
  
  <!-- Slot para rodapé do card no mobile -->
  <svelte:fragment slot="mobile-card-footer" let:row>
    <div class="flex gap-2">
      <button class="btn btn-sm btn-primary flex-1">
        Editar
      </button>
      <button class="btn btn-sm btn-danger flex-1">
        Excluir
      </button>
    </div>
  </svelte:fragment>
</ResponsiveTable>
```

## Propriedades

- `columns`: Array de configuração das colunas
- `data`: Array de dados a serem exibidos
- `keyField`: Campo chave único (padrão: 'id')
- `selectable`: Habilita checkboxes de seleção
- `selectedRows`: Set com IDs das linhas selecionadas
- `onRowSelect`: Callback quando uma linha é selecionada
- `onSelectAll`: Callback quando selecionar todos
- `loading`: Estado de carregamento
- `emptyMessage`: Mensagem quando não há dados
- `emptyDescription`: Descrição adicional quando vazio
- `mobileView`: 'cards' ou 'stacked' (padrão: 'cards')

## Benefícios

1. **Responsivo**: Automaticamente muda para cards no mobile
2. **Sem scroll horizontal**: Cards empilhados no mobile
3. **Configurável**: Escolha quais colunas mostrar no mobile
4. **Reutilizável**: Um componente para todas as tabelas
5. **Acessível**: Mantém semântica HTML correta 