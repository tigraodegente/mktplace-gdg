import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ url, platform }) => {
  const baseUrl = url.origin;
  
  try {
    const result = await withDatabase(platform, async (db) => {
      // Buscar produtos ativos
      const products = await db.query`
        SELECT slug, updated_at
        FROM products
        WHERE is_active = true
        ORDER BY updated_at DESC
        LIMIT 10000
      `;
      
      // Buscar categorias ativas
      const categories = await db.query`
        SELECT slug, updated_at
        FROM categories
        WHERE is_active = true
        ORDER BY name
      `;
      
      return { products, categories };
    });
    
    // Construir sitemap XML
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Páginas estáticas -->
  <url>
    <loc>${baseUrl}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/busca</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/categorias</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/login</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${baseUrl}/cadastro</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  
  <!-- Categorias -->
  ${result.categories.map(cat => `
  <url>
    <loc>${baseUrl}/categoria/${cat.slug}</loc>
    <lastmod>${new Date(cat.updated_at).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`).join('')}
  
  <!-- Produtos -->
  ${result.products.map(product => `
  <url>
    <loc>${baseUrl}/produto/${product.slug}</loc>
    <lastmod>${new Date(product.updated_at).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`).join('')}
</urlset>`;
    
    return new Response(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600' // Cache por 1 hora
      }
    });
    
  } catch (error) {
    console.error('Erro ao gerar sitemap:', error);
    
    // Retornar sitemap básico em caso de erro
    const fallbackSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;
    
    return new Response(fallbackSitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=300'
      }
    });
  }
}; 