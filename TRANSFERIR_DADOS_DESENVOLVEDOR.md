# 📦 **Como Transferir Banco e Dados para Outro Desenvolvedor**

Este guia explica como passar todos os dados do marketplace para outro desenvolvedor de forma segura e completa.

## 🚀 **Método 1: Export/Import Automático (Recomendado)**

### **👨‍💻 Para Você (Quem Envia)**

#### **1. Exportar Banco Completo**
```bash
# Execute o script de export
chmod +x exportar_banco_completo.sh
./exportar_banco_completo.sh
```

**O script vai criar:**
- 📄 **mktplace_backup_YYYYMMDD_HHMMSS.sql** - Backup completo
- 📊 **mktplace_data_YYYYMMDD_HHMMSS.sql** - Apenas dados  
- 🏗️ **mktplace_schema_YYYYMMDD_HHMMSS.sql** - Apenas estrutura
- 📈 **estatisticas_YYYYMMDD_HHMMSS.txt** - Relatório detalhado
- 🗜️ **mktplace_backup_completo_YYYYMMDD_HHMMSS.zip** - Pacote completo

#### **2. Enviar Arquivos**
```bash
# Envie o arquivo ZIP (mais fácil)
# Contém: backup SQL + documentação + scripts
exports/mktplace_backup_completo_YYYYMMDD_HHMMSS.zip

# OU envie apenas o backup SQL
exports/mktplace_backup_YYYYMMDD_HHMMSS.sql
```

### **👤 Para o Outro Desenvolvedor (Quem Recebe)**

#### **1. Receber e Preparar**
```bash
# Baixar/copiar o arquivo para a máquina
# Descompactar se necessário
unzip mktplace_backup_completo_YYYYMMDD_HHMMSS.zip

# Dar permissão aos scripts
chmod +x *.sh
```

#### **2. Importar Banco**
```bash
# Import automático (busca arquivo automaticamente)
./importar_banco_completo.sh

# OU especificar arquivo
./importar_banco_completo.sh mktplace_backup_20241231_123456.sql
```

#### **3. Iniciar Marketplace**
```bash
# Instalar dependências (se necessário)
pnpm install

# Iniciar desenvolvimento
cd apps/store
pnpm dev

# Acessar: http://localhost:5173
```

---

## 🗄️ **Método 2: Commands Manuais do PostgreSQL**

### **👨‍💻 Para Você (Exportar)**

```bash
# 1. Export completo
pg_dump "postgresql://mktplace_user:123456@localhost:5432/mktplace_dev" \
  --clean --if-exists --create --format=plain \
  > mktplace_backup_manual.sql

# 2. Comprimir para envio
gzip mktplace_backup_manual.sql

# 3. Enviar: mktplace_backup_manual.sql.gz
```

### **👤 Para o Outro Desenvolvedor (Importar)**

```bash
# 1. Descomprimir
gunzip mktplace_backup_manual.sql.gz

# 2. Configurar banco
createdb mktplace_dev

# 3. Importar
psql mktplace_dev < mktplace_backup_manual.sql

# 4. Verificar
psql mktplace_dev -c "SELECT COUNT(*) FROM products;"
```

---

## 📋 **Método 3: Apenas Dados (Sem Estrutura)**

Útil quando o outro dev já tem a estrutura das tabelas.

### **👨‍💻 Para Você (Exportar Dados)**

```bash
# Script personalizado para dados específicos
./exportar_banco_completo.sh

# Usar apenas o arquivo de dados
# exports/mktplace_data_YYYYMMDD_HHMMSS.sql
```

### **👤 Para o Outro Desenvolvedor (Importar Dados)**

```bash
# 1. Ter marketplace configurado (estrutura)
./setup_banco_local.sh

# 2. Importar apenas dados
./importar_banco_completo.sh -d mktplace_data_20241231.sql

# OU manualmente
psql "postgresql://mktplace_user:123456@localhost:5432/mktplace_dev" \
  -f mktplace_data_20241231.sql
```

---

## 🌐 **Método 4: Via Neon.tech (Cloud)**

Para compartilhar via banco na nuvem.

### **👨‍💻 Configurar Neon.tech**

```bash
# 1. Criar conta no Neon.tech
# 2. Criar projeto "mktplace-shared"
# 3. Obter URL de conexão

# 4. Sincronizar dados locais para Neon
DATABASE_URL_NEON="postgresql://user:pass@ep-xxx.neon.tech/mktplace"

# Export local
pg_dump "postgresql://mktplace_user:123456@localhost:5432/mktplace_dev" \
  | psql "$DATABASE_URL_NEON"
```

### **👤 Para o Outro Desenvolvedor**

```bash
# 1. Receber credenciais do Neon
# 2. Configurar .env
DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/mktplace"

# 3. Testar conexão
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM products;"

# 4. Usar direto ou fazer backup local
pg_dump "$DATABASE_URL" | psql "postgresql://localhost/mktplace_dev"
```

---

## 📊 **O que Cada Método Transfere**

### **📦 Método 1 (Automático) - Transfere:**
- ✅ **Estrutura completa** (50+ tabelas)
- ✅ **Todos os dados** (produtos, usuários, pedidos, etc)
- ✅ **Configurações** (.env, scripts)
- ✅ **Documentação** (guias de setup)
- ✅ **Estatísticas** (relatórios do banco)

### **🗄️ Método 2 (Manual) - Transfere:**
- ✅ **Estrutura completa**
- ✅ **Todos os dados**
- ❌ Configurações (manual)
- ❌ Documentação (manual)

### **📋 Método 3 (Apenas Dados) - Transfere:**
- ❌ Estrutura (dev precisa ter)
- ✅ **Todos os dados**
- ❌ Configurações (manual)

### **🌐 Método 4 (Cloud) - Transfere:**
- ✅ **Estrutura completa**
- ✅ **Todos os dados**
- ✅ **Acesso remoto** (sem backup local)

---

## 🔍 **Dados Incluídos na Transferência**

### **🛍️ E-commerce**
- **500+ produtos** com variações, imagens, descrições
- **Categorias hierárquicas** organizadas
- **Marcas** configuradas
- **Carrinho** de compras
- **Cupons** de desconto ativos
- **Pedidos** de exemplo com tracking

### **👥 Usuários**
- **Admin**: admin@graodigente.com.br / 123456
- **Vendedor**: vendedor@graodigente.com.br / 123456  
- **Cliente**: cliente@graodigente.com.br / 123456
- **Sessões** ativas
- **Endereços** cadastrados

### **💬 Comunicação**
- **Chat** com conversas de exemplo
- **Notificações** configuradas
- **Tickets de suporte** 
- **Base de conhecimento**

### **📊 Sistema**
- **Analytics** de produtos
- **Logs** de atividades
- **Configurações** do sistema
- **Metadados** completos

---

## 🚨 **Troubleshooting**

### **Erro: "PostgreSQL não encontrado"**
```bash
# macOS
brew install postgresql
brew services start postgresql

# Ubuntu
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### **Erro: "Permissão negada"**
```bash
# Dar permissão aos scripts
chmod +x exportar_banco_completo.sh
chmod +x importar_banco_completo.sh
```

### **Erro: "Banco não existe"**
```bash
# Criar banco manualmente
createdb mktplace_dev

# OU usar script de setup
./setup_banco_local.sh
```

### **Importação com erros**
```bash
# Verificar logs
cat /tmp/import_log.txt

# Tentar import forçado
psql mktplace_dev -f backup.sql -v ON_ERROR_STOP=0
```

### **Dados incompletos**
```bash
# Verificar tabelas principais
psql mktplace_dev -c "
SELECT tablename, 
       (SELECT COUNT(*) FROM information_schema.columns 
        WHERE table_name = tablename) as colunas
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
"
```

---

## 📋 **Checklist de Transferência**

### **✅ Para Quem Envia:**
- [ ] Executou `./exportar_banco_completo.sh`
- [ ] Verificou arquivo ZIP criado
- [ ] Testou arquivo com estatísticas
- [ ] Enviou arquivo + documentação
- [ ] Compartilhou credenciais de teste

### **✅ Para Quem Recebe:**
- [ ] Baixou arquivo de backup
- [ ] Instalou PostgreSQL
- [ ] Executou `./importar_banco_completo.sh`
- [ ] Verificou contagem de produtos (500+)
- [ ] Testou login nas 3 apps
- [ ] Confirmou funcionamento do marketplace

---

## 🎯 **Resultado Final**

Após a transferência, o outro desenvolvedor terá:

- ✅ **Marketplace 100% funcional** localmente
- ✅ **Banco PostgreSQL** configurado  
- ✅ **500+ produtos** reais para teste
- ✅ **Usuários** de todos os tipos
- ✅ **3 aplicações** rodando (Store/Admin/Seller)
- ✅ **Credenciais de teste** funcionando
- ✅ **Documentação completa** incluída

**🎉 Marketplace pronto para desenvolvimento imediato!** 