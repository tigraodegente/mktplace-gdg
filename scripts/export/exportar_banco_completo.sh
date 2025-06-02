#!/bin/bash

# Script para exportar banco de dados completo do Marketplace GDG
# Autor: Sistema de Export Automatizado
# Data: $(date +%Y-%m-%d)

set -e

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Exportador de Banco de Dados - Marketplace GDG ===${NC}"
echo ""

# Verificar se DATABASE_URL está definida
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}ERRO: DATABASE_URL não está definida!${NC}"
    echo "Por favor, defina a variável de ambiente DATABASE_URL"
    echo "Exemplo: export DATABASE_URL='postgresql://usuario:senha@host:porta/banco'"
    exit 1
fi

# Criar diretório de export com timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
EXPORT_DIR="exports/banco_completo_${TIMESTAMP}"
mkdir -p "$EXPORT_DIR"

echo -e "${YELLOW}Exportando para: $EXPORT_DIR${NC}"
echo ""

# 1. Export completo do schema + dados
echo -e "${GREEN}1. Exportando banco completo (schema + dados)...${NC}"
pg_dump "$DATABASE_URL" \
    --no-owner \
    --no-privileges \
    --no-acl \
    --if-exists \
    --clean \
    --create \
    --encoding=UTF8 \
    > "$EXPORT_DIR/banco_completo.sql"

# 2. Export apenas do schema (estrutura)
echo -e "${GREEN}2. Exportando apenas estrutura (schema)...${NC}"
pg_dump "$DATABASE_URL" \
    --schema-only \
    --no-owner \
    --no-privileges \
    --no-acl \
    > "$EXPORT_DIR/schema_apenas.sql"

# 3. Export apenas dos dados
echo -e "${GREEN}3. Exportando apenas dados...${NC}"
pg_dump "$DATABASE_URL" \
    --data-only \
    --no-owner \
    --no-privileges \
    --disable-triggers \
    > "$EXPORT_DIR/dados_apenas.sql"

# 4. Export de dados essenciais (sem dados sensíveis)
echo -e "${GREEN}4. Exportando dados essenciais (sem informações sensíveis)...${NC}"
pg_dump "$DATABASE_URL" \
    --data-only \
    --no-owner \
    --no-privileges \
    --disable-triggers \
    --exclude-table=users \
    --exclude-table=sessions \
    --exclude-table=password_resets \
    --exclude-table=audit_logs \
    > "$EXPORT_DIR/dados_essenciais.sql"

# 5. Criar arquivo com dados de exemplo para users
echo -e "${GREEN}5. Criando dados de exemplo para usuários...${NC}"
cat > "$EXPORT_DIR/usuarios_exemplo.sql" << 'EOF'
-- Usuários de exemplo para desenvolvimento
-- Senha padrão para todos: 123456

INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at) VALUES
('usr_admin_001', 'admin@marketplace.com', '$2a$10$YourHashHere', 'Admin Dev', 'admin', NOW(), NOW()),
('usr_seller_001', 'vendedor@marketplace.com', '$2a$10$YourHashHere', 'Vendedor Teste', 'seller', NOW(), NOW()),
('usr_customer_001', 'cliente@marketplace.com', '$2a$10$YourHashHere', 'Cliente Teste', 'customer', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Criar seller para o vendedor
INSERT INTO sellers (id, user_id, store_name, slug, status, created_at, updated_at) VALUES
('sel_001', 'usr_seller_001', 'Loja Teste', 'loja-teste', 'active', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
EOF

# 6. Gerar estatísticas do banco
echo -e "${GREEN}6. Gerando estatísticas do banco...${NC}"
psql "$DATABASE_URL" -c "\dt+" > "$EXPORT_DIR/estatisticas_tabelas.txt"
psql "$DATABASE_URL" -c "SELECT table_name, pg_size_pretty(pg_total_relation_size(table_name::regclass)) as size FROM information_schema.tables WHERE table_schema = 'public' ORDER BY pg_total_relation_size(table_name::regclass) DESC;" > "$EXPORT_DIR/tamanho_tabelas.txt"

# 7. Contar registros em cada tabela
echo -e "${GREEN}7. Contando registros...${NC}"
cat > "$EXPORT_DIR/contagem_registros.sql" << 'EOF'
DO $$
DECLARE
    r RECORD;
    count_result INTEGER;
BEGIN
    FOR r IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
    LOOP
        EXECUTE 'SELECT COUNT(*) FROM ' || quote_ident(r.tablename) INTO count_result;
        RAISE NOTICE '% : % registros', r.tablename, count_result;
    END LOOP;
END $$;
EOF

psql "$DATABASE_URL" -f "$EXPORT_DIR/contagem_registros.sql" 2>&1 | grep "NOTICE" > "$EXPORT_DIR/contagem_registros.txt"

# 8. Criar README para o desenvolvedor
echo -e "${GREEN}8. Criando documentação...${NC}"
cat > "$EXPORT_DIR/README.md" << EOF
# Banco de Dados - Marketplace GDG

## Conteúdo do Export

- **banco_completo.sql**: Dump completo com schema + dados
- **schema_apenas.sql**: Apenas estrutura das tabelas
- **dados_apenas.sql**: Apenas dados (com informações sensíveis)
- **dados_essenciais.sql**: Dados sem informações sensíveis
- **usuarios_exemplo.sql**: Usuários de teste para desenvolvimento

## Como Importar

### 1. Criar banco local (PostgreSQL)
\`\`\`bash
createdb marketplace_dev
\`\`\`

### 2. Importar schema + dados essenciais
\`\`\`bash
# Opção 1: Banco completo (com todos os dados)
psql marketplace_dev < banco_completo.sql

# Opção 2: Schema + dados essenciais (recomendado)
psql marketplace_dev < schema_apenas.sql
psql marketplace_dev < dados_essenciais.sql
psql marketplace_dev < usuarios_exemplo.sql
\`\`\`

### 3. Configurar .env
\`\`\`env
DATABASE_URL=postgresql://usuario:senha@localhost:5432/marketplace_dev
\`\`\`

## Usuários de Teste

| Email | Senha | Role |
|-------|-------|------|
| admin@marketplace.com | 123456 | admin |
| vendedor@marketplace.com | 123456 | seller |
| cliente@marketplace.com | 123456 | customer |

## Estatísticas do Banco

$(date)

### Tabelas
$(wc -l < "$EXPORT_DIR/estatisticas_tabelas.txt") tabelas no total

### Registros
Ver arquivo: contagem_registros.txt

## Suporte

Em caso de dúvidas, consulte a documentação em /docs ou entre em contato.
EOF

# 9. Comprimir tudo
echo -e "${GREEN}9. Comprimindo arquivos...${NC}"
cd exports
zip -r "banco_marketplace_${TIMESTAMP}.zip" "banco_completo_${TIMESTAMP}/"
cd ..

# Resumo final
echo ""
echo -e "${GREEN}=== Export Concluído com Sucesso! ===${NC}"
echo ""
echo -e "${YELLOW}Arquivos gerados em: $EXPORT_DIR${NC}"
echo -e "${YELLOW}Arquivo comprimido: exports/banco_marketplace_${TIMESTAMP}.zip${NC}"
echo ""
echo "Tamanho dos arquivos:"
du -h "$EXPORT_DIR"/* | sort -h
echo ""
echo -e "${GREEN}Envie o arquivo ZIP para o desenvolvedor!${NC}" 