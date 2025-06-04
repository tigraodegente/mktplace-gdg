# MultiSelect Component

Componente compartilhado e reutilizável para seleção de itens com suporte a busca, hierarquia e múltiplas seleções.

## Características

✅ **Verdadeiramente Reutilizável** - Usado em filtros, formulários e qualquer página  
✅ **Flexível** - Suporte a seleção única ou múltipla  
✅ **Hierárquico** - Categorias pai/filho com indentação  
✅ **Busca** - Filtro em tempo real  
✅ **Z-index Seguro** - Sempre aparece sobre outros elementos  
✅ **Acessível** - Checkbox/radio, teclado navigation  

## Exemplos de Uso

### 1. Filtros (Múltipla Seleção)
```svelte
<MultiSelect
  items={categories}
  selected={selectedCategories}
  onSelectionChange={(selected) => selectedCategories = selected}
  placeholder="Selecione categorias..."
  hierarchical={true}
  allowMultiple={true}
  searchable={true}
/>
```

### 2. Formulários (Seleção Única)
```svelte
<MultiSelect
  items={categories}
  selected={formData.category_id ? [formData.category_id] : []}
  onSelectionChange={(selected) => {
    formData.category_id = selected[0] || '';
  }}
  placeholder="Selecione uma categoria..."
  hierarchical={true}
  allowMultiple={false}
  searchable={true}
/>
```

### 3. Lista Simples (sem hierarquia)
```svelte
<MultiSelect
  items={brands}
  selected={selectedBrands}
  onSelectionChange={(selected) => selectedBrands = selected}
  placeholder="Selecione marcas..."
  hierarchical={false}
  allowMultiple={true}
  searchable={true}
/>
```

## Props Disponíveis

| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| `items` | `Item[]` | `[]` | Array de itens |
| `selected` | `string[]` | `[]` | IDs dos itens selecionados |
| `onSelectionChange` | `function` | `() => {}` | Callback quando seleção muda |
| `placeholder` | `string` | `'Selecione...'` | Texto quando vazio |
| `label` | `string` | `''` | Label do campo |
| `hierarchical` | `boolean` | `true` | Ativar modo hierárquico |
| `allowMultiple` | `boolean` | `true` | Permitir múltiplas seleções |
| `searchable` | `boolean` | `true` | Ativar busca |
| `maxHeight` | `string` | `'300px'` | Altura máxima do dropdown |

## Estrutura dos Items

```typescript
interface Item {
  id: string;           // ID único
  name: string;         // Nome exibido
  parent_id?: string;   // ID do pai (para hierarquia)
  [key: string]: any;   // Propriedades extras
}
```

## Usado Em

- ✅ `/produtos` - Filtros de categoria (múltipla seleção)
- ✅ `/produtos/novo` - Formulário categoria (seleção única)  
- ✅ `/produtos/[id]` - Edição categoria (seleção única)
- 🚀 **Pronto para qualquer outra página**

## Benefícios

1. **Consistência Visual** - Mesmo design em todo o sistema
2. **Funcionalidade Uniforme** - Mesma UX em qualquer contexto  
3. **Manutenção Centralizada** - Um lugar para melhorias
4. **Tipagem Forte** - TypeScript completo
5. **Performance** - Otimizado com Svelte 5 runes 