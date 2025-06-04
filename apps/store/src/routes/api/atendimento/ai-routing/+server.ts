import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { aiAtendimento } from '$lib/services/aiAtendimento';

export const POST: RequestHandler = async ({ request }) => {
  try {
    console.log('🤖 AI Routing - Iniciando análise inteligente');

    const { message, userContext, history } = await request.json();

    if (!message || typeof message !== 'string') {
      return json({ 
        success: false, 
        error: 'Mensagem é obrigatória' 
      }, { status: 400 });
    }

    // Usar IA para analisar mensagem
    const analysis = await aiAtendimento.routeMessage(
      message, 
      userContext || {}, 
      history || []
    );

    console.log(`🎯 IA Analysis: ${analysis.categoria} | ${analysis.urgencia} | ${analysis.confianca}% confiança`);

    return json({
      success: true,
      data: {
        routing: analysis,
        timestamp: new Date().toISOString(),
        processed_by: 'ai_service'
      }
    });

  } catch (error: any) {
    console.error('❌ Erro na análise IA:', error);
    
    // Fallback: roteamento básico
    return json({
      success: true,
      data: {
        routing: {
          categoria: 'Outros',
          urgencia: 'média',
          tipo_contato: 'chat',
          confianca: 50,
          sugestoes: [
            'Falar com atendente especializado',
            'Consultar nossa central de ajuda',
            'Verificar perguntas frequentes'
          ],
          sentimento: 'neutro'
        },
        timestamp: new Date().toISOString(),
        processed_by: 'fallback'
      }
    });
  }
}; 