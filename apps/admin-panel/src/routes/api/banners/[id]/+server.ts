import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withAdminAuth } from '@mktplace/utils';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!);

export const GET: RequestHandler = withAdminAuth(async ({ params }) => {
  try {
    const { id } = params;
    
    console.log(`🔌 Dev: NEON - Buscando banner: ${id}`);
    
    const banner = await sql`
      SELECT 
        id,
        title,
        subtitle,
        image,
        link,
        target,
        start_date,
        end_date,
        "order",
        is_active,
        created_at,
        updated_at
      FROM banners 
      WHERE id = ${id}
    `;
    
    if (banner.length === 0) {
      return json({ 
        success: false, 
        error: { message: 'Banner não encontrado' } 
      }, { status: 404 });
    }
    
    console.log(`✅ Banner encontrado: ${banner[0].title}`);
    
    return json({
      success: true,
      data: banner[0]
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar banner:', error);
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
    
    console.log(`🔌 Dev: NEON - Atualizando banner: ${id}`);
    
    // Validação básica
    if (!data.title) {
      return json({
        success: false,
        error: { message: 'Título é obrigatório' }
      }, { status: 400 });
    }
    
    const updatedBanner = await sql`
      UPDATE banners SET
        title = ${data.title},
        subtitle = ${data.subtitle || null},
        image = ${data.image || null},
        link = ${data.link || null},
        target = ${data.target || '_self'},
        start_date = ${data.start_date || null},
        end_date = ${data.end_date || null},
        "order" = ${data.order || 0},
        is_active = ${data.is_active || false},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    
    if (updatedBanner.length === 0) {
      return json({ 
        success: false, 
        error: { message: 'Banner não encontrado' } 
      }, { status: 404 });
    }
    
    console.log(`✅ Banner atualizado: ${updatedBanner[0].title}`);
    
    return json({
      success: true,
      data: updatedBanner[0],
      message: 'Banner atualizado com sucesso'
    });
    
  } catch (error) {
    console.error('❌ Erro ao atualizar banner:', error);
    return json({ 
      success: false, 
      error: { message: 'Erro interno do servidor' } 
    }, { status: 500 });
  }
});

export const DELETE: RequestHandler = withAdminAuth(async ({ params }) => {
  try {
    const { id } = params;
    
    console.log(`🔌 Dev: NEON - Deletando banner: ${id}`);
    
    const deletedBanner = await sql`
      DELETE FROM banners 
      WHERE id = ${id}
      RETURNING title
    `;
    
    if (deletedBanner.length === 0) {
      return json({ 
        success: false, 
        error: { message: 'Banner não encontrado' } 
      }, { status: 404 });
    }
    
    console.log(`✅ Banner deletado: ${deletedBanner[0].title}`);
    
    return json({
      success: true,
      message: 'Banner deletado com sucesso'
    });
    
  } catch (error) {
    console.error('❌ Erro ao deletar banner:', error);
    return json({ 
      success: false, 
      error: { message: 'Erro interno do servidor' } 
    }, { status: 500 });
  }
}); 