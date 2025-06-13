-- Migration: Desabilitar prompts de IA para campos de estoque
-- Date: 2024-12-20
-- Description: quantity e low_stock_alert são campos operacionais que não devem ter sugestões de IA

-- Desabilitar o prompt de estoque que gera sugestões para quantity e low_stock_alert
UPDATE ai_prompts 
SET is_active = false,
    description = 'DESABILITADO: Campos de estoque são operacionais e devem ser definidos pelo lojista'
WHERE name = 'enrich_inventory';

-- Comentário explicativo
COMMENT ON TABLE ai_prompts IS 'Prompts de IA - O prompt enrich_inventory foi desabilitado porque quantity e low_stock_alert são campos operacionais'; 