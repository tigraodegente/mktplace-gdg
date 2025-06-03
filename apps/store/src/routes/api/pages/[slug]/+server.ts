import { json } from '@sveltejs/kit';
import { TIMEOUT_CONFIG, withTimeout } from '$lib/config/timeouts';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db/index.js';

export const GET: RequestHandler = async ({ params, platform }) => {
  try {
    console.log('📄 Pages [slug] - Estratégia híbrida iniciada');
    
    const { slug } = params;

    // Tentar buscar página com timeout
    try {
      const db = getDatabase(platform);
      
      const queryPromise = (async () => {
        const pages = await db.query`
          SELECT id, title, slug, content, meta_title, meta_description,
                 is_published, created_at, updated_at
        FROM pages 
        WHERE slug = ${slug} AND is_published = true
          LIMIT 1
      `;

        return pages[0] || null;
      })();
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 2000)
      });
      
      const result = await Promise.race([queryPromise, timeoutPromise]) as any;

    if (!result) {
      return json({
        success: false,
          error: { code: 'PAGE_NOT_FOUND', message: 'Página não encontrada' }
      }, { status: 404 });
    }

    return json({
      success: true,
        data: result,
        source: 'database'
    });
      
    } catch (error) {
      console.log(`⚠️ Erro page: ${error instanceof Error ? error.message : 'Erro'}`);
      
      // Retornar erro ao invés de dados mockados
      return json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Não foi possível carregar a página',
          details: 'Por favor, tente novamente em alguns instantes'
        }
      }, { status: 503 });
    }

  } catch (error) {
    console.error('❌ Erro crítico pages:', error);
    return json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erro ao buscar página' }
    }, { status: 500 });
  }
}; 