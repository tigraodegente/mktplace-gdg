-- Migração para sistema de Page Builder Avançado
-- Adicionando funcionalidades de templates, blocos de conteúdo, SEO e temas

-- 1. Adicionar novas colunas para o sistema avançado
ALTER TABLE pages ADD COLUMN IF NOT EXISTS template VARCHAR(50) DEFAULT 'default';
ALTER TABLE pages ADD COLUMN IF NOT EXISTS content_blocks JSONB DEFAULT '[]'::jsonb;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS theme_settings JSONB DEFAULT '{}'::jsonb;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS seo_settings JSONB DEFAULT '{}'::jsonb;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS page_settings JSONB DEFAULT '{}'::jsonb;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS featured_image_id VARCHAR(255);
ALTER TABLE pages ADD COLUMN IF NOT EXISTS hero_image_id VARCHAR(255);
ALTER TABLE pages ADD COLUMN IF NOT EXISTS gallery_images JSONB DEFAULT '[]'::jsonb;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS custom_css TEXT;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS custom_js TEXT;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS reading_time INTEGER; -- em minutos
ALTER TABLE pages ADD COLUMN IF NOT EXISTS author_id VARCHAR(255);
ALTER TABLE pages ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS category_id VARCHAR(255);

-- 2. Comentários para documentar a estrutura
COMMENT ON COLUMN pages.template IS 'Template usado: default, landing, institutional, blog_post, product_showcase, contact';
COMMENT ON COLUMN pages.content_blocks IS 'Array de blocos de conteúdo no formato: [{type, content, styling, order}]';
COMMENT ON COLUMN pages.theme_settings IS 'Configurações de tema: {colors, typography, spacing, effects}';
COMMENT ON COLUMN pages.seo_settings IS 'Configurações SEO: {canonical, robots, schema, openGraph}';
COMMENT ON COLUMN pages.page_settings IS 'Configurações da página: {header, footer, sidebar, animations}';
COMMENT ON COLUMN pages.gallery_images IS 'Array de IDs de imagens para galerias';
COMMENT ON COLUMN pages.tags IS 'Array de tags para categorização e busca';

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_pages_template ON pages(template);
CREATE INDEX IF NOT EXISTS idx_pages_is_published ON pages(is_published);
CREATE INDEX IF NOT EXISTS idx_pages_view_count ON pages(view_count);
CREATE INDEX IF NOT EXISTS idx_pages_author_id ON pages(author_id);
CREATE INDEX IF NOT EXISTS idx_pages_category_id ON pages(category_id);
CREATE INDEX IF NOT EXISTS idx_pages_tags ON pages USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_pages_content_blocks ON pages USING GIN(content_blocks);

-- 4. Função para busca full-text
CREATE INDEX IF NOT EXISTS idx_pages_search ON pages USING GIN(
  to_tsvector('portuguese', 
    COALESCE(title, '') || ' ' || 
    COALESCE(content, '') || ' ' || 
    COALESCE(meta_description, '')
  )
);

-- 5. Tabela para assets/mídia
CREATE TABLE IF NOT EXISTS page_assets (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  alt_text TEXT,
  caption TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  url VARCHAR(500) NOT NULL,
  thumbnail_url VARCHAR(500),
  width INTEGER,
  height INTEGER,
  is_optimized BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_page_assets_type ON page_assets(file_type);
CREATE INDEX IF NOT EXISTS idx_page_assets_tags ON page_assets USING GIN(tags);

-- 6. Tabela para templates customizados
CREATE TABLE IF NOT EXISTS page_templates (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  preview_image VARCHAR(500),
  template_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  default_blocks JSONB DEFAULT '[]'::jsonb,
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir templates padrão
INSERT INTO page_templates (name, display_name, description, template_data, default_blocks, is_system) 
VALUES 
  ('default', 'Página Padrão', 'Template básico para páginas institucionais', 
   '{"layout": "single-column", "header": true, "footer": true, "sidebar": false}',
   '[{"type": "text", "content": {"html": "<p>Conteúdo da página...</p>"}, "styling": {}, "order": 1}]',
   true),
   
  ('landing', 'Landing Page', 'Template para páginas de conversão e campanhas',
   '{"layout": "full-width", "header": false, "footer": false, "sidebar": false}',
   '[
     {"type": "hero", "content": {"title": "Título Principal", "subtitle": "Subtítulo", "ctaText": "Call to Action", "ctaLink": "#"}, "styling": {}, "order": 1},
     {"type": "features", "content": {"items": []}, "styling": {}, "order": 2}
   ]',
   true),
   
  ('blog_post', 'Post de Blog', 'Template para artigos e posts de blog',
   '{"layout": "article", "header": true, "footer": true, "sidebar": true}',
   '[
     {"type": "article-header", "content": {"showDate": true, "showAuthor": true, "showReadingTime": true}, "styling": {}, "order": 1},
     {"type": "text", "content": {"html": ""}, "styling": {}, "order": 2}
   ]',
   true),
   
  ('contact', 'Página de Contato', 'Template com formulários e informações de contato',
   '{"layout": "two-column", "header": true, "footer": true, "sidebar": false}',
   '[
     {"type": "contact-form", "content": {"fields": ["name", "email", "message"]}, "styling": {}, "order": 1},
     {"type": "contact-info", "content": {"phone": "", "email": "", "address": ""}, "styling": {}, "order": 2}
   ]',
   true)
ON CONFLICT (name) DO NOTHING;

-- 7. Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger na tabela pages
DROP TRIGGER IF EXISTS update_pages_updated_at ON pages;
CREATE TRIGGER update_pages_updated_at
    BEFORE UPDATE ON pages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Aplicar trigger na tabela page_assets
DROP TRIGGER IF EXISTS update_page_assets_updated_at ON page_assets;
CREATE TRIGGER update_page_assets_updated_at
    BEFORE UPDATE ON page_assets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Aplicar trigger na tabela page_templates
DROP TRIGGER IF EXISTS update_page_templates_updated_at ON page_templates;
CREATE TRIGGER update_page_templates_updated_at
    BEFORE UPDATE ON page_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 