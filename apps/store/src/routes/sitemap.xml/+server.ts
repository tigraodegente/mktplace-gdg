import { getDatabase } from '$lib/db';
import { TIMEOUT_CONFIG, withTimeout } from '$lib/config/timeouts';

export async function GET({ platform }: { platform: any }) {
  try {
    console.log('🗺️ Gerando sitemap.xml - Estratégia híbrida');
    
    // Tentar buscar dados com timeout
    let pages: any[] = [];
    let products: any[] = [];
    let categories: any[] = [];
  
  try {
      const db = getDatabase(platform);
      
      const queryPromise = (async () => {
        // Buscar todas as URLs em paralelo com queries simples
        const [pagesResult, productsResult, categoriesResult] = await Promise.all([
          db.query`
            SELECT slug, updated_at 
            FROM pages 
            WHERE is_published = true
            ORDER BY updated_at DESC
          `,
          db.query`
        SELECT slug, updated_at
        FROM products
        WHERE is_active = true
        ORDER BY updated_at DESC
            LIMIT 1000
          `,
          db.query`
        SELECT slug, updated_at
        FROM categories
        WHERE is_active = true
            ORDER BY updated_at DESC
          `
        ]);
      
        return {
          pages: pagesResult,
          products: productsResult, 
          categories: categoriesResult
        };
      })();
    
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout sitemap')), 5000)
      );
      
      const result = await Promise.race([queryPromise, timeoutPromise]);
      pages = result.pages;
      products = result.products;
      categories = result.categories;
      
      console.log(`✅ Sitemap dados: ${pages.length} páginas, ${products.length} produtos, ${categories.length} categorias`);
    } catch (dbError) {
      console.log('⚠️ Erro no banco para sitemap, usando dados mínimos');
      // Fallback com URLs básicas
      pages = [];
      products = [];
      categories = [
        { slug: 'bebe', updated_at: new Date() },
        { slug: 'infantil', updated_at: new Date() },
        { slug: 'roupas', updated_at: new Date() }
      ];
    }

    const baseUrl = 'https://marketplace-gdg.com';
    const now = new Date().toISOString();

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Homepage -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- Páginas estáticas -->
  ${pages.map(page => `
  <url>
    <loc>${baseUrl}/${page.slug}</loc>
    <lastmod>${page.updated_at.toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`).join('')}
  
  <!-- Produtos -->
  ${products.map(product => `
  <url>
    <loc>${baseUrl}/produto/${product.slug}</loc>
    <lastmod>${product.updated_at.toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('')}
  
  <!-- Categorias -->
  ${categories.map(category => `
  <url>
    <loc>${baseUrl}/categorias/${category.slug}</loc>
    <lastmod>${category.updated_at?.toISOString() || now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`).join('')}
  
  <!-- Páginas principais -->
  <url>
    <loc>${baseUrl}/busca</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/login</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${baseUrl}/cadastro</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
</urlset>`;
    
    return new Response(sitemap.trim(), {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=7200' // 1h client, 2h CDN
      }
    });
    
  } catch (error) {
    console.error('❌ Erro crítico ao gerar sitemap:', error);
    
    // Fallback sitemap mínimo
    const baseUrl = 'https://marketplace-gdg.com';
    const now = new Date().toISOString();
    
    const fallbackSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/busca</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`;
    
    return new Response(fallbackSitemap.trim(), {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=300' // 5 minutos para fallback
      }
    });
  }
} 