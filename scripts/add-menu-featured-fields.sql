-- ===============================================
-- Script para adicionar campos de destaque no menu
-- ===============================================

-- Começar transação
BEGIN;

-- Adicionar campos na tabela categories
ALTER TABLE categories 
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS menu_order INTEGER DEFAULT 0;

-- Adicionar campos na tabela pages  
ALTER TABLE pages
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS menu_order INTEGER DEFAULT 0;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_categories_featured ON categories(is_featured, menu_order) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_pages_featured ON pages(is_featured, menu_order) WHERE is_featured = true;

-- Comentários para documentação
COMMENT ON COLUMN categories.is_featured IS 'Indica se a categoria deve aparecer no menu principal';
COMMENT ON COLUMN categories.menu_order IS 'Ordem de exibição no menu (0 = primeiro)';
COMMENT ON COLUMN pages.is_featured IS 'Indica se a página deve aparecer no menu principal';  
COMMENT ON COLUMN pages.menu_order IS 'Ordem de exibição no menu (0 = primeiro)';

-- Dados de exemplo (destacar poucas categorias principais)
UPDATE categories 
SET is_featured = true, menu_order = 1 
WHERE id IN (
  SELECT id FROM categories 
  WHERE parent_id IS NULL AND is_active = true
  ORDER BY name 
  LIMIT 3
);

-- Destacar página do blog se existir
UPDATE pages 
SET is_featured = true, menu_order = 10 
WHERE id IN (
  SELECT id FROM pages 
  WHERE slug = 'blog' OR title ILIKE '%blog%'
  ORDER BY created_at DESC
  LIMIT 1
);

-- Commit da transação
COMMIT;

-- Verificar resultado
SELECT 'categories' as table_name, COUNT(*) as featured_count 
FROM categories WHERE is_featured = true
UNION ALL
SELECT 'pages' as table_name, COUNT(*) as featured_count 
FROM pages WHERE is_featured = true; 