#!/bin/bash

# Script para executar migração via Xata CLI
# Este script usa o Xata CLI que pode ter melhor compatibilidade

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Executando migração via Xata CLI...${NC}"

# Verificar se xata está instalado
if ! command -v xata &> /dev/null; then
    echo -e "${RED}❌ Xata CLI não está instalado.${NC}"
    echo "Instale com: npm install -g @xata.io/cli"
    exit 1
fi

# Navegar para o diretório do projeto
cd "$(dirname "$0")/.." || exit

echo -e "${YELLOW}📋 Executando script de migração...${NC}"

# Executar cada parte do script separadamente
echo -e "${GREEN}Passo 1: Criando tabela users...${NC}"
xata schema edit --branch main << 'EOF'
{
  "tables": [
    {
      "name": "users",
      "columns": [
        {"name": "email", "type": "string", "unique": true, "notNull": true},
        {"name": "password_hash", "type": "string", "notNull": true},
        {"name": "name", "type": "string", "notNull": true},
        {"name": "cpf", "type": "string"},
        {"name": "phone", "type": "string"},
        {"name": "role", "type": "string", "notNull": true, "defaultValue": "customer"},
        {"name": "is_active", "type": "bool", "notNull": true, "defaultValue": "true"},
        {"name": "email_verified", "type": "bool", "notNull": true, "defaultValue": "false"},
        {"name": "created_at", "type": "datetime", "notNull": true, "defaultValue": "now"},
        {"name": "updated_at", "type": "datetime", "notNull": true, "defaultValue": "now"}
      ]
    }
  ]
}
EOF

echo -e "${YELLOW}⚠️  Nota: Este script cria a estrutura básica.${NC}"
echo -e "${YELLOW}Para a migração completa com todas as constraints e índices,${NC}"
echo -e "${YELLOW}use o Xata Dashboard ou psql diretamente.${NC}"

echo ""
echo -e "${GREEN}Opções para continuar:${NC}"
echo "1. Use o Xata Dashboard: https://app.xata.io"
echo "2. Execute via psql:"
echo "   psql \"postgresql://DB_USER:DB_PASSWORD@DB_HOST/DB_NAME?sslmode=require\""
echo "3. Cole o conteúdo de execute-migration-step-by-step.sql" 