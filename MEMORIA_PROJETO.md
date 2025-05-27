# Memória do Projeto - Marketplace GDG

## 📅 Histórico de Decisões Importantes

### 27/11/2024 - Estratégia de Componentes

**Contexto**: Discussão sobre onde manter componentes - compartilhados vs específicos por app

**Decisão**: Adotar abordagem híbrida
- Componentes genéricos em `@mktplace/ui`
- Componentes específicos em cada app
- ProductCard permanece específico na store

**Razão**: Balancear reusabilidade com flexibilidade e independência entre apps

**Documentação**: `/docs/arquitetura/componentes.md`

---

### 27/11/2024 - Deploy Automático Configurado

**Conquista**: Deploy automático funcionando para as 3 apps

**URLs de Produção**:
- Store: https://mktplace-store.pages.dev
- Admin: https://mktplace-admin.pages.dev  
- Seller: https://mktplace-seller.pages.dev

**Configuração**:
- Cloudflare Pages com webhooks GitHub
- Build commands específicos por app
- Diretório raiz configurado para cada app

---

### 27/11/2024 - Correções Implementadas

**Problemas Resolvidos**:
1. ✅ Login funcionando em produção (cookies seguros)
2. ✅ Variáveis de ambiente configuradas
3. ✅ Warning do vite-plugin-svelte corrigido
4. ✅ Tags HTML auto-fechadas corrigidas

---

## 🏗️ Estrutura do Projeto

### Monorepo com 3 aplicações:
```
apps/
├── store/          # E-commerce para clientes
├── admin-panel/    # Painel administrativo
└── seller-panel/   # Painel do vendedor

packages/
├── ui/             # Componentes compartilhados
├── shared-types/   # TypeScript types
├── utils/          # Funções utilitárias
└── xata-client/    # Cliente do banco de dados
```

### Stack Tecnológica:
- **Frontend**: SvelteKit 2.0 + TypeScript
- **Estilização**: Tailwind CSS
- **Deploy**: Cloudflare Pages
- **Banco de Dados**: Xata.io
- **Autenticação**: Cookies seguros + bcrypt

---

## 🎯 Estado Atual do Projeto

### ✅ Implementado:
- Sistema de autenticação (login/registro)
- Estrutura base das 3 aplicações
- Deploy automático configurado
- Componentes base (Button, Input, Card)
- Sistema de busca com sugestões
- Páginas de categorias
- ProductCard completo

### 🚧 Em Desenvolvimento:
- Sistema de produtos completo
- Carrinho de compras
- Dashboard do vendedor
- Painel administrativo

### 📋 Backlog:
- Sistema de pagamentos
- Gestão de pedidos
- Sistema de avaliações
- Chat vendedor-cliente
- Notificações
- Analytics

---

## 💡 Convenções e Padrões

### Nomenclatura:
- Componentes: PascalCase (`ProductCard.svelte`)
- Arquivos TS: camelCase (`authService.ts`)
- Rotas: kebab-case (`/meus-pedidos`)
- Variáveis CSS: kebab-case (`--primary-color`)

### Git:
- Conventional commits (feat:, fix:, docs:, etc.)
- Branch main para produção
- Feature branches para desenvolvimento

### Componentes:
- Props tipadas com TypeScript
- Composição sobre herança
- Separação entre genéricos e específicos

---

## 🔗 Links Importantes

### Produção:
- [Store](https://mktplace-store.pages.dev)
- [Admin Panel](https://mktplace-admin.pages.dev)
- [Seller Panel](https://mktplace-seller.pages.dev)

### Desenvolvimento:
- Repositório: https://github.com/tigraodegente/mktplace-gdg
- Xata Dashboard: https://xata.io
- Cloudflare Dashboard: https://dash.cloudflare.com

---

## 📝 Notas para Desenvolvedores

1. **Variáveis de Ambiente**: Configurar no Cloudflare Pages, não commitar `.env`
2. **Build Local**: Usar `pnpm dev:store` (ou admin/seller)
3. **Deploy**: Push para main dispara deploy automático
4. **Componentes**: Verificar `/docs/arquitetura/componentes.md` antes de criar novos

---

**Última atualização**: 27/11/2024 