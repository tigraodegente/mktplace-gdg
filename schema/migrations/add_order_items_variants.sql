-- Migração: Adicionar colunas para variantes selecionadas
-- Data: 2025-01-06
-- Descrição: Adiciona campos para preservar cor e tamanho selecionados no momento da compra

-- Adicionar colunas para cores e tamanhos selecionados
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS selected_color VARCHAR(100),
ADD COLUMN IF NOT EXISTS selected_size VARCHAR(100);

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_order_items_variants 
ON order_items(selected_color, selected_size);

-- Comentários nas colunas
COMMENT ON COLUMN order_items.selected_color IS 'Cor selecionada no momento da compra (snapshot)';
COMMENT ON COLUMN order_items.selected_size IS 'Tamanho selecionado no momento da compra (snapshot)'; 