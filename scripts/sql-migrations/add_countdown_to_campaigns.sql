-- Migration: Adicionar campos de countdown às campanhas de marketing
-- Permite campanhas do tipo 'countdown' com data de término e texto personalizável

BEGIN;

-- Adicionar novos campos para countdown
ALTER TABLE marketing_campaigns 
ADD COLUMN IF NOT EXISTS countdown_end_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS countdown_text VARCHAR(500),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Atualizar constraint de tipo para incluir 'countdown'
ALTER TABLE marketing_campaigns 
DROP CONSTRAINT IF EXISTS marketing_campaigns_type_check;

ALTER TABLE marketing_campaigns 
ADD CONSTRAINT marketing_campaigns_type_check 
CHECK (type IN ('email', 'sms', 'push', 'banner', 'popup', 'social', 'countdown'));

-- Criar índice para busca eficiente de countdowns ativos
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_countdown 
ON marketing_campaigns(type, is_active, countdown_end_time) 
WHERE type = 'countdown';

-- Inserir dados de exemplo para countdown
INSERT INTO marketing_campaigns (
    name, 
    description, 
    type, 
    status, 
    content, 
    countdown_end_time, 
    countdown_text,
    is_active,
    start_date,
    priority
) VALUES (
    'Mega Promoção Janeiro',
    'Countdown para mega promoção de janeiro',
    'countdown',
    'running',
    'Ofertas especiais com até 70% de desconto em produtos selecionados',
    NOW() + INTERVAL '48 hours',  -- 48 horas a partir de agora
    '⚡ Mega promoção termina em:',
    true,
    NOW(),
    1
)
ON CONFLICT DO NOTHING;

COMMIT;

-- Verificar se a migration foi bem-sucedida
SELECT 
    'Migration executada com sucesso!' as status,
    COUNT(*) as campanhas_countdown
FROM marketing_campaigns 
WHERE type = 'countdown' AND is_active = true; 