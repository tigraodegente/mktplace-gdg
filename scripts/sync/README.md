# Sistema de Sincronização MongoDB → Neon Develop

Sistema independente e seguro para sincronizar dados do MongoDB para o banco PostgreSQL Neon na branch de desenvolvimento.

## 🚀 Início Rápido

### 1. Configurar Ambiente

Crie um arquivo `.env.develop` na raiz do projeto com as seguintes variáveis:

```bash
# Banco de Dados - Neon Develop
DATABASE_URL=postgresql://user:pass@host.neon.tech/marketplace-develop?sslmode=require
NEON_BRANCH=develop

# MongoDB - Produção (Read-Only)
MONGODB_URI=mongodb+srv://readonly:pass@cluster.mongodb.net/database
MONGODB_DATABASE=graodegente

# Configurações de Sincronização
SYNC_BATCH_SIZE=1000
SYNC_DELAY_MS=100
ANONYMIZE_USERS=true
LOG_LEVEL=info
```

### 2. Instalar Dependências

```bash
# Na raiz do projeto
npm install mongodb pg dotenv
```

### 3. Executar Sincronização

```bash
# Testar conexões
node scripts/sync/utils/db-connector.mjs

# Sincronizar produtos
node scripts/sync/core/sync-products.mjs

# Modo dry-run (não faz alterações)
node scripts/sync/core/sync-products.mjs --dry-run

# Forçar atualização de todos os produtos
node scripts/sync/core/sync-products.mjs --force
```

## 📁 Estrutura

```
scripts/sync/
├── core/                   # Scripts principais
│   ├── sync-products.mjs   # Sincronizar produtos
│   ├── sync-users.mjs      # Sincronizar usuários (em desenvolvimento)
│   ├── sync-orders.mjs     # Sincronizar pedidos (em desenvolvimento)
│   └── sync-all.mjs        # Sincronização completa (em desenvolvimento)
├── utils/                  # Utilitários
│   ├── db-connector.mjs    # Conexões com bancos
│   ├── data-mapper.mjs     # Mapeamento de dados
│   └── logger.mjs          # Sistema de logs
└── README.md              # Este arquivo
```

## 🔧 Comandos Disponíveis

### sync-products.mjs

```bash
# Opções disponíveis:
--dry-run        # Simula sincronização sem fazer alterações
--force          # Força atualização mesmo se não houver mudanças
--batch-size N   # Define tamanho do lote (padrão: 1000)
--limit N        # Limita número de produtos a processar

# Exemplos:
node scripts/sync/core/sync-products.mjs --dry-run --limit 100
node scripts/sync/core/sync-products.mjs --force --batch-size 500
```

## 📊 Logs e Relatórios

Os logs são salvos em `/logs/sync/` com rotação diária:

```
logs/sync/
├── 2024-01-31/
│   ├── sync-products.log    # Log detalhado
│   └── summary.json         # Resumo do dia
└── latest.log → link simbólico para log mais recente
```

### Visualizar Logs

```bash
# Acompanhar logs em tempo real
tail -f logs/sync/latest.log

# Ver apenas erros
grep "ERROR" logs/sync/latest.log

# Ver resumo do dia
cat logs/sync/$(date +%Y-%m-%d)/summary.json | jq
```

## 🔒 Segurança

1. **Branch Validation**: O sistema verifica automaticamente se está conectando à branch correta
2. **Read-Only MongoDB**: Use sempre um usuário com permissões apenas de leitura
3. **Anonimização**: Dados sensíveis de usuários são anonimizados por padrão
4. **Sem Senhas**: Senhas nunca são sincronizadas

## 🐛 Troubleshooting

### Erro: "MONGODB_URI não configurada"
- Verifique se o arquivo `.env.develop` existe e está configurado

### Erro: "Conexão bloqueada por segurança"
- A URL do banco não contém "develop" no nome
- Use `forceConnection: true` apenas se tiver certeza

### Erro: "Connection timeout"
- Verifique conectividade de rede
- Aumente timeout nas configurações

### Performance lenta
- Reduza `SYNC_BATCH_SIZE`
- Aumente `SYNC_DELAY_MS`
- Execute em horários de menor tráfego

## 📈 Monitoramento

### Verificar Status

```bash
# Contar produtos no MongoDB
node -e "
import { DatabaseConnector } from './scripts/sync/utils/db-connector.mjs';
const db = new DatabaseConnector();
await db.connectMongo();
const count = await db.getMongoDb().collection('m_product').countDocuments();
console.log('Produtos no MongoDB:', count);
await db.disconnect();
"

# Verificar último sync
grep "sync_complete" logs/sync/latest.log | tail -1 | jq
```

### Métricas Importantes

- **Created**: Novos produtos adicionados
- **Updated**: Produtos atualizados
- **Skipped**: Produtos sem alterações
- **Errors**: Produtos com erro (verificar logs)

## 🔄 Automação

### Cron Job

```bash
# Adicionar ao crontab para executar diariamente às 2h
0 2 * * * cd /path/to/project && node scripts/sync/core/sync-products.mjs >> logs/sync/cron.log 2>&1
```

### GitHub Actions

Veja `.github/workflows/sync-develop.yml` para configuração de CI/CD.

## 📝 Desenvolvimento

### Adicionar Nova Sincronização

1. Crie novo script em `core/sync-[tipo].mjs`
2. Use os utilitários existentes (DatabaseConnector, Logger, DataMapper)
3. Siga o padrão dos scripts existentes
4. Adicione documentação

### Testar Mudanças

```bash
# Sempre teste com dry-run primeiro
node scripts/sync/core/sync-products.mjs --dry-run --limit 10

# Verificar logs de debug
LOG_LEVEL=debug node scripts/sync/core/sync-products.mjs --limit 1
```

## 🤝 Contribuindo

1. Não commite arquivos `.env`
2. Teste com `--dry-run` antes de fazer PR
3. Mantenha logs limpos (sem informações sensíveis)
4. Documente novas funcionalidades

## 📞 Suporte

Em caso de problemas:

1. Verifique os logs detalhados
2. Consulte a documentação principal em `/docs/database/SINCRONIZACAO_MONGODB_NEON.md`
3. Abra uma issue com logs relevantes (sem dados sensíveis) 