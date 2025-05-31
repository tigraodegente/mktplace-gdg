import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db/index.js';

// Listar templates disponíveis
export const GET: RequestHandler = async ({ url, platform }) => {
  try {
    const type = url.searchParams.get('type');
    const limit = Number(url.searchParams.get('limit')) || 20;

    const result = await withDatabase(platform, async (db) => {
      let whereClause = 'WHERE glt.is_active = true';
      
      if (type) {
        whereClause += ` AND glt.type = '${type}'`;
      }

      const templates = await db.query`
        SELECT 
          glt.*,
          u.name as created_by_name,
          CASE 
            WHEN glt.default_items IS NOT NULL THEN 
              json_array_length(glt.default_items::json)
            ELSE 0 
          END as items_count
        FROM gift_list_templates glt
        LEFT JOIN users u ON u.id = glt.created_by
        ${whereClause}
        ORDER BY glt.usage_count DESC, glt.created_at DESC
        LIMIT ${limit}
      `;

      return templates;
    });

    return json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Erro ao buscar templates:', error);
    return json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Erro ao buscar templates'
      }
    }, { status: 500 });
  }
};

// Criar novo template
export const POST: RequestHandler = async ({ request, platform }) => {
  try {
    const data = await request.json();

    // Validação básica
    if (!data.name || !data.type) {
      return json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Nome e tipo são obrigatórios'
        }
      }, { status: 400 });
    }

    const result = await withDatabase(platform, async (db) => {
      const [newTemplate] = await db.query`
        INSERT INTO gift_list_templates (
          name, type, description, cover_image, theme_color,
          default_items, suggested_categories, created_by
        ) VALUES (
          ${data.name}, ${data.type}, ${data.description || null},
          ${data.cover_image || null}, ${data.theme_color || '#FF69B4'},
          ${JSON.stringify(data.default_items || [])}, 
          ${data.suggested_categories || []},
          ${data.created_by || null}
        )
        RETURNING *
      `;

      return newTemplate;
    });

    return json({
      success: true,
      data: result,
      message: 'Template criado com sucesso!'
    });

  } catch (error) {
    console.error('Erro ao criar template:', error);
    return json({
      success: false,
      error: {
        code: 'CREATE_ERROR',
        message: 'Erro ao criar template'
      }
    }, { status: 500 });
  }
}; 