# 🎯 **Para o Desenvolvedor: Como Configurar o Marketplace em 2 Minutos**

Olá! 👋 Você acaba de receber um marketplace enterprise completo e funcional. Aqui está como configurar na sua máquina de forma **super rápida**.

## 🚀 **Setup Automático (Recomendado)**

### **1. Clone o Projeto**
```bash
git clone https://github.com/tigraodegente/mktplace-gdg.git
cd mktplace-gdg
```

### **2. Execute UM comando e pronto!**
```bash
./setup_banco_local.sh
```

**Isso é tudo!** ✨ O script vai fazer **TUDO** automaticamente:

## 🔄 **O que o Script Faz Automaticamente**

### ✅ **Pré-requisitos**
- Verifica se Node.js está instalado
- Instala pnpm automaticamente se necessário
- Verifica se PostgreSQL está instalado e rodando

### ✅ **Banco de Dados**
- Cria banco PostgreSQL local (`mktplace_dev`)
- Cria usuário `mktplace_user` com senha `123456`
- Executa **todas** as migrations automaticamente
- Cria **todas** as tabelas necessárias (50+ tabelas)
- Instala extensões PostgreSQL necessárias

### ✅ **Dados de Exemplo Completos**
- **500+ produtos** com variações, imagens e descrições
- **Categorias hierárquicas** organizadas
- **Usuários de teste** para todos os perfis
- **Pedidos de exemplo** com tracking
- **Sistema de chat** com conversas
- **Notificações** configuradas
- **Cupons ativos** para teste
- **Tickets de suporte** de exemplo

### ✅ **Configuração Automática**
- Cria arquivo `.env` com todas as configurações
- Define URLs de desenvolvimento
- Configura credenciais de teste
- Instala **todas** as dependências do monorepo

## 🎉 **Resultado: Marketplace 100% Funcional**

Após o script terminar, você terá:

### 🌐 **3 Aplicações Rodando**
```bash
# Iniciar o desenvolvimento
cd apps/store
pnpm dev

# URLs disponíveis:
http://localhost:5173  # 🛒 Loja principal
http://localhost:5174  # 👨‍💼 Painel administrativo
http://localhost:5175  # 🏪 Painel do vendedor
```

### 🔑 **Credenciais de Teste Prontas**
```bash
👨‍💼 ADMIN:
   Email: admin@graodigente.com.br
   Senha: 123456

🏪 VENDEDOR:
   Email: vendedor@graodigente.com.br
   Senha: 123456

👤 CLIENTE:
   Email: cliente@graodigente.com.br
   Senha: 123456
```

### 🗄️ **Banco de Dados Configurado**
```bash
Host: localhost
Porta: 5432
Banco: mktplace_dev
Usuário: mktplace_user
Senha: 123456
URL: postgresql://mktplace_user:123456@localhost:5432/mktplace_dev
```

## 🧪 **Testando se Funcionou**

### **1. Testar Banco**
```bash
psql "postgresql://mktplace_user:123456@localhost:5432/mktplace_dev" -c "SELECT COUNT(*) FROM products;"
# Deve retornar: 500+ produtos
```

### **2. Testar APIs**
```bash
# Listar produtos
curl http://localhost:5173/api/products

# Listar categorias
curl http://localhost:5173/api/categories

# Login de teste
curl -X POST http://localhost:5173/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@graodigente.com.br","password":"123456"}'
```

### **3. Testar Interface**
1. Acesse http://localhost:5173
2. Navegue pelos produtos
3. Faça login com as credenciais acima
4. Teste o carrinho, chat, notificações

## 🎯 **Principais Funcionalidades Disponíveis**

### 🛒 **E-commerce Completo**
- **Catálogo** com 500+ produtos reais
- **Filtros avançados** (preço, marca, categoria, etc)
- **Busca inteligente** com autocomplete
- **Carrinho persistente** com cálculo automático
- **Checkout completo** (5 etapas)
- **Sistema de cupons** (%, valor fixo, frete grátis)
- **Múltiplas formas de pagamento**

### 🚚 **Logística**
- **Cálculo de frete** integrado (PAC, SEDEX, etc)
- **Gestão de estoque** em tempo real
- **Rastreamento de pedidos** completo
- **Sistema de devoluções/trocas**

### 👥 **Gestão de Usuários**
- **Multi-role**: Admin, Seller, Customer
- **Perfis completos** com endereços
- **Histórico de pedidos**
- **Sistema de favoritos**

### 💬 **Comunicação**
- **Chat em tempo real** (WebSocket)
- **Notificações push** inteligentes
- **Sistema de suporte** com tickets
- **Emails transacionais**

### 📊 **Analytics**
- **Relatórios de vendas**
- **Métricas de performance**
- **Tracking de usuários**
- **Analytics de produtos**

## 🛠️ **Comandos Úteis para Desenvolvimento**

```bash
# Desenvolvimento
pnpm dev              # Todas as apps
pnpm dev:store        # Só a loja
pnpm dev:admin        # Só o admin
pnpm dev:seller       # Só o seller

# Qualidade de código
pnpm lint             # Verificar erros
pnpm format           # Formatar código
pnpm typecheck        # Verificar tipos TypeScript

# Banco de dados
pnpm db:studio        # Interface visual do banco
pnpm db:migrate       # Rodar migrations
pnpm db:seed          # Popular mais dados

# Build e deploy
pnpm build            # Build para produção
pnpm preview          # Preview da build
```

## 🚨 **Troubleshooting**

### **PostgreSQL não instalado?**
```bash
# macOS
brew install postgresql
brew services start postgresql

# Ubuntu/Debian
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### **Erro de permissão no script?**
```bash
chmod +x setup_banco_local.sh
```

### **Dependências com problema?**
```bash
rm -rf node_modules
pnpm install
```

### **Quer recomeçar do zero?**
```bash
dropdb mktplace_dev
./setup_banco_local.sh
```

## 📚 **Documentação Disponível**

- **[CONFIGURACAO_DESENVOLVEDOR.md](./CONFIGURACAO_DESENVOLVEDOR.md)** - Guia rápido
- **[SETUP_BANCO_LOCAL.md](./SETUP_BANCO_LOCAL.md)** - Setup detalhado
- **[README.md](./README.md)** - Overview completo
- **[.cursorrules](./.cursorrules)** - Padrões de código
- **[docs/](./docs/)** - Documentação técnica

## 🎯 **Próximos Passos**

1. **Execute o script** (`./setup_banco_local.sh`)
2. **Acesse as 3 apps** e explore as funcionalidades
3. **Faça login** com as credenciais de teste
4. **Teste um fluxo completo** de compra
5. **Explore o código** para entender a estrutura
6. **Use o chat** para testar comunicação em tempo real
7. **Verifique as notificações** e sistema de suporte

## 💡 **Dicas Importantes**

### **Performance**
- Virtual scrolling para milhões de produtos
- Cache multi-camada otimizado
- APIs otimizadas para escala

### **Segurança**
- Autenticação JWT segura
- Validação em todas as camadas
- Rate limiting implementado

### **Escalabilidade**
- Pronto para Cloudflare Pages
- Banco PostgreSQL/Neon.tech
- Edge computing otimizado

---

## 🎉 **Pronto!**

Você agora tem um **marketplace enterprise completo** rodando localmente com:

- ✅ **Todas as funcionalidades** implementadas
- ✅ **Dados reais** para teste
- ✅ **Performance otimizada**
- ✅ **Documentação completa**
- ✅ **Pronto para desenvolvimento** imediato

**Qualquer dúvida, consulte a documentação ou use o próprio sistema de chat do marketplace para testar!** 😄

---

🚀 **Marketplace GDG - Pronto para o futuro do e-commerce brasileiro!** 