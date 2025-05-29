# Configuração do Cloudflare KV para Cache Global

## O que é Cloudflare KV?

Cloudflare KV (Key-Value) é um armazenamento de dados distribuído globalmente que permite cache de baixa latência em todo o mundo. É perfeito para:
- Cache de resultados de API
- Armazenamento de sessões
- Dados que mudam com pouca frequência
- Configurações globais

## Configuração Automática (Recomendado)

Execute o script que criamos:

```bash
./scripts/setup-cloudflare-kv.sh
```

Este script irá:
1. Verificar se você tem o Wrangler instalado
2. Fazer login no Cloudflare (se necessário)
3. Criar os namespaces KV de produção e preview
4. Atualizar automaticamente o `wrangler.toml` com os IDs

## Configuração Manual

### 1. Instalar Wrangler

```bash
npm install -g wrangler
```

### 2. Fazer login no Cloudflare

```bash
wrangler login
```

### 3. Criar KV Namespaces

```bash
# Criar namespace de produção
wrangler kv:namespace create "CACHE_KV"

# Criar namespace de preview
wrangler kv:namespace create "CACHE_KV" --preview
```

### 4. Atualizar wrangler.toml

Copie os IDs gerados e atualize o arquivo `apps/store/wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "CACHE_KV"
id = "seu_id_de_producao_aqui"
preview_id = "seu_id_de_preview_aqui"
```

## Como Usar o Cache KV

### 1. No código (já implementado)

```typescript
// Em qualquer endpoint
import { createCache } from '$lib/cache/kv-cache';

export const GET: RequestHandler = async ({ platform }) => {
  const cache = platform?.env?.CACHE_KV 
    ? createCache(platform.env.CACHE_KV) 
    : null;
  
  if (cache) {
    // Buscar do cache
    const cached = await cache.get('minha-chave');
    if (cached) return cached;
    
    // Calcular valor
    const valor = await calcularValor();
    
    // Salvar no cache por 5 minutos
    await cache.set('minha-chave', valor, { ttl: 300 });
    
    return valor;
  }
};
```

### 2. Com Tags para Invalidação

```typescript
// Salvar com tags
await cache.set('produto:123', produto, { 
  ttl: 3600, // 1 hora
  tags: ['produtos', 'categoria:eletronicos'] 
});

// Invalidar todos os produtos
await cache.invalidateByTag('produtos');

// Invalidar categoria específica
await cache.invalidateByTag('categoria:eletronicos');
```

### 3. Decorator para Cache Automático

```typescript
class ProductService {
  constructor(private kv: KVNamespace) {}
  
  @cached(300, 'products') // Cache por 5 minutos
  async getPopularProducts() {
    // Método pesado que será cacheado automaticamente
    return await db.query('...');
  }
}
```

## Desenvolvimento Local

O Wrangler cria automaticamente um namespace KV local quando você executa:

```bash
cd apps/store
npm run dev
```

Os dados são armazenados em `.wrangler/state/` e persistem entre execuções.

## Monitoramento

### Via Dashboard

1. Acesse [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Vá para Workers & Pages > KV
3. Selecione seu namespace
4. Visualize métricas de uso

### Via CLI

```bash
# Listar chaves
wrangler kv:key list --namespace-id=seu_id

# Ler valor
wrangler kv:key get "minha-chave" --namespace-id=seu_id

# Deletar chave
wrangler kv:key delete "minha-chave" --namespace-id=seu_id
```

## Limites e Custos

### Plano Gratuito
- 100,000 leituras/dia
- 1,000 escritas/dia
- 1 GB de armazenamento
- 25 MB/mês de largura de banda

### Boas Práticas

1. **Use TTL apropriado**: Não cache para sempre
2. **Chaves descritivas**: Use prefixos (`produto:`, `usuario:`, etc)
3. **Comprima dados grandes**: JSON.stringify com compressão
4. **Invalide quando necessário**: Use tags para invalidação em grupo
5. **Monitore o uso**: Evite exceder limites

## Troubleshooting

### Erro: "KV namespace not found"
- Verifique se os IDs no wrangler.toml estão corretos
- Certifique-se de ter feito deploy após adicionar o KV

### Cache não funciona localmente
- Execute `wrangler dev` ao invés de `npm run dev`
- Verifique se o `.wrangler/` não está no .gitignore

### Performance lenta
- KV tem latência de ~50ms globalmente
- Para dados críticos, use cache em memória também
- Considere Cloudflare Durable Objects para consistência forte

## Próximos Passos

1. **Implementar cache em mais endpoints**:
   - Categorias
   - Produtos em destaque
   - Configurações

2. **Adicionar métricas**:
   - Taxa de hit/miss
   - Tempo de resposta
   - Tamanho do cache

3. **Implementar warming**:
   - Pré-carregar cache importante
   - Renovar cache antes de expirar 