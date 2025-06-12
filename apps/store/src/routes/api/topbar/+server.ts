import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db/index.js';

/**
 * TopBar API - Dynamic promotional messages from database
 * Uses banners table with position 'topbar' for promotional carousel
 */
export const GET: RequestHandler = async ({ platform, url }) => {
  console.log('[SERVER] [INFO][api_topbar] TopBar API iniciada');

  try {
    const db = getDatabase(platform);
    
    // Query banners with position 'topbar' or fallback to 'home' with specific format
    const bannersResult = await db.query`
      SELECT 
        id,
        title,
        subtitle,
        image_url,
        link_url,
        display_order,
        created_at
      FROM banners
      WHERE 
        is_active = true
        AND position IN ('topbar', 'promo')
        AND (starts_at IS NULL OR starts_at <= NOW())
        AND (ends_at IS NULL OR ends_at >= NOW())
      ORDER BY display_order ASC, created_at ASC
      LIMIT 5
    `;

    let topbarMessages: any[] = [];

    if (bannersResult.length > 0) {
      // Convert database banners to topbar format
      topbarMessages = bannersResult.map((banner: any) => ({
        id: banner.id,
        icon: determineIcon(banner.title, banner.subtitle),
        text: banner.title,
        link: banner.link_url || '#',
        linkText: extractCTA(banner.subtitle || banner.title)
      }));
    } else {
      // Fallback to default messages if no topbar banners found
      console.log('[SERVER] [INFO][api_topbar] Nenhum banner encontrado, usando mensagens padrão');
      topbarMessages = [
        {
          id: 'default-1',
          icon: 'payment',
          text: 'Tudo em até 12X',
          link: '/promocoes',
          linkText: 'COMPRAR'
        },
        {
          id: 'default-2',
          icon: 'shipping',
          text: 'Frete Grátis acima de R$ 199',
          link: '/frete-gratis',
          linkText: 'APROVEITAR'
        },
        {
          id: 'default-3',
          icon: 'discount',
          text: '10% OFF na primeira compra',
          link: '/primeira-compra',
          linkText: 'USAR CUPOM'
        }
      ];
    }

    console.log(`[SERVER] [INFO][api_topbar] ✅ ${topbarMessages.length} mensagens carregadas para topbar`);

    return json({
      success: true,
      data: topbarMessages
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300', // 5 minutes cache
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('[SERVER] [ERROR][api_topbar] Erro ao buscar mensagens da topbar:', error);
    
    // Return fallback data on error
    const fallbackMessages = [
      {
        id: 'fallback-1',
        icon: 'payment',
        text: 'Tudo em até 12X',
        link: '/promocoes',
        linkText: 'COMPRAR'
      },
      {
        id: 'fallback-2',
        icon: 'shipping', 
        text: 'Frete Grátis acima de R$ 199',
        link: '/frete-gratis',
        linkText: 'APROVEITAR'
      }
    ];

    return json({
      success: true,
      data: fallbackMessages,
      fallback: true,
      error: {
        code: 'TOPBAR_FETCH_ERROR',
        message: 'Usando dados de fallback',
        details: error instanceof Error ? error.message : String(error)
      }
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};

/**
 * Determine appropriate icon based on banner content
 */
function determineIcon(title: string, subtitle?: string): 'payment' | 'shipping' | 'discount' {
  const content = `${title} ${subtitle || ''}`.toLowerCase();
  
  if (content.includes('frete') || content.includes('entrega') || content.includes('delivery')) {
    return 'shipping';
  }
  
  if (content.includes('desconto') || content.includes('%') || content.includes('off') || 
      content.includes('promoção') || content.includes('cupom')) {
    return 'discount';
  }
  
  if (content.includes('12x') || content.includes('parcel') || content.includes('sem juros') ||
      content.includes('cartão') || content.includes('pagamento')) {
    return 'payment';
  }
  
  // Default fallback
  return 'discount';
}

/**
 * Extract call-to-action text from subtitle or generate appropriate one
 */
function extractCTA(text: string): string {
  const cleanText = text.toLowerCase();
  
  if (cleanText.includes('frete')) return 'APROVEITAR';
  if (cleanText.includes('desconto') || cleanText.includes('%') || cleanText.includes('off')) return 'USAR CUPOM';
  if (cleanText.includes('12x') || cleanText.includes('parcel')) return 'COMPRAR';
  if (cleanText.includes('novo') || cleanText.includes('lançamento')) return 'CONFERIR';
  if (cleanText.includes('sale') || cleanText.includes('promoção')) return 'VER OFERTAS';
  
  // Extract uppercase words that might be CTAs
  const words = text.split(' ');
  const upperWords = words.filter(word => word === word.toUpperCase() && word.length > 2);
  
  if (upperWords.length > 0) {
    return upperWords[0];
  }
  
  return 'CONFERIR';
} 