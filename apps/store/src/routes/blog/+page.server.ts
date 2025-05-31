import type { PageServerLoad } from './$types';
import { withDatabase } from '$lib/db/index.js';

export const load: PageServerLoad = async ({ platform, url, setHeaders }) => {
  try {
    // Headers de cache para o blog
    setHeaders({
      'cache-control': 'public, max-age=1800, stale-while-revalidate=900',
      'vary': 'Accept-Encoding'
    });

    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = 10;
    const offset = (page - 1) * limit;

    const result = await withDatabase(platform, async (db) => {
      // Buscar posts do blog (páginas com slug começando com 'blog/')
      const posts = await db.query`
        SELECT 
          id,
          title,
          slug,
          content,
          meta_title,
          meta_description,
          created_at,
          updated_at,
          -- Extrair resumo do conteúdo (primeiros 300 caracteres sem HTML)
          CASE 
            WHEN LENGTH(REGEXP_REPLACE(content, '<[^>]*>', '', 'g')) > 300 
            THEN SUBSTRING(REGEXP_REPLACE(content, '<[^>]*>', '', 'g'), 1, 300) || '...'
            ELSE REGEXP_REPLACE(content, '<[^>]*>', '', 'g')
          END as excerpt
        FROM pages 
        WHERE slug LIKE 'blog/%' 
          AND is_published = true
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      // Contar total de posts
      const [{ count }] = await db.query`
        SELECT COUNT(*) as count
        FROM pages 
        WHERE slug LIKE 'blog/%' 
          AND is_published = true
      `;

      return { posts, totalCount: parseInt(count) };
    });

    const totalPages = Math.ceil(result.totalCount / limit);

    return {
      posts: result.posts.map(post => ({
        ...post,
        // Limpar slug para mostrar apenas o título do post
        blogSlug: post.slug.replace('blog/', ''),
        publishedAt: new Date(post.created_at).toLocaleDateString('pt-BR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      })),
      pagination: {
        currentPage: page,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        totalCount: result.totalCount
      },
      meta: {
        title: 'Blog - Grão de Gente',
        description: 'Acompanhe as novidades, dicas e tendências do universo infantil no blog da Grão de Gente.'
      }
    };

  } catch (error) {
    console.error('Erro ao carregar posts do blog:', error);
    return {
      posts: [],
      pagination: {
        currentPage: 1,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
        totalCount: 0
      },
      meta: {
        title: 'Blog - Grão de Gente',
        description: 'Blog da Grão de Gente'
      },
      error: 'Erro ao carregar posts do blog'
    };
  }
}; 