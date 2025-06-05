-- CRIAR TABELAS FAQ - GRÃO DE GENTE MARKETPLACE
-- Execute este script primeiro para criar as tabelas necessárias

-- 1. EXTENSÕES NECESSÁRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CATEGORIAS DE SUPORTE
CREATE TABLE IF NOT EXISTS support_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50) DEFAULT 'help-circle',
  color VARCHAR(7) DEFAULT '#6366f1',
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. CATEGORIAS FAQ  
CREATE TABLE IF NOT EXISTS faq_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50) DEFAULT 'question-mark-circle',
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. ITENS FAQ
CREATE TABLE IF NOT EXISTS faq_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES faq_categories(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. FEEDBACK FAQ
CREATE TABLE IF NOT EXISTS faq_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  faq_item_id UUID NOT NULL REFERENCES faq_items(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id VARCHAR(255),
  is_helpful BOOLEAN,
  feedback_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_faq_categories_active ON faq_categories(is_active, order_index);
CREATE INDEX IF NOT EXISTS idx_faq_items_category ON faq_items(category_id, is_active);
CREATE INDEX IF NOT EXISTS idx_faq_items_active ON faq_items(is_active, order_index);
CREATE INDEX IF NOT EXISTS idx_faq_feedback_item ON faq_feedback(faq_item_id);
CREATE INDEX IF NOT EXISTS idx_faq_feedback_session ON faq_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_support_categories_active ON support_categories(is_active, order_index);

COMMIT; 