import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db/index.js';

/**
 * Banners API - Dynamic banners from database
 * Supports position filtering and active/time-based filtering
 */
export const GET: RequestHandler = async ({ platform, url }) => {
  console.log('[SERVER] [INFO][api_banners] Banners API iniciada');

  try {
    const db = getDatabase(platform);
    const position = url.searchParams.get('position') || 'home';
    
    // Query banners with proper filtering
    const bannersResult = await db.query`
      SELECT 
        id,
        title,
        subtitle,
        image_url,
        link_url,
        position,
        display_order
      FROM banners
      WHERE 
        is_active = true
        AND position = ${position}
        AND (starts_at IS NULL OR starts_at <= NOW())
        AND (ends_at IS NULL OR ends_at >= NOW())
      ORDER BY display_order ASC, created_at ASC
    `;

    const banners = bannersResult.map((banner: any) => ({
      id: banner.id,
      title: banner.title,
      subtitle: banner.subtitle || '',
      image: banner.image_url,
      link: banner.link_url || '#',
      position: banner.position,
      order: banner.display_order || 0
    }));

    console.log(`[SERVER] [INFO][api_banners] ✅ ${banners.length} banners carregados para posição: ${position}`);

    return json({
      success: true,
      data: banners
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300', // 5 minutes cache
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('[SERVER] [ERROR][api_banners] Erro ao buscar banners:', error);
    
    return json({
      success: false,
      data: [],
      error: {
        code: 'BANNERS_FETCH_ERROR',
        message: 'Erro ao carregar banners',
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