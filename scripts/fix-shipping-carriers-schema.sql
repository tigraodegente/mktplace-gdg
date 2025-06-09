-- ============================================================================
-- CORREÇÃO CRÍTICA: Adicionar coluna type na tabela shipping_carriers
-- ============================================================================

-- Verificar se a coluna type existe antes de adicionar
DO $$ 
BEGIN
    -- Verificar se a coluna type já existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shipping_carriers' 
        AND column_name = 'type'
    ) THEN
        -- Adicionar a coluna type
        ALTER TABLE shipping_carriers 
        ADD COLUMN type VARCHAR(50) DEFAULT 'api';
        
        -- Atualizar valores baseado na integração
        UPDATE shipping_carriers 
        SET type = CASE 
            WHEN api_integration IS NOT NULL AND api_integration != '' THEN 'api'
            ELSE 'manual'
        END;
        
        -- Tornar a coluna NOT NULL depois de popular
        ALTER TABLE shipping_carriers 
        ALTER COLUMN type SET NOT NULL;
        
        RAISE NOTICE 'Coluna type adicionada e populada com sucesso!';
    ELSE
        RAISE NOTICE 'Coluna type já existe na tabela shipping_carriers';
    END IF;
END $$;

-- Verificar resultado
SELECT 
    id,
    name, 
    type,
    api_integration,
    is_active,
    created_at
FROM shipping_carriers 
ORDER BY created_at DESC; 