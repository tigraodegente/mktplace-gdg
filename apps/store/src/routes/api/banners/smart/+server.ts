import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db/index.js';

const LOG_PREFIX = '[api_banners_smart]';

export const GET: RequestHandler = async ({ platform, url }) => {
  console.log(`[SERVER] [INFO]${LOG_PREFIX} Smart Banners API iniciada`);

  try {
    const db = getDatabase(platform);
    const position = url.searchParams.get('position') || 'home';
    
    // Query para buscar banners com informações de countdown
    const bannersResult = await db.query`
      SELECT 
        id,
        title,
        subtitle,
        image_url,
        link_url,
        position,
        display_order,
        starts_at,
        ends_at,
        is_active,
        countdown_text,
        countdown_end_time,
        display_duration_minutes,
        auto_rotate,
        clicks,
        created_at
      FROM banners
      WHERE 
        is_active = true
        AND position = ${position}
        AND (starts_at IS NULL OR starts_at <= NOW())
        AND (ends_at IS NULL OR ends_at >= NOW())
      ORDER BY display_order ASC, created_at ASC
    `;

    const smartBanners = bannersResult.map((banner: any) => {
      const now = new Date();
      const hasCountdown = banner.countdown_end_time && banner.countdown_text;
      const countdownValid = hasCountdown && new Date(banner.countdown_end_time) > now;

      return {
        id: banner.id,
        title: banner.title,
        subtitle: banner.subtitle || '',
        image: banner.image_url,
        link: banner.link_url || '#',
        position: banner.position,
        order: banner.display_order || 0,
        
        // Campos específicos do smart banner
        countdownText: banner.countdown_text,
        countdownEndTime: banner.countdown_end_time?.toISOString(),
        displayDurationMinutes: banner.display_duration_minutes || 60,
        autoRotate: banner.auto_rotate !== false, // Default true
        clicks: banner.clicks || 0,
        
        // Estados calculados
        isActive: banner.is_active,
        hasActiveCountdown: countdownValid,
        
        // Metadados para debugging
        meta: {
          startsAt: banner.starts_at?.toISOString(),
          endsAt: banner.ends_at?.toISOString(),
          createdAt: banner.created_at?.toISOString()
        }
      };
    });

    // Calcular próximas rotações se necessário
    const activeRotatingBanners = smartBanners.filter((b: any) => b.autoRotate && b.isActive);
    if (activeRotatingBanners.length > 0) {
      // Adicionar informações de sequência
      activeRotatingBanners.forEach((banner: any, index: number) => {
        banner.rotationIndex = index;
        banner.totalInRotation = activeRotatingBanners.length;
      });
    }

    console.log(`[SERVER] [INFO]${LOG_PREFIX} ✅ ${smartBanners.length} smart banners carregados para posição: ${position}`);

    return json({
      success: true,
      data: smartBanners,
      meta: {
        position,
        totalBanners: smartBanners.length,
        activeBanners: smartBanners.filter((b: any) => b.isActive).length,
        bannersWithCountdown: smartBanners.filter((b: any) => b.hasActiveCountdown).length,
        autoRotatingBanners: smartBanners.filter((b: any) => b.autoRotate).length
      }
    }, {
      headers: {
        'Cache-Control': 'public, max-age=60', // Cache menor para smart banners (1 min)
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error(`[SERVER] [ERROR]${LOG_PREFIX} Erro ao buscar smart banners:`, error);
    
    return json({
      success: false,
      data: [],
      error: {
        code: 'SMART_BANNERS_FETCH_ERROR',
        message: 'Erro ao carregar banners inteligentes',
        details: error instanceof Error ? error.message : String(error)
      }
    }, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};

// POST para tracking de cliques
export const POST: RequestHandler = async ({ platform, request }) => {
  console.log(`[SERVER] [INFO]${LOG_PREFIX} Track click requisitado`);

  try {
    const { bannerId } = await request.json();
    
    if (!bannerId) {
      return json({
        success: false,
        error: 'bannerId é obrigatório'
      }, { status: 400 });
    }

    const db = getDatabase(platform);
    
    // Incrementar contador de cliques
    await db.query`
      UPDATE banners 
      SET clicks = COALESCE(clicks, 0) + 1
      WHERE id = ${bannerId}
    `;

    console.log(`[SERVER] [INFO]${LOG_PREFIX} ✅ Click registrado para banner: ${bannerId}`);

    return json({
      success: true,
      message: 'Click registrado com sucesso'
    });

  } catch (error) {
    console.error(`[SERVER] [ERROR]${LOG_PREFIX} Erro ao registrar click:`, error);
    
    return json({
      success: false,
      error: {
        code: 'TRACK_CLICK_ERROR',
        message: 'Erro ao registrar click',
        details: error instanceof Error ? error.message : String(error)
      }
    }, { status: 500 });
  }
}; 