import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db/index.js';

export const GET: RequestHandler = async ({ params, platform }) => {
  try {
    const { slug } = params;

    const result = await withDatabase(platform, async (db) => {
      const [page] = await db.query`
        SELECT 
          id,
          title,
          slug,
          content,
          meta_title,
          meta_description,
          is_published,
          created_at,
          updated_at
        FROM pages 
        WHERE slug = ${slug} AND is_published = true
      `;

      return page;
    });

    if (!result) {
      return json({
        success: false,
        error: {
          code: 'PAGE_NOT_FOUND',
          message: 'Página não encontrada'
        }
      }, { status: 404 });
    }

    return json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Erro ao buscar página:', error);
    return json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Erro ao buscar página'
      }
    }, { status: 500 });
  }
}; 