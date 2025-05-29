# 🗄️ Configuração de Banco de Dados

## 📋 **Estratégia Atual**

### 🏠 **Desenvolvimento (Local)**
- **Banco**: PostgreSQL local (`localhost`)
- **URL**: `postgresql://postgres@localhost/mktplace_dev`
- **Arquivo**: `.env` (cada app)

### ☁️ **Produção (Cloudflare)**
- **Banco**: Neon PostgreSQL
- **URL**: Via Hyperdrive binding
- **Arquivo**: `.env.production`

## 🔧 **Configuração**

### Para Desenvolvimento:
```bash
# apps/store/.env
DATABASE_URL=postgresql://postgres@localhost/mktplace_dev

# apps/admin-panel/.env  
DATABASE_URL=postgresql://postgres@localhost/mktplace_dev

# apps/seller-panel/.env
DATABASE_URL=postgresql://postgres@localhost/mktplace_dev
```

### Para Produção:
```bash
# Cloudflare Wrangler
wrangler hyperdrive create mktplace-db \
  --connection-string="postgresql://neondb_owner:TOKEN@ep-dawn-field-acydf752-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require"
```

## 🚀 **Como usar**

### 1. Desenvolvimento
```bash
# Banco local deve estar rodando
pg_ctl start

# Rodar aplicação
pnpm dev:store
```

### 2. Deploy Production
```bash
# Deploy automático usa Hyperdrive
pnpm deploy:store
```

## 📊 **Status do Banco Local**

- ✅ **54 produtos** cadastrados
- ✅ **19 categorias** ativas  
- ✅ **13 termos** de busca populares
- ✅ **48 tabelas** completas

## 🔧 **Problemas Resolvidos**

### ✅ **Coluna 'count' não existe** 
- **Problema**: Query usando `count` ao invés de `search_count`
- **Arquivo**: `apps/store/src/routes/api/search/popular-terms/+server.ts`
- **Solução**: Alterado para `SELECT term, search_count as count`

### ✅ **Coluna 'active' não existe**
- **Problema**: Query usando `p.active` ao invés de `p.is_active` 
- **Arquivo**: Mesmo arquivo popular-terms
- **Solução**: Alterado para `WHERE p.is_active = true`

## 🔍 **Troubleshooting**

### Banco local não conecta:
```bash
# Verificar se PostgreSQL está rodando
brew services list | grep postgresql

# Iniciar se necessário
brew services start postgresql
```

### Verificar dados:
```bash
psql postgresql://postgres@localhost/mktplace_dev -c "\dt"
```

### Verificar estrutura de tabela:
```bash
psql postgresql://postgres@localhost/mktplace_dev -c "\d popular_searches"
``` 