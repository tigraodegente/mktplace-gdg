import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

// GET - Listar páginas
export const GET: RequestHandler = async ({ url, platform }) => {
  try {
    const db = getDatabase(platform);
    
    // Parâmetros
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 20));
    const search = url.searchParams.get('search') || '';
    const status = url.searchParams.get('status') || 'all';
    
    // Construir query
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    if (search) {
      conditions.push(`(title ILIKE $${paramIndex} OR slug ILIKE $${paramIndex} OR content ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    if (status !== 'all') {
      conditions.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;
    
    // Query principal
    const query = `
      SELECT 
        id, title, slug, content, 
        status, meta_title, meta_description, meta_keywords,
        created_at, updated_at,
        COUNT(*) OVER() as total_count
      FROM pages
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(limit, offset);
    
    const pages = await db.query(query, ...params);
    const totalCount = pages[0]?.total_count || 0;
    
    // Buscar estatísticas
    const [stats] = await db.query`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'published') as published,
        COUNT(*) FILTER (WHERE status = 'draft') as draft,
        COUNT(*) FILTER (WHERE updated_at > NOW() - INTERVAL '7 days') as recently_updated
      FROM pages
    `;
    
    await db.close();
    
    return json({
      success: true,
      data: {
        pages: pages.map((p: any) => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          content: p.content,
          status: p.status,
          seo: {
            title: p.meta_title || p.title,
            description: p.meta_description,
            keywords: p.meta_keywords
          },
          createdAt: p.created_at,
          updatedAt: p.updated_at
        })),
        pagination: {
          page,
          limit,
          total: parseInt(totalCount),
          totalPages: Math.ceil(totalCount / limit)
        },
        stats: {
          total: stats.total || 0,
          published: stats.published || 0,
          draft: stats.draft || 0,
          recentlyUpdated: stats.recently_updated || 0
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching pages:', error);
    return json({
      success: false,
      error: 'Erro ao buscar páginas'
    }, { status: 500 });
  }
};

// POST - Criar página
export const POST: RequestHandler = async ({ request, platform }) => {
  try {
    const db = getDatabase(platform);
    const data = await request.json();
    
    // Validações
    if (!data.title || !data.slug) {
      return json({
        success: false,
        error: 'Título e slug são obrigatórios'
      }, { status: 400 });
    }
    
    // Verificar slug duplicado
    const [existing] = await db.query`
      SELECT id FROM pages WHERE slug = ${data.slug}
    `;
    
    if (existing) {
      await db.close();
      return json({
        success: false,
        error: 'Slug já existe'
      }, { status: 400 });
    }
    
    // Inserir página
    const [pageData] = await db.query`
      INSERT INTO pages (
        title, slug, content,
        status, meta_title, meta_description, meta_keywords
      ) VALUES (
        ${data.title}, ${data.slug}, ${data.content || ''},
        ${data.status || 'draft'}, 
        ${data.seo?.title || data.title},
        ${data.seo?.description || null},
        ${data.seo?.keywords || null}
      ) RETURNING id
    `;
    
    await db.close();
    
    return json({
      success: true,
      data: {
        id: pageData.id,
        message: 'Página criada com sucesso'
      }
    });
    
  } catch (error) {
    console.error('Error creating page:', error);
    return json({
      success: false,
      error: 'Erro ao criar página'
    }, { status: 500 });
  }
};

// PUT - Atualizar página
export const PUT: RequestHandler = async ({ request, platform }) => {
  try {
    const db = getDatabase(platform);
    const data = await request.json();
    
    if (!data.id) {
      return json({
        success: false,
        error: 'ID da página é obrigatório'
      }, { status: 400 });
    }
    
    // Atualizar página
    await db.query`
      UPDATE pages SET
        title = ${data.title},
        slug = ${data.slug},
        content = ${data.content || ''},
        status = ${data.status || 'draft'},
        meta_title = ${data.seo?.title || data.title},
        meta_description = ${data.seo?.description || null},
        meta_keywords = ${data.seo?.keywords || null},
        updated_at = NOW()
      WHERE id = ${data.id}
    `;
    
    await db.close();
    
    return json({
      success: true,
      data: {
        message: 'Página atualizada com sucesso'
      }
    });
    
  } catch (error) {
    console.error('Error updating page:', error);
    return json({
      success: false,
      error: 'Erro ao atualizar página'
    }, { status: 500 });
  }
};

// DELETE - Excluir página
export const DELETE: RequestHandler = async ({ request, platform }) => {
  try {
    const db = getDatabase(platform);
    const { id } = await request.json();
    
    if (!id) {
      return json({
        success: false,
        error: 'ID da página é obrigatório'
      }, { status: 400 });
    }
    
    // Páginas protegidas que não podem ser excluídas
    const protectedSlugs = ['terms', 'privacy', 'about', 'contact'];
    const [pageData] = await db.query`
      SELECT slug FROM pages WHERE id = ${id}
    `;
    
    if (pageData && protectedSlugs.includes(pageData.slug)) {
      await db.close();
      return json({
        success: false,
        error: 'Esta página é protegida e não pode ser excluída'
      }, { status: 400 });
    }
    
    // Excluir página
    await db.query`DELETE FROM pages WHERE id = ${id}`;
    
    await db.close();
    
    return json({
      success: true,
      data: {
        message: 'Página excluída com sucesso'
      }
    });
    
  } catch (error) {
    console.error('Error deleting page:', error);
    return json({
      success: false,
      error: 'Erro ao excluir página'
    }, { status: 500 });
  }
}; 