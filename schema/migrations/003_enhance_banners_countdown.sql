-- Migração: Adicionar campos de countdown individual aos banners
-- Data: 2024-01-15
-- Autor: Sistema

-- Adicionar campos de countdown aos banners
ALTER TABLE banners ADD COLUMN IF NOT EXISTS countdown_text VARCHAR(255);
ALTER TABLE banners ADD COLUMN IF NOT EXISTS countdown_end_time TIMESTAMP;
ALTER TABLE banners ADD COLUMN IF NOT EXISTS display_duration_minutes INTEGER DEFAULT 60;
ALTER TABLE banners ADD COLUMN IF NOT EXISTS auto_rotate BOOLEAN DEFAULT true;
ALTER TABLE banners ADD COLUMN IF NOT EXISTS clicks INTEGER DEFAULT 0;

-- Adicionar comentários
COMMENT ON COLUMN banners.countdown_text IS 'Texto do countdown para este banner específico';
COMMENT ON COLUMN banners.countdown_end_time IS 'Data/hora de fim do countdown deste banner';
COMMENT ON COLUMN banners.display_duration_minutes IS 'Duração em minutos que o banner deve aparecer';
COMMENT ON COLUMN banners.auto_rotate IS 'Se deve rotacionar automaticamente para próximo banner';
COMMENT ON COLUMN banners.clicks IS 'Número de cliques neste banner';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_banners_countdown_end_time ON banners(countdown_end_time);
CREATE INDEX IF NOT EXISTS idx_banners_auto_rotate ON banners(auto_rotate);
CREATE INDEX IF NOT EXISTS idx_banners_display_duration ON banners(display_duration_minutes);

-- Trigger para atualizar clicks
CREATE OR REPLACE FUNCTION update_banner_clicks()
RETURNS TRIGGER AS $$
BEGIN
    -- Função será implementada quando necessário
    RETURN NEW;
END;
$$ LANGUAGE plpgsql; 