-- Criar tabelas para sistema de prompts IA

-- Tabela principal de prompts
CREATE TABLE IF NOT EXISTS ai_prompts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) DEFAULT 'general',
    title VARCHAR(200) NOT NULL,
    description TEXT,
    prompt_template TEXT NOT NULL,
    variables JSONB DEFAULT '[]',
    expected_output TEXT,
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(name, category)
);

-- Tabela de histórico de prompts  
CREATE TABLE IF NOT EXISTS ai_prompts_history (
    id SERIAL PRIMARY KEY,
    prompt_id INTEGER REFERENCES ai_prompts(id),
    old_prompt_template TEXT,
    old_version INTEGER,
    change_reason TEXT,
    changed_by VARCHAR(100),
    changed_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_ai_prompts_name ON ai_prompts(name);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_category ON ai_prompts(category);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_active ON ai_prompts(is_active);

-- Confirmar criação
SELECT 'Tabelas criadas com sucesso!' as status; 