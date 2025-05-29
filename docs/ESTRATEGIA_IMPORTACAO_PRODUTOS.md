# Estratégia de Importação de Produtos Reais

## 📋 Visão Geral

Esta documentação descreve a estratégia completa para importar produtos reais de um JSON para o banco de dados Xata, preenchendo campos faltantes com dados mockados para posterior enriquecimento via IA.

## 🎯 Objetivos

1. **Importar produtos rapidamente** mantendo a integridade do banco
2. **Preencher campos obrigatórios** com dados temporários identificáveis
3. **Preservar dados originais** para referência futura
4. **Facilitar enriquecimento posterior** via IA ou manual
5. **Manter rastreabilidade** de produtos importados vs enriquecidos

## 🏗️ Arquitetura da Solução

### Scripts Criados

1. **`import-real-products.mjs`** - Script principal de importação
2. **`enrich-products-ai.mjs`** - Script de enriquecimento via IA

### Fluxo de Dados

```
JSON Original → Importação → Banco (com dados mockados) → Enriquecimento IA → Banco (dados completos)
```

## 📊 Estrutura de Dados

### Campos Obrigatórios no Banco

```typescript
interface Product {
  // Obrigatórios
  seller_id: string
  category_id: string
  name: string
  slug: string
  description: string
  price: number
  stock_quantity: number
  images: Array<Image>
  
  // Opcionais mas importantes
  sku?: string
  barcode?: string
  compare_at_price?: number
  cost?: number
  weight?: number
  dimensions?: object
  tags?: string[]
  metadata?: object
}
```

### Mapeamento de Campos

O script mapeia automaticamente variações comuns de nomes de campos:

| Campo no Banco | Possíveis Campos no JSON |
|----------------|-------------------------|
| name | name, title |
| price | price, preco |
| description | description, descricao |
| sku | sku, codigo |
| barcode | barcode, ean, gtin |
| stock_quantity | stock, estoque, quantity |
| weight | weight, peso |
| images | images, image, imagem |

## 🔧 Dados Mockados

### Vendedor Padrão
```javascript
{
  email: 'vendedor.padrao@marketplace.com',
  company_name: 'Loja Padrão Marketplace',
  company_document: '00000000000000',
  description: '[PENDENTE] Descrição da empresa a ser preenchida'
}
```

### Categoria Padrão
```javascript
{
  name: 'Produtos Gerais',
  slug: 'produtos-gerais',
  description: 'Categoria temporária para produtos sem categoria definida'
}
```

### Produto Mockado
```javascript
{
  description: '[PENDENTE] Descrição detalhada do produto a ser preenchida via IA',
  stock_quantity: 100,
  weight: 1.0,
  dimensions: { length: 30, width: 20, height: 10, unit: 'cm' },
  tags: ['importado', 'pendente-enriquecimento'],
  metadata: {
    imported_at: '2024-01-01T00:00:00Z',
    needs_enrichment: true,
    original_data: {} // Dados originais do JSON
  }
}
```

## 🚀 Como Usar

### 1. Importar Produtos

```bash
# Importar de um arquivo JSON
node scripts/import-real-products.mjs caminho/para/produtos.json

# Exemplo
node scripts/import-real-products.mjs ../data/meus-produtos.json
```

### 2. Verificar Status de Enriquecimento

```bash
# Ver quantos produtos precisam de enriquecimento
node scripts/enrich-products-ai.mjs --check
```

### 3. Executar Enriquecimento

```bash
# Enriquecer produtos pendentes
node scripts/enrich-products-ai.mjs
```

## 📝 Formato do JSON de Entrada

### Formato Mínimo Aceito
```json
[
  {
    "name": "Produto Exemplo",
    "price": 99.90
  }
]
```

### Formato Completo Suportado
```json
[
  {
    "name": "Smartphone XYZ",
    "price": 1999.90,
    "description": "Descrição do produto",
    "sku": "SKU123",
    "barcode": "7891234567890",
    "stock": 50,
    "weight": 0.2,
    "dimensions": {
      "length": 15,
      "width": 7,
      "height": 1
    },
    "images": [
      {
        "url": "https://exemplo.com/imagem1.jpg",
        "alt": "Frente do produto"
      }
    ],
    "category": "smartphones",
    "tags": ["android", "5g", "128gb"]
  }
]
```

## 🔍 Identificação de Dados Mockados

### Marcadores de Dados Pendentes

1. **Textos com [PENDENTE]** - Indicam campos que precisam ser preenchidos
2. **Tag "pendente-enriquecimento"** - Identifica produtos não processados
3. **metadata.needs_enrichment: true** - Flag para busca programática
4. **Vendedor com document "00000000000000"** - Vendedor temporário

### Queries para Encontrar Dados Mockados

```javascript
// Produtos pendentes
const pendentes = await xata.db.products
  .filter({ 'metadata.needs_enrichment': true })
  .getMany()

// Produtos com descrição pendente
const semDescricao = await xata.db.products
  .filter({ description: { $contains: '[PENDENTE]' } })
  .getMany()

// Produtos sem imagens reais
const semImagens = await xata.db.products
  .filter({ 'images[0].is_placeholder': true })
  .getMany()
```

## 📊 Relatórios Gerados

### Relatório de Importação
```json
{
  "success": 150,
  "errors": 5,
  "skipped": 10,
  "details": [
    {
      "name": "Produto X",
      "sku": "PRO-1234567890-0001",
      "id": "rec_xyz123",
      "needs_enrichment": true
    }
  ]
}
```

## 🤖 Enriquecimento via IA

### Dados Gerados pela IA

1. **Descrição detalhada** (200-300 palavras)
2. **Características principais** (5-8 itens)
3. **Especificações técnicas**
4. **Tags para SEO** (10-15 tags)
5. **Sugestões de categorização**

### Configuração da IA

```javascript
// No arquivo .env
OPENAI_API_KEY=sua-chave-aqui
# ou
ANTHROPIC_API_KEY=sua-chave-aqui
```

## ✅ Checklist Pós-Importação

- [ ] Verificar relatório de importação
- [ ] Conferir produtos no painel admin
- [ ] Executar enriquecimento via IA
- [ ] Revisar descrições geradas
- [ ] Adicionar imagens reais
- [ ] Ajustar categorias
- [ ] Configurar preços reais
- [ ] Atualizar estoque
- [ ] Remover tags de importação
- [ ] Ativar produtos revisados

## 🚨 Considerações Importantes

### Segurança
- Vendedor padrão tem `is_verified: false`
- Senha mockada tem prefixo `mock:`
- Produtos importados começam como `is_active: true` (ajuste se necessário)

### Performance
- Importação processa em lote
- Enriquecimento tem delay de 1s entre produtos (evita rate limit)
- Use paginação para grandes volumes

### Manutenção
- Dados originais preservados em `metadata.original_data`
- Timestamps de importação e enriquecimento
- SKUs únicos gerados automaticamente

## 🔄 Próximas Melhorias

1. **Importação em Lote** - Usar transações para melhor performance
2. **Validação Avançada** - Verificar dados antes de importar
3. **Mapeamento Customizado** - Arquivo de configuração para mapeamentos
4. **Queue de Enriquecimento** - Processar em background
5. **Dashboard de Status** - Interface visual para acompanhar progresso

## 📚 Exemplos de Uso Avançado

### Importar com Mapeamento Customizado

```javascript
// Criar arquivo de mapeamento
const customMapping = {
  "titulo": "name",
  "valor": "price",
  "codigo_produto": "sku"
}

// Usar no script (futura implementação)
node scripts/import-real-products.mjs produtos.json --mapping=mapeamento.json
```

### Filtrar Produtos para Enriquecimento

```javascript
// Enriquecer apenas produtos de uma categoria
const produtos = await xata.db.products
  .filter({
    'metadata.needs_enrichment': true,
    'category_id': 'categoria-especifica'
  })
  .getMany()
```

## 🆘 Troubleshooting

### Erro: "SKU já existe"
- O script pula automaticamente produtos com SKU duplicado
- Verifique o relatório para ver quais foram pulados

### Erro: "Categoria não encontrada"
- Produtos vão para categoria "Produtos Gerais"
- Revise e recategorize no painel admin

### Erro de Conexão com Xata
- Verifique variáveis de ambiente
- Confirme que o banco está acessível
- Verifique limites de API 