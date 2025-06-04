import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { aiAtendimento } from '$lib/services/aiAtendimento';

export const POST: RequestHandler = async ({ request }) => {
  try {
    console.log('🧠 Smart Answer - IA Contextual');

    const { question } = await request.json();

    if (!question || typeof question !== 'string') {
      return json({ 
        success: false, 
        error: 'Pergunta é obrigatória' 
      }, { status: 400 });
    }

    // IA Contextual resolve diretamente
    const response = await aiAtendimento.resolveQuestion(question);

    console.log(`✅ Resposta IA: ${response.category} | ${response.confidence}% | Especialista: ${response.specialist_used}`);

    return json({
      success: true,
      data: response,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Erro na IA Contextual:', error);
    
    // Fallback mínimo  
    return json({
      success: true,
      data: {
        success: false,
        category: 'Erro',
        confidence: 0,
        answer: 'Houve um problema técnico. Entre em contato via WhatsApp (11) 99999-0000 para resolução imediata.',
        source: 'fallback',
        next_actions: [
          { label: 'WhatsApp Urgente', action: 'whatsapp', value: '5511999990000', priority: 'high' }
        ],
        escalate: true,
        specialist_used: 'Fallback de Erro',
        processing_steps: ['❌ Erro no processamento']
      },
      timestamp: new Date().toISOString()
    });
  }
}; 