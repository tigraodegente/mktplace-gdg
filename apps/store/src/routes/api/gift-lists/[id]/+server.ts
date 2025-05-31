import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db/index.js';

// Buscar lista específica (por ID ou share_token)
export const GET: RequestHandler = async ({ params, url, platform, request }) => {
  try {
    const { id } = params;
    const includeItems = url.searchParams.get('include_items') === 'true';
    const includeContributions = url.searchParams.get('include_contributions') === 'true';
    const userAgent = request.headers.get('user-agent') || '';
    const ip = request.headers.get('x-forwarded-for') || 'unknown';

    const result = await withDatabase(platform, async (db) => {
      // Buscar lista (por ID ou token)
      const [list] = await db.query`
        SELECT 
          gl.*,
          u.name as owner_name,
          u.email as owner_email,
          u.avatar as owner_avatar,
          COUNT(gli.id) as total_items,
          COUNT(CASE WHEN gli.is_purchased = true THEN 1 END) as purchased_items,
          ROUND((gl.collected_amount / GREATEST(gl.goal_amount, 1)) * 100, 2) as completion_percentage
        FROM gift_lists gl
        LEFT JOIN users u ON u.id = gl.user_id
        LEFT JOIN gift_list_items gli ON gli.list_id = gl.id AND gli.is_active = true
        WHERE gl.id = ${id} OR gl.share_token = ${id}
        GROUP BY gl.id, u.name, u.email, u.avatar
      `;

      if (!list) {
        return null;
      }

      // Registrar visualização
      await db.query`
        UPDATE gift_lists 
        SET view_count = view_count + 1, updated_at = NOW()
        WHERE id = ${list.id}
      `;

      // Registrar analytics
      await db.query`
        SELECT record_gift_list_metric(
          ${list.id}, 'view', 1, 'direct',
          ${JSON.stringify({ user_agent: userAgent, ip: ip })}
        )
      `;

      let items = [];
      let contributions = [];

      // Incluir itens se solicitado
      if (includeItems) {
        items = await db.query`
          SELECT 
            gli.*,
            p.name as product_name,
            p.slug as product_slug,
            pi.url as product_image,
            ROUND((gli.collected_amount / gli.target_amount) * 100, 2) as completion_percentage,
            CASE WHEN gli.collected_amount >= gli.target_amount THEN true ELSE false END as is_fully_funded
          FROM gift_list_items gli
          LEFT JOIN products p ON p.id = gli.product_id
          LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.position = 0
          WHERE gli.list_id = ${list.id} AND gli.is_active = true
          ORDER BY gli.priority DESC, gli.display_order ASC, gli.created_at ASC
        `;
      }

      // Incluir contribuições se solicitado
      if (includeContributions) {
        contributions = await db.query`
          SELECT 
            gc.id,
            gc.amount,
            gc.message,
            gc.is_anonymous,
            gc.payment_status,
            gc.created_at,
            CASE 
              WHEN gc.is_anonymous = true THEN 'Anônimo'
              ELSE gc.contributor_name
            END as display_name,
            gli.custom_item_name,
            gli.target_amount as item_target_amount
          FROM gift_contributions gc
          LEFT JOIN gift_list_items gli ON gli.id = gc.item_id
          WHERE gc.list_id = ${list.id} 
          AND gc.payment_status = 'paid'
          ORDER BY gc.created_at DESC
        `;
      }

      return {
        ...list,
        items,
        contributions,
        stats: {
          total_items: list.total_items,
          purchased_items: list.purchased_items,
          completion_percentage: list.completion_percentage,
          total_contributors: contributions.length
        }
      };
    });

    if (!result) {
      return json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Lista de presentes não encontrada'
        }
      }, { status: 404 });
    }

    return json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Erro ao buscar lista de presentes:', error);
    return json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Erro ao buscar lista de presentes'
      }
    }, { status: 500 });
  }
};

// Atualizar lista de presentes
export const PUT: RequestHandler = async ({ params, request, platform, locals }) => {
  try {
    const { id } = params;
    const data = await request.json();

    const result = await withDatabase(platform, async (db) => {
      // Verificar se a lista existe e se o usuário pode editá-la
      const [existingList] = await db.query`
        SELECT user_id FROM gift_lists WHERE id = ${id}
      `;

      if (!existingList) {
        return { error: 'Lista não encontrada', status: 404 };
      }

      // Atualizar lista
      const [updatedList] = await db.query`
        UPDATE gift_lists SET
          title = COALESCE(${data.title}, title),
          description = COALESCE(${data.description}, description),
          event_date = COALESCE(${data.event_date}, event_date),
          event_location = COALESCE(${data.event_location}, event_location),
          couple_name_1 = COALESCE(${data.couple_name_1}, couple_name_1),
          couple_name_2 = COALESCE(${data.couple_name_2}, couple_name_2),
          baby_name = COALESCE(${data.baby_name}, baby_name),
          baby_gender = COALESCE(${data.baby_gender}, baby_gender),
          cover_image = COALESCE(${data.cover_image}, cover_image),
          theme_color = COALESCE(${data.theme_color}, theme_color),
          privacy = COALESCE(${data.privacy}, privacy),
          allow_partial_contributions = COALESCE(${data.allow_partial_contributions}, allow_partial_contributions),
          allow_anonymous_contributions = COALESCE(${data.allow_anonymous_contributions}, allow_anonymous_contributions),
          minimum_contribution = COALESCE(${data.minimum_contribution}, minimum_contribution),
          goal_amount = COALESCE(${data.goal_amount}, goal_amount),
          expires_at = COALESCE(${data.expires_at}, expires_at),
          thank_you_message = COALESCE(${data.thank_you_message}, thank_you_message),
          delivery_address = COALESCE(${data.delivery_address ? JSON.stringify(data.delivery_address) : null}, delivery_address),
          settings = COALESCE(${data.settings ? JSON.stringify(data.settings) : null}, settings),
          status = COALESCE(${data.status}, status),
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;

      // Log da atividade
      await db.query`
        SELECT log_gift_list_activity(
          ${id}, ${existingList.user_id}, 'UPDATE',
          ${JSON.stringify(data)}
        )
      `;

      return { data: updatedList };
    });

    if (result.error) {
      return json({
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: result.error
        }
      }, { status: result.status || 500 });
    }

    return json({
      success: true,
      data: result.data,
      message: 'Lista de presentes atualizada com sucesso!'
    });

  } catch (error) {
    console.error('Erro ao atualizar lista de presentes:', error);
    return json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Erro ao atualizar lista de presentes'
      }
    }, { status: 500 });
  }
};

// Deletar lista de presentes
export const DELETE: RequestHandler = async ({ params, platform, locals }) => {
  try {
    const { id } = params;

    const result = await withDatabase(platform, async (db) => {
      // Verificar se a lista existe
      const [existingList] = await db.query`
        SELECT user_id, title FROM gift_lists WHERE id = ${id}
      `;

      if (!existingList) {
        return { error: 'Lista não encontrada', status: 404 };
      }

      // Soft delete (marcar como cancelada)
      await db.query`
        UPDATE gift_lists 
        SET status = 'cancelled', updated_at = NOW()
        WHERE id = ${id}
      `;

      // Log da atividade
      await db.query`
        SELECT log_gift_list_activity(
          ${id}, ${existingList.user_id}, 'DELETE',
          ${JSON.stringify({ title: existingList.title })}
        )
      `;

      return { success: true };
    });

    if (result.error) {
      return json({
        success: false,
        error: {
          code: 'DELETE_ERROR',
          message: result.error
        }
      }, { status: result.status || 500 });
    }

    return json({
      success: true,
      message: 'Lista de presentes removida com sucesso!'
    });

  } catch (error) {
    console.error('Erro ao deletar lista de presentes:', error);
    return json({
      success: false,
      error: {
        code: 'DELETE_ERROR',
        message: 'Erro ao deletar lista de presentes'
      }
    }, { status: 500 });
  }
}; 