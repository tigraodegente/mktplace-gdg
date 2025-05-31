import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ url, platform, setHeaders }) => {
  const baseUrl = url.origin;
  
  // Headers de cache para o sitemap
  setHeaders({
    'Content-Type': 'application/xml',
    'Cache-Control': 'public, max-age=3600, stale-while-revalidate=1800',
    'Vary': 'Accept-Encoding'
  });
  
  try {
    const result = await withDatabase(platform, async (db) => {
      // Buscar produtos com suas imagens
      const productImages = await db.query`
        SELECT 
          p.slug,
          p.name as product_name,
          p.description,
          p.updated_at,
          pi.url as image_url,
          pi.alt_text,
          pi.caption,
          pi.position
        FROM products p
        INNER JOIN product_images pi ON pi.product_id = p.id
        WHERE 
          p.is_active = true 
          AND pi.url IS NOT NULL
          AND pi.url != ''
        ORDER BY p.updated_at DESC, p.slug ASC, pi.position ASC
        LIMIT 1000
      `;
      
      return productImages;
    });
    
    // Construir sitemap XML para imagens
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  ${result.map(item => `
  <url>
    <loc>${baseUrl}/produto/${item.slug}</loc>
    <lastmod>${new Date(item.updated_at).toISOString()}</lastmod>
    <image:image>
      <image:loc>${item.image_url.startsWith('http') ? item.image_url : `${baseUrl}${item.image_url}`}</image:loc>
      <image:title>${escapeXml(item.product_name)}</image:title>
      <image:caption>${escapeXml(item.alt_text || item.caption || item.product_name)}</image:caption>
      <image:geo_location>Brasil</image:geo_location>
      <image:license>${baseUrl}/termos-de-uso</image:license>
    </image:image>
  </url>`).join('')}
</urlset>`;
    
    return new Response(sitemap, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8'
      }
    });
    
  } catch (error) {
    console.error('Erro ao gerar sitemap de imagens:', error);
    
    // Retornar sitemap básico em caso de erro
    const fallbackSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </url>
</urlset>`;
    
    return new Response(fallbackSitemap, {
      status: 500,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8'
      }
    });
  }
};

// Função para escapar caracteres especiais no XML
function escapeXml(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .trim();
} 