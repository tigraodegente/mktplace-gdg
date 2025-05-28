import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getXataClient } from '$lib/xata';

export const GET: RequestHandler = async () => {
  try {
    const xata = getXataClient();
    
    // Buscar todas as categorias ativas
    const categories = await xata.db.categories
      .filter({ is_active: true })
      .sort('position', 'asc')
      .getAll();
    
    // Formatar categorias para o frontend
    const formattedCategories = categories.map(category => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      image_url: category.image_url,
      parent_id: category.parent_id,
      position: category.position,
      // Adicionar contagem de produtos se necessário
      product_count: 0 // TODO: Implementar contagem real
    }));
    
    // Organizar em hierarquia (categorias principais e subcategorias)
    const mainCategories = formattedCategories.filter(cat => !cat.parent_id);
    const categoriesWithChildren = mainCategories.map(parent => ({
      ...parent,
      children: formattedCategories.filter(cat => cat.parent_id === parent.id)
    }));
    
    return json({
      success: true,
      data: {
        categories: categoriesWithChildren,
        total: categories.length
      }
    });
    
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    return json({
      success: false,
      error: { message: 'Erro ao buscar categorias' }
    }, { status: 500 });
  }
}; 