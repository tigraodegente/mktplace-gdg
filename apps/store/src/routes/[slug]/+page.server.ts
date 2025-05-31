import type { PageServerLoad } from './$types';
import { withDatabase } from '$lib/db/index.js';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, platform, setHeaders }) => {
  try {
    const { slug } = params;

    // Headers de cache para páginas estáticas
    setHeaders({
      'cache-control': 'public, max-age=3600, stale-while-revalidate=1800',
      'vary': 'Accept-Encoding'
    });

    const page = await withDatabase(platform, async (db) => {
      const [result] = await db.query`
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

      return result;
    });

    if (!page) {
      throw error(404, 'Página não encontrada');
    }

    return {
      page,
      meta: {
        title: page.meta_title || page.title,
        description: page.meta_description || null
      }
    };

  } catch (err) {
    console.error('Erro ao carregar página estática:', err);
    throw error(404, 'Página não encontrada');
  }
}; 