# Sincronização e Importação MongoDB → Neon Develop

## 📋 Visão Geral

Este documento descreve o processo seguro, automatizado e versionado para sincronizar dados do MongoDB com o banco PostgreSQL Neon na branch de desenvolvimento (develop), garantindo um ambiente de desenvolvimento fiel ao de produção sem riscos aos dados produtivos.

## 🎯 Objetivos

1. **Ambiente Realista**: Manter dados de desenvolvimento atualizados com produção
2. **Segurança**: Isolar completamente desenvolvimento de produção
3. **Automação**: Minimizar trabalho manual e erros humanos
4. **Rastreabilidade**: Versionar e documentar todas as sincronizações
5. **Performance**: Otimizar processo para grandes volumes de dados

## 🏗️ Arquitetura

### Fluxo de Dados

```
MongoDB (Produção) → Scripts de Sincronização → Neon Develop → Aplicação Dev
                           ↓
                    Logs e Relatórios
```

### Componentes

1. **Scripts de Sincronização**: `/scripts/sync/`
2. **Configurações**: `.env.develop`
3. **Logs**: `/logs/sync/`
4. **Relatórios**: `/reports/sync/`

## 🔧 Configuração

### 1. Variáveis de Ambiente

Crie um arquivo `.env.develop` com as seguintes configurações:

```bash
# Banco de Dados - Neon Develop
DATABASE_URL=postgresql://user:pass@host.neon.tech/marketplace-develop?sslmode=require
NEON_BRANCH=develop

# MongoDB - Produção (Read-Only)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/database?retryWrites=true&w=majority
MONGODB_DATABASE=graodegente

# Configurações de Sincronização
SYNC_BATCH_SIZE=1000
SYNC_DELAY_MS=100
SYNC_MAX_RETRIES=3

# Notificações (opcional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
EMAIL_NOTIFICATION=devops@marketplace.com

# Logs
LOG_LEVEL=info
LOG_DIR=./logs/sync
```

### 2. Estrutura de Diretórios

```bash
/scripts/sync/
├── core/                   # Scripts principais
│   ├── sync-products.mjs   # Sincronizar produtos
│   ├── sync-users.mjs      # Sincronizar usuários
│   ├── sync-orders.mjs     # Sincronizar pedidos
│   └── sync-all.mjs        # Sincronização completa
├── utils/                  # Utilitários
│   ├── db-connector.mjs    # Conexões com bancos
│   ├── data-mapper.mjs     # Mapeamento de dados
│   ├── logger.mjs          # Sistema de logs
│   └── notifier.mjs        # Notificações
├── config/                 # Configurações
│   ├── sync-config.mjs     # Configurações gerais
│   └── field-mappings.mjs  # Mapeamento de campos
└── templates/              # Templates de relatórios
```

## 📝 Scripts de Sincronização

### Script Principal: sync-all.mjs

```javascript
#!/usr/bin/env node

import 'dotenv/config'
import { syncProducts } from './core/sync-products.mjs'
import { syncUsers } from './core/sync-users.mjs'
import { syncOrders } from './core/sync-orders.mjs'
import { Logger } from './utils/logger.mjs'
import { Notifier } from './utils/notifier.mjs'

const logger = new Logger('sync-all')
const notifier = new Notifier()

async function syncAll(options = {}) {
  const startTime = Date.now()
  const results = {
    products: null,
    users: null,
    orders: null,
    errors: []
  }

  try {
    logger.info('🚀 Iniciando sincronização completa MongoDB → Neon Develop')
    
    // 1. Sincronizar Produtos
    if (options.skip?.includes('products') === false) {
      logger.info('📦 Sincronizando produtos...')
      results.products = await syncProducts(options)
    }
    
    // 2. Sincronizar Usuários
    if (options.skip?.includes('users') === false) {
      logger.info('👥 Sincronizando usuários...')
      results.users = await syncUsers(options)
    }
    
    // 3. Sincronizar Pedidos
    if (options.skip?.includes('orders') === false) {
      logger.info('📋 Sincronizando pedidos...')
      results.orders = await syncOrders(options)
    }
    
    // Gerar relatório
    const duration = Date.now() - startTime
    const report = generateReport(results, duration)
    
    // Salvar relatório
    await saveReport(report)
    
    // Notificar conclusão
    await notifier.success('Sincronização completa', report)
    
    logger.info('✅ Sincronização concluída com sucesso!')
    
  } catch (error) {
    logger.error('❌ Erro na sincronização:', error)
    await notifier.error('Erro na sincronização', error)
    throw error
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  syncAll({
    dryRun: process.argv.includes('--dry-run'),
    skip: process.argv.includes('--skip') ? 
      process.argv[process.argv.indexOf('--skip') + 1].split(',') : [],
    force: process.argv.includes('--force')
  })
}
```

### Script de Produtos: sync-products.mjs

```javascript
import { MongoClient } from 'mongodb'
import pg from 'pg'
import { Logger } from '../utils/logger.mjs'
import { DataMapper } from '../utils/data-mapper.mjs'

const logger = new Logger('sync-products')
const mapper = new DataMapper()

export async function syncProducts(options = {}) {
  const mongoClient = new MongoClient(process.env.MONGODB_URI)
  const neonPool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  })
  
  const stats = {
    total: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0
  }
  
  try {
    // Conectar aos bancos
    await mongoClient.connect()
    const mongodb = mongoClient.db(process.env.MONGODB_DATABASE)
    const collection = mongodb.collection('m_product')
    
    // Contar total
    const totalCount = await collection.countDocuments()
    logger.info(`📊 Total de produtos no MongoDB: ${totalCount}`)
    
    // Processar em lotes
    const batchSize = parseInt(process.env.SYNC_BATCH_SIZE) || 1000
    let skip = 0
    
    while (skip < totalCount) {
      const batch = await collection
        .find({})
        .skip(skip)
        .limit(batchSize)
        .toArray()
      
      logger.info(`🔄 Processando lote ${skip / batchSize + 1} (${batch.length} produtos)`)
      
      for (const mongoProduct of batch) {
        try {
          // Mapear dados
          const neonProduct = mapper.mapProduct(mongoProduct)
          
          // Verificar se existe
          const existing = await neonPool.query(
            'SELECT id, updated_at FROM products WHERE sku = $1',
            [neonProduct.sku]
          )
          
          if (existing.rows.length > 0) {
            // Atualizar se necessário
            if (shouldUpdate(existing.rows[0], mongoProduct)) {
              await updateProduct(neonPool, existing.rows[0].id, neonProduct)
              stats.updated++
            } else {
              stats.skipped++
            }
          } else {
            // Criar novo
            await createProduct(neonPool, neonProduct)
            stats.created++
          }
          
          stats.total++
          
        } catch (error) {
          logger.error(`Erro ao processar produto ${mongoProduct.name}:`, error)
          stats.errors++
        }
      }
      
      skip += batchSize
      
      // Delay entre lotes
      if (process.env.SYNC_DELAY_MS) {
        await new Promise(resolve => setTimeout(resolve, parseInt(process.env.SYNC_DELAY_MS)))
      }
    }
    
    logger.info(`✅ Sincronização de produtos concluída:`, stats)
    return stats
    
  } finally {
    await mongoClient.close()
    await neonPool.end()
  }
}
```

## 🚀 Uso

### Sincronização Manual

```bash
# Sincronização completa
node scripts/sync/core/sync-all.mjs

# Sincronização com opções
node scripts/sync/core/sync-all.mjs --dry-run          # Modo simulação
node scripts/sync/core/sync-all.mjs --skip=orders      # Pular pedidos
node scripts/sync/core/sync-all.mjs --force            # Forçar atualização

# Sincronização específica
node scripts/sync/core/sync-products.mjs               # Apenas produtos
node scripts/sync/core/sync-users.mjs                   # Apenas usuários
node scripts/sync/core/sync-orders.mjs --limit=100     # Últimos 100 pedidos
```

### Automação via Cron

```bash
# Adicionar ao crontab
# Sincronização diária às 2h da manhã
0 2 * * * cd /path/to/project && npm run sync:develop >> logs/sync/cron.log 2>&1

# Sincronização de produtos a cada 6 horas
0 */6 * * * cd /path/to/project && node scripts/sync/core/sync-products.mjs
```

### Automação via CI/CD

```yaml
# .github/workflows/sync-develop.yml
name: Sync MongoDB to Neon Develop

on:
  schedule:
    - cron: '0 2 * * *'  # Diariamente às 2h
  workflow_dispatch:      # Permitir execução manual

jobs:
  sync:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run sync
      env:
        DATABASE_URL: ${{ secrets.NEON_DEVELOP_URL }}
        MONGODB_URI: ${{ secrets.MONGODB_URI }}
      run: npm run sync:develop
      
    - name: Upload logs
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: sync-logs
        path: logs/sync/
```

## 📊 Monitoramento

### Logs

Todos os logs são salvos em `/logs/sync/` com rotação diária:

```
/logs/sync/
├── 2024-01-15/
│   ├── sync-all.log
│   ├── sync-products.log
│   ├── sync-users.log
│   └── sync-orders.log
└── latest.log → 2024-01-15/sync-all.log
```

### Relatórios

Relatórios detalhados são gerados após cada sincronização:

```json
{
  "timestamp": "2024-01-15T02:00:00Z",
  "duration": "5m 23s",
  "results": {
    "products": {
      "total": 15000,
      "created": 50,
      "updated": 1200,
      "skipped": 13700,
      "errors": 50
    },
    "users": {
      "total": 5000,
      "created": 10,
      "updated": 100,
      "skipped": 4890,
      "errors": 0
    }
  },
  "errors": [],
  "warnings": []
}
```

## 🔒 Segurança

### Boas Práticas

1. **Credenciais**: Usar sempre variáveis de ambiente
2. **Acesso MongoDB**: Configurar usuário read-only
3. **Branch Neon**: Nunca apontar para produção
4. **Dados Sensíveis**: Anonimizar quando necessário
5. **Logs**: Não logar informações sensíveis

### Script de Anonimização

```javascript
// scripts/sync/utils/anonymizer.mjs
export function anonymizeUser(user) {
  return {
    ...user,
    email: hashEmail(user.email),
    phone: user.phone ? '***' : null,
    document: user.document ? '***' : null,
    password: null // Nunca sincronizar senhas
  }
}
```

## 🐛 Troubleshooting

### Erro: Connection timeout

```bash
# Aumentar timeout
DATABASE_URL="...?connect_timeout=30"
```

### Erro: Memory limit

```bash
# Executar com mais memória
node --max-old-space-size=4096 scripts/sync/core/sync-all.mjs
```

### Erro: Rate limit

```bash
# Ajustar configurações
SYNC_BATCH_SIZE=500      # Reduzir tamanho do lote
SYNC_DELAY_MS=1000       # Aumentar delay
```

## 📈 Otimizações

### 1. Sincronização Incremental

```javascript
// Sincronizar apenas alterações recentes
const lastSync = await getLastSyncTimestamp()
const filter = { updatedAt: { $gte: lastSync } }
```

### 2. Paralelização

```javascript
// Processar coleções em paralelo
await Promise.all([
  syncProducts(),
  syncUsers(),
  syncCategories()
])
```

### 3. Cache de Mapeamentos

```javascript
// Cachear mapeamentos frequentes
const categoryCache = new Map()
const sellerCache = new Map()
```

## 🔄 Próximos Passos

1. **Dashboard Web**: Interface para monitorar sincronizações
2. **Webhooks**: Sincronização em tempo real via webhooks
3. **Validação**: Verificar integridade dos dados
4. **Rollback**: Sistema para reverter sincronizações
5. **Métricas**: Integração com Prometheus/Grafana

## 📚 Referências

- [Documentação MongoDB](https://docs.mongodb.com/)
- [Documentação Neon](https://neon.tech/docs)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [PostgreSQL Performance](https://www.postgresql.org/docs/current/performance-tips.html) 