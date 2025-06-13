import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { aiApprovalService } from '$lib/services/aiApprovalService';
import type { SuggestionFilters, ApprovalRequest, BulkApprovalRequest } from '$lib/types/aiApproval';

// GET /api/ai-approval/suggestions - Listar sugestões
export const GET: RequestHandler = async ({ url }) => {
  try {
    const filters: SuggestionFilters = {};
    
    // Extrair filtros da query string
    const sessionId = url.searchParams.get('session_id');
    if (sessionId) filters.session_id = sessionId;
    
    const fieldName = url.searchParams.get('field_name');
    if (fieldName) filters.field_name = fieldName;
    
    const category = url.searchParams.get('category');
    if (category) filters.category = category;
    
    const status = url.searchParams.get('status');
    if (status) filters.status = status as any;
    
    const source = url.searchParams.get('source');
    if (source) filters.source = source as any;
    
    const confidenceAbove = url.searchParams.get('confidence_above');
    if (confidenceAbove) filters.confidence_above = parseInt(confidenceAbove);
    
    const confidenceBelow = url.searchParams.get('confidence_below');
    if (confidenceBelow) filters.confidence_below = parseInt(confidenceBelow);
    
    const approvedBy = url.searchParams.get('approved_by');
    if (approvedBy) filters.approved_by = approvedBy;
    
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    
    const suggestions = await aiApprovalService.getSuggestions(filters, page, limit);
    
    // Calcular estatísticas das sugestões
    const stats = {
      total: suggestions.length,
      by_status: suggestions.reduce((acc, s) => {
        acc[s.status] = (acc[s.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      by_category: suggestions.reduce((acc, s) => {
        acc[s.category] = (acc[s.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      by_confidence: {
        high: suggestions.filter(s => s.confidence >= 80).length,
        medium: suggestions.filter(s => s.confidence >= 50 && s.confidence < 80).length,
        low: suggestions.filter(s => s.confidence < 50).length
      }
    };
    
    return json({
      success: true,
      data: suggestions,
      meta: {
        page,
        limit,
        total: suggestions.length,
        filters,
        stats
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar sugestões:', error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno'
    }, { status: 500 });
  }
};

// POST /api/ai-approval/suggestions - Aprovar/Rejeitar sugestões
export const POST: RequestHandler = async ({ request }) => {
  try {
    const data: ApprovalRequest = await request.json();
    
    // TODO: Pegar user ID do contexto de autenticação
    const userId = 'current-user-id'; // Placeholder
    
    const result = await aiApprovalService.approveSuggestions(data, userId);
    
    return json({
      success: result.success,
      data: result,
      message: `${result.affected_suggestions} sugestões processadas com sucesso`
    });
    
  } catch (error) {
    console.error('❌ Erro ao processar sugestões:', error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno'
    }, { status: 400 });
  }
}; 