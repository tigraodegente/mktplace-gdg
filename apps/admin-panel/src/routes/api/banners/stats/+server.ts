import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

const LOG_PREFIX = '[api_admin_banners_stats]';

export const GET: RequestHandler = async ({ platform }) => {
  console.log(`[SERVER] [INFO]${LOG_PREFIX} Carregando estatísticas de banners`);

  try {
    const db = getDatabase(platform);

    // Query complexa para obter todas as estatísticas
    const statsQuery = `
      WITH banner_stats AS (
        SELECT 
          COUNT(*) as total_banners,
          COUNT(*) FILTER (WHERE is_active = true) as active_banners,
          COUNT(*) FILTER (WHERE is_active = false) as inactive_banners,
          COUNT(*) FILTER (WHERE 
            countdown_text IS NOT NULL 
            AND countdown_end_time IS NOT NULL 
            AND countdown_end_time > NOW()
          ) as active_countdown_banners,
          COUNT(*) FILTER (WHERE 
            countdown_text IS NOT NULL 
            AND countdown_end_time IS NOT NULL 
            AND countdown_end_time <= NOW()
          ) as expired_countdown_banners,
          COUNT(*) FILTER (WHERE 
            (countdown_text IS NULL OR countdown_end_time IS NULL)
          ) as no_countdown_banners,
          COUNT(*) FILTER (WHERE auto_rotate = true) as auto_rotating_banners,
          COUNT(*) FILTER (WHERE auto_rotate = false) as fixed_banners,
          SUM(COALESCE(clicks, 0)) as total_clicks,
          AVG(COALESCE(clicks, 0)) as avg_clicks_per_banner,
          MAX(COALESCE(clicks, 0)) as max_clicks,
          COUNT(*) FILTER (WHERE ends_at IS NOT NULL AND ends_at < NOW()) as expiring_banners
        FROM banners
      ),
      position_stats AS (
        SELECT 
          position,
          COUNT(*) as count,
          SUM(COALESCE(clicks, 0)) as clicks
        FROM banners 
        WHERE is_active = true
        GROUP BY position
      ),
      recent_activity AS (
        SELECT 
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as created_last_week,
          COUNT(*) FILTER (WHERE updated_at > NOW() - INTERVAL '7 days') as updated_last_week,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as created_last_month
        FROM banners
      )
      SELECT 
        bs.*,
        ra.created_last_week,
        ra.updated_last_week,
        ra.created_last_month,
        (
          SELECT json_agg(
            json_build_object(
              'position', position,
              'count', count,
              'clicks', clicks
            )
          )
          FROM position_stats
        ) as position_breakdown
      FROM banner_stats bs, recent_activity ra
    `;

    const result = await db.query(statsQuery);
    const stats = result[0];

    // Calcular totais para métricas
    const totalBanners = parseInt(stats.total_banners) || 0;
    const activeBanners = parseInt(stats.active_banners) || 0;
    const totalClicks = parseInt(stats.total_clicks) || 0;
    const totalWithCountdown = (parseInt(stats.active_countdown_banners) || 0) + (parseInt(stats.expired_countdown_banners) || 0);
    const autoRotatingBanners = parseInt(stats.auto_rotating_banners) || 0;

    // Preparar dados no formato esperado pelo frontend
    const formattedStats = {
      // Estatísticas principais
      total_banners: totalBanners,
      active_banners: activeBanners,
      inactive_banners: parseInt(stats.inactive_banners) || 0,
      expiring_banners: parseInt(stats.expiring_banners) || 0,

      // Estatísticas de countdown
      countdown_stats: {
        active: parseInt(stats.active_countdown_banners) || 0,
        expired: parseInt(stats.expired_countdown_banners) || 0,
        none: parseInt(stats.no_countdown_banners) || 0,
        total_with_countdown: totalWithCountdown
      },

      // Estatísticas de rotação
      rotation_stats: {
        auto_rotating: autoRotatingBanners,
        fixed: parseInt(stats.fixed_banners) || 0
      },

      // Estatísticas de cliques
      click_stats: {
        total_clicks: totalClicks,
        avg_clicks_per_banner: parseFloat(stats.avg_clicks_per_banner) || 0,
        max_clicks: parseInt(stats.max_clicks) || 0
      },

      // Atividade recente
      recent_activity: {
        created_last_week: parseInt(stats.created_last_week) || 0,
        updated_last_week: parseInt(stats.updated_last_week) || 0,
        created_last_month: parseInt(stats.created_last_month) || 0
      },

      // Breakdown por posição
      position_breakdown: stats.position_breakdown || [],

      // Métricas de performance
      performance_metrics: {
        click_rate: activeBanners > 0 ? (totalClicks / activeBanners) : 0,
        countdown_adoption: totalBanners > 0 ? (totalWithCountdown / totalBanners * 100) : 0,
        rotation_adoption: totalBanners > 0 ? (autoRotatingBanners / totalBanners * 100) : 0,
        active_rate: totalBanners > 0 ? (activeBanners / totalBanners * 100) : 0
      }
    };

    console.log(`[SERVER] [INFO]${LOG_PREFIX} ✅ Estatísticas carregadas: ${formattedStats.total_banners} banners`);

    return json({
      success: true,
      data: formattedStats,
      meta: {
        generated_at: new Date().toISOString(),
        cache_duration: '5 minutes'
      }
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300', // 5 minutos
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error(`[SERVER] [ERROR]${LOG_PREFIX} Erro ao carregar estatísticas:`, error);
    
    return json({
      success: false,
      error: {
        code: 'BANNER_STATS_ERROR',
        message: 'Erro ao carregar estatísticas de banners',
        details: error instanceof Error ? error.message : String(error)
      }
    }, { status: 500 });
  }
}; 