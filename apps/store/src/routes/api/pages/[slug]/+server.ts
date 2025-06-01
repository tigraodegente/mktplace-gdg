import { json } from '@sveltejs/kit';
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
      console.log(`⚠️ Erro pages: ${error instanceof Error ? error.message : 'Erro'} - usando fallback`);
      
      // FALLBACK: Página mock baseada no slug
      const mockPage = {
        id: `page-${slug}`,
        title: slug === 'sobre' ? 'Sobre Nós' : 
              slug === 'contato' ? 'Contato' :
              slug === 'termos' ? 'Termos de Uso' :
              slug === 'privacidade' ? 'Política de Privacidade' :
              'Página Institucional',
        slug: slug,
        content: `<h1>${slug === 'sobre' ? 'Sobre Nossa Loja' : 'Conteúdo da Página'}</h1>
                  <p>Esta é uma página institucional do nosso marketplace.</p>
                  <p>Conteúdo gerado automaticamente para demonstração.</p>`,
        meta_title: `${slug} - Marketplace GDG`,
        meta_description: `Página de ${slug} do Marketplace GDG`,
        is_published: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      return json({
        success: true,
        data: mockPage,
        source: 'fallback'
      });
    }

  } catch (error) {
    console.error('❌ Erro crítico pages:', error);
    return json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erro ao buscar página' }
    }, { status: 500 });
  }
}; 