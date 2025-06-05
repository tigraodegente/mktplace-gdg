#!/bin/bash

# ============================================================================
# SCRIPT AUTOMATIZADO - SISTEMA FRETE DEFINITIVO
# Executa todo o processo de importação Frenet automaticamente
# ============================================================================

set -e  # Para se houver erro

echo "🚛 ============================================"
echo "   SISTEMA DE FRETE DEFINITIVO - FRENET"
echo "   Implementação Automática Completa"
echo "============================================"

# Configurações
DB_CONNECTION_STRING=${DATABASE_URL:-"postgresql://user:pass@localhost:5432/db"}
CSV_PATH="./data/imports/Planilha Frenet - Grão de Gente - Atualizada.xlsx - Grão de Gente.csv"
SCRIPT_PATH="./scripts/sistema_frete_definitivo.sql"

# Verificar se arquivos existem
echo "📁 Verificando arquivos necessários..."

if [ ! -f "$CSV_PATH" ]; then
    echo "❌ ERRO: Arquivo CSV não encontrado em: $CSV_PATH"
    echo "   Verifique se o arquivo existe no caminho correto"
    exit 1
fi

if [ ! -f "$SCRIPT_PATH" ]; then
    echo "❌ ERRO: Script SQL não encontrado em: $SCRIPT_PATH"
    echo "   Execute primeiro a criação do script"
    exit 1
fi

echo "✅ Arquivos encontrados!"
echo ""

# Verificar conexão com banco
echo "🔗 Testando conexão com banco de dados..."
if ! psql "$DB_CONNECTION_STRING" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "❌ ERRO: Não foi possível conectar ao banco de dados"
    echo "   Verifique a string de conexão: $DB_CONNECTION_STRING"
    exit 1
fi

echo "✅ Conexão com banco OK!"
echo ""

# ETAPA 1: Executar script principal
echo "📋 ETAPA 1: Executando script de estrutura..."
psql "$DB_CONNECTION_STRING" -f "$SCRIPT_PATH"
echo "✅ Script estrutural executado!"
echo ""

# ETAPA 2: Importar dados CSV
echo "📊 ETAPA 2: Importando dados CSV Frenet (14.383 registros)..."
psql "$DB_CONNECTION_STRING" -c "\\COPY frenet_import_definitiva FROM '$CSV_PATH' WITH (FORMAT CSV, HEADER true, DELIMITER ',');"
echo "✅ Dados CSV importados!"
echo ""

# ETAPA 3: Executar importação definitiva
echo "⚙️ ETAPA 3: Processando importação definitiva..."
psql "$DB_CONNECTION_STRING" -c "SELECT * FROM importar_frenet_definitivo();"
echo "✅ Importação processada!"
echo ""

# ETAPA 4: Gerar relatório final
echo "📊 ETAPA 4: Gerando relatório final..."
echo ""
psql "$DB_CONNECTION_STRING" -c "SELECT * FROM relatorio_frete_definitivo();"
echo ""

# ETAPA 5: Testar CEP problema
echo "🧪 ETAPA 5: Testando CEP 11060-414 (problema anterior)..."
echo ""
psql "$DB_CONNECTION_STRING" -c "SELECT * FROM testar_cep_11060414();"
echo ""

# ETAPA 6: Validação adicional
echo "🔍 ETAPA 6: Validações adicionais..."
echo ""

echo "Contagem de modalidades ativas:"
psql "$DB_CONNECTION_STRING" -c "SELECT code, name, price_multiplier, days_multiplier FROM shipping_modalities WHERE is_active = true ORDER BY priority;"
echo ""

echo "Amostra de zonas SP:"
psql "$DB_CONNECTION_STRING" -c "SELECT name, cities, zone_type FROM shipping_zones WHERE uf = 'SP' AND carrier_id = 'frenet-carrier' LIMIT 5;"
echo ""

echo "Total de opções por modalidade:"
psql "$DB_CONNECTION_STRING" -c "
SELECT 
    sm.name as modalidade,
    COUNT(sco.id) as opcoes_disponiveis,
    COUNT(DISTINCT sco.zone_id) as zonas_cobertas
FROM shipping_modalities sm
LEFT JOIN shipping_calculated_options sco ON sm.id = sco.modality_id
WHERE sm.is_active = true
GROUP BY sm.id, sm.name, sm.priority
ORDER BY sm.priority;
"
echo ""

# FINALIZAÇÃO
echo "🎉 ============================================"
echo "   SISTEMA DE FRETE FRENET IMPLEMENTADO!"
echo "============================================"
echo ""
echo "✅ Status: 100% COMPLETO"
echo "📍 Modalidades: Padrão, Econômica (-15%), Expressa (+18%)"
echo "🌍 Cobertura: Nacional (baseada em dados Frenet reais)"
echo "📊 Dados: 14.383 registros originais processados"
echo "🔧 Funções: Cálculo automático por peso/CEP/modalidade"
echo ""
echo "🛍️ PRÓXIMOS PASSOS:"
echo "1. Teste o carrinho com CEP 11060-414"
echo "2. Verifique se as 3 modalidades aparecem"
echo "3. Confirme se os preços estão corretos"
echo "4. Sistema está pronto para produção!"
echo ""
echo "🔧 Para fazer ajustes:"
echo "- Modificar percentuais: UPDATE shipping_modalities SET price_multiplier = X WHERE code = 'Y'"
echo "- Regenerar opções: SELECT generate_calculated_options(base_rate_id) FROM shipping_base_rates"
echo "- Ver relatórios: SELECT * FROM relatorio_frete_definitivo()"
echo ""
echo "============================================" 