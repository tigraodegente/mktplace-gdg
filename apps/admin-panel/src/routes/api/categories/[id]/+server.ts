import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withAdminAuth } from '@mktplace/utils';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!);

export const GET: RequestHandler = withAdminAuth(async ({ params }) => {
  try {
    const { id } = params;
    
    console.log(`🔌 Dev: NEON - Buscando categoria: ${id}`);
    
    const category = await sql`
      SELECT 
        id,
        name,
        description,
        image,
        parent_id,
        is_active,
        "order",
        created_at,
        updated_at
      FROM categories 
      WHERE id = ${id}
    `;
    
    if (category.length === 0) {
      return json({ 
        success: false, 
        error: { message: 'Categoria não encontrada' } 
      }, { status: 404 });
    }
    
    console.log(`✅ Categoria encontrada: ${category[0].name}`);
    
    return json({
      success: true,
      data: category[0]
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar categoria:', error);
    return json({ 
      success: false, 
      error: { message: 'Erro interno do servidor' } 
    }, { status: 500 });
  }
});

export const PUT: RequestHandler = withAdminAuth(async ({ params, request }) => {
  try {
    const { id } = params;
    const data = await request.json();
    
    console.log(`🔌 Dev: NEON - Atualizando categoria: ${id}`);
    
    // Validação básica
    if (!data.name) {
      return json({
        success: false,
        error: { message: 'Nome é obrigatório' }
      }, { status: 400 });
    }
    
    const updatedCategory = await sql`
      UPDATE categories SET
        name = ${data.name},
        description = ${data.description || null},
        image = ${data.image || null},
        parent_id = ${data.parent_id || null},
        "order" = ${data.order || 0},
        is_active = ${data.is_active || false},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    
    if (updatedCategory.length === 0) {
      return json({ 
        success: false, 
        error: { message: 'Categoria não encontrada' } 
      }, { status: 404 });
    }
    
    console.log(`✅ Categoria atualizada: ${updatedCategory[0].name}`);
    
    return json({
      success: true,
      data: updatedCategory[0],
      message: 'Categoria atualizada com sucesso'
    });
    
  } catch (error) {
    console.error('❌ Erro ao atualizar categoria:', error);
    return json({ 
      success: false, 
      error: { message: 'Erro interno do servidor' } 
    }, { status: 500 });
  }
});

export const DELETE: RequestHandler = withAdminAuth(async ({ params }) => {
  try {
    const { id } = params;
    
    console.log(`🔌 Dev: NEON - Deletando categoria: ${id}`);
    
    const deletedCategory = await sql`
      DELETE FROM categories 
      WHERE id = ${id}
      RETURNING name
    `;
    
    if (deletedCategory.length === 0) {
      return json({ 
        success: false, 
        error: { message: 'Categoria não encontrada' } 
      }, { status: 404 });
    }
    
    console.log(`✅ Categoria deletada: ${deletedCategory[0].name}`);
    
    return json({
      success: true,
      message: 'Categoria deletada com sucesso'
    });
    
  } catch (error) {
    console.error('❌ Erro ao deletar categoria:', error);
    return json({ 
      success: false, 
      error: { message: 'Erro interno do servidor' } 
    }, { status: 500 });
  }
}); 