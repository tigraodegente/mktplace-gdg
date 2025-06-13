-- Migration: 004_add_pricing_configs.sql
-- Adiciona sistema de configurações dinâmicas de pricing
-- Execução: psql -d [database] -f 004_add_pricing_configs.sql

-- 1. Criar tabela pricing_configs
\i ../tables/pricing_configs.sql

-- 2. Verificar se foi criada corretamente
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pricing_configs') THEN
        RAISE EXCEPTION 'Tabela pricing_configs não foi criada corretamente';
    END IF;
    
    RAISE NOTICE 'Tabela pricing_configs criada com sucesso';
    RAISE NOTICE 'Inseridos % registros iniciais', (SELECT count(*) FROM pricing_configs);
END $$;

-- 3. Log da migração
INSERT INTO migration_log (migration_name, executed_at, success) 
VALUES ('004_add_pricing_configs', NOW(), true)
ON CONFLICT DO NOTHING; 