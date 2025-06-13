import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { virtualFieldService } from '$lib/services/virtualFieldService';

// GET /api/virtual-fields/templates - Listar templates de fórmulas
export const GET: RequestHandler = async ({ url }) => {
  try {
    const category = url.searchParams.get('category');
    
    const [templates, categories] = await Promise.all([
      virtualFieldService.getFormulaTemplates(category || undefined),
      virtualFieldService.getTemplateCategories()
    ]);
    
    return json({
      success: true,
      data: templates,
      categories: categories,
      meta: {
        total: templates.length,
        filtered_by_category: category
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar templates:', error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno'
    }, { status: 500 });
  }
}; 