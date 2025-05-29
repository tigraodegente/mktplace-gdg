# 🐛 Correção: Erro de Loop Infinito na Navegação

## Problema

Ao navegar da página de busca para a página de produto, ocorria um erro de loop infinito (`effect_update_depth_exceeded`) que travava a aplicação.

### Sintomas:
- Página travava ao clicar em um produto
- Console mostrava múltiplos erros: `Maximum update depth exceeded`
- Navegação não funcionava (botão voltar não respondia)
- URL mudava mas a página ficava travada

## Causa Raiz

O problema tinha **duas causas principais**:

### 1. Console.logs dentro de effects e templates
No Svelte 5, console.logs dentro de effects ou templates podem causar re-renderizações infinitas.

### 2. Cadeia complexa de dependências reativas
- Múltiplos `$derived` dependendo uns dos outros
- `searchParams` era um `$derived` de `$page.url.searchParams`
- Dezenas de outros `$derived` dependiam de `searchParams`
- O `filters` era um `$derived` que dependia de todos esses
- Isso criava uma cadeia complexa que podia entrar em loop

## Solução Implementada

### 1. Remover todos os console.logs

**Antes:**
```svelte
$effect(() => {
    console.log('🔄 Effect executado');
    console.log('📊 Estado:', state);
    // código...
});
```

**Depois:**
```svelte
$effect(() => {
    // código sem console.logs
});
```

### 2. Refatorar dependências reativas

**Antes (problemático):**
```svelte
// Cadeia complexa de $derived
let searchParams = $derived($page.url.searchParams);
let searchQuery = $derived(searchParams.get('q') || '');
let selectedCategories = $derived(searchParams.get('categoria')?.split(',') || []);
// ... dezenas de outros $derived

const filters = $derived<SearchFilters>({
    categories: selectedCategories,
    brands: selectedBrands,
    // ... todos os outros campos
});
```

**Depois (solução robusta):**
```svelte
import { untrack } from 'svelte';

// Função para extrair parâmetros sem reatividade excessiva
function getUrlParams() {
    return untrack(() => {
        const params = $page.url.searchParams;
        return {
            searchQuery: params.get('q') || '',
            selectedCategories: params.get('categoria')?.split(',').filter(Boolean) || [],
            // ... todos os parâmetros
        };
    });
}

// Estado único que é atualizado controladamente
let urlParams = $state(getUrlParams());

// Atualizar apenas quando necessário
$effect(() => {
    $page.url.searchParams; // Observar mudanças
    urlParams = getUrlParams();
});

// Derivar valores individuais do estado único
let searchQuery = $derived(urlParams.searchQuery);
let selectedCategories = $derived(urlParams.selectedCategories);
// ... outros valores

// Função para construir filtros sob demanda
function buildFilters(): SearchFilters {
    return {
        categories: selectedCategories,
        brands: selectedBrands,
        // ... outros campos
    };
}
```

### 3. Usar `untrack` para evitar dependências desnecessárias

O `untrack` do Svelte permite executar código sem criar dependências reativas:

```svelte
import { untrack } from 'svelte';

// Lê valores sem criar dependências
const value = untrack(() => someReactiveValue);
```

## Arquivos Modificados

1. **`apps/store/src/routes/busca/+page.svelte`**
   - Removidos todos os console.logs
   - Refatorada toda a lógica de estado reativo
   - Usado `untrack` para evitar dependências excessivas
   - Substituído `$:` por `$derived` (compatibilidade com runes)
   - `filters` agora é uma função `buildFilters()` ao invés de `$derived`

2. **`apps/store/src/lib/components/product/ProductCard.svelte`**
   - Corrigido tipo do `hoverInterval`
   - Removido type cast desnecessário

## Conceitos Importantes

### Reatividade no Svelte 5

1. **$derived cria dependências**: Cada `$derived` observa suas dependências e re-executa quando elas mudam
2. **Cadeias longas são perigosas**: Muitos `$derived` dependendo uns dos outros pode criar loops
3. **untrack quebra a cadeia**: Use `untrack` quando precisar ler valores sem criar dependências

### Padrão Recomendado

```svelte
// ✅ BOM: Estado centralizado com atualizações controladas
let state = $state(computeState());

$effect(() => {
    // Observar mudanças específicas
    dependency;
    // Atualizar estado de forma controlada
    state = computeState();
});

// ✅ BOM: Derivar valores simples do estado
let value = $derived(state.someField);

// ✅ BOM: Funções para computar valores complexos
function computeComplexValue() {
    return { /* ... */ };
}
```

## Como Debugar no Svelte 5 (Forma Correta)

### 1. Use `$inspect` para Debug Reativo:
```svelte
<script>
    let count = $state(0);
    $inspect(count); // Debug seguro
</script>
```

### 2. Use `$state.snapshot()` para Logs:
```svelte
<script>
    let products = $state([]);
    
    function logProducts() {
        console.log('Produtos:', $state.snapshot(products));
    }
</script>
```

### 3. Debug em Funções Separadas:
```svelte
<script>
    let data = $state(null);
    
    // Função separada para debug
    function debugData() {
        console.log('Data atual:', $state.snapshot(data));
    }
    
    $effect(() => {
        processData(data);
        // Chamar debug se necessário
        if (import.meta.env.DEV) {
            debugData();
        }
    });
</script>
```

## Teste da Correção

1. Navegue para: `http://localhost:5173/busca?q=xiaomi`
2. Clique em qualquer produto
3. A navegação deve funcionar sem erros ✅
4. O botão voltar deve funcionar normalmente ✅
5. Não deve haver erros no console ✅

## Prevenção Futura

### 1. Regras de Código
- **Nunca** coloque console.log dentro de `$effect`
- **Evite** longas cadeias de `$derived`
- **Use** `untrack` quando precisar ler valores sem criar dependências
- **Prefira** funções a `$derived` para valores complexos

### 2. Revisão de Código
- Verificar uso de `$effect` e `$derived`
- Procurar por cadeias longas de dependências
- Garantir que console.logs estão fora de contextos reativos

### 3. Testes
- Adicionar testes E2E para navegação
- Testar transições entre páginas
- Verificar performance com muitos dados

## Lições Aprendidas

1. **Simplicidade é melhor**: Evite estruturas reativas complexas
2. **untrack é seu amigo**: Use para quebrar cadeias de dependências
3. **Debug com cuidado**: Console.logs podem quebrar a reatividade
4. **Estado centralizado**: Melhor ter um estado único bem controlado

## Referências

- [Svelte 5 Runes](https://svelte.dev/docs/svelte/v5-migration-guide)
- [Effect Update Depth Error](https://svelte.dev/docs/svelte/v5-migration-guide#effects)
- [untrack API](https://svelte.dev/docs/svelte/untrack)
- [Debugging in Svelte 5](https://svelte.dev/docs/svelte/$inspect) 