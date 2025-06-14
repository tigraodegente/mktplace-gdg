import { json } from '@sveltejs/kit';
import { TIMEOUT_CONFIG, withTimeout } from '$lib/config/timeouts';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db/index.js';

// Listar listas de presentes públicas ou do usuário
export const GET: RequestHandler = async ({ url, platform, locals }) => {
  try {
    console.log('🎁 Gift Lists GET - Estratégia híbrida iniciada');
    
    const userId = url.searchParams.get('user_id');
    const type = url.searchParams.get('type');
    const limit = Number(url.searchParams.get('limit')) || 20;
    const offset = Number(url.searchParams.get('offset')) || 0;
    const publicOnly = url.searchParams.get('public') === 'true';

    // Tentar buscar gift lists com timeout
    try {
      const db = getDatabase(platform);
      
      // Promise com timeout de 4 segundos
      const queryPromise = (async () => {
        // STEP 1: Buscar gift lists (query simplificada)
        let giftLists = [];
        try {
          let baseQuery = `
            SELECT gl.id, gl.user_id, gl.type, gl.title, gl.description,
                   gl.event_date, gl.privacy, gl.goal_amount, gl.collected_amount,
                   gl.created_at, gl.status, gl.cover_image, gl.theme_color
            FROM gift_lists gl
            WHERE gl.status = 'active'
          `;
          let queryParams = [];
          let paramIndex = 1;

      if (publicOnly) {
            baseQuery += ` AND gl.privacy = 'public'`;
      } else if (userId) {
            baseQuery += ` AND gl.user_id = $${paramIndex}`;
            queryParams.push(userId);
            paramIndex++;
      }

      if (type) {
            baseQuery += ` AND gl.type = $${paramIndex}`;
            queryParams.push(type);
            paramIndex++;
          }

          baseQuery += ` ORDER BY gl.created_at DESC LIMIT ${limit} OFFSET ${offset}`;

          giftLists = await db.query(baseQuery, ...queryParams);
        } catch (e) {
          console.log('Erro ao buscar gift lists, usando fallback');
      }

        // STEP 2: Para cada lista, buscar informações adicionais (queries simplificadas)
        const enrichedLists = [];
        for (const list of giftLists) {
          try {
            // Buscar owner info
            const owners = await db.query`
              SELECT name, email FROM users WHERE id = ${list.user_id} LIMIT 1
            `;
            
            // Buscar contagem de itens
            const itemCounts = await db.query`
              SELECT COUNT(*) as total_items,
                     COUNT(CASE WHEN is_purchased = true THEN 1 END) as purchased_items
              FROM gift_list_items 
              WHERE list_id = ${list.id} AND is_active = true
            `;

            const owner = owners[0] || { name: 'Usuário', email: '' };
            const counts = itemCounts[0] || { total_items: 0, purchased_items: 0 };
            
            enrichedLists.push({
              ...list,
              owner_name: owner.name,
              owner_email: owner.email,
              total_items: parseInt(counts.total_items),
              purchased_items: parseInt(counts.purchased_items),
              completion_percentage: list.goal_amount > 0 
                ? Math.round((list.collected_amount / list.goal_amount) * 100 * 100) / 100
                : 0
            });
          } catch (e) {
            // Adicionar com dados básicos se derro
            enrichedLists.push({
              ...list,
              owner_name: 'Usuário',
              owner_email: '',
              total_items: 0,
              purchased_items: 0,
              completion_percentage: 0
            });
          }
        }

        return enrichedLists;
      })();
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 4000)
      });
      
      const result = await Promise.race([queryPromise, timeoutPromise]) as any;
      
      console.log(`✅ Gift lists encontradas: ${result.length}`);

    return json({
      success: true,
      data: result,
      meta: {
        total: result.length,
        limit,
        offset
        },
        source: 'database'
    });
      
    } catch (error) {
      console.log(`⚠️ Erro gift lists GET: ${error instanceof Error ? error.message : 'Erro'}`);
      
      // Retornar erro ao invés de dados mockados
      return json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Não foi possível carregar as listas de presentes',
          details: 'Por favor, tente novamente em alguns instantes'
        }
      }, { status: 503 });
    }

  } catch (error) {
    console.error('❌ Erro crítico gift lists GET:', error);
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
    console.log('🎁 Gift Lists POST - Estratégia híbrida iniciada');
    
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

    // Tentar criar gift list com timeout
    try {
      const db = getDatabase(platform);
      
      // Promise com timeout de 5 segundos
      const queryPromise = (async () => {
        // STEP 1: Criar a lista (query simplificada)
        const listId = `list-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        
        const newLists = await db.query`
        INSERT INTO gift_lists (
            id, user_id, type, title, description, event_date, event_location,
          couple_name_1, couple_name_2, baby_name, baby_gender,
          cover_image, theme_color, privacy, allow_partial_contributions,
          allow_anonymous_contributions, minimum_contribution, goal_amount,
            expires_at, thank_you_message, delivery_address, settings,
            status, created_at
        ) VALUES (
            ${listId}, ${data.user_id}, ${data.type}, ${data.title}, 
            ${data.description || null}, ${data.event_date || null}, 
            ${data.event_location || null}, ${data.couple_name_1 || null}, 
            ${data.couple_name_2 || null}, ${data.baby_name || null}, 
            ${data.baby_gender || null}, ${data.cover_image || null}, 
            ${data.theme_color || '#FF69B4'}, ${data.privacy || 'public'}, 
            ${data.allow_partial_contributions !== false}, 
            ${data.allow_anonymous_contributions !== false}, 
            ${data.minimum_contribution || 10.00}, ${data.goal_amount || null}, 
            ${data.expires_at || null}, ${data.thank_you_message || null}, 
            ${JSON.stringify(data.delivery_address || {})}, 
            ${JSON.stringify(data.settings || {})},
            'active', NOW()
        )
        RETURNING *
      `;

        const newList = newLists[0];

        // STEP 2: Operações async (não travar resposta)
        setTimeout(async () => {
          try {
      // Se tem template, adicionar itens padrão
      if (data.template_id) {
              const templates = await db.query`
          SELECT default_items FROM gift_list_templates 
          WHERE id = ${data.template_id} AND is_active = true
                LIMIT 1
        `;

              if (templates.length > 0 && templates[0].default_items) {
                const items = JSON.parse(templates[0].default_items);
          for (const item of items) {
                  const itemId = `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
            await db.query`
              INSERT INTO gift_list_items (
                      id, list_id, custom_item_name, category, priority, target_amount,
                      is_active, created_at
              ) VALUES (
                      ${itemId}, ${newList.id}, ${item.name}, ${item.category}, 
                      ${item.priority}, ${item.price || 100.00}, true, NOW()
              )
            `;
          }
        }
      }

      // Log da atividade
      await db.query`
              INSERT INTO gift_list_activities (
                list_id, user_id, action, details, created_at
              ) VALUES (
          ${newList.id}, ${data.user_id}, 'CREATE',
                ${JSON.stringify({ type: data.type, title: data.title })}, NOW()
        )
      `;
          } catch (e) {
            console.log('Template/activity setup async failed:', e);
          }
        }, 100);

      return newList;
      })();
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 5000)
    });
      
      const result = await Promise.race([queryPromise, timeoutPromise]) as any;
      
      console.log(`✅ Gift list criada: ${result.title}`);

    return json({
      success: true,
      data: result,
        message: 'Lista de presentes criada com sucesso!',
        source: 'database'
    });
      
    } catch (error) {
      console.log(`⚠️ Erro gift lists POST: ${error instanceof Error ? error.message : 'Erro'}`);
      
      // Retornar erro ao invés de dados mockados
      return json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Não foi possível criar a lista de presentes',
          details: 'Por favor, tente novamente em alguns instantes'
        }
      }, { status: 503 });
    }

  } catch (error) {
    console.error('❌ Erro crítico gift lists POST:', error);
    return json({
      success: false,
      error: {
        code: 'CREATE_ERROR',
        message: 'Erro ao criar lista de presentes'
      }
    }, { status: 500 });
  }
}; 