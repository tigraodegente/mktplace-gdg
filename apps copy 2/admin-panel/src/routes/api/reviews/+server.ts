import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

// GET - Listar avaliações
export const GET: RequestHandler = async ({ url, platform }) => {
  try {
    const db = getDatabase(platform);
    
    // Parâmetros
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 20));
    const search = url.searchParams.get('search') || '';
    const rating = url.searchParams.get('rating') || 'all';
    const status = url.searchParams.get('status') || 'all';
    
    // Construir query
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    if (search) {
      conditions.push(`(p.name ILIKE $${paramIndex} OR u.name ILIKE $${paramIndex} OR r.comment ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    if (rating !== 'all') {
      conditions.push(`r.rating = $${paramIndex}`);
      params.push(parseInt(rating));
      paramIndex++;
    }
    
    if (status !== 'all') {
      conditions.push(`r.is_active = $${paramIndex}`);
      params.push(status === 'active');
      paramIndex++;
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;
    
    // Query principal
    const query = `
      SELECT 
        r.id, r.rating, r.comment, r.is_active, r.created_at, r.updated_at,
        p.id as product_id, p.name as product_name, p.slug as product_slug,
        u.id as user_id, u.name as user_name, u.email as user_email,
        o.id as order_id,
        COUNT(*) OVER() as total_count
      FROM reviews r
      INNER JOIN products p ON p.id = r.product_id
      INNER JOIN users u ON u.id = r.user_id
      LEFT JOIN order_items oi ON oi.product_id = r.product_id AND oi.order_id IN (
        SELECT id FROM orders WHERE user_id = r.user_id
      )
      LEFT JOIN orders o ON o.id = oi.order_id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(limit, offset);
    
    const reviews = await db.query(query, ...params);
    const totalCount = reviews[0]?.total_count || 0;
    
    // Buscar estatísticas
    const [stats] = await db.query`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_active = true) as active,
        COUNT(*) FILTER (WHERE is_active = false) as inactive,
        AVG(rating) as average_rating,
        COUNT(*) FILTER (WHERE rating = 5) as five_stars,
        COUNT(*) FILTER (WHERE rating = 4) as four_stars,
        COUNT(*) FILTER (WHERE rating = 3) as three_stars,
        COUNT(*) FILTER (WHERE rating = 2) as two_stars,
        COUNT(*) FILTER (WHERE rating = 1) as one_star
      FROM reviews
    `;
    
    await db.close();
    
    return json({
      success: true,
      data: {
        reviews: reviews.map((r: any) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          isActive: r.is_active,
          product: {
            id: r.product_id,
            name: r.product_name,
            slug: r.product_slug
          },
          user: {
            id: r.user_id,
            name: r.user_name,
            email: r.user_email
          },
          orderId: r.order_id,
          createdAt: r.created_at,
          updatedAt: r.updated_at
        })),
        pagination: {
          page,
          limit,
          total: parseInt(totalCount),
          totalPages: Math.ceil(totalCount / limit)
        },
        stats: {
          total: stats.total || 0,
          active: stats.active || 0,
          inactive: stats.inactive || 0,
          averageRating: Number(stats.average_rating || 0).toFixed(1),
          distribution: {
            5: stats.five_stars || 0,
            4: stats.four_stars || 0,
            3: stats.three_stars || 0,
            2: stats.two_stars || 0,
            1: stats.one_star || 0
          }
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return json({
      success: false,
      error: 'Erro ao buscar avaliações'
    }, { status: 500 });
  }
};

// PUT - Moderar avaliação (ativar/desativar)
export const PUT: RequestHandler = async ({ request, platform }) => {
  try {
    const db = getDatabase(platform);
    const data = await request.json();
    
    if (!data.id) {
      return json({
        success: false,
        error: 'ID da avaliação é obrigatório'
      }, { status: 400 });
    }
    
    // Atualizar status
    await db.query`
      UPDATE reviews SET
        is_active = ${data.isActive},
        updated_at = NOW()
      WHERE id = ${data.id}
    `;
    
    await db.close();
    
    return json({
      success: true,
      data: {
        message: `Avaliação ${data.isActive ? 'aprovada' : 'rejeitada'} com sucesso`
      }
    });
    
  } catch (error) {
    console.error('Error updating review:', error);
    return json({
      success: false,
      error: 'Erro ao moderar avaliação'
    }, { status: 500 });
  }
};

// DELETE - Excluir avaliação
export const DELETE: RequestHandler = async ({ request, platform }) => {
  try {
    const db = getDatabase(platform);
    const { id } = await request.json();
    
    if (!id) {
      return json({
        success: false,
        error: 'ID da avaliação é obrigatório'
      }, { status: 400 });
    }
    
    // Excluir avaliação
    await db.query`DELETE FROM reviews WHERE id = ${id}`;
    
    await db.close();
    
    return json({
      success: true,
      data: {
        message: 'Avaliação excluída com sucesso'
      }
    });
    
  } catch (error) {
    console.error('Error deleting review:', error);
    return json({
      success: false,
      error: 'Erro ao excluir avaliação'
    }, { status: 500 });
  }
}; 