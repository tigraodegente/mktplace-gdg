-- Tabela para analytics de buscas inteligentes com IA (PostgreSQL)
CREATE TABLE IF NOT EXISTS faq_searches (
    id SERIAL PRIMARY KEY,
    session_id TEXT NOT NULL,
    query TEXT NOT NULL,
    results_count INTEGER NOT NULL DEFAULT 0,
    ai_confidence REAL DEFAULT 0.0,
    selected_faq_id TEXT DEFAULT NULL,
    search_type TEXT DEFAULT 'ai' CHECK (search_type IN ('ai', 'traditional', 'hybrid')),
    processing_time_ms INTEGER DEFAULT NULL,
    created_at TIMESTAMP DEFAULT NOW()
); 