import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { virtualFieldService } from '$lib/services/virtualFieldService';
import type { VirtualFieldFormData } from '$lib/types/virtualFields';

// GET /api/virtual-fields/[id] - Buscar campo virtual específico
export const GET: RequestHandler = async ({ params }) => {
  try {
    const { id } = params;
    
    const field = await virtualFieldService.getVirtualFieldById(id);
    
    if (!field) {
      return json({
        success: false,
        error: 'Campo virtual não encontrado'
      }, { status: 404 });
    }
    
    return json({
      success: true,
      data: field
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar campo virtual:', error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno'
    }, { status: 500 });
  }
};

// PUT /api/virtual-fields/[id] - Atualizar campo virtual
export const PUT: RequestHandler = async ({ params, request }) => {
  try {
    const { id } = params;
    const data: Partial<VirtualFieldFormData> = await request.json();
    
    const field = await virtualFieldService.updateVirtualField(id, data);
    
    return json({
      success: true,
      data: field,
      message: 'Campo virtual atualizado com sucesso'
    });
    
  } catch (error) {
    console.error('❌ Erro ao atualizar campo virtual:', error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno'
    }, { status: 400 });
  }
};

// DELETE /api/virtual-fields/[id] - Deletar campo virtual
export const DELETE: RequestHandler = async ({ params }) => {
  try {
    const { id } = params;
    
    await virtualFieldService.deleteVirtualField(id);
    
    return json({
      success: true,
      message: 'Campo virtual deletado com sucesso'
    });
    
  } catch (error) {
    console.error('❌ Erro ao deletar campo virtual:', error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno'
    }, { status: 400 });
  }
}; 