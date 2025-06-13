import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { aiApprovalService } from '$lib/services/aiApprovalService';
import type { BulkApprovalRequest } from '$lib/types/aiApproval';

// POST /api/ai-approval/bulk - Aprovação/Rejeição em lote
export const POST: RequestHandler = async ({ request }) => {
  try {
    const data: BulkApprovalRequest = await request.json();
    
    // Validar dados obrigatórios
    if (!data.session_id) {
      return json({
        success: false,
        error: 'session_id é obrigatório'
      }, { status: 400 });
    }
    
    if (!data.action || !['approve', 'reject'].includes(data.action)) {
      return json({
        success: false,
        error: 'action deve ser "approve" ou "reject"'
      }, { status: 400 });
    }
    
    // TODO: Pegar user ID do contexto de autenticação
    const userId = 'current-user-id'; // Placeholder
    
    const result = await aiApprovalService.bulkApproval(data, userId);
    
    return json({
      success: result.success,
      data: result,
      message: `Operação em lote concluída: ${result.affected_suggestions} sugestões ${data.action === 'approve' ? 'aprovadas' : 'rejeitadas'}`
    });
    
  } catch (error) {
    console.error('❌ Erro na operação em lote:', error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno'
    }, { status: 400 });
  }
}; 