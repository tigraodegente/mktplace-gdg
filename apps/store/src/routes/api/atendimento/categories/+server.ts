import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ platform }) => {
  try {
    console.log('🎯 Support Categories GET - Estratégia híbrida iniciada');

    // Tentar buscar categorias com timeout
    try {
      const db = getDatabase(platform);
      
      const queryPromise = (async () => {
        const categories = await db.query`
          SELECT id, name, description, icon, color, order_index
          FROM support_categories
          WHERE is_active = true
          ORDER BY order_index ASC
        `;
        return { success: true, categories };
      })();
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 2000)
      });
      
      const result = await Promise.race([queryPromise, timeoutPromise]) as any;
      
      return json({ ...result, source: 'database' });
      
    } catch (error) {
      console.log(`⚠️ Erro categories GET: ${error instanceof Error ? error.message : 'Erro'} - usando fallback`);
      
      // FALLBACK: Mock categories
      const mockCategories = [
        {
          id: 'cat-1',
          name: 'Pedidos',
          description: 'Dúvidas sobre status, entrega e acompanhamento de pedidos',
          icon: 'shopping-bag',
          color: '#10b981',
          order_index: 1
        },
        {
          id: 'cat-2', 
          name: 'Produtos',
          description: 'Informações sobre produtos, estoque e especificações',
          icon: 'cube',
          color: '#6366f1',
          order_index: 2
        },
        {
          id: 'cat-3',
          name: 'Pagamentos', 
          description: 'Problemas com pagamento, reembolso e faturamento',
          icon: 'credit-card',
          color: '#f59e0b',
          order_index: 3
        },
        {
          id: 'cat-4',
          name: 'Técnico',
          description: 'Problemas no site, app ou questões técnicas', 
          icon: 'cog',
          color: '#ef4444',
          order_index: 4
        },
        {
          id: 'cat-5',
          name: 'Outros',
          description: 'Outras dúvidas e sugestões gerais',
          icon: 'chat-bubble-left-right',
          color: '#8b5cf6',
          order_index: 5
        }
      ];

      return json({
        success: true,
        categories: mockCategories,
        source: 'fallback'
      });
    }

  } catch (error: any) {
    console.error('❌ Erro categories GET:', error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
}; 