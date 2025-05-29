#!/bin/bash

# ============================================================================
# SCRIPT DE IMPORTAÇÃO COMPLETA - DADOS FRENET AVANÇADOS
# ============================================================================

set -e  # Para no primeiro erro

# Configurações
DB_NAME="mktplace_dev"
DB_USER="postgres"
CSV_FILE="Planilha Frenet - Grão de Gente - Atualizada.xlsx - Grão de Gente.csv"
SQL_FILE="scripts/import_complete_frenet.sql"

echo "============================================"
echo "🚀 IMPORTAÇÃO COMPLETA DADOS FRENET"
echo "============================================"

# Verificar se o arquivo CSV existe
if [ ! -f "$CSV_FILE" ]; then
    echo "❌ ERRO: Arquivo CSV não encontrado: $CSV_FILE"
    echo "📁 Verifique se o arquivo está no diretório raiz do projeto"
    exit 1
fi

# Verificar se o arquivo SQL existe
if [ ! -f "$SQL_FILE" ]; then
    echo "❌ ERRO: Arquivo SQL não encontrado: $SQL_FILE"
    exit 1
fi

echo "📊 Arquivo CSV encontrado: $CSV_FILE"
echo "🗃️ Arquivo SQL encontrado: $SQL_FILE"
echo ""

# Criar script SQL temporário que inclui o COPY
TEMP_SQL="temp_import_$(date +%s).sql"

echo "🔧 Preparando script de importação..."

# Combinar o comando COPY com o script SQL
cat > "$TEMP_SQL" << EOF
-- ============================================================================
-- IMPORTAÇÃO COMPLETA DOS DADOS FRENET - ESTRUTURA AVANÇADA
-- ============================================================================

-- 1. Criar tabela temporária para importação do CSV completo
CREATE TEMP TABLE frenet_import_full (
    uf VARCHAR(2),
    cidade VARCHAR(255),
    cidade_uf VARCHAR(50),
    cep_de VARCHAR(8),
    cep_ate VARCHAR(8),
    prazo INTEGER,
    ate_300g VARCHAR(20),
    ate_500g VARCHAR(20),
    ate_750g VARCHAR(20),
    ate_1kg VARCHAR(20),
    ate_1250g VARCHAR(20),
    ate_1500g VARCHAR(20),
    ate_2kg VARCHAR(20),
    ate_2500g VARCHAR(20),
    ate_3kg VARCHAR(20),
    ate_3500g VARCHAR(20),
    ate_4kg VARCHAR(20),
    ate_5kg VARCHAR(20),
    ate_7500g VARCHAR(20),
    ate_10kg VARCHAR(20),
    ate_11kg VARCHAR(20),
    ate_12kg VARCHAR(20),
    ate_13kg VARCHAR(20),
    ate_14kg VARCHAR(20),
    ate_15kg VARCHAR(20),
    ate_16kg VARCHAR(20),
    ate_17kg VARCHAR(20),
    ate_18kg VARCHAR(20),
    ate_19kg VARCHAR(20),
    ate_20kg VARCHAR(20),
    ate_21kg VARCHAR(20),
    ate_22kg VARCHAR(20),
    ate_23kg VARCHAR(20),
    ate_24kg VARCHAR(20),
    ate_25kg VARCHAR(20),
    ate_26kg VARCHAR(20),
    ate_27kg VARCHAR(20),
    ate_28kg VARCHAR(20),
    ate_29kg VARCHAR(20),
    ate_30kg VARCHAR(20),
    acima_de_30kg VARCHAR(20),
    gris_percent VARCHAR(10),
    gris_min VARCHAR(10),
    adv_percent VARCHAR(10),
    adv_min VARCHAR(10),
    pedagio VARCHAR(10),
    trt_percent VARCHAR(10),
    trt_minimo VARCHAR(10),
    emex_percent VARCHAR(10),
    emex_min VARCHAR(10),
    despacho VARCHAR(10),
    suframa VARCHAR(10),
    tas VARCHAR(10),
    icms VARCHAR(10)
);

-- 2. Importar dados do CSV
\COPY frenet_import_full FROM '$CSV_FILE' WITH (FORMAT CSV, HEADER true, DELIMITER ',');

EOF

# Adicionar o resto do script SQL (removendo a parte da criação da tabela e o \COPY)
tail -n +95 "$SQL_FILE" >> "$TEMP_SQL"

echo "✅ Script temporário criado: $TEMP_SQL"
echo ""

# Executar a importação
echo "🚀 Iniciando importação no banco de dados..."
echo "   📊 Banco: $DB_NAME"
echo "   👤 Usuário: $DB_USER"
echo ""

# Executar com feedback de progresso
psql -U "$DB_USER" -d "$DB_NAME" -f "$TEMP_SQL" -v ON_ERROR_STOP=1

# Verificar se a execução foi bem-sucedida
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ IMPORTAÇÃO CONCLUÍDA COM SUCESSO!"
    echo ""
    echo "📊 Verificando dados importados..."
    
    # Mostrar estatísticas finais
    psql -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT 
            'Zonas Frenet' as tipo,
            COUNT(*) as total
        FROM shipping_zones 
        WHERE carrier_id = 'frenet-carrier'
        
        UNION ALL
        
        SELECT 
            'Tabelas Base' as tipo,
            COUNT(*) as total
        FROM shipping_base_rates 
        WHERE source = 'frenet'
        
        UNION ALL
        
        SELECT 
            'Modalidades Ativas' as tipo,
            COUNT(*) as total
        FROM shipping_modalities 
        WHERE is_active = true
        
        UNION ALL
        
        SELECT 
            'Opções Calculadas' as tipo,
            COUNT(*) as total
        FROM shipping_calculated_options;
    "
    
    echo ""
    echo "🎯 PRÓXIMOS PASSOS:"
    echo "   1. Testar cálculos: /teste-frete"
    echo "   2. Configurar modalidades no admin"
    echo "   3. Ajustar multiplicadores se necessário"
    echo ""
    
else
    echo ""
    echo "❌ ERRO na importação!"
    echo "   Verifique os logs acima para detalhes"
    echo ""
fi

# Limpar arquivo temporário
echo "🧹 Limpando arquivos temporários..."
rm -f "$TEMP_SQL"

echo "============================================"
echo "🏁 PROCESSO FINALIZADO"
echo "============================================" 