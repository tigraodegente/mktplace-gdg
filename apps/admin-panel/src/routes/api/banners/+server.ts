import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

const LOG_PREFIX = '[api_admin_banners]';

// GET - Listar banners
export const GET: RequestHandler = async ({ platform, url }) => {
  console.log(`[SERVER] [INFO]${LOG_PREFIX} Listando banners`);

  try {
    const db = getDatabase(platform);
    
    // Parâmetros de busca e filtros
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const search = url.searchParams.get('search') || '';
    const position = url.searchParams.get('position') || '';
    const status = url.searchParams.get('status') || '';
    const countdownStatus = url.searchParams.get('countdown_status') || '';
    const autoRotate = url.searchParams.get('auto_rotate') || '';
    
    const offset = (page - 1) * limit;

    // Construir WHERE dinamicamente
    let whereConditions = ['1=1'];
    let params: any[] = [];
    let paramIndex = 1;

    // Busca por texto
    if (search) {
      whereConditions.push(`(title ILIKE $${paramIndex} OR subtitle ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Filtro por posição
    if (position) {
      whereConditions.push(`position = $${paramIndex}`);
      params.push(position);
      paramIndex++;
    }

    // Filtro por status
    if (status === 'active') {
      whereConditions.push('is_active = true');
    } else if (status === 'inactive') {
      whereConditions.push('is_active = false');
    }

    // Filtro por countdown
    if (countdownStatus === 'with_countdown') {
      whereConditions.push('countdown_text IS NOT NULL AND countdown_end_time IS NOT NULL');
    } else if (countdownStatus === 'without_countdown') {
      whereConditions.push('(countdown_text IS NULL OR countdown_end_time IS NULL)');
    } else if (countdownStatus === 'active_countdown') {
      whereConditions.push('countdown_text IS NOT NULL AND countdown_end_time IS NOT NULL AND countdown_end_time > NOW()');
    } else if (countdownStatus === 'expired_countdown') {
      whereConditions.push('countdown_text IS NOT NULL AND countdown_end_time IS NOT NULL AND countdown_end_time <= NOW()');
    }

    // Filtro por auto-rotação
    if (autoRotate === 'true') {
      whereConditions.push('auto_rotate = true');
    } else if (autoRotate === 'false') {
      whereConditions.push('auto_rotate = false');
    }

    const whereClause = whereConditions.join(' AND ');

    // Query principal com contagem
    const bannersQuery = `
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
        created_at,
        updated_at
      FROM banners
      WHERE ${whereClause}
      ORDER BY display_order ASC, created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM banners
      WHERE ${whereClause}
    `;

    const [banners, countResult] = await Promise.all([
      db.query(bannersQuery, [...params, limit, offset]),
      db.query(countQuery, params)
    ]);

    const total = parseInt(countResult[0]?.total || '0');
    const totalPages = Math.ceil(total / limit);

    console.log(`[SERVER] [INFO]${LOG_PREFIX} ✅ ${banners.length} banners encontrados (${total} total)`);

    return json({
      success: true,
      data: banners,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error(`[SERVER] [ERROR]${LOG_PREFIX} Erro ao listar banners:`, error);
    
    return json({
      success: false,
      error: {
        code: 'BANNERS_LIST_ERROR',
        message: 'Erro ao listar banners',
        details: error instanceof Error ? error.message : String(error)
      }
    }, { status: 500 });
  }
};

// POST - Criar banner
export const POST: RequestHandler = async ({ platform, request }) => {
  console.log(`[SERVER] [INFO]${LOG_PREFIX} Criando novo banner`);

  try {
    const data = await request.json();
    const db = getDatabase(platform);

    // Validações básicas
    if (!data.title || !data.image_url) {
      return json({
        success: false,
        error: 'Título e imagem são obrigatórios'
      }, { status: 400 });
    }

    // Inserir novo banner
    const result = await db.query`
      INSERT INTO banners (
        title, subtitle, image_url, link_url, position,
        display_order, starts_at, ends_at, is_active,
        countdown_text, countdown_end_time, display_duration_minutes,
        auto_rotate
      ) VALUES (
        ${data.title},
        ${data.subtitle || null},
        ${data.image_url},
        ${data.link_url || null},
        ${data.position || 'home'},
        ${parseInt(data.display_order) || 0},
        ${data.starts_at ? new Date(data.starts_at) : null},
        ${data.ends_at ? new Date(data.ends_at) : null},
        ${data.is_active !== false},
        ${data.countdown_text || null},
        ${data.countdown_end_time ? new Date(data.countdown_end_time) : null},
        ${parseInt(data.display_duration_minutes) || 60},
        ${data.auto_rotate !== false}
      )
      RETURNING *
    `;

    const banner = result[0];

    console.log(`[SERVER] [INFO]${LOG_PREFIX} ✅ Banner criado: ${banner.id}`);

    return json({
      success: true,
      data: banner,
      message: 'Banner criado com sucesso'
    });

  } catch (error) {
    console.error(`[SERVER] [ERROR]${LOG_PREFIX} Erro ao criar banner:`, error);
    
    return json({
      success: false,
      error: {
        code: 'BANNER_CREATE_ERROR',
        message: 'Erro ao criar banner',
        details: error instanceof Error ? error.message : String(error)
      }
    }, { status: 500 });
  }
};

// PUT - Atualizar banner
export const PUT: RequestHandler = async ({ platform, request, url }) => {
  const bannerId = url.searchParams.get('id');
  console.log(`[SERVER] [INFO]${LOG_PREFIX} Atualizando banner: ${bannerId}`);

  try {
    if (!bannerId) {
      return json({
        success: false,
        error: 'ID do banner é obrigatório'
      }, { status: 400 });
    }

    const data = await request.json();
    const db = getDatabase(platform);

    // Verificar se banner existe
    const existing = await db.query`
      SELECT id FROM banners WHERE id = ${bannerId}
    `;

    if (existing.length === 0) {
      return json({
        success: false,
        error: 'Banner não encontrado'
      }, { status: 404 });
    }

    // Atualizar banner
    const result = await db.query`
      UPDATE banners SET
        title = ${data.title},
        subtitle = ${data.subtitle || null},
        image_url = ${data.image_url},
        link_url = ${data.link_url || null},
        position = ${data.position || 'home'},
        display_order = ${parseInt(data.display_order) || 0},
        starts_at = ${data.starts_at ? new Date(data.starts_at) : null},
        ends_at = ${data.ends_at ? new Date(data.ends_at) : null},
        is_active = ${data.is_active !== false},
        countdown_text = ${data.countdown_text || null},
        countdown_end_time = ${data.countdown_end_time ? new Date(data.countdown_end_time) : null},
        display_duration_minutes = ${parseInt(data.display_duration_minutes) || 60},
        auto_rotate = ${data.auto_rotate !== false},
        updated_at = NOW()
      WHERE id = ${bannerId}
      RETURNING *
    `;

    const banner = result[0];

    console.log(`[SERVER] [INFO]${LOG_PREFIX} ✅ Banner atualizado: ${bannerId}`);

    return json({
      success: true,
      data: banner,
      message: 'Banner atualizado com sucesso'
    });

  } catch (error) {
    console.error(`[SERVER] [ERROR]${LOG_PREFIX} Erro ao atualizar banner:`, error);
    
    return json({
      success: false,
      error: {
        code: 'BANNER_UPDATE_ERROR',
        message: 'Erro ao atualizar banner',
        details: error instanceof Error ? error.message : String(error)
      }
    }, { status: 500 });
  }
};

// DELETE - Excluir banner
export const DELETE: RequestHandler = async ({ platform, url }) => {
  const bannerId = url.searchParams.get('id');
  console.log(`[SERVER] [INFO]${LOG_PREFIX} Excluindo banner: ${bannerId}`);

  try {
    if (!bannerId) {
      return json({
        success: false,
        error: 'ID do banner é obrigatório'
      }, { status: 400 });
    }

    const db = getDatabase(platform);

    // Verificar se banner existe
    const existing = await db.query`
      SELECT id, title FROM banners WHERE id = ${bannerId}
    `;

    if (existing.length === 0) {
      return json({
        success: false,
        error: 'Banner não encontrado'
      }, { status: 404 });
    }

    // Excluir banner
    await db.query`
      DELETE FROM banners WHERE id = ${bannerId}
    `;

    console.log(`[SERVER] [INFO]${LOG_PREFIX} ✅ Banner excluído: ${bannerId}`);

    return json({
      success: true,
      message: `Banner "${existing[0].title}" excluído com sucesso`
    });

  } catch (error) {
    console.error(`[SERVER] [ERROR]${LOG_PREFIX} Erro ao excluir banner:`, error);
    
    return json({
      success: false,
      error: {
        code: 'BANNER_DELETE_ERROR',
        message: 'Erro ao excluir banner',
        details: error instanceof Error ? error.message : String(error)
      }
    }, { status: 500 });
  }
}; 