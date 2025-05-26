# Configuração do Ambiente de Desenvolvimento

## Pré-requisitos

### Software Necessário
- **Node.js**: v18.0.0 ou superior
- **pnpm**: v8.0.0 ou superior (gerenciador de pacotes)
- **Git**: Para controle de versão
- **VS Code** ou **Cursor**: IDE recomendada

### Contas e Serviços
- **Cloudflare**: Conta para Workers e Pages
- **Xata.io**: Conta para banco de dados
- **GitHub**: Para repositório e CI/CD

## Instalação Inicial

### 1. Clone o Repositório
```bash
git clone https://github.com/seu-usuario/mktplace-gdg.git
cd mktplace-gdg
```

### 2. Instale as Dependências
```bash
# Instalar pnpm globalmente se ainda não tiver
npm install -g pnpm

# Instalar todas as dependências do monorepo
pnpm install
```

### 3. Configure o Xata.io

#### Instale o CLI do Xata
```bash
pnpm add -g @xata.io/cli
```

#### Faça login no Xata
```bash
xata auth login
```

#### Inicialize o Xata no projeto
```bash
# Na raiz do projeto
xata init
```

Quando solicitado:
- Escolha criar um novo database
- Nome: `mktplace-gdg`
- Região: Escolha a mais próxima
- Branch: `main`

### 4. Configure as Variáveis de Ambiente

#### Crie os arquivos .env
```bash
# Para cada app, crie um arquivo .env.local
touch apps/store/.env.local
touch apps/admin-panel/.env.local
touch apps/seller-panel/.env.local
```

#### Template do .env.local
```env
# Xata.io
XATA_API_KEY=xau_xxxxxxxxxxxxxxxxxxxxx
XATA_BRANCH=main
PUBLIC_XATA_WORKSPACE_URL=https://workspace-xxxxx.xata.sh

# Cloudflare (para desenvolvimento local)
CLOUDFLARE_ACCOUNT_ID=xxxxxxxxxxxxxxxxxxxxx
CLOUDFLARE_API_TOKEN=xxxxxxxxxxxxxxxxxxxxx

# App Config
PUBLIC_APP_URL=http://localhost:5173
PUBLIC_API_URL=http://localhost:5173

# Auth
AUTH_SECRET=gere-uma-chave-segura-aqui
SESSION_SECRET=gere-outra-chave-segura-aqui

# Storage (Cloudflare R2)
R2_ACCESS_KEY_ID=xxxxxxxxxxxxxxxxxxxxx
R2_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxx
R2_BUCKET_NAME=mktplace-assets
PUBLIC_R2_PUBLIC_URL=https://pub-xxxxx.r2.dev

# Email (opcional para desenvolvimento)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@seudominio.com

# Payment Gateway (opcional para desenvolvimento)
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxx
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxx
```

### 5. Configure o Banco de Dados

#### Execute as migrations iniciais
```bash
# Navegue até o diretório de scripts
cd scripts

# Execute o setup do banco
pnpm run setup:db
```

### 6. Configure o Cloudflare

#### Instale o Wrangler
```bash
pnpm add -g wrangler
```

#### Faça login no Cloudflare
```bash
wrangler login
```

#### Configure cada app
Para cada aplicação, crie um `wrangler.toml`:

```toml
# apps/store/wrangler.toml
name = "mktplace-store"
compatibility_date = "2024-01-01"

[vars]
ENVIRONMENT = "development"

[[r2_buckets]]
binding = "ASSETS"
bucket_name = "mktplace-assets-dev"

[[kv_namespaces]]
binding = "CACHE"
id = "xxxxxxxxxxxxxxxxxxxxx"
```

## Desenvolvimento Local

### 1. Inicie o Ambiente de Desenvolvimento

#### Para trabalhar em uma app específica:
```bash
# Store (Loja)
pnpm --filter ./apps/store dev

# Admin Panel
pnpm --filter ./apps/admin-panel dev

# Seller Panel
pnpm --filter ./apps/seller-panel dev
```

#### Para trabalhar em múltiplas apps simultaneamente:
```bash
# Em terminais separados
pnpm run dev:store
pnpm run dev:admin
pnpm run dev:seller
```

### 2. Acessar as Aplicações

- **Store**: http://localhost:5173
- **Admin Panel**: http://localhost:5174
- **Seller Panel**: http://localhost:5175

### 3. Desenvolvimento de Componentes

Para desenvolver componentes compartilhados:
```bash
# Inicie o Storybook (se configurado)
pnpm --filter ./packages/ui storybook
```

## Comandos Úteis

### Build
```bash
# Build de todas as apps
pnpm run build

# Build específico
pnpm --filter ./apps/store build
```

### Testes
```bash
# Rodar todos os testes
pnpm run test

# Testes com watch
pnpm run test:watch

# Testes E2E
pnpm run test:e2e
```

### Linting e Formatação
```bash
# Lint
pnpm run lint

# Format
pnpm run format

# Type check
pnpm run typecheck
```

### Gerenciamento de Dependências
```bash
# Adicionar dependência a uma app específica
pnpm --filter ./apps/store add package-name

# Adicionar dependência compartilhada
pnpm --filter ./packages/ui add package-name

# Adicionar devDependency na raiz
pnpm add -D -w package-name
```

## Troubleshooting

### Problemas Comuns

#### 1. Erro de CORS no desenvolvimento
Adicione no `vite.config.ts` da app:
```typescript
server: {
  proxy: {
    '/api': 'http://localhost:8787'
  }
}
```

#### 2. Erro de tipos do Xata
```bash
# Regenere os tipos
xata codegen
```

#### 3. Problemas com cache
```bash
# Limpe o cache do pnpm
pnpm store prune

# Reinstale as dependências
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

#### 4. Porta já em uso
```bash
# Encontre o processo usando a porta
lsof -i :5173

# Mate o processo
kill -9 <PID>
```

## Próximos Passos

1. [Leia o Guia de Desenvolvimento](../desenvolvimento/guia-desenvolvimento.md)
2. [Entenda a Arquitetura](../arquitetura_sistema.md)
3. [Configure seu Editor](./.vscode/settings.json)
4. [Comece a Contribuir](../CONTRIBUTING.md) 