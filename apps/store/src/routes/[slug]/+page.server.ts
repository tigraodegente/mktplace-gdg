import type { PageServerLoad } from './$types';
import { getDatabase } from '$lib/db/index.js';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, platform, setHeaders }) => {
  try {
    const { slug } = params;
    console.log(`📄 Carregando página estática: ${slug} - Estratégia híbrida`);

    // Headers de cache para páginas estáticas
    setHeaders({
      'cache-control': 'public, max-age=3600, stale-while-revalidate=1800',
      'vary': 'Accept-Encoding'
    });

    // Tentar buscar página com timeout
    try {
      const db = getDatabase(platform);
      
      const queryPromise = (async () => {
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
      })();

      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout page')), 3000)
      );
      
      const page = await Promise.race([queryPromise, timeoutPromise]);

    if (!page) {
      throw error(404, 'Página não encontrada');
    }

      console.log(`✅ Página estática carregada: ${page.title}`);
    return {
      page,
      meta: {
        title: page.meta_title || page.title,
        description: page.meta_description || null
      }
    };
    } catch (dbError) {
      console.log('⚠️ Erro ao buscar página no banco, verificando fallback...');
      throw error(404, 'Página não encontrada');
    }

  } catch (err) {
    console.error('❌ Erro ao carregar página estática:', err);
    throw error(404, 'Página não encontrada');
  }
}; 