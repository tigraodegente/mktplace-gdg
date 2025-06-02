# Transferência de Banco de Dados - Marketplace GDG

## Visão Geral

Este documento explica como exportar e importar o banco de dados do Marketplace GDG para desenvolvimento local.

## Scripts Disponíveis

### 1. Exportar Banco de Dados

**Script:** `scripts/export/exportar_banco_completo.sh`

Este script cria um export completo do banco de dados com várias opções:

```bash
# Executar o script (requer DATABASE_URL configurada)
./scripts/export/exportar_banco_completo.sh
```

#### O que é exportado:

1. **banco_completo.sql** - Dump completo (schema + dados)
2. **schema_apenas.sql** - Apenas estrutura das tabelas
3. **dados_apenas.sql** - Apenas dados (incluindo dados sensíveis)
4. **dados_essenciais.sql** - Dados sem informações sensíveis
5. **usuarios_exemplo.sql** - Usuários de teste para desenvolvimento
6. **estatisticas_tabelas.txt** - Informações sobre as tabelas
7. **contagem_registros.txt** - Quantidade de registros por tabela
8. **README.md** - Instruções para o desenvolvedor

O script gera automaticamente um arquivo ZIP com todos os arquivos.

### 2. Importar Banco de Dados

**Script:** `scripts/import/importar_banco_completo.sh`

Este script importa o banco de dados a partir do export:

```bash
# Importar de um arquivo ZIP
./scripts/import/importar_banco_completo.sh exports/banco_marketplace_20250130_120000.zip

# Ou importar de um diretório
./scripts/import/importar_banco_completo.sh exports/banco_completo_20250130_120000/
```

#### Opções de importação:

1. **Banco completo** - Schema + todos os dados
2. **Schema + dados essenciais** - Recomendado para desenvolvimento
3. **Apenas schema** - Somente estrutura
4. **Apenas dados** - Requer schema existente
5. **Personalizado** - Escolher arquivos específicos

## Processo Passo a Passo

### Para quem está enviando o banco:

1. **Configure a variável DATABASE_URL:**
   ```bash
   export DATABASE_URL="postgresql://usuario:senha@host:porta/banco"
   ```

2. **Execute o script de export:**
   ```bash
   cd /caminho/para/mktplace-gdg
   ./scripts/export/exportar_banco_completo.sh
   ```

3. **Envie o arquivo ZIP gerado:**
   - Localização: `exports/banco_marketplace_TIMESTAMP.zip`
   - Tamanho aproximado: 2-5MB comprimido

### Para quem está recebendo o banco:

1. **Instale o PostgreSQL localmente:**
   ```bash
   # macOS
   brew install postgresql
   brew services start postgresql

   # Ubuntu/Debian
   sudo apt-get install postgresql postgresql-contrib
   sudo systemctl start postgresql

   # Windows
   # Baixe o instalador em https://www.postgresql.org/download/windows/
   ```

2. **Coloque o arquivo ZIP na pasta do projeto:**
   ```bash
   cd /caminho/para/mktplace-gdg
   # Coloque o arquivo ZIP aqui
   ```

3. **Execute o script de import:**
   ```bash
   ./scripts/import/importar_banco_completo.sh banco_marketplace_TIMESTAMP.zip
   ```

4. **Siga as instruções interativas:**
   - Escolha a opção 2 (Schema + dados essenciais) para desenvolvimento
   - Use as configurações padrão ou personalize conforme necessário

## Configuração do Ambiente

### 1. Arquivo .env.local

O script de importação cria automaticamente um `.env.local` básico. Complete com suas configurações:

```env
# Banco de dados local (já configurado pelo script)
DATABASE_URL=postgresql://postgres@localhost:5432/marketplace_dev

# Configurações obrigatórias
NODE_ENV=development
JWT_SECRET=desenvolvimento-local-secret-key

# Cloudflare (opcional para desenvolvimento local)
CLOUDFLARE_ACCOUNT_ID=desenvolvimento-local
CLOUDFLARE_DATABASE_ID=desenvolvimento-local

# APIs externas (adicione conforme necessário)
OPENAI_API_KEY=
RESEND_API_KEY=
```

### 2. Instalar dependências

```bash
# Instalar pnpm se necessário
npm install -g pnpm

# Instalar dependências do projeto
pnpm install
```

### 3. Executar o projeto

```bash
# Executar todas as aplicações
pnpm dev

# Ou executar aplicações específicas
pnpm dev:store      # Loja (porta 5173)
pnpm dev:admin      # Admin (porta 5174)
pnpm dev:seller     # Vendedor (porta 5175)
```

## Usuários de Teste

Após importar com a opção recomendada, você terá acesso aos seguintes usuários:

| Email | Senha | Role | Descrição |
|-------|-------|------|-----------|
| admin@marketplace.com | 123456 | admin | Acesso total ao painel administrativo |
| vendedor@marketplace.com | 123456 | seller | Acesso ao painel do vendedor |
| cliente@marketplace.com | 123456 | customer | Cliente da loja |

## Solução de Problemas

### Erro: pg_dump não encontrado

```bash
# macOS
brew install libpq
echo 'export PATH="/opt/homebrew/opt/libpq/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Linux
sudo apt-get install postgresql-client
```

### Erro: createdb não encontrado

Certifique-se de que o PostgreSQL está instalado e no PATH.

### Erro: FATAL: role "postgres" does not exist

```bash
# macOS
createuser -s postgres

# Linux
sudo -u postgres createuser -s $USER
```

### Erro de permissão

```bash
# Tornar scripts executáveis
chmod +x scripts/export/exportar_banco_completo.sh
chmod +x scripts/import/importar_banco_completo.sh
```

## Segurança

- **Dados sensíveis:** O export com dados essenciais remove informações sensíveis
- **Senhas:** Todos os usuários de teste usam senha padrão (123456)
- **Produção:** NUNCA use estas configurações em produção

## Alternativas

### Export manual com pg_dump

```bash
# Export completo
pg_dump $DATABASE_URL > backup.sql

# Apenas schema
pg_dump $DATABASE_URL --schema-only > schema.sql

# Apenas dados
pg_dump $DATABASE_URL --data-only > data.sql
```

### Import manual com psql

```bash
# Criar banco
createdb marketplace_dev

# Importar
psql marketplace_dev < backup.sql
```

## Suporte

Em caso de dúvidas:

1. Verifique os logs de erro
2. Consulte a documentação do PostgreSQL
3. Verifique as issues do projeto
4. Entre em contato com a equipe de desenvolvimento 