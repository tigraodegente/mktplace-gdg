#!/bin/bash

# Script para importar banco de dados do Marketplace GDG
# Autor: Sistema de Import Automatizado
# Data: $(date +%Y-%m-%d)

set -e

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Importador de Banco de Dados - Marketplace GDG ===${NC}"
echo ""

# Verificar argumentos
if [ $# -eq 0 ]; then
    echo -e "${RED}ERRO: Nenhum arquivo especificado!${NC}"
    echo "Uso: $0 <arquivo_zip_ou_diretorio>"
    echo "Exemplo: $0 exports/banco_marketplace_20250130_120000.zip"
    exit 1
fi

INPUT_PATH="$1"

# Verificar se é um arquivo ZIP ou diretório
if [[ "$INPUT_PATH" == *.zip ]]; then
    echo -e "${YELLOW}Descompactando arquivo ZIP...${NC}"
    TEMP_DIR=$(mktemp -d)
    unzip -q "$INPUT_PATH" -d "$TEMP_DIR"
    # Encontrar o diretório extraído
    IMPORT_DIR=$(find "$TEMP_DIR" -maxdepth 1 -type d -name "banco_completo_*" | head -1)
else
    IMPORT_DIR="$INPUT_PATH"
fi

if [ ! -d "$IMPORT_DIR" ]; then
    echo -e "${RED}ERRO: Diretório de import não encontrado!${NC}"
    exit 1
fi

echo -e "${YELLOW}Importando de: $IMPORT_DIR${NC}"
echo ""

# Menu de opções
echo -e "${BLUE}Escolha o tipo de importação:${NC}"
echo "1) Banco completo (schema + todos os dados)"
echo "2) Schema + dados essenciais (sem dados sensíveis) [RECOMENDADO]"
echo "3) Apenas schema (estrutura)"
echo "4) Apenas dados (requer schema existente)"
echo "5) Personalizado (escolher arquivos)"
echo ""
read -p "Opção (1-5): " OPCAO

# Configurar banco de dados
echo ""
echo -e "${BLUE}Configuração do banco de dados:${NC}"
read -p "Nome do banco de dados [marketplace_dev]: " DB_NAME
DB_NAME=${DB_NAME:-marketplace_dev}

read -p "Host do PostgreSQL [localhost]: " DB_HOST
DB_HOST=${DB_HOST:-localhost}

read -p "Porta do PostgreSQL [5432]: " DB_PORT
DB_PORT=${DB_PORT:-5432}

read -p "Usuário do PostgreSQL [postgres]: " DB_USER
DB_USER=${DB_USER:-postgres}

# Construir DATABASE_URL
DATABASE_URL="postgresql://$DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"

# Verificar se o banco existe
echo ""
echo -e "${YELLOW}Verificando banco de dados...${NC}"
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo -e "${YELLOW}ATENÇÃO: O banco '$DB_NAME' já existe!${NC}"
    read -p "Deseja sobrescrever? (s/N): " CONFIRM
    if [[ ! "$CONFIRM" =~ ^[Ss]$ ]]; then
        echo "Operação cancelada."
        exit 0
    fi
    echo -e "${YELLOW}Removendo banco existente...${NC}"
    dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
fi

# Criar banco
echo -e "${GREEN}Criando banco de dados '$DB_NAME'...${NC}"
createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"

# Executar importação baseada na opção escolhida
case $OPCAO in
    1)
        echo -e "${GREEN}Importando banco completo...${NC}"
        psql "$DATABASE_URL" < "$IMPORT_DIR/banco_completo.sql"
        ;;
    2)
        echo -e "${GREEN}Importando schema...${NC}"
        psql "$DATABASE_URL" < "$IMPORT_DIR/schema_apenas.sql"
        
        echo -e "${GREEN}Importando dados essenciais...${NC}"
        psql "$DATABASE_URL" < "$IMPORT_DIR/dados_essenciais.sql"
        
        echo -e "${GREEN}Importando usuários de exemplo...${NC}"
        psql "$DATABASE_URL" < "$IMPORT_DIR/usuarios_exemplo.sql"
        ;;
    3)
        echo -e "${GREEN}Importando apenas schema...${NC}"
        psql "$DATABASE_URL" < "$IMPORT_DIR/schema_apenas.sql"
        ;;
    4)
        echo -e "${GREEN}Importando apenas dados...${NC}"
        psql "$DATABASE_URL" < "$IMPORT_DIR/dados_apenas.sql"
        ;;
    5)
        echo -e "${BLUE}Arquivos disponíveis:${NC}"
        ls -la "$IMPORT_DIR"/*.sql
        echo ""
        read -p "Digite os arquivos a importar (separados por espaço): " FILES
        for FILE in $FILES; do
            if [ -f "$IMPORT_DIR/$FILE" ]; then
                echo -e "${GREEN}Importando $FILE...${NC}"
                psql "$DATABASE_URL" < "$IMPORT_DIR/$FILE"
            else
                echo -e "${RED}Arquivo não encontrado: $FILE${NC}"
            fi
        done
        ;;
    *)
        echo -e "${RED}Opção inválida!${NC}"
        exit 1
        ;;
esac

# Verificar importação
echo ""
echo -e "${GREEN}Verificando importação...${NC}"
TABLES=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
echo "Tabelas criadas: $TABLES"

# Criar arquivo .env.local se não existir
if [ ! -f ".env.local" ]; then
    echo ""
    echo -e "${GREEN}Criando arquivo .env.local...${NC}"
    cat > .env.local << EOF
# Banco de dados local
DATABASE_URL=$DATABASE_URL

# Outras configurações necessárias
NODE_ENV=development
JWT_SECRET=your-jwt-secret-here
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_DATABASE_ID=your-database-id

# APIs (adicione suas chaves)
OPENAI_API_KEY=
RESEND_API_KEY=
EOF
    echo -e "${YELLOW}Arquivo .env.local criado! Configure as variáveis necessárias.${NC}"
fi

# Limpar arquivos temporários
if [ ! -z "$TEMP_DIR" ] && [ -d "$TEMP_DIR" ]; then
    rm -rf "$TEMP_DIR"
fi

# Resumo final
echo ""
echo -e "${GREEN}=== Importação Concluída com Sucesso! ===${NC}"
echo ""
echo -e "${BLUE}Próximos passos:${NC}"
echo "1. Configure as variáveis em .env.local"
echo "2. Instale as dependências: pnpm install"
echo "3. Execute o projeto: pnpm dev"
echo ""
echo -e "${YELLOW}Banco de dados: $DATABASE_URL${NC}"
echo ""

# Mostrar usuários de teste se foram importados
if [[ $OPCAO == "2" ]] || grep -q "usuarios_exemplo.sql" <<< "$FILES" 2>/dev/null; then
    echo -e "${BLUE}Usuários de teste disponíveis:${NC}"
    echo "admin@marketplace.com - senha: 123456"
    echo "vendedor@marketplace.com - senha: 123456"
    echo "cliente@marketplace.com - senha: 123456"
fi 