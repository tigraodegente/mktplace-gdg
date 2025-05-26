# Arquitetura do Sistema E-commerce

## Visão Geral

Este documento descreve a arquitetura completa do sistema de e-commerce, detalhando como os diferentes componentes se integram, como os dados fluem através da aplicação, e a estrutura do projeto como um monorepo.

## Índice

1. [Estrutura do Projeto (Monorepo)](#estrutura-do-projeto-monorepo)
2. [Arquitetura Geral](#arquitetura-geral)
3. [Camadas da Aplicação](#camadas-da-aplicação)
4. [Fluxo de Dados](#fluxo-de-dados)
5. [Integração com Xata.io e Ecossistema Cloudflare](#integração-com-xataio-e-ecossistema-cloudflare)
6. [Gerenciamento de Estado](#gerenciamento-de-estado)
7. [Roteamento e Navegação](#roteamento-e-navegação)
8. [Otimizações de Performance](#otimizações-de-performance)
9. [Segurança](#segurança)
10. [Monitoramento e Análise](#monitoramento-e-análise)
11. [Estratégia de Implantação](#estratégia-de-implantação)
12. [Considerações para uma Arquitetura 100% Cloudflare (com Xata.io)](#considerações-para-uma-arquitetura-100-cloudflare-com-xataio)
13. [Documentação do Projeto](#documentação-do-projeto)

## Estrutura do Projeto (Monorepo)

Para facilitar o gerenciamento, o compartilhamento de código e a escalabilidade, o projeto é organizado como um monorepo. Esta abordagem centraliza todas as aplicações e pacotes compartilhados em um único repositório.

```
/mktplace-gdg/  (Raiz do monorepo)
├── apps/
│   ├── store/                # Aplicação SvelteKit: Loja para clientes
│   │   ├── src/
│   │   ├── svelte.config.js
│   │   └── package.json
│   ├── admin-panel/          # Aplicação SvelteKit: Painel administrativo
│   │   ├── src/
│   │   ├── svelte.config.js
│   │   └── package.json
│   ├── seller-panel/         # Aplicação SvelteKit: Painel do vendedor
│   │   ├── src/
│   │   ├── svelte.config.js
│   │   └── package.json
│   └── (outros_workers_dedicados)/ # Opcional: Cloudflare Workers não ligados a uma app SvelteKit
│
├── packages/
│   ├── ui/                   # Componentes Svelte compartilhados entre as apps
│   │   ├── src/
│   │   └── package.json
│   ├── shared-types/         # Definições TypeScript (ex: do Xata, para APIs)
│   │   ├── src/
│   │   └── package.json
│   ├── utils/                # Funções utilitárias JavaScript/TypeScript compartilhadas
│   │   ├── src/
│   │   └── package.json
│   └── xata-client/          # Configuração e cliente Xata.io (se compartilhado)
│       ├── src/
│       └── package.json
│
├── docs/                     # Documentação do projeto (modular)
│   ├── arquitetura_sistema.md # Este documento
│   ├── store_app_guide.md
│   ├── admin_panel_guide.md
│   ├── seller_panel_guide.md
│   └── ui_components_guide.md
│
├── package.json              # package.json raiz para o monorepo (ex: com workspaces)
├── pnpm-workspace.yaml       # Exemplo se usar pnpm workspaces
└── tsconfig.base.json        # Configuração TypeScript base para todo o monorepo
```

**Benefícios do Monorepo:**
- **Compartilhamento de Código:** Fácil importação de `packages/` comuns pelas `apps/`.
- **Gerenciamento de Dependências:** Consistência de versões gerenciada na raiz.
- **Refatorações Simplificadas:** Alterações em código compartilhado podem ser propagadas em um único PR.
- **CI/CD Coordenado:** Pipelines podem ser configurados para build/deploy de aplicações específicas baseadas nas mudanças.

## Arquitetura Geral
{{ ... }}

### 1. Camada de Apresentação

Responsável pela interface do usuário e interações em cada aplicação (`apps/*`).

- **Componentes**: Elementos reutilizáveis da UI. Podem ser específicos de uma aplicação (`apps/[app_name]/src/lib/components/`) ou compartilhados (`packages/ui/src/`).
- **Páginas**: Rotas da aplicação (`apps/[app_name]/src/routes/`)
- **Layouts**: Estruturas compartilhadas entre páginas (`apps/[app_name]/src/routes/+layout.svelte`)

### 2. Camada de Gerenciamento de Estado

Gerencia o estado da aplicação e a comunicação entre componentes, dentro de cada aplicação.

- **Stores**: Gerenciamento de estado global (`apps/[app_name]/src/lib/stores/`)
- **Context**: Compartilhamento de estado local dentro dos componentes de uma aplicação ou pacote.

### 3. Camada de Serviços

Encapsula a lógica de negócios e comunicação com APIs, geralmente dentro de cada aplicação que necessita.

- **Serviços de API**: Comunicação com o backend (`apps/[app_name]/src/lib/services/`)
- **Serviços de Autenticação**: Gerenciamento de usuários (`apps/[app_name]/src/lib/services/authService.ts`)
- **Serviços de Produtos**: Gerenciamento de produtos (`apps/[app_name]/src/lib/services/products.ts`)

### 4. Camada de Dados

Gerencia o acesso e manipulação de dados.

- **Xata.io Client**: Cliente para acesso ao Xata.io. Pode ser configurado em um pacote compartilhado (`packages/xata-client/`) e importado pelas aplicações, ou cada aplicação pode ter sua instância (`apps/[app_name]/src/lib/xata.ts`). As credenciais são gerenciadas por variáveis de ambiente.
- **Modelos de Dados**: Interfaces e tipos gerados pelo Xata ou definidos manualmente, idealmente em um pacote compartilhado (`packages/shared-types/src/`).
- **Utilitários de Dados**: Funções para manipulação de dados, podem ser compartilhadas (`packages/utils/src/`) ou específicas de uma aplicação.

### 5. Camada de Infraestrutura

Fornece funcionalidades de suporte para a aplicação.

- **Utilitários**: Funções auxiliares, idealmente compartilhadas (`packages/utils/src/`).
- **Configurações**: Configurações específicas de cada aplicação (`apps/[app_name]/src/lib/config/`).
- **Hooks**: Hooks do SvelteKit (`apps/[app_name]/src/hooks.server.ts`).

## Fluxo de Dados
{{ ... }}
### Configuração do Xata.io Client

O cliente Xata.io é configurado. Se compartilhado, pode residir em `packages/xata-client/src/index.ts` ou similar. Se por aplicação, em `apps/[app_name]/src/lib/xata.ts`.

```typescript
// Exemplo: packages/xata-client/src/index.ts ou apps/[app_name]/src/lib/xata.ts
import { getXataClient } from './xata'; // Ajuste o caminho para o cliente gerado pelo Xata CLI

let instance: ReturnType<typeof getXataClient> | null = null;

export const xata = () => {
  if (instance) return instance;
  // getXataClient usará variáveis de ambiente (XATA_API_KEY, XATA_BRANCH ou XATA_WORKSPACE_URL)
  // injetadas no ambiente de build/runtime (ex: Cloudflare Pages/Workers).
  instance = getXataClient(); 
  return instance;
};
```

**Nota:** O Xata CLI (`xata init`) geralmente configura o cliente para ser importado de um local específico (ex: `./src/xata.ts` relativo à raiz do projeto Xata, ou `$xata` se configurado com alias). Adapte conforme a sua configuração. No monorepo, você pode ter um projeto Xata na raiz ou um por aplicação, dependendo da granularidade desejada para branches de dados.

### Autenticação com Cloudflare

A lógica de autenticação, como a configuração de `hooks.server.ts`, será específica para cada aplicação SvelteKit que requer autenticação (`apps/store/src/hooks.server.ts`, `apps/admin-panel/src/hooks.server.ts`, etc.).

```typescript
// Exemplo: apps/store/src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
import { xata } from '$lib/xata'; // Ou o caminho para o cliente compartilhado, ex: '@mktplace/xata-client'

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.xata = xata();
  const sessionToken = event.cookies.get('__session');

  if (sessionToken) {
    // ... lógica de validação de token e obtenção de usuário ...
    // event.locals.user = { id: 'user-123', email: 'user@example.com' };
  } else {
    event.locals.user = null;
  }

  const response = await resolve(event);
  return response;
};
```

### Acesso ao Banco de Dados Xata.io

O acesso ao banco de dados a partir das funções `load` ou endpoints de API em cada aplicação SvelteKit (`apps/*`) usará a instância do cliente Xata disponibilizada via `event.locals`.

```typescript
// Exemplo de consulta dentro de uma função load em apps/store/src/routes/some/+page.server.ts

// export const load: PageServerLoad = async ({ locals }) => {
//   const xataClient = locals.xata; // Cliente Xata de event.locals
//   const products = await xataClient.db.products.getAll();
//   return { products };
// };
```

### Controle de Acesso a Dados

A lógica de controle de acesso será implementada nos endpoints e funções `load` de cada aplicação (`apps/*`) que interage com os dados, utilizando o `event.locals.user` para determinar as permissões.

```typescript
// Exemplo em apps/seller-panel/src/routes/products/+page.server.ts
// export const load: PageServerLoad = async ({ locals }) => {
//   const xataClient = locals.xata;
//   const user = locals.user; // Supondo que user tem um 'seller_id'

//   if (!user || !user.seller_id) {
//     throw error(401, 'Unauthorized');
//   }

//   const sellerProducts = await xataClient.db.products
//     .filter({ seller_id: user.seller_id, is_active: true })
//     .getAll();
//   return { products: sellerProducts };
// };
```

## Gerenciamento de Estado
{{ ... }}
// Exemplo: apps/store/src/lib/stores/cartStore.ts
export const cart = createCartStore();
{{ ... }}
// Exemplo: apps/store/src/routes/categoria/[slug]/+page.server.ts
import type { PageServerLoad } from './$types';
// import { xata } from '$lib/xata'; // Ou do pacote compartilhado
{{ ... }}
### Ambiente de Desenvolvimento

- **Servidor Local**: Comandos como `pnpm --filter ./apps/store dev` para rodar uma aplicação específica.
- **Hot Reloading**: Atualizações instantâneas no navegador para a aplicação em desenvolvimento.

### Ambiente de Staging

- **Branch de Staging**: Implantação automática de aplicações específicas (ex: `apps/store`) a partir de branches de feature/staging para a Cloudflare Pages.
- **Testes E2E**: Executados contra as aplicações em staging.

### Ambiente de Produção

- **Branch Principal**: Implantação automática de aplicações específicas após merge na branch principal para a Cloudflare Pages.
- **CD/CI**: Pipeline de integração e entrega contínua (ex: GitHub Actions) configurado para identificar quais `apps/*` foram modificadas e precisam de deploy.
- **Rollbacks**: Estratégia para reverter implantações problemáticas por aplicação na Cloudflare Pages.

### Hospedagem

- **Cloudflare Pages**: Cada aplicação SvelteKit (`apps/store`, `apps/admin-panel`, `apps/seller-panel`) pode ser um projeto separado no Cloudflare Pages, todos originando-se do mesmo monorepo, mas com configurações de build e diretórios base distintos.
- **Cloudflare Workers**: Para lógica de backend adicional, APIs dedicadas, ou tarefas que não se encaixam no modelo do SvelteKit em Pages. Podem ser parte de uma aplicação SvelteKit ou workers independentes em `apps/outros_workers_dedicados/`.
- **Xata.io**: Para o banco de dados serverless, acessado pelas diversas aplicações.
- **Cloudflare R2**: Para armazenamento de objetos, acessível pelas aplicações.

## Considerações para uma Arquitetura 100% Cloudflare (com Xata.io)
{{ ... }}
Esta arquitetura permite escalar globalmente, com baixa latência e custos potencialmente otimizados, aproveitando a infraestrutura de borda da Cloudflare para as diversas aplicações (`apps/*`) do monorepo.

## Documentação do Projeto

A documentação do projeto é mantida de forma centralizada na pasta `docs/` dentro do monorepo. Ela é organizada modularmente:

- **`arquitetura_sistema.md`**: Este documento, fornecendo a visão geral da arquitetura e da estrutura do projeto.
- **Guias Específicos por Aplicação**: Documentos como `store_app_guide.md`, `admin_panel_guide.md`, `seller_panel_guide.md` detalham a funcionalidade, endpoints específicos, e fluxos de cada aplicação dentro da pasta `apps/`.
- **Guias de Pacotes Compartilhados**: Documentação para pacotes importantes como `ui_components_guide.md` (para `packages/ui/`) ou `shared_types_guide.md` (para `packages/shared-types/`).

Manter a documentação junto ao código no monorepo facilita sua atualização e consulta por todos os desenvolvedores.
