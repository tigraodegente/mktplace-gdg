import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { virtualFieldService } from '$lib/services/virtualFieldService';
import type { VirtualFieldFormData, VirtualFieldFilters } from '$lib/types/virtualFields';

// GET /api/virtual-fields - Listar campos virtuais
export const GET: RequestHandler = async ({ url }) => {
  try {
    const filters: VirtualFieldFilters = {};
    
    // Extrair filtros da query string
    const entityType = url.searchParams.get('entity_type');
    if (entityType) filters.entity_type = entityType as any;
    
    const fieldType = url.searchParams.get('field_type');
    if (fieldType) filters.field_type = fieldType as any;
    
    const aiEnabled = url.searchParams.get('ai_enabled');
    if (aiEnabled) filters.ai_enabled = aiEnabled === 'true';
    
    const isActive = url.searchParams.get('is_active');
    if (isActive) filters.is_active = isActive === 'true';
    
    const search = url.searchParams.get('search');
    if (search) filters.search = search;

    const fields = await virtualFieldService.getVirtualFields(filters);
    
    return json({
      success: true,
      data: fields,
      meta: {
        total: fields.length,
        filters: filters
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar campos virtuais:', error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno'
    }, { status: 500 });
  }
};

// POST /api/virtual-fields - Criar campo virtual
export const POST: RequestHandler = async ({ request }) => {
  try {
    const data: VirtualFieldFormData = await request.json();
    
    // TODO: Pegar user ID do contexto de autenticação
    const userId = 'current-user-id'; // Placeholder
    
    const field = await virtualFieldService.createVirtualField(data, userId);
    
    return json({
      success: true,
      data: field,
      message: 'Campo virtual criado com sucesso'
    });
    
  } catch (error) {
    console.error('❌ Erro ao criar campo virtual:', error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno'
    }, { status: 400 });
  }
}; 