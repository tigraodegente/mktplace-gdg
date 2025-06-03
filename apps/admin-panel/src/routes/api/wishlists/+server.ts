import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

// GET - Listar listas de presentes
export const GET: RequestHandler = async ({ url, platform }) => {
  try {
    const db = getDatabase(platform);
    
    // Parâmetros
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 20));
    const search = url.searchParams.get('search') || '';
    const privacy = url.searchParams.get('privacy') || 'all';
    
    // Construir query
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    if (search) {
      conditions.push(`(w.name ILIKE $${paramIndex} OR u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    if (privacy !== 'all') {
      conditions.push(`w.is_public = $${paramIndex}`);
      params.push(privacy === 'public');
      paramIndex++;
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;
    
    // Query principal
    const query = `
      SELECT 
        w.id, w.name, w.description, w.is_public, w.created_at, w.updated_at,
        u.id as user_id, u.name as user_name, u.email as user_email,
        COUNT(wi.id) as item_count,
        COUNT(*) OVER() as total_count
      FROM wishlists w
      INNER JOIN users u ON u.id = w.user_id
      LEFT JOIN wishlist_items wi ON wi.wishlist_id = w.id
      ${whereClause}
      GROUP BY w.id, w.name, w.description, w.is_public, w.created_at, w.updated_at,
               u.id, u.name, u.email
      ORDER BY w.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(limit, offset);
    
    const wishlists = await db.query(query, ...params);
    const totalCount = wishlists[0]?.total_count || 0;
    
    // Buscar estatísticas
    const [stats] = await db.query`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_public = true) as public_lists,
        COUNT(*) FILTER (WHERE is_public = false) as private_lists,
        AVG(item_count) as avg_items_per_list
      FROM (
        SELECT w.id, w.is_public, COUNT(wi.id) as item_count
        FROM wishlists w
        LEFT JOIN wishlist_items wi ON wi.wishlist_id = w.id
        GROUP BY w.id, w.is_public
      ) as wishlist_stats
    `;
    
    // Top produtos em listas
    const topWishlistProducts = await db.query`
      SELECT 
        p.id, p.name, p.slug, p.price,
        COUNT(wi.id) as wishlist_count
      FROM products p
      INNER JOIN wishlist_items wi ON wi.product_id = p.id
      GROUP BY p.id, p.name, p.slug, p.price
      ORDER BY wishlist_count DESC
      LIMIT 10
    `;
    
    await db.close();
    
    return json({
      success: true,
      data: {
        wishlists: wishlists.map((w: any) => ({
          id: w.id,
          name: w.name,
          description: w.description,
          isPublic: w.is_public,
          itemCount: w.item_count || 0,
          user: {
            id: w.user_id,
            name: w.user_name,
            email: w.user_email
          },
          createdAt: w.created_at,
          updatedAt: w.updated_at
        })),
        pagination: {
          page,
          limit,
          total: parseInt(totalCount),
          totalPages: Math.ceil(totalCount / limit)
        },
        stats: {
          total: stats.total || 0,
          publicLists: stats.public_lists || 0,
          privateLists: stats.private_lists || 0,
          avgItemsPerList: Number(stats.avg_items_per_list || 0).toFixed(1)
        },
        topProducts: topWishlistProducts.map((p: any) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          price: Number(p.price),
          wishlistCount: p.wishlist_count || 0
        }))
      }
    });
    
  } catch (error) {
    console.error('Error fetching wishlists:', error);
    return json({
      success: false,
      error: 'Erro ao buscar listas de presentes'
    }, { status: 500 });
  }
};

// DELETE - Excluir lista de presentes
export const DELETE: RequestHandler = async ({ request, platform }) => {
  try {
    const db = getDatabase(platform);
    const { id } = await request.json();
    
    if (!id) {
      return json({
        success: false,
        error: 'ID da lista é obrigatório'
      }, { status: 400 });
    }
    
    // Excluir itens da lista primeiro
    await db.query`DELETE FROM wishlist_items WHERE wishlist_id = ${id}`;
    
    // Excluir lista
    await db.query`DELETE FROM wishlists WHERE id = ${id}`;
    
    await db.close();
    
    return json({
      success: true,
      data: {
        message: 'Lista de presentes excluída com sucesso'
      }
    });
    
  } catch (error) {
    console.error('Error deleting wishlist:', error);
    return json({
      success: false,
      error: 'Erro ao excluir lista de presentes'
    }, { status: 500 });
  }
}; 