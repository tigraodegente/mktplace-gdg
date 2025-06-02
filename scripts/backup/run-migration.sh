#!/bin/bash

# Script para executar a migração do banco de dados
# Autor: Assistant
# Data: $(date)

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configurações
DB_URL="postgresql://DB_USER:DB_PASSWORD@DB_HOST/DB_NAME?sslmode=require"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo -e "${YELLOW}🚀 Iniciando migração do banco de dados...${NC}"

# Verificar se psql está instalado
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ psql não está instalado. Por favor, instale o PostgreSQL client.${NC}"
    echo "No macOS: brew install postgresql"
    exit 1
fi

# Fazer backup
echo -e "${YELLOW}📦 Criando backup...${NC}"
BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
pg_dump "$DB_URL" > "$SCRIPT_DIR/$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backup criado: $BACKUP_FILE${NC}"
else
    echo -e "${RED}❌ Erro ao criar backup. Abortando migração.${NC}"
    exit 1
fi

# Executar migração
echo -e "${YELLOW}🔄 Executando migração...${NC}"
psql "$DB_URL" < "$SCRIPT_DIR/execute-migration-step-by-step.sql"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Migração executada com sucesso!${NC}"
else
    echo -e "${RED}❌ Erro durante a migração.${NC}"
    echo -e "${YELLOW}Para restaurar o backup, execute:${NC}"
    echo "psql \"$DB_URL\" < \"$SCRIPT_DIR/$BACKUP_FILE\""
    exit 1
fi

# Verificar migração
echo -e "${YELLOW}🔍 Verificando migração...${NC}"
psql "$DB_URL" < "$SCRIPT_DIR/verify-migration.sql"

echo -e "${GREEN}✅ Processo concluído!${NC}"
echo -e "${YELLOW}Próximos passos:${NC}"
echo "1. Verifique os resultados acima"
echo "2. Se tudo estiver OK, execute a migração de fornecedores"
echo "3. Atualize os models TypeScript" 