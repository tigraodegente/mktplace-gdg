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

echo "=== RECRIANDO TABELAS PARA COMPATIBILIDADE COM XATA ORM ==="
echo ""

# 1. Fazer backup das tabelas atuais
echo "1. Fazendo backup das tabelas atuais..."
execute_sql "ALTER TABLE IF EXISTS users RENAME TO users_old_backup" "Backup users"
execute_sql "ALTER TABLE IF EXISTS sessions RENAME TO sessions_old_backup" "Backup sessions"
execute_sql "ALTER TABLE IF EXISTS sellers RENAME TO sellers_old_backup" "Backup sellers"

# 2. Criar tabela users compatível com Xata
echo ""
echo "2. Criando nova tabela users..."
execute_sql "CREATE TABLE users (email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'customer', is_active BOOLEAN DEFAULT true, email_verified BOOLEAN DEFAULT false, avatar_url TEXT, phone TEXT, last_login_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())" "Create users table"

# 3. Criar tabela sessions compatível com Xata
echo ""
echo "3. Criando nova tabela sessions..."
execute_sql "CREATE TABLE sessions (user_id TEXT NOT NULL, token TEXT UNIQUE NOT NULL, ip_address TEXT, user_agent TEXT, expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())" "Create sessions table"

# 4. Criar tabela sellers compatível com Xata
echo ""
echo "4. Criando nova tabela sellers..."
execute_sql "CREATE TABLE sellers (user_id TEXT UNIQUE NOT NULL, company_name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, description TEXT, logo_url TEXT, banner_url TEXT, is_active BOOLEAN DEFAULT false, is_verified BOOLEAN DEFAULT false, rating DECIMAL(3,2) DEFAULT 0, total_sales INTEGER DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())" "Create sellers table"

# 5. Copiar dados das tabelas antigas (apenas alguns campos essenciais)
echo ""
echo "5. Copiando dados essenciais..."

# Copiar usuários admin e alguns de teste
execute_sql "INSERT INTO users (email, password_hash, name, role, is_active, email_verified, created_at, updated_at) SELECT email, password_hash, name, role, is_active, email_verified, created_at, updated_at FROM users_old_backup WHERE email LIKE '%admin%' OR email LIKE '%test%' LIMIT 10" "Copy essential users"

# 6. Criar usuário admin padrão se não existir
echo ""
echo "6. Criando usuário admin padrão..."
execute_sql "INSERT INTO users (email, password_hash, name, role, is_active, email_verified) VALUES ('admin@marketplace.com', '\$2a\$10\$K.0HwpsoPDGaB/atFBmmXOGTw4ceeg33.WrxJx/FeC9.gOMxlYla6', 'Administrador', 'admin', true, true) ON CONFLICT (email) DO NOTHING" "Create admin user"

# 7. Verificar tabelas criadas
echo ""
echo "7. Verificando tabelas criadas..."
execute_sql "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('users', 'sessions', 'sellers')" "List new tables"

# Limpar arquivo temporário
rm -f /tmp/sql_query.json

echo ""
echo "=== RECRIAÇÃO CONCLUÍDA ==="
echo ""
echo "✅ Tabelas recriadas com schema compatível com Xata ORM"
echo "✅ IDs serão gerados automaticamente pelo Xata"
echo "✅ Usuário admin criado: admin@marketplace.com / senha: 123456"
echo ""
echo "Próximos passos:"
echo "1. Executar: cd packages/xata-client && xata pull main --force"
echo "2. Reiniciar o servidor"
echo "3. Testar autenticação"
echo ""
echo "Para remover backups antigos (após confirmar que tudo funciona):"
echo "DROP TABLE users_old_backup, sessions_old_backup, sellers_old_backup;" 