-- Criar tabela de histórico de produtos
CREATE TABLE IF NOT EXISTS product_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'published', 'unpublished')),
    changes JSONB NOT NULL DEFAULT '{}',
    summary TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_product_history_product_id ON product_history(product_id);
CREATE INDEX IF NOT EXISTS idx_product_history_created_at ON product_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_history_action ON product_history(action);
CREATE INDEX IF NOT EXISTS idx_product_history_user_id ON product_history(user_id);

-- Comentários para documentação
COMMENT ON TABLE product_history IS 'Histórico de alterações dos produtos';
COMMENT ON COLUMN product_history.product_id IS 'ID do produto alterado';
COMMENT ON COLUMN product_history.user_id IS 'ID do usuário que fez a alteração';
COMMENT ON COLUMN product_history.action IS 'Tipo de ação realizada';
COMMENT ON COLUMN product_history.changes IS 'Detalhes das alterações em formato JSON';
COMMENT ON COLUMN product_history.summary IS 'Resumo legível das alterações';
COMMENT ON COLUMN product_history.created_at IS 'Data e hora da alteração';

-- Exemplo de inserção para teste
INSERT INTO product_history (product_id, user_id, action, changes, summary) 
SELECT 
    p.id,
    NULL,
    'created',
    '{"initial": {"old": null, "new": "produto criado"}}',
    'Produto criado automaticamente'
FROM products p 
WHERE NOT EXISTS (
    SELECT 1 FROM product_history ph WHERE ph.product_id = p.id
)
LIMIT 5; 