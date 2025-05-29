# Melhorias para Sistema de Busca - Marketplace GDG

## 🚀 Melhorias de Performance

### 1. Implementar Busca com Elasticsearch/Meilisearch
Para marketplaces grandes, considere usar um motor de busca dedicado:

```typescript
// Exemplo com Meilisearch (mais simples que Elasticsearch)
import { MeiliSearch } from 'meilisearch'

const client = new MeiliSearch({
  host: 'http://localhost:7700',
  apiKey: 'masterKey',
})

// Indexar produtos
await client.index('products').addDocuments(products)

// Buscar com typo tolerance nativo
const results = await client.index('products').search('samsug', {
  limit: 20,
  facets: ['category', 'brand'],
  filter: 'price > 100',
  sort: ['_rankingScore:desc', 'sales_count:desc']
})
```

### 2. Implementar Cache Redis/Upstash
```typescript
// Cache de resultados de busca
const cacheKey = `search:${query}:${JSON.stringify(filters)}`
const cached = await redis.get(cacheKey)

if (cached) {
  return JSON.parse(cached)
}

const results = await searchProducts(query, filters)
await redis.setex(cacheKey, 300, JSON.stringify(results)) // 5 min cache
```

### 3. Busca Fuzzy Melhorada com Similarity
```sql
-- Adicionar à query quando similarity estiver funcionando
OR similarity(p.name, $1) > 0.3
ORDER BY 
  CASE 
    WHEN p.name ILIKE $1 THEN 1.0
    ELSE similarity(p.name, $1)
  END DESC
```

### 4. Implementar Sinônimos
```sql
-- Criar tabela de sinônimos
CREATE TABLE search_synonyms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term VARCHAR(255) NOT NULL,
  synonyms TEXT[] NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Exemplos
INSERT INTO search_synonyms (term, synonyms) VALUES
  ('celular', ARRAY['smartphone', 'telefone', 'mobile']),
  ('notebook', ARRAY['laptop', 'computador portátil']),
  ('fone', ARRAY['headphone', 'fone de ouvido', 'headset']);
```

### 5. Busca por Voz (Web Speech API)
```typescript
// components/VoiceSearch.svelte
const recognition = new webkitSpeechRecognition()
recognition.lang = 'pt-BR'
recognition.onresult = (event) => {
  const transcript = event.results[0][0].transcript
  searchQuery = transcript
  performSearch()
}
```

### 6. Busca Visual (Upload de Imagem)
```typescript
// Integração com API de visão computacional
async function searchByImage(imageFile: File) {
  const formData = new FormData()
  formData.append('image', imageFile)
  
  const response = await fetch('/api/search/visual', {
    method: 'POST',
    body: formData
  })
  
  const { similarProducts } = await response.json()
  return similarProducts
}
```

### 7. Personalização com Machine Learning
```sql
-- Tabela para preferências do usuário
CREATE TABLE user_preferences (
  user_id UUID REFERENCES users(id),
  category_scores JSONB DEFAULT '{}',
  brand_scores JSONB DEFAULT '{}',
  price_range_min DECIMAL(10,2),
  price_range_max DECIMAL(10,2),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Atualizar scores baseado em comportamento
UPDATE user_preferences
SET category_scores = jsonb_set(
  category_scores,
  '{electronics}',
  to_jsonb(COALESCE((category_scores->>'electronics')::float, 0) + 0.1)
)
WHERE user_id = $1;
```

### 8. Autocomplete Inteligente
```typescript
// Implementar debounce + cache + predição
class SmartAutocomplete {
  private cache = new Map()
  private predictions = new Map()
  
  async getSuggestions(query: string) {
    // Check cache first
    if (this.cache.has(query)) {
      return this.cache.get(query)
    }
    
    // Get suggestions
    const suggestions = await fetch(`/api/autocomplete?q=${query}`)
    
    // Add user's common searches
    const userHistory = await this.getUserSearchHistory()
    const filtered = userHistory.filter(h => 
      h.toLowerCase().includes(query.toLowerCase())
    )
    
    // Combine and rank
    const combined = [...suggestions, ...filtered]
    const ranked = this.rankByRelevance(combined, query)
    
    this.cache.set(query, ranked)
    return ranked
  }
}
```

### 9. Busca Federada (Multi-index)
```typescript
// Buscar em múltiplos índices simultaneamente
async function federatedSearch(query: string) {
  const [products, categories, brands, sellers] = await Promise.all([
    searchProducts(query),
    searchCategories(query),
    searchBrands(query),
    searchSellers(query)
  ])
  
  return {
    products: products.slice(0, 10),
    categories: categories.slice(0, 5),
    brands: brands.slice(0, 5),
    sellers: sellers.slice(0, 5)
  }
}
```

### 10. A/B Testing para Relevância
```typescript
// Testar diferentes algoritmos de ranking
const variant = getABTestVariant(userId)

switch (variant) {
  case 'A':
    // Ranking padrão
    return standardRanking(results)
  case 'B':
    // Ranking com boost de popularidade
    return popularityBoostedRanking(results)
  case 'C':
    // Ranking personalizado
    return personalizedRanking(results, userId)
}

// Rastrear conversões para cada variante
trackSearchConversion(variant, query, clickedProduct)
```

## 📊 Métricas para Monitorar

### 1. Performance
- **Tempo de resposta** da busca (P50, P95, P99)
- **Taxa de cache hit**
- **Queries por segundo**

### 2. Relevância
- **Click-through rate (CTR)** dos resultados
- **Posição média do clique**
- **Taxa de busca sem cliques**
- **Taxa de refinamento** (segunda busca)

### 3. Negócio
- **Taxa de conversão** por busca
- **Valor médio do pedido** originado de busca
- **Produtos mais buscados** vs mais vendidos

## 🔧 Implementação Gradual

### Fase 1 (Imediato)
- [ ] Adicionar sinônimos básicos
- [ ] Implementar cache Redis/Upstash
- [ ] Melhorar autocomplete com histórico

### Fase 2 (Curto prazo)
- [ ] Busca por voz
- [ ] A/B testing de relevância
- [ ] Dashboard de métricas

### Fase 3 (Médio prazo)
- [ ] Meilisearch/Elasticsearch
- [ ] Personalização básica
- [ ] Busca visual

### Fase 4 (Longo prazo)
- [ ] ML para ranking
- [ ] Recomendações em tempo real
- [ ] Busca preditiva

## 🎯 Quick Wins

### 1. Adicionar "Você quis dizer?"
```typescript
// Usar Levenshtein distance
function didYouMean(query: string, products: Product[]) {
  if (products.length === 0) {
    const suggestions = await db.query`
      SELECT DISTINCT name, levenshtein($1, name) as distance
      FROM products
      WHERE levenshtein($1, name) <= 3
      ORDER BY distance
      LIMIT 5
    `
    return suggestions[0]?.name
  }
}
```

### 2. Busca por Código de Barras
```typescript
// Scanner de código de barras
import { BarcodeScanner } from '@capacitor-community/barcode-scanner'

async function scanBarcode() {
  const result = await BarcodeScanner.startScan()
  if (result.hasContent) {
    const product = await searchByBarcode(result.content)
    if (product) {
      goto(`/produto/${product.slug}`)
    }
  }
}
```

### 3. Histórico Inteligente
```typescript
// Mostrar buscas recentes com contexto
interface SearchHistoryItem {
  query: string
  timestamp: Date
  resultCount: number
  category?: string
  clickedProduct?: string
}

// Agrupar por sessão de busca
function groupSearchSessions(history: SearchHistoryItem[]) {
  const sessions = []
  let currentSession = []
  
  history.forEach((item, i) => {
    if (i === 0 || item.timestamp - history[i-1].timestamp > 30*60*1000) {
      if (currentSession.length) sessions.push(currentSession)
      currentSession = [item]
    } else {
      currentSession.push(item)
    }
  })
  
  return sessions
}
```

## 🏆 Benchmarks de Referência

- **Amazon**: < 100ms de resposta, personalização extrema
- **Mercado Livre**: Busca visual, filtros dinâmicos
- **Shopee**: Gamificação da busca, trending real-time
- **AliExpress**: Multi-idioma, tradução automática

## 📚 Recursos Adicionais

- [Elasticsearch Guide](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)
- [Meilisearch Docs](https://docs.meilisearch.com/)
- [PostgreSQL Full Text Search](https://www.postgresql.org/docs/current/textsearch.html)
- [Redis Search](https://redis.io/docs/stack/search/) 