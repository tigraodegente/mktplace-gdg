#!/bin/bash

# =====================================================
# SCRIPT AUTOMÁTICO DE SETUP DO BANCO LOCAL
# Marketplace GDG - Grão de Gente Digital
# =====================================================

set -e  # Parar se houver erro

echo "🚀 Iniciando setup automático do banco local..."
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log colorido
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar pré-requisitos
check_prerequisites() {
    log_info "Verificando pré-requisitos..."
    
    # Verificar Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js não encontrado. Instale pelo site: https://nodejs.org"
        exit 1
    fi
    log_success "Node.js encontrado: $(node --version)"
    
    # Verificar/instalar pnpm
    if ! command -v pnpm &> /dev/null; then
        log_warning "pnpm não encontrado. Instalando..."
        npm install -g pnpm
    fi
    log_success "pnpm encontrado: $(pnpm --version)"
    
    # Verificar PostgreSQL
    if ! command -v psql &> /dev/null; then
        log_error "PostgreSQL não encontrado. Instale usando:"
        echo "  macOS: brew install postgresql"
        echo "  Ubuntu: sudo apt install postgresql postgresql-contrib"
        echo "  Windows: https://www.postgresql.org/download/windows/"
        exit 1
    fi
    log_success "PostgreSQL encontrado: $(psql --version)"
}

# Configurar variáveis de ambiente
setup_env() {
    log_info "Configurando variáveis de ambiente..."
    
    # Criar .env se não existir
    if [ ! -f .env ]; then
        cat > .env << EOF
# Configuração do banco de dados local
DATABASE_URL="postgresql://mktplace_user:123456@localhost:5432/mktplace_dev"
HYPERDRIVE_BINDING="false"

# Configurações de desenvolvimento
NODE_ENV="development"
PUBLIC_APP_URL="http://localhost:5173"

# Chaves para desenvolvimento (altere em produção)
JWT_SECRET="sua_chave_jwt_super_secreta_aqui"
ENCRYPT_KEY="sua_chave_de_criptografia_aqui"

# Configurações de email (opcional)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="seu_email@gmail.com"
SMTP_PASS="sua_senha_de_app"

# Configurações de upload (opcional)
UPLOAD_DIR="uploads"
MAX_FILE_SIZE="10485760"

# Cache KV (desenvolvimento)
CACHE_KV_NAMESPACE="mktplace_cache_dev"
EOF
        log_success "Arquivo .env criado"
    else
        log_warning "Arquivo .env já existe, mantendo configurações"
    fi
}

# Criar banco de dados
setup_database() {
    log_info "Configurando banco de dados PostgreSQL..."
    
    # Verificar se PostgreSQL está rodando
    if ! pg_isready &> /dev/null; then
        log_warning "PostgreSQL não está rodando. Tentando iniciar..."
        
        # Tentar iniciar PostgreSQL dependendo do sistema
        if command -v brew &> /dev/null; then
            brew services start postgresql
        elif command -v systemctl &> /dev/null; then
            sudo systemctl start postgresql
        else
            log_error "Não foi possível iniciar PostgreSQL automaticamente. Inicie manualmente."
            exit 1
        fi
        
        # Aguardar um pouco
        sleep 3
    fi
    
    log_success "PostgreSQL está rodando"
    
    # Criar banco e usuário
    log_info "Criando banco de dados e usuário..."
    
    # Script SQL para criar banco
    cat > /tmp/setup_db.sql << EOF
-- Criar usuário se não existir
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'mktplace_user') THEN
        CREATE USER mktplace_user WITH PASSWORD '123456';
    END IF;
END
\$\$;

-- Criar banco se não existir
SELECT 'CREATE DATABASE mktplace_dev'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'mktplace_dev')\gexec

-- Dar permissões
GRANT ALL PRIVILEGES ON DATABASE mktplace_dev TO mktplace_user;
ALTER USER mktplace_user CREATEDB;
EOF
    
    # Executar como superuser
    psql postgres -f /tmp/setup_db.sql 2>/dev/null || {
        log_warning "Falha ao criar banco como superuser. Tentando como usuário atual..."
        createdb mktplace_dev 2>/dev/null || log_warning "Banco pode já existir"
    }
    
    # Criar extensões necessárias
    log_info "Criando extensões PostgreSQL..."
    psql postgresql://mktplace_user:123456@localhost:5432/mktplace_dev -c '
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
        CREATE EXTENSION IF NOT EXISTS "pg_trgm";
    ' 2>/dev/null || log_warning "Algumas extensões podem já existir"
    
    log_success "Banco de dados configurado"
    
    # Limpar arquivo temporário
    rm -f /tmp/setup_db.sql
}

# Instalar dependências
install_dependencies() {
    log_info "Instalando dependências do projeto..."
    
    # Instalar dependências na raiz
    pnpm install --frozen-lockfile
    
    log_success "Dependências instaladas"
}

# Executar migrations e popular dados
setup_schema_and_data() {
    log_info "Criando estrutura do banco e populando dados..."
    
    export DATABASE_URL="postgresql://mktplace_user:123456@localhost:5432/mktplace_dev"
    
    # 1. Estrutura básica
    log_info "Executando script principal de criação..."
    if [ -f "scripts/01-create-database.mjs" ]; then
        node scripts/01-create-database.mjs || log_warning "Erro no script principal, continuando..."
    fi
    
    # 2. Tabelas avançadas
    log_info "Criando tabelas dos sistemas avançados..."
    if [ -f "create_advanced_systems_tables.sql" ]; then
        psql "$DATABASE_URL" -f create_advanced_systems_tables.sql 2>/dev/null || log_warning "Algumas tabelas podem já existir"
    fi
    
    # 3. Sistema de chat
    log_info "Criando tabelas do sistema de chat..."
    if [ -f "create_chat_system_tables.sql" ]; then
        psql "$DATABASE_URL" -f create_chat_system_tables.sql 2>/dev/null || log_warning "Tabelas de chat podem já existir"
    fi
    
    # 4. Sessões
    log_info "Criando tabela de sessões..."
    if [ -f "create_sessions_table.sql" ]; then
        psql "$DATABASE_URL" -f create_sessions_table.sql 2>/dev/null || log_warning "Tabela de sessões pode já existir"
    fi
    
    # 5. Multi-role
    log_info "Configurando sistema multi-role..."
    if [ -f "setup-multiple-roles.sql" ]; then
        psql "$DATABASE_URL" -f setup-multiple-roles.sql 2>/dev/null || log_warning "Sistema multi-role pode já estar configurado"
    fi
    
    # 6. Dados de exemplo
    log_info "Inserindo dados de exemplo..."
    if [ -f "insert_sample_data.sql" ]; then
        psql "$DATABASE_URL" -f insert_sample_data.sql 2>/dev/null || log_warning "Dados de exemplo podem já existir"
    fi
    
    log_success "Estrutura e dados configurados"
}

# Verificar instalação
verify_setup() {
    log_info "Verificando instalação..."
    
    export DATABASE_URL="postgresql://mktplace_user:123456@localhost:5432/mktplace_dev"
    
    # Testar conexão
    if psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM users;" &> /dev/null; then
        log_success "Conexão com banco funcionando"
    else
        log_error "Erro na conexão com banco"
        return 1
    fi
    
    # Verificar algumas tabelas importantes
    tables=("users" "products" "categories" "orders" "notifications" "chat_conversations")
    for table in "${tables[@]}"; do
        if psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM $table;" &> /dev/null; then
            log_success "Tabela $table: OK"
        else
            log_warning "Tabela $table: Não encontrada"
        fi
    done
}

# Mostrar informações finais
show_final_info() {
    echo ""
    echo "🎉 Setup concluído com sucesso!"
    echo ""
    echo "📋 INFORMAÇÕES IMPORTANTES:"
    echo ""
    echo "🗄️  BANCO DE DADOS:"
    echo "   URL: postgresql://mktplace_user:123456@localhost:5432/mktplace_dev"
    echo "   Host: localhost"
    echo "   Porta: 5432"
    echo "   Banco: mktplace_dev"
    echo "   Usuário: mktplace_user"
    echo "   Senha: 123456"
    echo ""
    echo "👥 USUÁRIOS DE TESTE:"
    echo "   Admin: admin@graodigente.com.br / 123456"
    echo "   Vendedor: vendedor@graodigente.com.br / 123456"
    echo "   Cliente: cliente@graodigente.com.br / 123456"
    echo ""
    echo "🚀 PARA INICIAR O PROJETO:"
    echo "   cd apps/store"
    echo "   pnpm dev"
    echo ""
    echo "🌐 URLS DO PROJETO:"
    echo "   Loja: http://localhost:5173"
    echo "   Admin: http://localhost:5174"
    echo "   Seller: http://localhost:5175"
    echo ""
    echo "🧪 TESTAR APIS:"
    echo "   curl http://localhost:5173/api/products"
    echo "   curl http://localhost:5173/api/categories"
    echo ""
    echo "📚 DOCUMENTAÇÃO:"
    echo "   Leia SETUP_BANCO_LOCAL.md para mais detalhes"
    echo ""
}

# Função principal
main() {
    echo "🏪 Marketplace GDG - Setup Automático do Banco Local"
    echo "=================================================="
    echo ""
    
    check_prerequisites
    setup_env
    setup_database
    install_dependencies
    setup_schema_and_data
    verify_setup
    
    if [ $? -eq 0 ]; then
        show_final_info
    else
        log_error "Setup falhou. Verifique os erros acima."
        exit 1
    fi
}

# Executar script principal
main "$@" 