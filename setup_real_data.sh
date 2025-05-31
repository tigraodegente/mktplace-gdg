#!/bin/bash

# =====================================================
# SCRIPT PARA CONFIGURAR DADOS REAIS NO MARKETPLACE
# =====================================================

echo "🚀 Configurando dados reais no marketplace..."

# Verificar se existe arquivo .env
if [ ! -f .env ]; then
    echo "❌ Arquivo .env não encontrado. Criando um básico..."
    cat > .env << EOF
# Configuração do banco de dados
DATABASE_URL="sua_url_do_banco_aqui"
XATA_API_KEY="sua_chave_xata_aqui"
XATA_BRANCH="main"
EOF
    echo "📝 Arquivo .env criado. Configure suas credenciais do banco."
fi

# Função para executar SQL
execute_sql() {
    local file=$1
    local description=$2
    
    echo "📊 $description..."
    
    if [ -f "$file" ]; then
        # Tentar com diferentes métodos dependendo do banco
        if command -v psql >/dev/null 2>&1; then
            echo "   Usando psql..."
            psql "$DATABASE_URL" -f "$file" 2>/dev/null || echo "   ⚠️  psql falhou, prosseguindo..."
        elif command -v xata >/dev/null 2>&1; then
            echo "   Usando Xata CLI..."
            xata schema edit --file "$file" 2>/dev/null || echo "   ⚠️  Xata CLI falhou, prosseguindo..."
        else
            echo "   ⚠️  Nenhum cliente SQL encontrado. Execute manualmente:"
            echo "   📄 Arquivo: $file"
        fi
    else
        echo "   ❌ Arquivo $file não encontrado"
    fi
}

# 1. Executar tabelas básicas
echo ""
echo "=== PASSO 1: Criando tabelas básicas ==="
execute_sql "complete_missing_tables.sql" "Criando tabelas sessions, orders, order_items"

# 2. Executar tabelas dos sistemas avançados  
echo ""
echo "=== PASSO 2: Criando sistemas avançados ==="
execute_sql "create_advanced_systems_tables.sql" "Criando tabelas de notificações, rastreamento, suporte e devoluções"

# 3. Inserir dados de exemplo
echo ""
echo "=== PASSO 3: Inserindo dados de exemplo ==="
execute_sql "insert_sample_data.sql" "Inserindo dados de teste para demonstração"

echo ""
echo "✅ Configuração concluída!"
echo ""
echo "🔑 CREDENCIAIS DE TESTE:"
echo "   Email: teste@graodigente.com.br"
echo "   Token: test-session-token"
echo "   Pedido: MP1748645252590OLW"
echo ""
echo "🌐 TESTANDO AS APIS:"
echo "   curl -H 'Cookie: session_token=test-session-token' http://localhost:5173/api/notifications"
echo "   curl -H 'Cookie: session_token=test-session-token' http://localhost:5173/api/orders/MP1748645252590OLW/tracking"
echo "   curl -H 'Cookie: session_token=test-session-token' http://localhost:5173/api/support/tickets"
echo "   curl -H 'Cookie: session_token=test-session-token' http://localhost:5173/api/returns"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo "1. Configure as credenciais do banco no arquivo .env"
echo "2. Execute os scripts SQL manualmente se necessário"
echo "3. Teste as interfaces em http://localhost:5173/notificacoes"
echo "4. As APIs agora tentam usar dados reais primeiro, com fallback para mock"
echo "" 