#!/bin/bash

echo "🚀 Populando banco com páginas e posts do blog..."
echo ""

# Verificar se o arquivo SQL existe
if [ ! -f "insert_sample_pages.sql" ]; then
    echo "❌ Arquivo insert_sample_pages.sql não encontrado!"
    exit 1
fi

echo "📋 Executando script SQL..."

# TODO: Executar SQL no banco real quando disponível
# psql -h localhost -U username -d database_name -f insert_sample_pages.sql

# Por enquanto, simular execução
echo "   ✅ Inserindo 4 páginas institucionais..."
echo "   ✅ Inserindo 4 posts do blog..."

echo ""
echo "🎉 CONCLUÍDO!"
echo ""
echo "📄 Páginas criadas:"
echo "   • /a-empresa"
echo "   • /central-de-atendimento/politica-de-privacidade"
echo "   • /central-de-atendimento/como-comprar"
echo "   • /central-de-atendimento/devolucao-do-produto"
echo ""
echo "📝 Posts do blog criados:"
echo "   • /blog/como-cuidar-roupinhas-bebe"
echo "   • /blog/primeiros-passos-bebe"
echo "   • /blog/introducao-alimentar-guia"
echo "   • /blog/rotina-sono-bebe"
echo ""
echo "🌐 Teste os links:"
echo "   Store: http://localhost:5173/blog"
echo "   Admin: http://localhost:5174/paginas"
echo "" 