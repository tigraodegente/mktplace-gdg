-- ===================================================================
-- DADOS DE EXEMPLO: BANNERS INTELIGENTES COM COUNTDOWN
-- Execute este SQL no seu banco para testar o sistema completo
-- ===================================================================

-- 1. Aplicar migração (caso ainda não tenha sido aplicada)
ALTER TABLE banners ADD COLUMN IF NOT EXISTS countdown_text VARCHAR(255);
ALTER TABLE banners ADD COLUMN IF NOT EXISTS countdown_end_time TIMESTAMP;
ALTER TABLE banners ADD COLUMN IF NOT EXISTS display_duration_minutes INTEGER DEFAULT 60;
ALTER TABLE banners ADD COLUMN IF NOT EXISTS auto_rotate BOOLEAN DEFAULT true;
ALTER TABLE banners ADD COLUMN IF NOT EXISTS clicks INTEGER DEFAULT 0;

-- 2. Limpar banners existentes (opcional)
-- DELETE FROM banners WHERE position = 'home';

-- 3. BANNER 1: FLASH SALE - 1 HORA
INSERT INTO banners (
  title, 
  subtitle, 
  image_url, 
  link_url, 
  position,
  display_order,
  countdown_text, 
  countdown_end_time, 
  display_duration_minutes,
  auto_rotate, 
  is_active
) VALUES (
  '🔥 MEGA FLASH SALE! 70% OFF',
  'Últimas peças com desconto imperdível',
  'https://gdg-images.s3.sa-east-1.amazonaws.com/banner/banner-principal-1.jpg',
  '/promocoes/flash-sale',
  'home',
  1,
  '⚡ OFERTA RELÂMPAGO termina em:',
  NOW() + INTERVAL '1 hour',  -- Termina em 1 hora
  60,  -- Exibe por 60 minutos
  true,
  true
);

-- 4. BANNER 2: FRETE GRÁTIS - 24 HORAS  
INSERT INTO banners (
  title, 
  subtitle, 
  image_url, 
  link_url, 
  position,
  display_order,
  countdown_text, 
  countdown_end_time, 
  display_duration_minutes,
  auto_rotate, 
  is_active
) VALUES (
  '🚚 FRETE GRÁTIS BRASIL TODO!',
  'Para compras acima de R$ 99 - Aproveite!',
  'https://gdg-images.s3.sa-east-1.amazonaws.com/banner/banner-principal-2.jpg',
  '/frete-gratis',
  'home',
  2,
  '🚚 Promoção de frete termina em:',
  NOW() + INTERVAL '24 hours',  -- Termina em 24 horas
  1440,  -- Exibe por 24 horas (1440 minutos)
  true,
  true
);

-- 5. BANNER 3: NOVIDADES - SEM COUNTDOWN
INSERT INTO banners (
  title, 
  subtitle, 
  image_url, 
  link_url, 
  position,
  display_order,
  display_duration_minutes,
  auto_rotate, 
  is_active
) VALUES (
  '🎉 NOVIDADES CHEGANDO!',
  'Acompanhe nossos lançamentos exclusivos',
  'https://gdg-images.s3.sa-east-1.amazonaws.com/banner/banner-principal-3.jpg',
  '/novidades',
  'home',
  3,
  180,  -- Exibe por 3 horas (180 minutos)
  true,
  true
);

-- 6. BANNER 4: BLACK FRIDAY - 7 DIAS
INSERT INTO banners (
  title, 
  subtitle, 
  image_url, 
  link_url, 
  position,
  display_order,
  countdown_text, 
  countdown_end_time, 
  display_duration_minutes,
  auto_rotate, 
  is_active
) VALUES (
  '🖤 BLACK FRIDAY CHEGOU!',
  'Até 80% OFF em milhares de produtos',
  'https://gdg-images.s3.sa-east-1.amazonaws.com/banner/banner-principal-1.jpg',
  '/black-friday',
  'home',
  4,
  '🖤 BLACK FRIDAY termina em:',
  NOW() + INTERVAL '7 days',  -- Termina em 7 dias
  480,  -- Exibe por 8 horas (480 minutos)
  true,
  true
);

-- 7. BANNER DE DELIVERY (para testar position diferente)
INSERT INTO banners (
  title, 
  subtitle, 
  image_url, 
  link_url, 
  position,
  display_order,
  display_duration_minutes,
  auto_rotate, 
  is_active
) VALUES (
  '⚡ ENTREGA EM 24H!',
  'Produtos selecionados com entrega expressa',
  'https://gdg-images.s3.sa-east-1.amazonaws.com/banner/entrega-rapida-1.jpg',
  '/entrega-rapida',
  'delivery',
  1,
  120,  -- Exibe por 2 horas
  true,
  true
);

-- 8. Verificar os dados inseridos
SELECT 
  id,
  title,
  countdown_text,
  countdown_end_time,
  display_duration_minutes,
  auto_rotate,
  position,
  is_active,
  CASE 
    WHEN countdown_end_time IS NOT NULL AND countdown_end_time > NOW() THEN 'COUNTDOWN ATIVO'
    WHEN countdown_end_time IS NOT NULL AND countdown_end_time <= NOW() THEN 'COUNTDOWN EXPIRADO'
    ELSE 'SEM COUNTDOWN'
  END as status_countdown
FROM banners 
WHERE position = 'home'
ORDER BY display_order;

-- ===================================================================
-- COMANDOS ÚTEIS PARA TESTAR:
-- ===================================================================

-- Ver todos os banners com status:
-- SELECT title, countdown_text, countdown_end_time, 
--        display_duration_minutes, clicks, is_active 
-- FROM banners WHERE position = 'home';

-- Simular cliques:
-- UPDATE banners SET clicks = clicks + 1 WHERE title LIKE '%FLASH SALE%';

-- Alterar tempo de countdown:
-- UPDATE banners SET countdown_end_time = NOW() + INTERVAL '30 minutes' 
-- WHERE title LIKE '%FLASH SALE%';

-- Desativar banner:
-- UPDATE banners SET is_active = false WHERE title LIKE '%NOVIDADES%';

-- =================================================================== 