import type { PageServerLoad } from './$types';
import { getDatabase } from '$lib/db/index.js';

export const load: PageServerLoad = async ({ platform, url, setHeaders }) => {
  try {
    console.log('📝 Carregando página do blog - Estratégia híbrida');
    
    // Headers de cache para blog
    setHeaders({
      'cache-control': 'public, max-age=1800, s-maxage=3600', // 30min client, 1h CDN
      'vary': 'Accept-Encoding'
    });

    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = 10;
    const offset = (page - 1) * limit;

    // Tentar buscar posts do blog com timeout
    try {
      const db = getDatabase(platform);
      
      const queryPromise = (async () => {
        // Buscar posts publicados (queries simples)
        const [posts, totalResult] = await Promise.all([
          db.query`
            SELECT 
              id, title, slug, content, excerpt,
              meta_title, meta_description,
              created_at, updated_at
            FROM pages 
            WHERE slug LIKE 'blog/%' 
              AND is_published = true
            ORDER BY created_at DESC
            LIMIT ${limit}
            OFFSET ${offset}
          `,
          db.queryOne`
            SELECT COUNT(*) as total
            FROM pages 
            WHERE slug LIKE 'blog/%' 
              AND is_published = true
          `
        ]);

        const totalPosts = parseInt(totalResult?.total || '0');
        const totalPages = Math.ceil(totalPosts / limit);

        return {
          posts,
          pagination: {
            currentPage: page,
            totalPages,
            totalPosts,
            hasNext: page < totalPages,
            hasPrevious: page > 1
          }
        };
      })();

      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout blog')), 4000)
      );
      
      const result = await Promise.race([queryPromise, timeoutPromise]);
      
      console.log(`✅ Blog carregado: ${result.posts.length} posts`);
      return result;
      
    } catch (dbError) {
      console.log('⚠️ Erro no banco para blog, usando dados mock');
      
      // Fallback com posts mock
      const mockPosts = [
        {
          id: 'blog-1',
          title: 'Como Escolher o Melhor Berço para seu Bebê',
          slug: 'blog/como-escolher-berco-bebe',
          excerpt: 'Guia completo para escolher o berço ideal para o quarto do seu bebê, considerando segurança, conforto e design.',
          content: '<p>Escolher o berço perfeito é uma das decisões mais importantes...</p>',
          meta_title: 'Como Escolher o Melhor Berço para seu Bebê | Blog Grão de Gente',
          meta_description: 'Descubra como escolher o berço ideal para seu bebê com nosso guia completo.',
          created_at: new Date('2024-01-15'),
          updated_at: new Date('2024-01-15')
        },
        {
          id: 'blog-2', 
          title: 'Dicas de Segurança para o Quarto do Bebê',
          slug: 'blog/seguranca-quarto-bebe',
          excerpt: 'Aprenda como tornar o quarto do seu bebê mais seguro com nossas dicas práticas e essenciais.',
          content: '<p>A segurança do bebê é prioridade máxima...</p>',
          meta_title: 'Dicas de Segurança para o Quarto do Bebê | Blog Grão de Gente',
          meta_description: 'Confira nossas dicas essenciais de segurança para o quarto do bebê.',
          created_at: new Date('2024-01-10'),
          updated_at: new Date('2024-01-10')
        },
        {
          id: 'blog-3',
          title: 'Enxoval de Bebê: Lista Completa do que Comprar',
          slug: 'blog/enxoval-bebe-lista-completa',
          excerpt: 'Lista completa e prática com tudo que você precisa para o enxoval do seu bebê.',
          content: '<p>Preparar o enxoval do bebê pode ser desafiador...</p>',
          meta_title: 'Enxoval de Bebê: Lista Completa | Blog Grão de Gente',
          meta_description: 'Lista completa e prática para o enxoval perfeito do seu bebê.',
          created_at: new Date('2024-01-05'),
          updated_at: new Date('2024-01-05')
        }
      ];

      return {
        posts: mockPosts,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalPosts: mockPosts.length,
          hasNext: false,
          hasPrevious: false
        },
        dataSource: 'mock'
      };
    }

  } catch (error) {
    console.error('❌ Erro crítico ao carregar blog:', error);
    
    // Fallback vazio
    return {
      posts: [],
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalPosts: 0,
        hasNext: false,
        hasPrevious: false
      },
      error: 'Erro ao carregar posts do blog'
    };
  }
}; 