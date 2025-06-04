-- ============================================================================
-- FIX: Adicionar coluna api_type na tabela shipping_carriers
-- ============================================================================

-- Verificar se a coluna existe antes de adicionar
DO $$ 
BEGIN
    -- Verificar se a coluna api_type já existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shipping_carriers' 
        AND column_name = 'api_type'
    ) THEN
        -- Adicionar a coluna api_type
        ALTER TABLE shipping_carriers 
        ADD COLUMN api_type VARCHAR(50);
        
        -- Copiar dados da coluna type para api_type
        UPDATE shipping_carriers 
        SET api_type = type 
        WHERE api_type IS NULL;
        
        -- Tornar a coluna NOT NULL depois de popular
        ALTER TABLE shipping_carriers 
        ALTER COLUMN api_type SET NOT NULL;
        
        RAISE NOTICE 'Coluna api_type adicionada e populada com sucesso!';
    ELSE
        RAISE NOTICE 'Coluna api_type já existe na tabela shipping_carriers';
    END IF;
END $$;

-- Verificar resultado
SELECT 
    name, 
    type, 
    api_type,
    is_active,
    created_at
FROM shipping_carriers 
ORDER BY created_at DESC; 