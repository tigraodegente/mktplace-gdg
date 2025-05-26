# Próximos Passos - Marketplace GDG

## Apps Criadas

### 1. Store (Loja) ✅
- **URL Cloudflare**: mktplace-store.pages.dev
- **Status**: Deployed
- **Configurações**: TypeScript, Tailwind CSS, ESLint, Prettier, Vitest, Playwright

### 2. Admin Panel (Em criação)
- **URL Cloudflare**: mktplace-admin.pages.dev (a configurar)
- **Status**: Criando...
- **Configurações**: Mesmas da Store

### 3. Seller Panel (A criar)
- **URL Cloudflare**: mktplace-seller.pages.dev (a configurar)
- **Status**: Pendente

## Tarefas Imediatas

### 1. Finalizar criação das apps
- [ ] Completar criação do admin-panel
- [ ] Criar seller-panel com mesmas configurações
- [ ] Configurar adapter-cloudflare em cada app
- [ ] Criar wrangler.toml para cada app

### 2. Configurar Cloudflare Pages
- [ ] Criar projeto "mktplace-admin" no Cloudflare
- [ ] Criar projeto "mktplace-seller" no Cloudflare
- [ ] Configurar variáveis de ambiente em cada projeto

### 3. Configurar Packages Compartilhados
```bash
# Criar package de tipos compartilhados
cd packages/shared-types
pnpm init
# Adicionar TypeScript

# Criar package de componentes UI
cd packages/ui
pnpm init
# Adicionar Svelte + TypeScript + Tailwind

# Criar package de utilidades
cd packages/utils
pnpm init
# Adicionar TypeScript

# Criar cliente Xata
cd packages/xata-client
pnpm init
# Adicionar Xata SDK
```

### 4. Integração com Xata.io
- [ ] Criar conta no Xata.io
- [ ] Criar database "mktplace-gdg"
- [ ] Configurar tabelas conforme modelo de dados
- [ ] Gerar cliente TypeScript
- [ ] Adicionar XATA_API_KEY no Cloudflare

### 5. Implementar Autenticação
- [ ] Configurar JWT com refresh tokens
- [ ] Criar endpoints de auth em cada app
- [ ] Implementar guards de rota
- [ ] Criar páginas de login/registro

### 6. Páginas Iniciais

#### Store
- [ ] Homepage com produtos em destaque
- [ ] Listagem de produtos com filtros
- [ ] Página de detalhes do produto
- [ ] Carrinho de compras
- [ ] Processo de checkout

#### Admin Panel
- [ ] Dashboard com métricas
- [ ] CRUD de produtos
- [ ] Gerenciamento de pedidos
- [ ] Gerenciamento de usuários
- [ ] Configurações do sistema

#### Seller Panel
- [ ] Dashboard do vendedor
- [ ] Listagem de produtos próprios
- [ ] Gerenciamento de pedidos
- [ ] Relatórios de vendas
- [ ] Configurações da loja

## Comandos Úteis

```bash
# Desenvolvimento local
pnpm dev # roda todas as apps
pnpm --filter ./apps/store dev # roda apenas a store
pnpm --filter ./apps/admin-panel dev # roda apenas admin
pnpm --filter ./apps/seller-panel dev # roda apenas seller

# Build
pnpm build # build de todas as apps
pnpm --filter ./apps/store build

# Deploy manual (se necessário)
cd apps/store && wrangler pages deploy .svelte-kit/cloudflare
```

## Variáveis de Ambiente Necessárias

```env
# Xata
XATA_API_KEY=
XATA_BRANCH=main

# Auth
AUTH_SECRET=
JWT_SECRET=

# Cloudflare
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=

# App URLs
PUBLIC_STORE_URL=https://mktplace-store.pages.dev
PUBLIC_ADMIN_URL=https://mktplace-admin.pages.dev
PUBLIC_SELLER_URL=https://mktplace-seller.pages.dev

# Development
PUBLIC_API_URL=http://localhost:5173/api
```

## Estrutura Final Esperada

```
mktplace-gdg/
├── apps/
│   ├── store/          ✅
│   ├── admin-panel/    🚧
│   └── seller-panel/   ⏳
├── packages/
│   ├── ui/            ⏳
│   ├── shared-types/  ⏳
│   ├── utils/         ⏳
│   └── xata-client/   ⏳
├── docs/              ✅
└── scripts/           ⏳
``` 