# Variáveis de Ambiente - Marketplace GDG

Este documento lista todas as variáveis de ambiente necessárias para executar o marketplace.

## Configurações Essenciais

### Banco de Dados (Xata)

```bash
# API Key do Xata
XATA_API_KEY=xau_your_api_key_here

# Branch do banco (geralmente 'main')
XATA_BRANCH=main

# URLs de conexão PostgreSQL
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
DATABASE_URL_POSTGRES=postgresql://user:password@host/database?sslmode=require
```

### Autenticação

```bash
# Secret para JWT (gere uma string aleatória segura)
JWT_SECRET=your_jwt_secret_here

# Tempo de expiração dos tokens
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d
```

### URLs das Aplicações

```bash
# URLs públicas
SITE_URL=https://marketplace.com
VITE_PUBLIC_STORE_URL=http://localhost:5173
VITE_PUBLIC_ADMIN_URL=http://localhost:5174
VITE_PUBLIC_SELLER_URL=http://localhost:5175
VITE_PUBLIC_API_URL=http://localhost:5173/api
```

## Configurações de Produção

### Email (SMTP)

```bash
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_email_password
EMAIL_FROM=noreply@marketplace.com
```

### Upload de Arquivos (Cloudflare R2)

```bash
R2_ACCOUNT_ID=your_r2_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=marketplace-uploads
R2_PUBLIC_URL=https://uploads.marketplace.com
```

### Pagamentos (Stripe)

```bash
STRIPE_PUBLIC_KEY=pk_test_your_stripe_public_key
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

### Segurança

```bash
# CORS - domínios permitidos
CORS_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:5175

# Secrets para sessão e CSRF
SESSION_SECRET=your_session_secret_here
CSRF_SECRET=your_csrf_secret_here

# Rate limiting
API_RATE_LIMIT=100
API_RATE_LIMIT_WINDOW=15m
```

## Configurações Opcionais

### Cache (Redis)

```bash
REDIS_URL=redis://localhost:6379
CACHE_TTL=3600
```

### Logs e Monitoramento

```bash
LOG_LEVEL=info
SENTRY_DSN=https://your_sentry_dsn@sentry.io/project
MONITORING_ENABLED=true
HEALTH_CHECK_URL=/health
METRICS_ENABLED=true
```

### Analytics

```bash
GA_TRACKING_ID=UA-XXXXXXXXX-X
GTM_ID=GTM-XXXXXXX
```

### Busca (Algolia)

```bash
ALGOLIA_APP_ID=your_algolia_app_id
ALGOLIA_API_KEY=your_algolia_api_key
ALGOLIA_INDEX_NAME=products
```

### Push Notifications

```bash
PUSH_VAPID_PUBLIC_KEY=your_vapid_public_key
PUSH_VAPID_PRIVATE_KEY=your_vapid_private_key
PUSH_VAPID_EMAIL=mailto:admin@marketplace.com
```

### CDN e Otimização de Imagens

```bash
CDN_URL=https://cdn.marketplace.com
IMAGE_OPTIMIZATION_URL=https://images.marketplace.com
```

### Fila de Jobs

```bash
QUEUE_CONNECTION=redis
QUEUE_NAME=marketplace-jobs
```

### Backup

```bash
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30
```

## Configurações por Ambiente

### Desenvolvimento

```bash
NODE_ENV=development
DEBUG=true
LOG_LEVEL=debug
```

### Produção

```bash
NODE_ENV=production
DEBUG=false
LOG_LEVEL=error
```

## Como Configurar

1. Copie o arquivo `.env.example` para `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edite o arquivo `.env` com suas configurações

3. Para cada aplicação (store, admin-panel, seller-panel), crie um arquivo `.env.local`:
   ```bash
   # Em apps/store/
   cp .env.example .env.local
   
   # Em apps/admin-panel/
   cp .env.example .env.local
   
   # Em apps/seller-panel/
   cp .env.example .env.local
   ```

4. As variáveis com prefixo `VITE_PUBLIC_` são expostas ao cliente

## Gerando Secrets Seguros

Para gerar secrets seguros, use:

```bash
# No terminal
openssl rand -base64 32

# Ou com Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Validação

Execute o script de validação para verificar se todas as variáveis estão configuradas:

```bash
pnpm run check:env
``` 