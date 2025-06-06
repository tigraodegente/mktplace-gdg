import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

// GET - Buscar página por ID
export const GET: RequestHandler = async ({ params, platform }) => {
  try {
    const db = getDatabase(platform);
    const { id } = params;
    
    if (!id) {
      return json({
        success: false,
        error: 'ID da página é obrigatório'
      }, { status: 400 });
    }
    
    // Buscar página por ID
    const [page] = await db.query`
      SELECT 
        id, title, slug, content, meta_title, meta_description,
        is_published, is_featured, menu_order, created_at, updated_at
      FROM pages
      WHERE id = ${id}
    `;
    
    await db.close();
    
    if (!page) {
      return json({
        success: false,
        error: 'Página não encontrada'
      }, { status: 404 });
    }
    
    return json({
      success: true,
      data: {
        id: page.id,
        title: page.title,
        slug: page.slug,
        content: page.content,
        excerpt: null, // Não existe na tabela
        metaTitle: page.meta_title,
        metaDescription: page.meta_description,
        isPublished: page.is_published,
        featuredImage: null, // Não existe na tabela
        template: 'default', // Não existe na tabela
        isFeatured: page.is_featured,
        menuOrder: page.menu_order,
        createdAt: page.created_at,
        updatedAt: page.updated_at
      }
    });
    
  } catch (error) {
    console.error('Error fetching page:', error);
    return json({
      success: false,
      error: 'Erro ao buscar página'
    }, { status: 500 });
  }
}; 