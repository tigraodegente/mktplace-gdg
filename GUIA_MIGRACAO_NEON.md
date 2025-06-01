# 🚀 MIGRAÇÃO COMPLETA PARA NEON POSTGRESQL

Este guia te ajudará a migrar **TODOS** os seus dados do banco local para o Neon PostgreSQL de forma segura e automatizada.

## 📊 O que será migrado

✅ **TODOS** os dados do marketplace (46MB)  
✅ **101 tabelas** com estrutura completa  
✅ **Índices** e relacionamentos  
✅ **Triggers** e funções  
✅ **Dados reais** de produtos, usuários, pedidos  

## 🔧 Pré-requisitos

### 1. Conta no Neon PostgreSQL
- Acesse [neon.tech](https://neon.tech)
- Crie uma conta gratuita ou paga
- Crie um novo projeto
- Anote as credenciais de conexão

### 2. Informações que você precisará

```
📍 Host: ep-exemplo-123.us-east-1.aws.neon.tech
🗄️  Database: mktplace_prod
👤 User: seu_usuario
🔑 Password: sua_senha
```

### 3. Verificar dependências locais

```bash
# Verificar PostgreSQL
psql --version

# Verificar se o banco local está rodando
psql "postgresql://mktplace_user:123456@localhost:5432/mktplace_dev" -c "SELECT 1;"
```

## 🚀 Executar a migração

### Passo 1: Executar o script

```bash
./migrar_para_neon.sh
```

### Passo 2: Fornecer credenciais do Neon

O script irá solicitar:
- Host do Neon
- Nome do banco
- Usuário
- Senha

### Passo 3: Confirmar a migração

⚠️ **ATENÇÃO:** O script irá:
- Fazer backup completo do banco local
- **LIMPAR** completamente o banco Neon
- Transferir todos os dados
- Validar a migração

## 📋 O que o script faz automaticamente

### Etapa 1: Backup Local
- ✅ Cria backup completo (estrutura + dados)
- ✅ Salva arquivo na pasta `exports/`
- ✅ Verifica integridade do backup

### Etapa 2: Preparação do Neon
- ✅ Testa conexão com Neon
- ✅ Limpa banco de destino
- ✅ Cria extensões necessárias

### Etapa 3: Transferência
- ✅ Ajusta backup para compatibilidade Neon
- ✅ Importa estrutura e dados
- ✅ Monitora erros críticos

### Etapa 4: Validação
- ✅ Compara número de tabelas
- ✅ Verifica registros das tabelas principais
- ✅ Testa operações básicas (SELECT, INSERT)
- ✅ Atualiza arquivo `.env`

## 📁 Arquivos gerados

```
exports/
├── neon_migration_20250131_183747.sql    # Backup completo
└── neon_adjusted_20250131_183747.sql     # Backup ajustado para Neon

.env.backup_1706731647                     # Backup do .env anterior
.env                                       # Novo .env com Neon
```

## 🔗 Configuração final

Após a migração, edite o arquivo `.env` e configure:

```bash
# Integrações obrigatórias
FRENET_TOKEN="seu_token_frenet_aqui"
STRIPE_SECRET_KEY="sk_live_sua_chave_stripe"
PAGSEGURO_TOKEN="seu_token_pagseguro"

# Email
SMTP_USER="seu_email@gmail.com"
SMTP_PASS="sua_senha_de_app"

# Domínio de produção
PUBLIC_APP_URL="https://seudominio.com"
```

## 🧪 Testar a migração

### 1. Verificar conexão
```bash
psql "sua_neon_url_aqui" -c "SELECT COUNT(*) FROM users;"
```

### 2. Testar funcionalidades
```bash
cd apps/store
pnpm dev
```

Acesse: http://localhost:5173

### 3. Verificar dados principais
- ✅ Login de usuários
- ✅ Listagem de produtos
- ✅ Carrinho de compras
- ✅ Finalização de pedidos

## ⚠️ Segurança e backup

### Arquivos importantes salvos
- `exports/neon_migration_*.sql` - Backup completo
- `.env.backup_*` - Configurações anteriores

### Em caso de problemas
```bash
# Restaurar banco local
./importar_banco_completo.sh exports/neon_migration_*.sql

# Restaurar .env anterior
cp .env.backup_* .env
```

## 🔧 Troubleshooting

### Erro de conexão local
```bash
# Iniciar PostgreSQL
brew services start postgresql
# ou
sudo systemctl start postgresql
```

### Erro de conexão Neon
- Verifique host, usuário e senha
- Confirme que o projeto Neon está ativo
- Teste conexão manual:
```bash
psql "postgresql://user:pass@host/db?sslmode=require" -c "SELECT 1;"
```

### Tabelas com contagens diferentes
- Normal para tabelas de log/cache
- Crítico apenas para: users, products, orders, categories

### Extensões não disponíveis
- Algumas extensões podem não estar no Neon
- O marketplace funcionará normalmente

## 📞 Suporte

Se houver problemas:

1. **Verifique os logs:** `/tmp/neon_import.log`
2. **Teste conexões:** Local e Neon
3. **Restaure backup:** Se necessário
4. **Documente erro:** Para suporte

## ✅ Checklist pós-migração

- [ ] Dados migrados com sucesso
- [ ] Número de tabelas correto
- [ ] Contagens das tabelas principais OK
- [ ] Arquivo `.env` configurado
- [ ] Integrações externas configuradas
- [ ] Testes de funcionalidade passando
- [ ] Deploy realizado
- [ ] Monitoramento ativo

---

🎉 **Parabéns!** Seu marketplace está agora rodando no Neon PostgreSQL com todos os dados preservados! 