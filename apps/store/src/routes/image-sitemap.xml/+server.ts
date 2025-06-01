import { getDatabase } from '$lib/db';

export async function GET({ platform }: { platform: any }) {
  try {
    console.log('🖼️ Gerando image-sitemap.xml - Estratégia híbrida');
    
    // Tentar buscar imagens com timeout
    let images: any[] = [];
    
    try {
      const db = getDatabase(platform);
      
      const queryPromise = (async () => {
        // Query simples para imagens de produtos
        const results = await db.query`
          SELECT DISTINCT
            pi.url,
            p.name as title,
            p.slug as product_slug,
            pi.updated_at
          FROM product_images pi
          JOIN products p ON p.id = pi.product_id
          WHERE p.is_active = true
            AND pi.url IS NOT NULL
            AND pi.url != ''
          ORDER BY pi.updated_at DESC
          LIMIT 1000
        `;
        
        return results;
      })();
      
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout image sitemap')), 4000)
      );
      
      images = await Promise.race([queryPromise, timeoutPromise]);
      
      console.log(`✅ Image sitemap dados: ${images.length} imagens`);
    } catch (dbError) {
      console.log('⚠️ Erro no banco para image sitemap, usando dados mínimos');
      
      // Fallback com imagens básicas
      images = [
        {
          url: '/api/placeholder/800/600?text=Produto+Destaque&bg=f8f9fa&color=495057',
          title: 'Produtos em Destaque',
          product_slug: 'produtos-destaque',
          updated_at: new Date()
        },
        {
          url: '/api/placeholder/800/600?text=Categorias&bg=e3f2fd&color=1976d2',
          title: 'Categorias de Produtos',
          product_slug: 'categorias',
          updated_at: new Date()
        }
      ];
    }

    const baseUrl = 'https://marketplace-gdg.com';
    const now = new Date().toISOString();

    const imageSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
        
  <!-- Homepage com imagens principais -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${now}</lastmod>
    <image:image>
      <image:loc>${baseUrl}/api/placeholder/1200/630?text=Marketplace+GDG&bg=00BFB3&color=ffffff</image:loc>
      <image:title>Marketplace Grão de Gente - Sua loja online completa</image:title>
      <image:caption>Encontre os melhores produtos para bebês e crianças</image:caption>
    </image:image>
  </url>
  
  ${images.map(img => {
    const imageUrl = img.url.startsWith('http') ? img.url : `${baseUrl}${img.url}`;
    const productUrl = `${baseUrl}/produto/${img.product_slug}`;
    const lastmod = img.updated_at ? new Date(img.updated_at).toISOString() : now;
    
    return `
  <url>
    <loc>${productUrl}</loc>
    <lastmod>${lastmod}</lastmod>
    <image:image>
      <image:loc>${imageUrl}</image:loc>
      <image:title>${escapeXml(img.title || 'Produto')}</image:title>
      <image:caption>Produto disponível no Marketplace Grão de Gente</image:caption>
    </image:image>
  </url>`;
  }).join('')}
  
</urlset>`;

    return new Response(imageSitemap.trim(), {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=7200, s-maxage=14400' // 2h client, 4h CDN
      }
    });

  } catch (error) {
    console.error('❌ Erro crítico ao gerar image sitemap:', error);
    
    // Fallback sitemap mínimo
    const baseUrl = 'https://marketplace-gdg.com';
    const now = new Date().toISOString();
    
    const fallbackSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${now}</lastmod>
    <image:image>
      <image:loc>${baseUrl}/api/placeholder/1200/630?text=Marketplace+GDG&bg=00BFB3&color=ffffff</image:loc>
      <image:title>Marketplace Grão de Gente</image:title>
      <image:caption>Sua loja online completa</image:caption>
    </image:image>
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

// Função helper para escapar caracteres especiais XML
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
} 