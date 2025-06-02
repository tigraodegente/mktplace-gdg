#!/bin/bash

# =====================================================
# Script de Limpeza e Otimização do Projeto
# Marketplace GDG
# =====================================================

set -e

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🧹 Iniciando limpeza do projeto Marketplace GDG..."
echo ""

# Função para calcular tamanho de diretório
get_size() {
    du -sh "$1" 2>/dev/null | cut -f1 || echo "0"
}

# Tamanho inicial
INITIAL_SIZE=$(get_size ".")
echo "📊 Tamanho inicial do projeto: $INITIAL_SIZE"
echo ""

# 1. Criar estrutura de arquivamento
echo -e "${YELLOW}📁 Criando estrutura de arquivamento...${NC}"
mkdir -p archive/{exports,scripts,backups,logs,old-migrations}

# 2. Arquivar exports SQL
if [ -d "exports" ] && [ "$(ls -A exports/*.sql 2>/dev/null)" ]; then
    echo -e "${YELLOW}📦 Arquivando exports SQL...${NC}"
    EXPORT_COUNT=$(ls exports/*.sql 2>/dev/null | wc -l)
    mv exports/*.sql archive/exports/ 2>/dev/null || true
    
    # Comprimir se houver arquivos
    if [ "$(ls -A archive/exports/*.sql 2>/dev/null)" ]; then
        cd archive/exports
        tar -czf exports_$(date +%Y%m%d_%H%M%S).tar.gz *.sql
        rm *.sql
        cd ../..
        echo -e "${GREEN}✅ $EXPORT_COUNT arquivos SQL arquivados${NC}"
    fi
else
    echo "📭 Nenhum export SQL para arquivar"
fi

# 3. Arquivar scripts de migração antigos
echo -e "${YELLOW}📜 Arquivando scripts de migração executados...${NC}"
SCRIPT_COUNT=0

# Lista de padrões de scripts para arquivar
PATTERNS=(
    "*mongodb*.mjs"
    "sync-*.mjs"
    "import-*.mjs"
    "debug-*.mjs"
    "check-*.mjs"
    "test-*.mjs"
    "*-test.mjs"
)

for pattern in "${PATTERNS[@]}"; do
    if [ "$(ls scripts/$pattern 2>/dev/null)" ]; then
        COUNT=$(ls scripts/$pattern 2>/dev/null | wc -l)
        SCRIPT_COUNT=$((SCRIPT_COUNT + COUNT))
        mv scripts/$pattern archive/scripts/ 2>/dev/null || true
    fi
done

echo -e "${GREEN}✅ $SCRIPT_COUNT scripts arquivados${NC}"

# 4. Limpar arquivos temporários
echo -e "${YELLOW}🗑️  Limpando arquivos temporários...${NC}"
TEMP_COUNT=0

# Remover logs antigos (mais de 7 dias)
if [ "$(find . -name "*.log" -mtime +7 2>/dev/null)" ]; then
    TEMP_COUNT=$((TEMP_COUNT + $(find . -name "*.log" -mtime +7 2>/dev/null | wc -l)))
    find . -name "*.log" -mtime +7 -delete 2>/dev/null || true
fi

# Remover .DS_Store
if [ "$(find . -name ".DS_Store" 2>/dev/null)" ]; then
    TEMP_COUNT=$((TEMP_COUNT + $(find . -name ".DS_Store" 2>/dev/null | wc -l)))
    find . -name ".DS_Store" -delete 2>/dev/null || true
fi

# Remover arquivos .bak
if [ "$(find . -name "*.bak" 2>/dev/null)" ]; then
    TEMP_COUNT=$((TEMP_COUNT + $(find . -name "*.bak" 2>/dev/null | wc -l)))
    find . -name "*.bak" -delete 2>/dev/null || true
fi

echo -e "${GREEN}✅ $TEMP_COUNT arquivos temporários removidos${NC}"

# 5. Organizar scripts restantes
echo -e "${YELLOW}📚 Organizando scripts úteis...${NC}"
mkdir -p scripts/{utils,active,database}

# Mover scripts úteis para pastas apropriadas
[ -f "scripts/cleanup-sensitive-data.sh" ] && mv scripts/cleanup-sensitive-data.sh scripts/utils/ 2>/dev/null || true
[ -f "scripts/replace-console-logs.sh" ] && mv scripts/replace-console-logs.sh scripts/utils/ 2>/dev/null || true
[ -f "scripts/cleanup-project.sh" ] && mv scripts/cleanup-project.sh scripts/utils/ 2>/dev/null || true

# 6. Limpar cache de dependências
echo -e "${YELLOW}📦 Otimizando dependências...${NC}"
if command -v pnpm &> /dev/null; then
    pnpm store prune
    echo -e "${GREEN}✅ Cache do pnpm limpo${NC}"
else
    echo "⚠️  pnpm não encontrado, pulando limpeza de cache"
fi

# 7. Criar relatório de limpeza
echo -e "${YELLOW}📊 Gerando relatório...${NC}"
FINAL_SIZE=$(get_size ".")
ARCHIVE_SIZE=$(get_size "archive")

cat > LIMPEZA_$(date +%Y%m%d).md << EOF
# Relatório de Limpeza - $(date +"%d/%m/%Y %H:%M")

## Resumo
- **Tamanho inicial**: $INITIAL_SIZE
- **Tamanho final**: $FINAL_SIZE  
- **Arquivos arquivados**: $ARCHIVE_SIZE

## Ações Realizadas
- ✅ $EXPORT_COUNT exports SQL arquivados
- ✅ $SCRIPT_COUNT scripts de migração arquivados
- ✅ $TEMP_COUNT arquivos temporários removidos
- ✅ Dependências otimizadas

## Estrutura de Arquivo
\`\`\`
archive/
├── exports/     # Backups SQL comprimidos
├── scripts/     # Scripts de migração executados
├── backups/     # Outros backups
└── logs/        # Logs antigos
\`\`\`

## Próximos Passos
1. Fazer backup externo da pasta \`archive/\`
2. Após backup, considerar deletar \`archive/\` para liberar mais espaço
3. Adicionar \`archive/\` ao \`.gitignore\` se ainda não estiver
EOF

echo -e "${GREEN}✅ Relatório salvo em LIMPEZA_$(date +%Y%m%d).md${NC}"

# 8. Verificar .gitignore
if ! grep -q "^archive/" .gitignore 2>/dev/null; then
    echo -e "${YELLOW}📝 Adicionando archive/ ao .gitignore...${NC}"
    echo -e "\n# Arquivos arquivados\narchive/" >> .gitignore
fi

# Resumo final
echo ""
echo "========================================="
echo -e "${GREEN}✨ Limpeza concluída com sucesso!${NC}"
echo "========================================="
echo "📊 Tamanho inicial: $INITIAL_SIZE"
echo "📊 Tamanho final: $FINAL_SIZE"
echo "📦 Arquivos arquivados: $ARCHIVE_SIZE"
echo ""
echo "💡 Dicas:"
echo "   - Faça backup da pasta 'archive/' antes de deletá-la"
echo "   - Execute 'git status' para verificar mudanças"
echo "   - Considere fazer commit das mudanças importantes"
echo "" 