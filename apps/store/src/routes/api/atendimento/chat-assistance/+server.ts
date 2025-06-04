import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { aiAtendimento } from '$lib/services/aiAtendimento';

export const POST: RequestHandler = async ({ request }) => {
  try {
    console.log('💬 Chat Assistance - IA para sugestões');

    const { conversation, lastMessage, category, urgency } = await request.json();

    if (!lastMessage || typeof lastMessage !== 'string') {
      return json({ 
        success: false, 
        error: 'Última mensagem é obrigatória' 
      }, { status: 400 });
    }

    // IA sugere respostas e ações
    const suggestions = await aiAtendimento.getChatSuggestions(
      conversation || [],
      lastMessage,
      category || 'Outros', 
      urgency || 'média'
    );

    console.log(`💡 IA Suggestions: ${suggestions.responses.length} respostas | Escalar: ${suggestions.escalate}`);

    return json({
      success: true,
      data: {
        suggestions,
        timestamp: new Date().toISOString(),
        context: {
          category: category || 'Outros',
          urgency: urgency || 'média'
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Erro na assistência IA:', error);
    
    // Fallback com respostas genéricas  
    return json({
      success: true,
      data: {
        suggestions: {
          responses: [
            'Entendo sua situação. Como posso ajudá-lo?',
            'Vou verificar essas informações para você.',
            'Estou aqui para resolver sua questão.'
          ],
          escalate: false,
          quick_actions: [
            'Verificar pedido',
            'Consultar estoque', 
            'Falar com supervisor',
            'Ver perguntas frequentes'
          ]
        },
        timestamp: new Date().toISOString(),
        context: {
          category: 'Outros',
          urgency: 'média'
        }
      }
    });
  }
}; 