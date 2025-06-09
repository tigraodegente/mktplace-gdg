-- Migração: Criar tabelas para sistema de prompts IA editáveis
-- Data: 2025-01-06

-- Verificar se a tabela já existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'ai_prompts') THEN
        
        -- Criar tabela principal ai_prompts
        CREATE TABLE ai_prompts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(100) NOT NULL,
            category VARCHAR(50),
            title VARCHAR(200) NOT NULL,
            description TEXT,
            prompt_template TEXT NOT NULL,
            variables JSONB DEFAULT '[]',
            expected_output TEXT,
            is_active BOOLEAN DEFAULT true,
            version INTEGER DEFAULT 1,
            created_by UUID,
            created_at TIMESTAMP DEFAULT now(),
            updated_at TIMESTAMP DEFAULT now(),
            UNIQUE(name, category)
        );

        -- Criar índices para performance
        CREATE INDEX idx_ai_prompts_name ON ai_prompts(name);
        CREATE INDEX idx_ai_prompts_category ON ai_prompts(category);
        CREATE INDEX idx_ai_prompts_active ON ai_prompts(is_active);

        -- Comentários na tabela
        COMMENT ON TABLE ai_prompts IS 'Prompts de IA editáveis pelo usuário';
        COMMENT ON COLUMN ai_prompts.name IS 'Nome interno do prompt (chave única)';
        COMMENT ON COLUMN ai_prompts.category IS 'Categoria de produtos que usa este prompt';
        COMMENT ON COLUMN ai_prompts.prompt_template IS 'Template do prompt com variáveis {{variavel}}';

        RAISE NOTICE 'Tabela ai_prompts criada com sucesso';
    ELSE
        RAISE NOTICE 'Tabela ai_prompts já existe';
    END IF;
END $$;

-- Verificar se a tabela de histórico já existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'ai_prompts_history') THEN
        
        -- Criar tabela de histórico
        CREATE TABLE ai_prompts_history (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            prompt_id UUID REFERENCES ai_prompts(id) ON DELETE CASCADE,
            version INTEGER NOT NULL,
            prompt_template TEXT NOT NULL,
            variables JSONB DEFAULT '[]',
            change_notes TEXT,
            created_by UUID,
            created_at TIMESTAMP DEFAULT now()
        );

        COMMENT ON TABLE ai_prompts_history IS 'Histórico de versões dos prompts de IA';

        RAISE NOTICE 'Tabela ai_prompts_history criada com sucesso';
    ELSE
        RAISE NOTICE 'Tabela ai_prompts_history já existe';
    END IF;
END $$;

-- Verificar criação das tabelas
SELECT 
    'ai_prompts' as tabela,
    CASE WHEN EXISTS (SELECT FROM pg_tables WHERE tablename = 'ai_prompts') 
         THEN '✅ Criada' 
         ELSE '❌ Não existe' 
    END as status
UNION ALL
SELECT 
    'ai_prompts_history' as tabela,
    CASE WHEN EXISTS (SELECT FROM pg_tables WHERE tablename = 'ai_prompts_history') 
         THEN '✅ Criada' 
         ELSE '❌ Não existe' 
    END as status; 