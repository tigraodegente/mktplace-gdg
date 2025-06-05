-- Tabela para analytics de buscas inteligentes com IA
CREATE TABLE IF NOT EXISTS faq_searches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    query TEXT NOT NULL,
    results_count INTEGER NOT NULL DEFAULT 0,
    ai_confidence REAL DEFAULT 0.0,
    selected_faq_id TEXT DEFAULT NULL,
    search_type TEXT DEFAULT 'ai' CHECK (search_type IN ('ai', 'traditional', 'hybrid')),
    processing_time_ms INTEGER DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Índices para performance
    INDEX idx_faq_searches_session (session_id),
    INDEX idx_faq_searches_created (created_at),
    INDEX idx_faq_searches_query (query),
    INDEX idx_faq_searches_confidence (ai_confidence)
);

-- Comentários explicativos
COMMENT ON TABLE faq_searches IS 'Analytics de buscas inteligentes e tradicionais no FAQ';
COMMENT ON COLUMN faq_searches.session_id IS 'ID da sessão do usuário para tracking';
COMMENT ON COLUMN faq_searches.query IS 'Pergunta original do usuário';
COMMENT ON COLUMN faq_searches.results_count IS 'Número de resultados encontrados';
COMMENT ON COLUMN faq_searches.ai_confidence IS 'Nível de confiança da IA (0.0 - 1.0)';
COMMENT ON COLUMN faq_searches.selected_faq_id IS 'FAQ que o usuário clicou (se houver)';
COMMENT ON COLUMN faq_searches.search_type IS 'Tipo de busca: ai, traditional ou hybrid';
COMMENT ON COLUMN faq_searches.processing_time_ms IS 'Tempo de processamento em milissegundos'; 