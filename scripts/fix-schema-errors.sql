-- ============================================================================
-- CORREÇÃO DOS ERROS DE SCHEMA IDENTIFICADOS NOS LOGS
-- ============================================================================

-- 1. Verificar e adicionar coluna api_type na tabela shipping_carriers
DO $$ 
BEGIN
    -- Verificar se a coluna api_type existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shipping_carriers' 
        AND column_name = 'api_type'
    ) THEN
        -- Adicionar a coluna api_type
        ALTER TABLE shipping_carriers 
        ADD COLUMN api_type VARCHAR(50);
        
        -- Copiar dados da coluna type para api_type se a coluna type existir
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'shipping_carriers' 
            AND column_name = 'type'
        ) THEN
            UPDATE shipping_carriers 
            SET api_type = type 
            WHERE api_type IS NULL;
        END IF;
        
        RAISE NOTICE 'Coluna api_type adicionada com sucesso na tabela shipping_carriers!';
    ELSE
        RAISE NOTICE 'Coluna api_type já existe na tabela shipping_carriers';
    END IF;
END $$;

-- 2. Verificar e adicionar coluna image_url nas tabelas necessárias
DO $$ 
BEGIN
    -- Verificar e adicionar image_url na tabela categories se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'categories' 
        AND column_name = 'image_url'
    ) THEN
        ALTER TABLE categories 
        ADD COLUMN image_url TEXT;
        
        RAISE NOTICE 'Coluna image_url adicionada na tabela categories!';
    END IF;
    
    -- Verificar e adicionar image_url na tabela banners se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'banners' 
        AND column_name = 'image_url'
    ) THEN
        ALTER TABLE banners 
        ADD COLUMN image_url TEXT;
        
        RAISE NOTICE 'Coluna image_url adicionada na tabela banners!';
    END IF;
END $$;

-- 3. Verificar tabela product_downloads existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'product_downloads'
    ) THEN
        -- Criar tabela product_downloads se não existir
        CREATE TABLE product_downloads (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            product_id UUID NOT NULL,
            name VARCHAR(255) NOT NULL,
            file_url TEXT NOT NULL,
            file_size BIGINT,
            mime_type VARCHAR(100),
            download_limit INTEGER DEFAULT -1,
            download_count INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Adicionar índices
        CREATE INDEX idx_product_downloads_product_id ON product_downloads(product_id);
        CREATE INDEX idx_product_downloads_active ON product_downloads(is_active);
        
        RAISE NOTICE 'Tabela product_downloads criada com sucesso!';
    ELSE
        RAISE NOTICE 'Tabela product_downloads já existe';
    END IF;
END $$;

-- 4. Verificar tabela product_related existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'product_related'
    ) THEN
        -- Criar tabela product_related se não existir
        CREATE TABLE product_related (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            product_id UUID NOT NULL,
            related_product_id UUID NOT NULL,
            relation_type VARCHAR(50) DEFAULT 'similar',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(product_id, related_product_id)
        );
        
        -- Adicionar índices
        CREATE INDEX idx_product_related_product_id ON product_related(product_id);
        CREATE INDEX idx_product_related_related_id ON product_related(related_product_id);
        
        RAISE NOTICE 'Tabela product_related criada com sucesso!';
    ELSE
        RAISE NOTICE 'Tabela product_related já existe';
    END IF;
END $$;

-- 5. Verificar se existem UUIDs inválidos ou valores de teste
DO $$
BEGIN
    RAISE NOTICE 'Verificando dados de teste...';
    
    -- Verificar se há algum registro com UUID inválido nos logs
    -- (Este é mais um aviso para o desenvolvedor verificar chamadas de API)
    RAISE NOTICE 'ATENÇÃO: Verificar se alguma API está sendo chamada com parâmetro "test" ao invés de UUID válido';
    RAISE NOTICE 'Logs mostram erro: invalid input syntax for type uuid: "test"';
END $$;

-- 6. Verificar estrutura final das tabelas
SELECT 
    'shipping_carriers' as tabela,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'shipping_carriers'
  AND column_name IN ('type', 'api_type')
ORDER BY column_name;

SELECT 
    'categories' as tabela,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'categories'
  AND column_name = 'image_url';

-- Relatório final
SELECT 
    table_name,
    COUNT(*) as total_columns
FROM information_schema.columns
WHERE table_name IN ('shipping_carriers', 'categories', 'banners', 'product_downloads', 'product_related')
GROUP BY table_name
ORDER BY table_name; 