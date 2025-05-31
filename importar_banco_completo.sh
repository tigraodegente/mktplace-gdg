#!/bin/bash

# =====================================================
# SCRIPT PARA IMPORTAR BANCO COMPLETO DO MARKETPLACE
# =====================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Função para mostrar ajuda
show_help() {
    echo "🚀 IMPORTAR BANCO COMPLETO DO MARKETPLACE"
    echo ""
    echo "USO:"
    echo "  $0 [arquivo.sql]"
    echo ""
    echo "EXEMPLOS:"
    echo "  $0                                    # Busca automaticamente"
    echo "  $0 mktplace_backup_20241231.sql     # Importa arquivo específico"
    echo "  $0 exports/mktplace_backup.sql      # Com caminho"
    echo ""
    echo "OPÇÕES:"
    echo "  -h, --help        Mostra esta ajuda"
    echo "  -s, --schema      Importa apenas schema"
    echo "  -d, --data        Importa apenas dados"
    echo ""
}

# Verificar argumentos
IMPORT_TYPE="full"
BACKUP_FILE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -s|--schema)
            IMPORT_TYPE="schema"
            shift
            ;;
        -d|--data)
            IMPORT_TYPE="data"
            shift
            ;;
        *)
            BACKUP_FILE="$1"
            shift
            ;;
    esac
done

log_info "Iniciando importação do marketplace..."
echo ""

# Verificar se PostgreSQL está instalado
if ! command -v psql &> /dev/null; then
    log_error "PostgreSQL não encontrado. Instale usando:"
    echo "  macOS: brew install postgresql"
    echo "  Ubuntu: sudo apt install postgresql postgresql-contrib"
    exit 1
fi

# Verificar se PostgreSQL está rodando
if ! pg_isready &> /dev/null; then
    log_warning "PostgreSQL não está rodando. Tentando iniciar..."
    
    if command -v brew &> /dev/null; then
        brew services start postgresql
    elif command -v systemctl &> /dev/null; then
        sudo systemctl start postgresql
    else
        log_error "PostgreSQL não está rodando. Inicie manualmente."
        exit 1
    fi
    
    sleep 3
fi

log_success "PostgreSQL está rodando"

# Configurar URL do banco
DATABASE_URL="postgresql://mktplace_user:123456@localhost:5432/mktplace_dev"

# Verificar se arquivo de backup foi especificado
if [ -z "$BACKUP_FILE" ]; then
    log_info "Buscando arquivos de backup..."
    
    # Buscar na pasta exports
    if [ -d "exports" ]; then
        case $IMPORT_TYPE in
            "schema")
                BACKUP_FILE=$(ls -t exports/mktplace_schema_*.sql 2>/dev/null | head -1)
                ;;
            "data")
                BACKUP_FILE=$(ls -t exports/mktplace_data_*.sql 2>/dev/null | head -1)
                ;;
            *)
                BACKUP_FILE=$(ls -t exports/mktplace_backup_*.sql 2>/dev/null | head -1)
                ;;
        esac
    fi
    
    # Buscar na pasta atual
    if [ -z "$BACKUP_FILE" ]; then
        case $IMPORT_TYPE in
            "schema")
                BACKUP_FILE=$(ls -t mktplace_schema_*.sql 2>/dev/null | head -1)
                ;;
            "data")
                BACKUP_FILE=$(ls -t mktplace_data_*.sql 2>/dev/null | head -1)
                ;;
            *)
                BACKUP_FILE=$(ls -t mktplace_backup_*.sql 2>/dev/null | head -1)
                ;;
        esac
    fi
    
    if [ -z "$BACKUP_FILE" ]; then
        log_error "Nenhum arquivo de backup encontrado!"
        echo ""
        echo "📋 COMO OBTER UM BACKUP:"
        echo "  1. Execute ./exportar_banco_completo.sh na máquina origem"
        echo "  2. Copie o arquivo .sql gerado para esta máquina"
        echo "  3. Execute este script novamente"
        echo ""
        exit 1
    fi
fi

# Verificar se arquivo existe
if [ ! -f "$BACKUP_FILE" ]; then
    log_error "Arquivo não encontrado: $BACKUP_FILE"
    exit 1
fi

log_success "Arquivo de backup encontrado: $BACKUP_FILE"
echo "  Tamanho: $(du -h "$BACKUP_FILE" | cut -f1)"
echo ""

# Criar banco e usuário se não existirem
log_info "Configurando banco de dados..."

# Script SQL para criar banco
cat > /tmp/setup_import_db.sql << EOF
-- Criar usuário se não existir
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'mktplace_user') THEN
        CREATE USER mktplace_user WITH PASSWORD '123456';
    END IF;
END
\$\$;

-- Dropar banco se existir e recriar
DROP DATABASE IF EXISTS mktplace_dev;
CREATE DATABASE mktplace_dev;

-- Dar permissões
GRANT ALL PRIVILEGES ON DATABASE mktplace_dev TO mktplace_user;
ALTER USER mktplace_user CREATEDB;
EOF

# Executar como superuser
psql postgres -f /tmp/setup_import_db.sql 2>/dev/null || {
    log_warning "Falha ao criar banco como superuser. Tentando como usuário atual..."
    dropdb mktplace_dev 2>/dev/null || true
    createdb mktplace_dev
}

# Criar extensões necessárias
log_info "Criando extensões PostgreSQL..."
psql "$DATABASE_URL" -c '
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pg_trgm";
' 2>/dev/null || log_warning "Algumas extensões podem não ter sido criadas"

# Importar backup
case $IMPORT_TYPE in
    "schema")
        log_info "Importando apenas schema..."
        ;;
    "data")
        log_info "Importando apenas dados..."
        ;;
    *)
        log_info "Importando backup completo (schema + dados)..."
        ;;
esac

echo ""
log_warning "⚠️  ATENÇÃO: Isso vai SUBSTITUIR todos os dados existentes!"
echo ""
read -p "Deseja continuar? (s/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    log_info "Operação cancelada pelo usuário"
    exit 0
fi

# Executar importação
log_info "Iniciando importação... (pode demorar alguns minutos)"

# Capturar início do tempo
start_time=$(date +%s)

# Importar com tratamento de erros
if psql "$DATABASE_URL" -f "$BACKUP_FILE" > /tmp/import_log.txt 2>&1; then
    # Calcular tempo gasto
    end_time=$(date +%s)
    duration=$((end_time - start_time))
    
    log_success "Importação concluída em ${duration}s!"
else
    log_error "Erro durante a importação. Verificando logs..."
    
    # Mostrar apenas erros críticos
    if grep -i "error\|erro\|failed\|fatal" /tmp/import_log.txt > /dev/null; then
        echo ""
        log_warning "Erros encontrados:"
        grep -i "error\|erro\|failed\|fatal" /tmp/import_log.txt | head -10
        echo ""
        log_info "Log completo salvo em: /tmp/import_log.txt"
    fi
    
    # Verificar se pelo menos algumas tabelas foram criadas
    table_count=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null || echo "0")
    
    if [ "$table_count" -gt "10" ]; then
        log_warning "Importação parcial detectada. ${table_count} tabelas criadas."
        echo ""
        read -p "Deseja continuar mesmo com erros? (s/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Ss]$ ]]; then
            exit 1
        fi
    else
        log_error "Importação falhou completamente"
        exit 1
    fi
fi

# Verificar importação
log_info "Verificando importação..."

# Contar tabelas
table_count=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" | tr -d ' ')
log_success "$table_count tabelas importadas"

# Verificar tabelas principais
echo ""
log_info "Verificando dados das tabelas principais:"

for table in users products categories orders brands sellers; do
    count=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null | tr -d ' ')
    if [ ! -z "$count" ] && [ "$count" != "0" ]; then
        log_success "  $table: $count registros"
    else
        log_warning "  $table: tabela vazia ou não encontrada"
    fi
done

# Verificar se há dados suficientes
product_count=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM products;" 2>/dev/null | tr -d ' ')
if [ "$product_count" -gt "100" ]; then
    log_success "Dados suficientes detectados ($product_count produtos)"
else
    log_warning "Poucos produtos encontrados ($product_count). Verifique se o backup está completo."
fi

# Criar arquivo .env se não existir
if [ ! -f .env ]; then
    log_info "Criando arquivo .env..."
    cat > .env << EOF
# Configuração do banco de dados local
DATABASE_URL="postgresql://mktplace_user:123456@localhost:5432/mktplace_dev"
HYPERDRIVE_BINDING="false"

# Configurações de desenvolvimento
NODE_ENV="development"
PUBLIC_APP_URL="http://localhost:5173"

# Chaves para desenvolvimento
JWT_SECRET="sua_chave_jwt_super_secreta_aqui"
ENCRYPT_KEY="sua_chave_de_criptografia_aqui"
EOF
    log_success "Arquivo .env criado"
fi

# Instalar dependências se necessário
if [ ! -d "node_modules" ]; then
    log_info "Instalando dependências..."
    if command -v pnpm &> /dev/null; then
        pnpm install
    elif command -v npm &> /dev/null; then
        npm install
    else
        log_warning "npm/pnpm não encontrado. Instale as dependências manualmente."
    fi
fi

# Limpar arquivos temporários
rm -f /tmp/setup_import_db.sql /tmp/import_log.txt

# Mostrar resumo final
echo ""
echo "🎉 IMPORTAÇÃO CONCLUÍDA COM SUCESSO!"
echo ""
echo "🗄️ BANCO CONFIGURADO:"
echo "  URL: postgresql://mktplace_user:123456@localhost:5432/mktplace_dev"
echo "  Tabelas: $table_count"
echo "  Produtos: $product_count"
echo ""
echo "🚀 PARA INICIAR O MARKETPLACE:"
echo "  cd apps/store"
echo "  pnpm dev"
echo ""
echo "🌐 URLS DISPONÍVEIS:"
echo "  Loja: http://localhost:5173"
echo "  Admin: http://localhost:5174"
echo "  Seller: http://localhost:5175"
echo ""
echo "🔑 CREDENCIAIS DE TESTE:"
echo "  Admin: admin@graodigente.com.br / 123456"
echo "  Seller: vendedor@graodigente.com.br / 123456"
echo "  Cliente: cliente@graodigente.com.br / 123456"
echo ""
echo "✅ Marketplace pronto para desenvolvimento!" 