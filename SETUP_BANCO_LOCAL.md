# 🗄️ Guia Completo de Setup do Banco Local

Este guia te ajudará a configurar o banco de dados PostgreSQL local com todas as estruturas e dados do marketplace.

## 📋 Pré-requisitos

### 1. PostgreSQL Instalado
```bash
# macOS (Homebrew)
brew install postgresql
brew services start postgresql

# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql

# Windows
# Baixe do site oficial: https://www.postgresql.org/download/windows/
```

### 2. Node.js e pnpm
```bash
# Verificar se tem Node.js instalado
node --version

# Instalar pnpm globalmente
npm install -g pnpm
```

## 🚀 Setup Automático (Recomendado)

### 1. Clone o Repositório
```bash
git clone https://github.com/tigraodegente/mktplace-gdg.git
cd mktplace-gdg
```

### 2. Execute o Script de Setup Automático
```bash
# Dar permissão de execução
chmod +x setup_banco_local.sh

# Executar o setup
./setup_banco_local.sh
```

Este script vai:
- ✅ Criar o banco de dados
- ✅ Instalar dependências do projeto
- ✅ Criar todas as tabelas necessárias
- ✅ Popular com dados de exemplo
- ✅ Configurar variáveis de ambiente

## 🔧 Setup Manual (Alternativo)

### 1. Criar Banco de Dados
```bash
# Conectar ao PostgreSQL
psql postgres

# Criar banco e usuário
CREATE DATABASE mktplace_dev;
CREATE USER mktplace_user WITH PASSWORD 'sua_senha_aqui';
GRANT ALL PRIVILEGES ON DATABASE mktplace_dev TO mktplace_user;

# Conectar ao banco criado
\c mktplace_dev;

# Criar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

### 2. Configurar Variáveis de Ambiente
```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar .env com suas configurações
DATABASE_URL="postgresql://mktplace_user:sua_senha_aqui@localhost:5432/mktplace_dev"
HYPERDRIVE_BINDING="false"
```

### 3. Instalar Dependências
```bash
pnpm install
```

### 4. Executar Scripts SQL em Ordem

#### Passo 1: Estrutura Básica
```bash
# Executar script principal de criação
node scripts/01-create-database.mjs
```

#### Passo 2: Tabelas Avançadas
```bash
psql "$DATABASE_URL" -f create_advanced_systems_tables.sql
```

#### Passo 3: Sistema de Chat
```bash
psql "$DATABASE_URL" -f create_chat_system_tables.sql
```

#### Passo 4: Sessões
```bash
psql "$DATABASE_URL" -f create_sessions_table.sql
```

#### Passo 5: Multi-Role
```bash
psql "$DATABASE_URL" -f setup-multiple-roles.sql
```

#### Passo 6: Dados de Exemplo
```bash
psql "$DATABASE_URL" -f insert_sample_data.sql
```

## 🎯 Verificação do Setup

### 1. Testar Conexão
```bash
# Verificar se o banco está funcionando
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM users;"
```

### 2. Iniciar o Servidor
```bash
# No terminal principal
cd apps/store
pnpm dev

# Acessar http://localhost:5173
```

### 3. Testar APIs
```bash
# Produtos
curl http://localhost:5173/api/products

# Categorias
curl http://localhost:5173/api/categories

# Autenticação de teste
curl -X POST http://localhost:5173/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@graodigente.com.br","password":"123456"}'
```

## 👥 Usuários de Teste Incluídos

### Administrador
- **Email**: `admin@graodigente.com.br`
- **Senha**: `123456`
- **Role**: `admin`

### Vendedor
- **Email**: `vendedor@graodigente.com.br`
- **Senha**: `123456`
- **Role**: `seller`

### Cliente
- **Email**: `cliente@graodigente.com.br`
- **Senha**: `123456`
- **Role**: `customer`

## 📦 Dados Incluídos

### Produtos
- ✅ **500+ produtos** de exemplo
- ✅ **Categorias** organizadas hierarquicamente
- ✅ **Marcas** populares
- ✅ **Imagens** de placeholder otimizadas
- ✅ **Variações** de produtos (cor, tamanho, etc)

### E-commerce
- ✅ **Cupons** de desconto ativos
- ✅ **Métodos de pagamento** configurados
- ✅ **Opções de frete** (PAC, SEDEX, etc)
- ✅ **Pedidos** de exemplo
- ✅ **Avaliações** de produtos

### Sistemas Avançados
- ✅ **Notificações** de exemplo
- ✅ **Tickets de suporte**
- ✅ **Sistema de chat** funcional
- ✅ **Devoluções** configuradas
- ✅ **Multi-role** funcionando

## 🔍 Estrutura do Banco

### Tabelas Principais
```
users              - Usuários do sistema
products           - Catálogo de produtos
categories         - Categorias hierárquicas
brands             - Marcas dos produtos
orders             - Pedidos de compra
cart_items         - Itens do carrinho
reviews            - Avaliações de produtos
```

### Tabelas Avançadas
```
notifications      - Sistema de notificações
support_tickets    - Suporte ao cliente
chat_conversations - Sistema de chat
returns            - Devoluções/trocas
sessions           - Gestão de sessões
order_tracking     - Rastreamento de pedidos
```

## 🛠️ Troubleshooting

### Erro de Conexão
```bash
# Verificar se PostgreSQL está rodando
brew services list | grep postgresql
sudo systemctl status postgresql

# Reiniciar se necessário
brew services restart postgresql
sudo systemctl restart postgresql
```

### Erro de Permissão
```bash
# Dar permissões ao usuário
psql postgres -c "ALTER USER mktplace_user CREATEDB;"
psql postgres -c "ALTER USER mktplace_user SUPERUSER;"
```

### Tabelas Não Criadas
```bash
# Executar scripts SQL manualmente
psql "$DATABASE_URL" < complete_missing_tables.sql
psql "$DATABASE_URL" < create_advanced_systems_tables.sql
```

### Dependências
```bash
# Reinstalar dependências
rm -rf node_modules
pnpm install
```

## 📱 Testando o Marketplace

### URLs Principais
- **Loja**: http://localhost:5173
- **Admin**: http://localhost:5174
- **Seller**: http://localhost:5175

### Fluxos de Teste
1. **Cadastro/Login** de usuário
2. **Navegação** por categorias
3. **Busca** de produtos
4. **Carrinho** e checkout
5. **Sistema de chat**
6. **Notificações**
7. **Área do usuário**

## ⚙️ Configurações Opcionais

### Dados Reais da Grão de Gente
Se você tem acesso aos dados reais, execute:
```bash
# Popular com dados reais
node scripts/import-real-products.mjs
```

### Performance
```bash
# Otimizar banco para desenvolvimento
psql "$DATABASE_URL" -f scripts/optimize-marketplace-performance.sql
```

## 📞 Suporte

Se tiver problemas:
1. Verifique os logs no terminal
2. Consulte a documentação em `/docs`
3. Verifique as issues no GitHub
4. Use o sistema de chat do próprio marketplace para testar

---

🎉 **Marketplace configurado com sucesso!** 
Agora você tem um e-commerce completo rodando localmente! 