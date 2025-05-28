-- Verificar estrutura das tabelas antigas

-- Verificar colunas da tabela products_old
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'products_old'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar se as colunas xata existem nas tabelas antigas
SELECT 
    table_name,
    COUNT(CASE WHEN column_name = 'xata_createdat' THEN 1 END) as tem_xata_createdat,
    COUNT(CASE WHEN column_name = 'xata_updatedat' THEN 1 END) as tem_xata_updatedat
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name LIKE '%_old'
    AND column_name IN ('xata_createdat', 'xata_updatedat')
GROUP BY table_name; 