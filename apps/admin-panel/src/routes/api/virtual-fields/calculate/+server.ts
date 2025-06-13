import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { virtualFieldService } from '$lib/services/virtualFieldService';
import type { BatchCalculationRequest } from '$lib/types/virtualFields';

// POST /api/virtual-fields/calculate - Calcular campos virtuais
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    
    // Verificar se é cálculo individual ou em lote
    if (body.field_name && body.entity_data) {
      // Cálculo individual
      const { field_name, entity_data, context } = body;
      
      const result = await virtualFieldService.calculateVirtualField(
        field_name,
        entity_data,
        context
      );
      
      return json({
        success: true,
        data: result
      });
      
    } else if (body.entity_data && !body.field_name) {
      // Calcular todos os campos para uma entidade
      const { entity_data, context } = body;
      
      const results = await virtualFieldService.calculateAllVirtualFields(
        entity_data,
        context
      );
      
      return json({
        success: true,
        data: results
      });
      
    } else if (body.entity_type && body.entity_ids) {
      // Cálculo em lote
      const batchRequest: BatchCalculationRequest = body;
      
      const result = await virtualFieldService.batchCalculate(batchRequest);
      
      return json(result);
      
    } else {
      return json({
        success: false,
        error: 'Formato de requisição inválido. Forneça field_name + entity_data ou entity_type + entity_ids'
      }, { status: 400 });
    }
    
  } catch (error) {
    console.error('❌ Erro ao calcular campos virtuais:', error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno'
    }, { status: 500 });
  }
}; 