import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

// GET - Listar produtos arquivados
export const GET: RequestHandler = async ({ url, platform }) => {
  try {
    const db = getDatabase(platform);
    
    const search = url.searchParams.get('search') || '';
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit')) || 20));
    const offset = (page - 1) * limit;
    
    // Construir query
    let whereClause = "WHERE p.status = 'archived'";
    const params: any[] = [];
    let paramIndex = 1;
    
    if (search) {
      whereClause += ` AND (p.name ILIKE $${paramIndex} OR p.sku ILIKE $${paramIndex + 1})`;
      params.push(`%${search}%`, `%${search}%`);
      paramIndex += 2;
    }
    
    const query = `
      SELECT 
        p.id,
        p.name,
        p.sku,
        p.slug,
        p.price,
        p.created_at,
        p.updated_at,
        b.name as brand_name,
        s.company_name as seller_name,
        COUNT(*) OVER() as total_count
      FROM products p
      LEFT JOIN brands b ON b.id = p.brand_id
      LEFT JOIN sellers s ON s.id = p.seller_id
      ${whereClause}
      ORDER BY p.updated_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(limit, offset);
    
    const result = await db.query(query, params);
    const totalCount = result[0]?.total_count || 0;
    
    await db.close();
    
    return json({
      success: true,
      data: {
        products: result.map((p: any) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          slug: p.slug,
          price: Number(p.price),
          brand: p.brand_name,
          seller: p.seller_name,
          createdAt: p.created_at,
          archivedAt: p.updated_at
        })),
        pagination: {
          page,
          limit,
          total: parseInt(totalCount),
          totalPages: Math.ceil(totalCount / limit)
        }
      }
    });
    
  } catch (error) {
    console.error('Erro ao buscar produtos arquivados:', error);
    return json({
      success: false,
      error: 'Erro ao buscar produtos arquivados'
    }, { status: 500 });
  }
};

// POST - Restaurar produto arquivado
export const POST: RequestHandler = async ({ request, platform }) => {
  try {
    const db = getDatabase(platform);
    const { id, action } = await request.json();
    
    if (!id || !action) {
      await db.close();
      return json({
        success: false,
        error: 'ID e ação são obrigatórios'
      }, { status: 400 });
    }
    
    if (action === 'restore') {
      // Restaurar produto
      const result = await db.query`
        UPDATE products 
        SET status = 'draft', is_active = false, updated_at = NOW()
        WHERE id = ${id}::uuid AND status = 'archived'
        RETURNING name, sku
      `;
      
      if (result[0]) {
        await db.close();
        return json({
          success: true,
          message: `Produto "${result[0].name}" restaurado como rascunho!`
        });
      } else {
        await db.close();
        return json({
          success: false,
          error: 'Produto não encontrado ou não está arquivado'
        }, { status: 404 });
      }
    } else if (action === 'delete_permanently') {
      // Verificar se existem conflitos antes da exclusão definitiva
      const conflicts = await db.query`
        SELECT 
          (SELECT COUNT(*) FROM products WHERE sku = p.sku AND status != 'archived') as sku_conflicts,
          (SELECT COUNT(*) FROM products WHERE slug = p.slug AND status != 'archived') as slug_conflicts
        FROM products p 
        WHERE id = ${id}::uuid
      `;
      
      if (conflicts[0]?.sku_conflicts > 0 || conflicts[0]?.slug_conflicts > 0) {
        await db.close();
        return json({
          success: false,
          error: 'Não é possível excluir: existe produto ativo com mesmo SKU ou slug'
        }, { status: 409 });
      }
      
      // Remover dependências primeiro
      await db.query`DELETE FROM product_categories WHERE product_id = ${id}::uuid`;
      await db.query`DELETE FROM product_images WHERE product_id = ${id}::uuid`;
      await db.query`DELETE FROM product_related WHERE product_id = ${id}::uuid OR related_product_id = ${id}::uuid`;
      await db.query`DELETE FROM product_upsells WHERE product_id = ${id}::uuid OR upsell_product_id = ${id}::uuid`;
      await db.query`DELETE FROM product_downloads WHERE product_id = ${id}::uuid`;
      
      // Remover produto definitivamente
      const result = await db.query`
        DELETE FROM products 
        WHERE id = ${id}::uuid
        RETURNING name, sku
      `;
      
      if (result[0]) {
        await db.close();
        return json({
          success: true,
          message: `Produto "${result[0].name}" removido definitivamente!`
        });
      } else {
        await db.close();
        return json({
          success: false,
          error: 'Produto não encontrado'
        }, { status: 404 });
      }
    } else {
      await db.close();
      return json({
        success: false,
        error: 'Ação inválida'
      }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Erro ao processar produto arquivado:', error);
    return json({
      success: false,
      error: 'Erro ao processar produto arquivado'
    }, { status: 500 });
  }
}; 