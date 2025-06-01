# 👨‍💻 Configuração para Desenvolvedores

Guia rápido e direto para desenvolvedores que vão trabalhar no marketplace.

## 🚀 **SETUP SUPER RÁPIDO (2 minutos)**

```bash
# 1. Clone o projeto
git clone https://github.com/tigraodegente/mktplace-gdg.git
cd mktplace-gdg

# 2. Execute o setup automático
./setup_banco_local.sh

# 3. Pronto! Acesse http://localhost:5173
```

## 📋 **O que o script faz automaticamente:**

### ✅ **Dependências**
- Instala todas as dependências do monorepo
- Configura workspaces do pnpm
- Verifica Node.js e PostgreSQL

### ✅ **Banco de Dados**
- Cria banco PostgreSQL local (`mktplace_dev`)
- Cria usuário `mktplace_user` 
- Executa todas as migrations
- Popula com dados de exemplo completos

### ✅ **Configuração**
- Cria arquivo `.env` com configurações locais
- Configura URLs de desenvolvimento
- Define credenciais de teste

### ✅ **Dados de Teste**
- **500+ produtos** com variações
- **Usuários** de todos os tipos (admin/seller/customer)
- **Pedidos** de exemplo com tracking
- **Chat** com conversas
- **Notificações** configuradas

## 🔑 **Credenciais de Teste Prontas**

```bash
# Admin
Email: admin@graodigente.com.br
Senha: 123456

# Vendedor  
Email: vendedor@graodigente.com.br
Senha: 123456

# Cliente
Email: cliente@graodigente.com.br
Senha: 123456
```

## 🌐 **URLs de Desenvolvimento**

```bash
Loja:   http://localhost:5173  # App principal
Admin:  http://localhost:5174  # Painel administrativo  
Seller: http://localhost:5175  # Painel do vendedor
```

## 🗄️ **Banco de Dados Local**

```bash
Host: localhost
Porta: 5432
Banco: mktplace_dev
Usuário: mktplace_user  
Senha: 123456
URL: postgresql://mktplace_user:YOUR_PASSWORD@localhost:5432/mktplace_dev
```

## 🧪 **Testando se Funcionou**

```bash
# Verificar banco
psql "postgresql://mktplace_user:YOUR_PASSWORD@localhost:5432/mktplace_dev" -c "SELECT COUNT(*) FROM products;"

# Testar API
curl http://localhost:5173/api/products

# Login de teste
curl -X POST http://localhost:5173/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@graodigente.com.br","password":"123456"}'
```

## 🛠️ **Comandos Diários**

```bash
# Iniciar desenvolvimento
pnpm dev           # Todas as apps
pnpm dev:store     # Só a loja
pnpm dev:admin     # Só o admin

# Código limpo
pnpm lint          # Verificar erros
pnpm format        # Formatar código

# Banco
pnpm db:studio     # Interface visual
pnpm db:migrate    # Rodar migrations
```

## 📁 **Estrutura de Trabalho**

```
🎯 FOCO DE DESENVOLVIMENTO:
├── apps/store/src/          # Frontend da loja
├── apps/admin-panel/src/    # Painel admin
├── apps/seller-panel/src/   # Painel vendedor
├── packages/ui/src/         # Componentes compartilhados
└── packages/shared-types/   # TypeScript types

🗄️ BANCO DE DADOS:
├── scripts/                 # Migrations e scripts
├── create_*.sql            # Criação de tabelas
└── insert_*.sql            # Dados de exemplo
```

## 🚨 **Troubleshooting Rápido**

### PostgreSQL não inicia?
```bash
# macOS
brew services start postgresql

# Linux
sudo systemctl start postgresql
```

### Erro de permissão?
```bash
chmod +x setup_banco_local.sh
```

### Dependências com problema?
```bash
rm -rf node_modules
pnpm install
```

### Banco corrompido?
```bash
dropdb mktplace_dev
createdb mktplace_dev
./setup_banco_local.sh
```

## 📚 **Documentação Essencial**

- **[SETUP_BANCO_LOCAL.md](./SETUP_BANCO_LOCAL.md)** - Guia completo de configuração
- **[README.md](./README.md)** - Overview do projeto  
- **[.cursorrules](./.cursorrules)** - Padrões de código
- **[docs/](./docs/)** - Documentação técnica completa

## 🔥 **Features Principais Implementadas**

### ✅ **Core E-commerce**
- Catálogo de produtos com filtros avançados
- Carrinho com persistência 
- Checkout multi-etapas
- Sistema de cupons/promoções
- Gestão de estoque

### ✅ **Usuários & Auth**
- Login multi-role (Admin/Seller/Customer)
- Gestão de perfis e endereços
- Sessões seguras com JWT
- Recuperação de senha

### ✅ **Sistemas Avançados**  
- Chat em tempo real (WebSocket)
- Notificações push inteligentes
- Suporte ao cliente com tickets
- Devoluções/trocas automatizadas
- Analytics e relatórios

### ✅ **Performance**
- Virtual scrolling para milhões de produtos
- Cache multi-camada otimizado
- Lazy loading de componentes
- PWA ready com score 95+

## 🎯 **Próximos Passos Após Setup**

1. **Explorar a interface** - Navegue pelas 3 apps
2. **Testar fluxos** - Faça uma compra completa  
3. **Ver o código** - Explore a estrutura de componentes
4. **Banco de dados** - Use `pnpm db:studio` para visualizar
5. **APIs** - Teste os endpoints disponíveis

## 💡 **Dicas de Desenvolvimento**

### **Hot Reload**
- Alterações em código são refletidas instantaneamente
- Banco de dados persiste entre reinicializações
- Estados do Svelte são mantidos durante development

### **Debug**
```bash
# Logs detalhados
DEBUG=true pnpm dev

# SQL queries no console  
DEBUG_SQL=true pnpm dev:store
```

### **Produção**
```bash
# Build para produção
pnpm build

# Preview local da build
pnpm preview
```

---

🎉 **Tudo pronto para desenvolvimento!**  
*Se tiver dúvidas, consulte os outros documentos ou abra uma issue.* 