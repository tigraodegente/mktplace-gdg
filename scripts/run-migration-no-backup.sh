#!/bin/bash

# Script para executar a migração do banco de dados SEM BACKUP
# Autor: Assistant

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configurações
DB_URL="postgresql://787mk0:xau_dVL4yNzXLHrGYTmaUbvg00sGLUrZp4at1@us-east-1.sql.xata.sh/mktplace-gdg:main?sslmode=require"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo -e "${YELLOW}🚀 Iniciando migração do banco de dados...${NC}"

# Verificar se psql está instalado
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ psql não está instalado. Por favor, instale o PostgreSQL client.${NC}"
    echo "No macOS: brew install postgresql"
    exit 1
fi

# Executar migração
echo -e "${YELLOW}🔄 Executando migração...${NC}"
echo -e "${YELLOW}⚠️  AVISO: Executando sem backup devido à incompatibilidade de versão${NC}"

psql "$DB_URL" < "$SCRIPT_DIR/execute-migration-step-by-step.sql"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Migração executada com sucesso!${NC}"
    
    # Verificar migração
    echo -e "${YELLOW}🔍 Verificando migração...${NC}"
    psql "$DB_URL" < "$SCRIPT_DIR/verify-migration.sql"
    
    echo -e "${GREEN}✅ Processo concluído!${NC}"
    echo -e "${YELLOW}Próximos passos:${NC}"
    echo "1. Verifique os resultados acima"
    echo "2. Se tudo estiver OK, execute a migração de fornecedores"
    echo "3. Atualize os models TypeScript"
else
    echo -e "${RED}❌ Erro durante a migração.${NC}"
    exit 1
fi 