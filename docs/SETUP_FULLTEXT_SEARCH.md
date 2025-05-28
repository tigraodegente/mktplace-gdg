# Configuração do Sistema de Busca Full-Text Search

Este documento descreve como configurar e usar o sistema de busca Full-Text Search com PostgreSQL no Marketplace GDG.

## Visão Geral

O sistema de busca implementado oferece:

- **Full-Text Search em Português**: Busca inteligente com suporte a português, incluindo stemming e remoção de acentos
- **Busca Fuzzy**: Correção automática de erros de digitação
- **Autocomplete em Tempo Real**: Sugestões instantâneas enquanto o usuário digita
- **Performance Otimizada**: Índices especializados para respostas rápidas (10-50ms)
- **Busca Dinâmica**: Produtos novos são instantaneamente buscáveis

## Configuração Inicial

### 1. Executar o Script SQL

Execute o script de configuração no banco de dados Xata:

```bash
# Via Xata CLI
xata db:sql --db-url="https://your-workspace.xata.sh/db/your-database" < scripts/setup-fulltext-search.sql

# Ou via psql direto
psql "postgresql://user:password@host:port/database" < scripts/setup-fulltext-search.sql
```

### 2. Verificar a Instalação

```sql
-- Verificar se as extensões foram instaladas
SELECT * FROM pg_extension WHERE extname IN ('unaccent', 'pg_trgm');

-- Verificar se a coluna search_vector existe
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'products' AND column_name = 'search_vector';

-- Verificar se os índices foram criados
SELECT indexname FROM pg_indexes 
WHERE tablename = 'products' 
AND indexname LIKE 'idx_products_%';
```

## Como Funciona

### 1. Indexação Automática

Quando um produto é criado ou atualizado, o trigger `products_search_vector_update` automaticamente:

- Extrai texto do nome, descrição, SKU e tags
- Aplica pesos: A (nome) > B (descrição/SKU) > C (tags)
- Remove acentos e aplica stemming em português
- Armazena o resultado na coluna `search_vector`

### 2. Busca por Texto

A API `/api/products` aceita o parâmetro `q` para busca:

```javascript
// Busca simples
fetch('/api/products?q=kit berço')

// Busca com filtros
fetch('/api/products?q=lençol&categoria=berco&preco_max=100')
```

### 3. Sugestões de Busca

A API `/api/products/search-suggestions` fornece autocomplete:

```javascript
// Buscar sugestões
fetch('/api/products/search-suggestions?q=ber&limit=10')

// Resposta
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "type": "product",
        "id": "prod-1",
        "text": "Kit Berço Completo",
        "price": 189.90,
        "image": "...",
        "discount": 20
      },
      {
        "type": "category",
        "id": "berco",
        "text": "Berço",
        "count": 156
      }
    ]
  }
}
```

## Recursos de Busca

### 1. Operadores de Busca

O sistema suporta operadores avançados:

- **AND**: `kit AND berço` (ambos os termos)
- **OR**: `lençol OR fronha` (qualquer termo)
- **NOT**: `berço -mini` (excluir termo)
- **Frase**: `"kit completo"` (frase exata)
- **Proximidade**: `berço <-> americano` (palavras próximas)

### 2. Correção de Erros

A busca fuzzy corrige automaticamente:

- `berso` → `berço`
- `lensol` → `lençol`
- `bebe` → `bebê`

### 3. Busca por Similaridade

Se a busca exata não retornar resultados, o sistema automaticamente:

1. Tenta Full-Text Search com stemming
2. Se falhar, tenta busca fuzzy com correção
3. Retorna os melhores matches por similaridade

## Performance

### Otimizações Implementadas

1. **Índices Especializados**:
   - GIN para Full-Text Search
   - GiST para busca fuzzy
   - B-tree para filtros comuns

2. **Views Materializadas** (opcional):
   - Estatísticas pré-calculadas de categorias
   - Contagens de produtos por marca

3. **Cache de Busca**:
   - Resultados cacheados no frontend
   - Debounce para autocomplete

### Métricas Esperadas

- **Busca simples**: 10-30ms
- **Busca com filtros**: 20-50ms
- **Autocomplete**: 5-20ms
- **Busca fuzzy**: 30-100ms

## Manutenção

### 1. Atualizar Search Vectors

Se necessário reindexar todos os produtos:

```sql
-- Forçar atualização de todos os search vectors
UPDATE products 
SET search_vector = search_vector 
WHERE search_vector IS NOT NULL;
```

### 2. Refresh de Views Materializadas

Para atualizar estatísticas (se usando views materializadas):

```sql
-- Executar periodicamente (ex: a cada hora)
SELECT refresh_product_statistics();
```

### 3. Análise de Performance

```sql
-- Ver queries mais lentas
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE query LIKE '%products%'
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Verificar uso dos índices
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE tablename = 'products'
ORDER BY idx_scan DESC;
```

## Troubleshooting

### Problema: Busca não retorna resultados esperados

1. Verificar se o search_vector foi gerado:
```sql
SELECT id, name, search_vector 
FROM products 
WHERE name ILIKE '%termo%' 
LIMIT 5;
```

2. Testar a query diretamente:
```sql
SELECT id, name, ts_rank(search_vector, query) as rank
FROM products, websearch_to_tsquery('portuguese', 'termo busca') query
WHERE search_vector @@ query
ORDER BY rank DESC;
```

### Problema: Performance lenta

1. Verificar se os índices estão sendo usados:
```sql
EXPLAIN ANALYZE
SELECT * FROM products
WHERE search_vector @@ websearch_to_tsquery('portuguese', 'kit berço');
```

2. Atualizar estatísticas:
```sql
ANALYZE products;
```

### Problema: Acentos não são ignorados

Verificar se a configuração `portuguese_unaccent` está ativa:
```sql
SELECT * FROM pg_ts_config WHERE cfgname = 'portuguese_unaccent';
```

## Exemplos de Uso

### Frontend - Componente de Busca

```svelte
<script lang="ts">
  import { searchService } from '$lib/services/searchService';
  
  let searchQuery = '';
  let suggestions = [];
  let debounceTimer;
  
  async function handleSearch(event) {
    const query = event.target.value;
    
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      if (query.length >= 2) {
        suggestions = await searchService.quickSearch(query);
      } else {
        suggestions = [];
      }
    }, 300);
  }
</script>

<input 
  type="search" 
  bind:value={searchQuery}
  on:input={handleSearch}
  placeholder="Buscar produtos..."
/>
```

### Backend - Query Customizada

```typescript
// Busca com boost para produtos em promoção
const results = await xata.sql`
  SELECT 
    p.*,
    ts_rank(p.search_vector, query) * 
    CASE WHEN p.original_price > p.price THEN 1.5 ELSE 1 END as rank
  FROM products p,
       websearch_to_tsquery('portuguese', ${searchTerm}) query
  WHERE p.search_vector @@ query
    AND p.is_active = true
  ORDER BY rank DESC
  LIMIT 20
`;
```

## Próximos Passos

1. **Sinônimos**: Adicionar dicionário de sinônimos (ex: "bebê" = "neném")
2. **Sugestões Inteligentes**: ML para prever o que o usuário quer
3. **Busca por Voz**: Integração com Web Speech API
4. **Analytics de Busca**: Rastrear termos mais buscados
5. **Busca Visual**: Buscar produtos por imagem 