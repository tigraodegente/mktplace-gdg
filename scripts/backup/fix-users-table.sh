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

echo "=== CORRIGINDO TABELA USERS ==="
echo ""

# 1. Renomear tabela atual
echo "1. Renomeando tabela atual..."
execute_sql "ALTER TABLE users RENAME TO users_backup" "Renomear users para users_backup"

# 2. Criar nova tabela users sem especificar ID como TEXT
echo ""
echo "2. Criando nova tabela users..."
execute_sql "CREATE TABLE users (xata_id TEXT PRIMARY KEY DEFAULT ('rec_' || replace(gen_random_uuid()::text, '-', '')), email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'customer', is_active BOOLEAN DEFAULT true, email_verified BOOLEAN DEFAULT false, avatar_url TEXT, phone TEXT, last_login_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_version INTEGER NOT NULL DEFAULT 0, xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(), xata JSONB DEFAULT '{\\\"version\\\":0}'::jsonb)" "Create new users table"

# 3. Copiar dados da tabela antiga
echo ""
echo "3. Copiando dados da tabela antiga..."
execute_sql "INSERT INTO users (xata_id, email, password_hash, name, role, is_active, email_verified, avatar_url, phone, last_login_at, created_at, updated_at, xata_version, xata_createdat, xata_updatedat, xata) SELECT xata_id, email, password_hash, name, role, is_active, email_verified, avatar_url, phone, last_login_at, created_at, updated_at, xata_version, xata_createdat, xata_updatedat, xata FROM users_backup" "Copy data from backup"

# 4. Verificar contagem
echo ""
echo "4. Verificando dados..."
execute_sql "SELECT COUNT(*) as total FROM users" "Count users"

# Limpar arquivo temporário
rm -f /tmp/sql_query.json

echo ""
echo "=== CORREÇÃO CONCLUÍDA ==="
echo ""
echo "Próximos passos:"
echo "1. Executar 'xata pull main' para atualizar o cliente"
echo "2. Reiniciar o servidor"
echo "3. Se tudo estiver OK, executar: DROP TABLE users_backup;" 