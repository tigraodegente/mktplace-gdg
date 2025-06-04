import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

export const GET: RequestHandler = async ({ platform, url }) => {
  try {
    console.log('❓ FAQ GET - Estratégia híbrida iniciada');
    
    const categoryId = url.searchParams.get('category_id');
    const search = url.searchParams.get('search');

    // Tentar buscar FAQ com timeout
    try {
      const db = getDatabase(platform);
      
      const queryPromise = (async () => {
        let faqQuery = `
          SELECT 
            f.id, f.question, f.answer, f.view_count, f.helpful_count, f.not_helpful_count,
            fc.name as category_name, fc.id as category_id
          FROM faq_items f
          JOIN faq_categories fc ON f.category_id = fc.id
          WHERE f.is_active = true AND fc.is_active = true
        `;
        
        let queryParams = [];
        let paramIndex = 1;

        if (categoryId) {
          faqQuery += ` AND f.category_id = $${paramIndex}`;
          queryParams.push(categoryId);
          paramIndex++;
        }

        if (search) {
          faqQuery += ` AND (f.question ILIKE $${paramIndex} OR f.answer ILIKE $${paramIndex})`;
          queryParams.push(`%${search}%`);
          paramIndex++;
        }

        faqQuery += ` ORDER BY f.order_index ASC, f.helpful_count DESC`;

        const faq = await db.query(faqQuery, ...queryParams);
        
        // Buscar categorias também
        const categories = await db.query`
          SELECT id, name, description, order_index
          FROM faq_categories
          WHERE is_active = true
          ORDER BY order_index ASC
        `;

        return { success: true, faq, categories };
      })();
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 2000)
      });
      
      const result = await Promise.race([queryPromise, timeoutPromise]) as any;
      
      return json({ ...result, source: 'database' });
      
    } catch (error) {
      console.log(`⚠️ Erro FAQ GET: ${error instanceof Error ? error.message : 'Erro'} - usando fallback`);
      
      // FALLBACK: Mock FAQ data
      const mockCategories = [
        { id: 'faq-cat-1', name: 'Pedidos e Entrega', description: 'Perguntas sobre como fazer pedidos e prazos de entrega', order_index: 1 },
        { id: 'faq-cat-2', name: 'Pagamentos e Preços', description: 'Dúvidas sobre formas de pagamento e política de preços', order_index: 2 },
        { id: 'faq-cat-3', name: 'Produtos e Estoque', description: 'Informações sobre produtos e disponibilidade', order_index: 3 },
        { id: 'faq-cat-4', name: 'Trocas e Devoluções', description: 'Política de trocas, devoluções e garantia', order_index: 4 },
        { id: 'faq-cat-5', name: 'Conta e Perfil', description: 'Gerenciamento de conta, cadastro e dados pessoais', order_index: 5 },
        { id: 'faq-cat-6', name: 'Frete e Localização', description: 'Cálculo de frete, áreas de entrega e logística', order_index: 6 }
      ];

      const mockFAQ = [
        {
          id: 'faq-1',
          question: 'Como posso acompanhar meu pedido?',
          answer: 'Você pode acompanhar seu pedido através da seção "Meus Pedidos" no seu perfil. Também enviamos atualizações por email e SMS conforme o pedido progride.',
          view_count: 234,
          helpful_count: 89,
          not_helpful_count: 5,
          category_id: 'faq-cat-1',
          category_name: 'Pedidos e Entrega'
        },
        {
          id: 'faq-2',
          question: 'Qual o prazo de entrega?',
          answer: 'O prazo de entrega varia de acordo com sua localização e o produto escolhido. Geralmente é de 3 a 7 dias úteis para a região Sudeste e de 5 a 12 dias úteis para outras regiões.',
          view_count: 189,
          helpful_count: 76,
          not_helpful_count: 8,
          category_id: 'faq-cat-1',
          category_name: 'Pedidos e Entrega'
        },
        {
          id: 'faq-3',
          question: 'Quais formas de pagamento vocês aceitam?',
          answer: 'Aceitamos cartões de crédito (Visa, Mastercard, Elo), cartões de débito, PIX, boleto bancário e parcelamento em até 12x sem juros em produtos selecionados.',
          view_count: 167,
          helpful_count: 92,
          not_helpful_count: 3,
          category_id: 'faq-cat-2',
          category_name: 'Pagamentos e Preços'
        },
        {
          id: 'faq-4',
          question: 'É seguro comprar no site?',
          answer: 'Sim! Nosso site possui certificado SSL e seguimos todos os protocolos de segurança. Seus dados pessoais e de pagamento são criptografados e protegidos.',
          view_count: 145,
          helpful_count: 88,
          not_helpful_count: 2,
          category_id: 'faq-cat-2',
          category_name: 'Pagamentos e Preços'
        },
        {
          id: 'faq-5',
          question: 'Como sei se um produto está em estoque?',
          answer: 'A disponibilidade do produto é mostrada na página do produto. Se estiver "Em estoque", você pode comprar normalmente. Se estiver "Fora de estoque", você pode se cadastrar para ser avisado quando chegar.',
          view_count: 112,
          helpful_count: 67,
          not_helpful_count: 6,
          category_id: 'faq-cat-3',
          category_name: 'Produtos e Estoque'
        },
        {
          id: 'faq-6',
          question: 'Como faço para trocar ou devolver um produto?',
          answer: 'Você tem até 7 dias para solicitar troca ou devolução. Acesse "Meus Pedidos", selecione o item e clique em "Solicitar troca/devolução". O produto deve estar em perfeito estado e na embalagem original.',
          view_count: 98,
          helpful_count: 54,
          not_helpful_count: 4,
          category_id: 'faq-cat-4',
          category_name: 'Trocas e Devoluções'
        }
      ];

      // Filtrar por categoria se especificado
      const filteredFAQ = categoryId 
        ? mockFAQ.filter(item => item.category_id === categoryId)
        : mockFAQ;

      // Filtrar por busca se especificado
      const searchFilteredFAQ = search 
        ? filteredFAQ.filter(item => 
            item.question.toLowerCase().includes(search.toLowerCase()) ||
            item.answer.toLowerCase().includes(search.toLowerCase())
          )
        : filteredFAQ;

      return json({
        success: true,
        faq: searchFilteredFAQ,
        categories: mockCategories,
        source: 'fallback'
      });
    }

  } catch (error: any) {
    console.error('❌ Erro FAQ GET:', error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
}; 