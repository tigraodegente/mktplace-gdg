#!/bin/bash

# Configurações
API_KEY="xau_4YkLfHkfKWwzMmUzfLWuv1IfbS6M0r9D0"
DB_URL="https://GUSTAVO-FERRO-s-workspace-787mk0.us-east-1.xata.sh/db/mktplace-gdg:main/sql"

# Função para executar SQL
execute_sql() {
    local sql="$1"
    local description="$2"
    
    echo "Executando: $description"
    
    cat > /tmp/sql_query.json << EOF
{
  "statement": "$sql"
}
EOF
    
    response=$(curl -s -X POST "$DB_URL" \
        -H "Authorization: Bearer $API_KEY" \
        -H "Content-Type: application/json" \
        -d @/tmp/sql_query.json)
    
    if echo "$response" | grep -q '"message"'; then
        echo "❌ Erro: $response"
        return 1
    else
        echo "✅ Sucesso"
        return 0
    fi
}

echo "=== ADICIONANDO CAMPOS OBRIGATÓRIOS DO XATA ==="
echo ""

# 1. Adicionar campos Xata na tabela users
echo "1. Adicionando campos Xata em users..."
execute_sql "ALTER TABLE users ADD COLUMN IF NOT EXISTS xata_id TEXT PRIMARY KEY DEFAULT ('rec_' || replace(gen_random_uuid()::text, '-', ''))" "Add xata_id to users"
execute_sql "ALTER TABLE users ADD COLUMN IF NOT EXISTS xata_version INTEGER NOT NULL DEFAULT 0" "Add xata_version to users"
execute_sql "ALTER TABLE users ADD COLUMN IF NOT EXISTS xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW()" "Add xata_createdat to users"
execute_sql "ALTER TABLE users ADD COLUMN IF NOT EXISTS xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW()" "Add xata_updatedat to users"
execute_sql "ALTER TABLE users ADD COLUMN IF NOT EXISTS xata JSONB DEFAULT '{\\\"version\\\":0}'::jsonb" "Add xata to users"

# 2. Adicionar campos Xata na tabela sessions
echo ""
echo "2. Adicionando campos Xata em sessions..."
execute_sql "ALTER TABLE sessions ADD COLUMN IF NOT EXISTS xata_id TEXT PRIMARY KEY DEFAULT ('rec_' || replace(gen_random_uuid()::text, '-', ''))" "Add xata_id to sessions"
execute_sql "ALTER TABLE sessions ADD COLUMN IF NOT EXISTS xata_version INTEGER NOT NULL DEFAULT 0" "Add xata_version to sessions"
execute_sql "ALTER TABLE sessions ADD COLUMN IF NOT EXISTS xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW()" "Add xata_createdat to sessions"
execute_sql "ALTER TABLE sessions ADD COLUMN IF NOT EXISTS xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW()" "Add xata_updatedat to sessions"
execute_sql "ALTER TABLE sessions ADD COLUMN IF NOT EXISTS xata JSONB DEFAULT '{\\\"version\\\":0}'::jsonb" "Add xata to sessions"

# 3. Adicionar campos Xata na tabela sellers
echo ""
echo "3. Adicionando campos Xata em sellers..."
execute_sql "ALTER TABLE sellers ADD COLUMN IF NOT EXISTS xata_id TEXT PRIMARY KEY DEFAULT ('rec_' || replace(gen_random_uuid()::text, '-', ''))" "Add xata_id to sellers"
execute_sql "ALTER TABLE sellers ADD COLUMN IF NOT EXISTS xata_version INTEGER NOT NULL DEFAULT 0" "Add xata_version to sellers"
execute_sql "ALTER TABLE sellers ADD COLUMN IF NOT EXISTS xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW()" "Add xata_createdat to sellers"
execute_sql "ALTER TABLE sellers ADD COLUMN IF NOT EXISTS xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW()" "Add xata_updatedat to sellers"
execute_sql "ALTER TABLE sellers ADD COLUMN IF NOT EXISTS xata JSONB DEFAULT '{\\\"version\\\":0}'::jsonb" "Add xata to sellers"

# 4. Adicionar campo id como alias para xata_id
echo ""
echo "4. Adicionando campo id como alias..."
execute_sql "ALTER TABLE users ADD COLUMN IF NOT EXISTS id TEXT UNIQUE GENERATED ALWAYS AS (xata_id) STORED" "Add id to users"
execute_sql "ALTER TABLE sessions ADD COLUMN IF NOT EXISTS id TEXT UNIQUE GENERATED ALWAYS AS (xata_id) STORED" "Add id to sessions"
execute_sql "ALTER TABLE sellers ADD COLUMN IF NOT EXISTS id TEXT UNIQUE GENERATED ALWAYS AS (xata_id) STORED" "Add id to sellers"

# Limpar arquivo temporário
rm -f /tmp/sql_query.json

echo ""
echo "=== CAMPOS ADICIONADOS ==="
echo ""
echo "✅ Campos obrigatórios do Xata adicionados"
echo "✅ Campo 'id' criado como alias de 'xata_id'"
echo ""
echo "Próximos passos:"
echo "1. Executar: cd packages/xata-client && xata pull main --force"
echo "2. Reiniciar o servidor"
echo "3. Testar autenticação" 