import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db/index.js';

// Listar listas de presentes públicas ou do usuário
export const GET: RequestHandler = async ({ url, platform, locals }) => {
  try {
    const userId = url.searchParams.get('user_id');
    const type = url.searchParams.get('type');
    const limit = Number(url.searchParams.get('limit')) || 20;
    const offset = Number(url.searchParams.get('offset')) || 0;
    const publicOnly = url.searchParams.get('public') === 'true';

    const result = await withDatabase(platform, async (db) => {
      let whereClause = "WHERE gl.status = 'active'";
      const params: any[] = [];

      if (publicOnly) {
        whereClause += " AND gl.privacy = 'public'";
      } else if (userId) {
        params.push(userId);
        whereClause += ` AND gl.user_id = $${params.length}`;
      }

      if (type) {
        params.push(type);
        whereClause += ` AND gl.type = $${params.length}`;
      }

      params.push(limit, offset);

      const lists = await db.query`
        SELECT 
          gl.*,
          u.name as owner_name,
          u.email as owner_email,
          COUNT(gli.id) as total_items,
          COUNT(CASE WHEN gli.is_purchased = true THEN 1 END) as purchased_items,
          ROUND((gl.collected_amount / GREATEST(gl.goal_amount, 1)) * 100, 2) as completion_percentage
        FROM gift_lists gl
        LEFT JOIN users u ON u.id = gl.user_id
        LEFT JOIN gift_list_items gli ON gli.list_id = gl.id AND gli.is_active = true
        ${whereClause}
        GROUP BY gl.id, u.name, u.email
        ORDER BY gl.created_at DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}
      `;

      return lists;
    });

    return json({
      success: true,
      data: result,
      meta: {
        total: result.length,
        limit,
        offset
      }
    });

  } catch (error) {
    console.error('Erro ao buscar listas de presentes:', error);
    return json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Erro ao buscar listas de presentes'
      }
    }, { status: 500 });
  }
};

// Criar nova lista de presentes
export const POST: RequestHandler = async ({ request, platform, locals }) => {
  try {
    const data = await request.json();
    
    // Validação básica
    if (!data.title || !data.type || !data.user_id) {
      return json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Título, tipo e usuário são obrigatórios'
        }
      }, { status: 400 });
    }

    const result = await withDatabase(platform, async (db) => {
      // Criar a lista
      const [newList] = await db.query`
        INSERT INTO gift_lists (
          user_id, type, title, description, event_date, event_location,
          couple_name_1, couple_name_2, baby_name, baby_gender,
          cover_image, theme_color, privacy, allow_partial_contributions,
          allow_anonymous_contributions, minimum_contribution, goal_amount,
          expires_at, thank_you_message, delivery_address, settings
        ) VALUES (
          ${data.user_id}, ${data.type}, ${data.title}, ${data.description || null},
          ${data.event_date || null}, ${data.event_location || null},
          ${data.couple_name_1 || null}, ${data.couple_name_2 || null},
          ${data.baby_name || null}, ${data.baby_gender || null},
          ${data.cover_image || null}, ${data.theme_color || '#FF69B4'},
          ${data.privacy || 'public'}, ${data.allow_partial_contributions !== false},
          ${data.allow_anonymous_contributions !== false}, ${data.minimum_contribution || 10.00},
          ${data.goal_amount || null}, ${data.expires_at || null},
          ${data.thank_you_message || null}, ${JSON.stringify(data.delivery_address || {})},
          ${JSON.stringify(data.settings || {})}
        )
        RETURNING *
      `;

      // Se tem template, adicionar itens padrão
      if (data.template_id) {
        const [template] = await db.query`
          SELECT default_items FROM gift_list_templates 
          WHERE id = ${data.template_id} AND is_active = true
        `;

        if (template?.default_items) {
          const items = JSON.parse(template.default_items);
          for (const item of items) {
            await db.query`
              INSERT INTO gift_list_items (
                list_id, custom_item_name, category, priority, target_amount
              ) VALUES (
                ${newList.id}, ${item.name}, ${item.category}, 
                ${item.priority}, ${item.price || 100.00}
              )
            `;
          }
        }
      }

      // Log da atividade
      await db.query`
        SELECT log_gift_list_activity(
          ${newList.id}, ${data.user_id}, 'CREATE',
          ${JSON.stringify({ type: data.type, title: data.title })}
        )
      `;

      return newList;
    });

    return json({
      success: true,
      data: result,
      message: 'Lista de presentes criada com sucesso!'
    });

  } catch (error) {
    console.error('Erro ao criar lista de presentes:', error);
    return json({
      success: false,
      error: {
        code: 'CREATE_ERROR',
        message: 'Erro ao criar lista de presentes'
      }
    }, { status: 500 });
  }
}; 