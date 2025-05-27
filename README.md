# Marketplace GDG

Um marketplace completo desenvolvido com tecnologias modernas.

## 🎯 Status do Projeto

- ✅ Sistema de autenticação completo
- ✅ Integração com banco de dados Xata
- ✅ Deploy automatizado no Cloudflare Pages
- ✅ Deploy seletivo configurado
- ✅ Integração GitHub reconectada (27/01/2025)
- 🚧 Listagem de produtos (em desenvolvimento)
- 🚧 Carrinho de compras (próximo)

## 🚀 Stack Tecnológica

- **Frontend**: SvelteKit + TypeScript + Tailwind CSS
- **Backend**: Cloudflare Workers/Pages
- **Banco de Dados**: Xata.io
- **Arquitetura**: Monorepo com pnpm workspaces

## 📦 Estrutura do Projeto

```
mktplace-gdg/
├── apps/
│   ├── store/          # Loja para clientes
│   ├── admin-panel/    # Painel administrativo
│   └── seller-panel/   # Painel do vendedor
├── packages/
│   ├── ui/            # Componentes compartilhados
│   ├── shared-types/  # TypeScript types
│   ├── utils/         # Funções utilitárias
│   └── xata-client/   # Cliente Xata.io
└── docs/              # Documentação
```

## 🌐 URLs das Aplicações

- **Store**: https://mktplace-store.pages.dev
- **Admin Panel**: https://mktplace-admin.pages.dev
- **Seller Panel**: https://mktplace-seller.pages.dev

## 📚 Documentação Importante

- **[Memória do Projeto](./MEMORIA_PROJETO.md)** - Histórico de decisões e contexto
- **[Arquitetura de Componentes](./docs/arquitetura/componentes.md)** - Estratégia de componentes
- **[Regras do Cursor](./.cursorrules)** - Padrões e convenções do projeto

## 🛠️ Desenvolvimento

### Pré-requisitos
- Node.js 20+
- pnpm 8+

### Instalação
```bash
# Clone o repositório
git clone https://github.com/tigraodegente/mktplace-gdg.git

# Entre no diretório
cd mktplace-gdg

# Instale as dependências
pnpm install
```

### Comandos Disponíveis
```bash
# Desenvolvimento
pnpm dev          # Roda todas as apps
pnpm dev:store    # Roda apenas a store
pnpm dev:admin    # Roda apenas o admin
pnpm dev:seller   # Roda apenas o seller

# Build
pnpm build        # Build de todas as apps
pnpm build:store  # Build apenas da store
pnpm build:admin  # Build apenas do admin
pnpm build:seller # Build apenas do seller

# Outros
pnpm lint         # Linting
pnpm format       # Formatação
pnpm test         # Testes
```

## 📝 Documentação

Toda a documentação do projeto está disponível na pasta `/docs`.

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'feat: adiciona funcionalidade incrível'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT.

---

Desenvolvido com ❤️ por Gustavo

# Deploy automático configurado - Tue May 27 15:20:58 -03 2025
// Deploy automático funcionando! - Tue May 27 15:28:45 -03 2025
# Deploy fix
# Teste de deploy - Store funcionando! 🚀
