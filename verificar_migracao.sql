-- VERIFICAÇÃO DA MIGRAÇÃO DOS PROMPTS IA

-- 1. Verificar se as tabelas existem
SELECT 
    table_name as "Tabela",
    CASE 
        WHEN table_name IS NOT NULL THEN '✅ Criada'
        ELSE '❌ Não existe'
    END as "Status"
FROM information_schema.tables 
WHERE table_name IN ('ai_prompts', 'ai_prompts_history')
  AND table_schema = 'public'
ORDER BY table_name;

-- 2. Contar registros nas tabelas
SELECT 
    'ai_prompts' as "Tabela",
    COUNT(*) as "Registros",
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Com dados'
        ELSE '❌ Vazia'
    END as "Status"
FROM ai_prompts
WHERE is_active = true

UNION ALL

SELECT 
    'ai_prompts_history' as "Tabela",
    COUNT(*) as "Registros",
    '✅ OK' as "Status"
FROM ai_prompts_history;

-- 3. Listar prompts criados
SELECT 
    name as "Nome",
    category as "Categoria",
    title as "Título",
    is_active as "Ativo"
FROM ai_prompts 
ORDER BY category, name;

-- 4. Verificar estrutura da tabela principal
SELECT 
    column_name as "Campo",
    data_type as "Tipo",
    is_nullable as "Nulo?"
FROM information_schema.columns 
WHERE table_name = 'ai_prompts'
  AND table_schema = 'public'
ORDER BY ordinal_position; 