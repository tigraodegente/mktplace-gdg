#!/bin/bash

echo "🧹 Iniciando limpeza e organização dos arquivos SQL..."

# Criar diretório de backup se não existir
BACKUP_DIR="sql-backup"
SCHEMA_DIR="schema"

if [ ! -d "$BACKUP_DIR" ]; then
    echo "📁 Criando diretório de backup: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
fi

if [ ! -d "$SCHEMA_DIR" ]; then
    echo "📁 Criando diretório de schema: $SCHEMA_DIR"
    mkdir -p "$SCHEMA_DIR"
fi

# Contar arquivos SQL no root
SQL_COUNT=$(ls -1 *.sql 2>/dev/null | wc -l)

if [ "$SQL_COUNT" -eq 0 ]; then
    echo "✅ Nenhum arquivo SQL encontrado no root. Tudo limpo!"
    exit 0
fi

echo "📊 Encontrados $SQL_COUNT arquivos SQL no root"

# Categorizar arquivos SQL
echo -e "\n🏷️ Categorizando arquivos SQL..."

# Arrays para diferentes categorias
declare -a SCHEMA_FILES
declare -a MIGRATION_FILES
declare -a TEST_FILES
declare -a BACKUP_FILES

# Categorizar cada arquivo
for file in *.sql; do
    if [[ $file == *"schema"* ]] || [[ $file == *"create"* ]] || [[ $file == *"table"* ]]; then
        SCHEMA_FILES+=("$file")
    elif [[ $file == *"migration"* ]] || [[ $file == *"migrate"* ]] || [[ $file == *"update"* ]]; then
        MIGRATION_FILES+=("$file")
    elif [[ $file == *"test"* ]] || [[ $file == *"debug"* ]] || [[ $file == *"temp"* ]]; then
        TEST_FILES+=("$file")
    else
        BACKUP_FILES+=("$file")
    fi
done

# Criar subdiretórios
mkdir -p "$SCHEMA_DIR/tables"
mkdir -p "$SCHEMA_DIR/migrations"
mkdir -p "$BACKUP_DIR/tests"
mkdir -p "$BACKUP_DIR/misc"

# Mover arquivos para locais apropriados
echo -e "\n📦 Movendo arquivos..."

# Schema files
if [ ${#SCHEMA_FILES[@]} -gt 0 ]; then
    echo "  📋 Movendo ${#SCHEMA_FILES[@]} arquivos de schema..."
    for file in "${SCHEMA_FILES[@]}"; do
        echo "    - $file → $SCHEMA_DIR/tables/"
        mv "$file" "$SCHEMA_DIR/tables/"
    done
fi

# Migration files
if [ ${#MIGRATION_FILES[@]} -gt 0 ]; then
    echo "  🔄 Movendo ${#MIGRATION_FILES[@]} arquivos de migração..."
    for file in "${MIGRATION_FILES[@]}"; do
        echo "    - $file → $SCHEMA_DIR/migrations/"
        mv "$file" "$SCHEMA_DIR/migrations/"
    done
fi

# Test files
if [ ${#TEST_FILES[@]} -gt 0 ]; then
    echo "  🧪 Movendo ${#TEST_FILES[@]} arquivos de teste..."
    for file in "${TEST_FILES[@]}"; do
        echo "    - $file → $BACKUP_DIR/tests/"
        mv "$file" "$BACKUP_DIR/tests/"
    done
fi

# Other files
if [ ${#BACKUP_FILES[@]} -gt 0 ]; then
    echo "  📂 Movendo ${#BACKUP_FILES[@]} outros arquivos..."
    for file in "${BACKUP_FILES[@]}"; do
        echo "    - $file → $BACKUP_DIR/misc/"
        mv "$file" "$BACKUP_DIR/misc/"
    done
fi

# Criar README nos diretórios
echo -e "\n📝 Criando documentação..."

# README para schema
cat > "$SCHEMA_DIR/README.md" << 'EOF'
# Schema do Banco de Dados

Este diretório contém os arquivos de schema e migrações do banco de dados.

## Estrutura

- `/tables/` - Definições de tabelas e estruturas
- `/migrations/` - Scripts de migração e atualizações

## Como usar

### Criar novo banco
```bash
# Execute os scripts em ordem
cat tables/*.sql | psql $DATABASE_URL
```

### Aplicar migrações
```bash
# Execute as migrações em ordem cronológica
for file in migrations/*.sql; do
  psql $DATABASE_URL -f "$file"
done
```

## Convenções

- Use nomes descritivos para arquivos
- Inclua timestamp em migrações: `YYYYMMDD_description.sql`
- Sempre inclua rollback em migrações complexas
EOF

# README para backup
cat > "$BACKUP_DIR/README.md" << 'EOF'
# Backup de Arquivos SQL

Este diretório contém arquivos SQL de backup e testes.

## Estrutura

- `/tests/` - Scripts de teste e debug
- `/misc/` - Outros arquivos SQL diversos

## ⚠️ Atenção

Estes arquivos foram movidos do root do projeto durante a limpeza.
Revise antes de usar em produção.

## Limpeza futura

Após revisar, arquivos desnecessários podem ser removidos com:
```bash
# Remover todos os arquivos de teste
rm -rf tests/

# Remover arquivos específicos
rm misc/arquivo_desnecessario.sql
```
EOF

# Criar índice de arquivos movidos
echo -e "\n📋 Criando índice de arquivos movidos..."
cat > "SQL_FILES_CLEANUP_REPORT.md" << EOF
# Relatório de Limpeza de Arquivos SQL

**Data**: $(date)
**Total de arquivos movidos**: $SQL_COUNT

## Arquivos Organizados

### Schema e Tabelas (${#SCHEMA_FILES[@]} arquivos)
$(if [ ${#SCHEMA_FILES[@]} -gt 0 ]; then
    echo "Movidos para \`$SCHEMA_DIR/tables/\`:"
    for file in "${SCHEMA_FILES[@]}"; do
        echo "- $file"
    done
else
    echo "Nenhum arquivo nesta categoria."
fi)

### Migrações (${#MIGRATION_FILES[@]} arquivos)
$(if [ ${#MIGRATION_FILES[@]} -gt 0 ]; then
    echo "Movidos para \`$SCHEMA_DIR/migrations/\`:"
    for file in "${MIGRATION_FILES[@]}"; do
        echo "- $file"
    done
else
    echo "Nenhum arquivo nesta categoria."
fi)

### Testes (${#TEST_FILES[@]} arquivos)
$(if [ ${#TEST_FILES[@]} -gt 0 ]; then
    echo "Movidos para \`$BACKUP_DIR/tests/\`:"
    for file in "${TEST_FILES[@]}"; do
        echo "- $file"
    done
else
    echo "Nenhum arquivo nesta categoria."
fi)

### Outros (${#BACKUP_FILES[@]} arquivos)
$(if [ ${#BACKUP_FILES[@]} -gt 0 ]; then
    echo "Movidos para \`$BACKUP_DIR/misc/\`:"
    for file in "${BACKUP_FILES[@]}"; do
        echo "- $file"
    done
else
    echo "Nenhum arquivo nesta categoria."
fi)

## Próximos Passos

1. Revisar arquivos em \`$BACKUP_DIR/\` e remover desnecessários
2. Consolidar schemas duplicados em \`$SCHEMA_DIR/tables/\`
3. Ordenar migrações cronologicamente em \`$SCHEMA_DIR/migrations/\`
4. Atualizar scripts de deploy para usar nova estrutura

## Reverter (se necessário)

Para reverter esta organização:
\`\`\`bash
# Mover todos os arquivos de volta para o root
mv $SCHEMA_DIR/tables/*.sql ./
mv $SCHEMA_DIR/migrations/*.sql ./
mv $BACKUP_DIR/tests/*.sql ./
mv $BACKUP_DIR/misc/*.sql ./
\`\`\`
EOF

echo -e "\n✅ Limpeza concluída!"
echo "📊 Resumo:"
echo "  - Arquivos de schema: ${#SCHEMA_FILES[@]} → $SCHEMA_DIR/tables/"
echo "  - Arquivos de migração: ${#MIGRATION_FILES[@]} → $SCHEMA_DIR/migrations/"
echo "  - Arquivos de teste: ${#TEST_FILES[@]} → $BACKUP_DIR/tests/"
echo "  - Outros arquivos: ${#BACKUP_FILES[@]} → $BACKUP_DIR/misc/"
echo -e "\n📄 Relatório detalhado salvo em: SQL_FILES_CLEANUP_REPORT.md" 