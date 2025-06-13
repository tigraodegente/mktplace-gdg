import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { aiApprovalService } from '$lib/services/aiApprovalService';
import type { SessionFilters, CreateSessionRequest } from '$lib/types/aiApproval';

// GET /api/ai-approval/sessions - Listar sessões de aprovação
export const GET: RequestHandler = async ({ url }) => {
  try {
    const filters: SessionFilters = {};
    
    // Extrair filtros da query string
    const entityType = url.searchParams.get('entity_type');
    if (entityType) filters.entity_type = entityType;
    
    const entityId = url.searchParams.get('entity_id');
    if (entityId) filters.entity_id = entityId;
    
    const status = url.searchParams.get('status');
    if (status) filters.status = status as any;
    
    const createdBy = url.searchParams.get('created_by');
    if (createdBy) filters.created_by = createdBy;
    
    const createdAfter = url.searchParams.get('created_after');
    if (createdAfter) filters.created_after = createdAfter;
    
    const createdBefore = url.searchParams.get('created_before');
    if (createdBefore) filters.created_before = createdBefore;
    
    const hasPending = url.searchParams.get('has_pending');
    if (hasPending) filters.has_pending = hasPending === 'true';
    
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    
    const sessions = await aiApprovalService.getSessions(filters, page, limit);
    
    return json({
      success: true,
      data: sessions,
      meta: {
        page,
        limit,
        total: sessions.length,
        filters
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar sessões:', error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno'
    }, { status: 500 });
  }
};

// POST /api/ai-approval/sessions - Criar nova sessão de aprovação
export const POST: RequestHandler = async ({ request }) => {
  try {
    const data: CreateSessionRequest = await request.json();
    
    // TODO: Pegar user ID do contexto de autenticação
    const userId = 'current-user-id'; // Placeholder
    
    const session = await aiApprovalService.createSession(data, userId);
    
    return json({
      success: true,
      data: session,
      message: 'Sessão de aprovação criada com sucesso'
    });
    
  } catch (error) {
    console.error('❌ Erro ao criar sessão:', error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno'
    }, { status: 400 });
  }
}; 