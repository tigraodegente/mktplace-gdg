import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db/index.js';

// Listar itens de uma lista
export const GET: RequestHandler = async ({ params, url, platform }) => {
  try {
    const { id: listId } = params;
    const includeContributions = url.searchParams.get('include_contributions') === 'true';

    const result = await withDatabase(platform, async (db) => {
      // Buscar itens da lista
      const items = await db.query`
        SELECT 
          gli.*,
          p.name as product_name,
          p.slug as product_slug,
          p.price as product_price,
          pi.url as product_image,
          b.name as brand_name,
          c.name as category_name,
          ROUND((gli.collected_amount / gli.target_amount) * 100, 2) as completion_percentage,
          CASE WHEN gli.collected_amount >= gli.target_amount THEN true ELSE false END as is_fully_funded,
          gli.target_amount - gli.collected_amount as remaining_amount
        FROM gift_list_items gli
        LEFT JOIN products p ON p.id = gli.product_id
        LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.position = 0
        LEFT JOIN brands b ON b.id = p.brand_id
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE gli.list_id = ${listId} AND gli.is_active = true
        ORDER BY gli.priority DESC, gli.display_order ASC, gli.created_at ASC
      `;

      let itemsWithContributions = items;

      // Incluir contribuições se solicitado
      if (includeContributions) {
        for (const item of itemsWithContributions) {
          const contributions = await db.query`
            SELECT 
              gc.id,
              gc.amount,
              gc.message,
              gc.is_anonymous,
              gc.created_at,
              CASE 
                WHEN gc.is_anonymous = true THEN 'Anônimo'
                ELSE gc.contributor_name
              END as display_name
            FROM gift_contributions gc
            WHERE gc.item_id = ${item.id} AND gc.payment_status = 'paid'
            ORDER BY gc.created_at DESC
          `;
          
          item.contributions = contributions;
          item.contributor_count = contributions.length;
        }
      }

      return itemsWithContributions;
    });

    return json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Erro ao buscar itens da lista:', error);
    return json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Erro ao buscar itens da lista'
      }
    }, { status: 500 });
  }
};

// Adicionar item à lista
export const POST: RequestHandler = async ({ params, request, platform }) => {
  try {
    const { id: listId } = params;
    const data = await request.json();

    // Validação básica
    if (!data.target_amount || data.target_amount <= 0) {
      return json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Valor alvo é obrigatório e deve ser maior que zero'
        }
      }, { status: 400 });
    }

    if (!data.product_id && !data.custom_item_name) {
      return json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Produto do marketplace ou nome do item personalizado é obrigatório'
        }
      }, { status: 400 });
    }

    const result = await withDatabase(platform, async (db) => {
      // Verificar se a lista existe e está ativa
      const [list] = await db.query`
        SELECT id, user_id FROM gift_lists 
        WHERE id = ${listId} AND status = 'active'
      `;

      if (!list) {
        return { error: 'Lista não encontrada ou inativa', status: 404 };
      }

      // Se é produto do marketplace, buscar dados do produto
      let productData = null;
      if (data.product_id) {
        const [product] = await db.query`
          SELECT id, name, price, slug FROM products 
          WHERE id = ${data.product_id} AND is_active = true
        `;

        if (!product) {
          return { error: 'Produto não encontrado', status: 404 };
        }

        productData = product;
      }

      // Encontrar próximo display_order
      const [maxOrder] = await db.query`
        SELECT COALESCE(MAX(display_order), 0) + 1 as next_order
        FROM gift_list_items 
        WHERE list_id = ${listId}
      `;

      // Criar o item
      const [newItem] = await db.query`
        INSERT INTO gift_list_items (
          list_id, product_id, custom_item_name, custom_item_description,
          custom_item_image, custom_item_price, custom_item_url,
          quantity, priority, category, size_preference, color_preference,
          brand_preference, notes, target_amount, is_surprise, display_order
        ) VALUES (
          ${listId}, ${data.product_id || null}, ${data.custom_item_name || null},
          ${data.custom_item_description || null}, ${data.custom_item_image || null},
          ${data.custom_item_price || null}, ${data.custom_item_url || null},
          ${data.quantity || 1}, ${data.priority || 'medium'}, ${data.category || null},
          ${data.size_preference || null}, ${data.color_preference || null},
          ${data.brand_preference || null}, ${data.notes || null},
          ${data.target_amount}, ${data.is_surprise || false}, ${maxOrder.next_order}
        )
        RETURNING *
      `;

      // Log da atividade
      await db.query`
        SELECT log_gift_list_activity(
          ${listId}, ${list.user_id}, 'ADD_ITEM',
          ${JSON.stringify({ 
            item_name: data.custom_item_name || productData?.name,
            target_amount: data.target_amount
          })}
        )
      `;

      // Buscar item completo para retorno
      const [itemWithDetails] = await db.query`
        SELECT 
          gli.*,
          p.name as product_name,
          p.slug as product_slug,
          pi.url as product_image
        FROM gift_list_items gli
        LEFT JOIN products p ON p.id = gli.product_id
        LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.position = 0
        WHERE gli.id = ${newItem.id}
      `;

      return itemWithDetails;
    });

    if (result.error) {
      return json({
        success: false,
        error: {
          code: 'CREATE_ERROR',
          message: result.error
        }
      }, { status: result.status || 500 });
    }

    return json({
      success: true,
      data: result,
      message: 'Item adicionado à lista com sucesso!'
    });

  } catch (error) {
    console.error('Erro ao adicionar item à lista:', error);
    return json({
      success: false,
      error: {
        code: 'CREATE_ERROR',
        message: 'Erro ao adicionar item à lista'
      }
    }, { status: 500 });
  }
};

// Atualizar ordem dos itens
export const PUT: RequestHandler = async ({ params, request, platform }) => {
  try {
    const { id: listId } = params;
    const { items } = await request.json();

    if (!Array.isArray(items)) {
      return json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Lista de itens é obrigatória'
        }
      }, { status: 400 });
    }

    const result = await withDatabase(platform, async (db) => {
      // Verificar se a lista existe
      const [list] = await db.query`
        SELECT id, user_id FROM gift_lists 
        WHERE id = ${listId} AND status = 'active'
      `;

      if (!list) {
        return { error: 'Lista não encontrada', status: 404 };
      }

      // Atualizar ordem dos itens
      for (const [index, item] of items.entries()) {
        await db.query`
          UPDATE gift_list_items 
          SET display_order = ${index + 1}, updated_at = NOW()
          WHERE id = ${item.id} AND list_id = ${listId}
        `;
      }

      // Log da atividade
      await db.query`
        SELECT log_gift_list_activity(
          ${listId}, ${list.user_id}, 'REORDER_ITEMS',
          ${JSON.stringify({ items_count: items.length })}
        )
      `;

      return { success: true };
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
      message: 'Ordem dos itens atualizada com sucesso!'
    });

  } catch (error) {
    console.error('Erro ao atualizar ordem dos itens:', error);
    return json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Erro ao atualizar ordem dos itens'
      }
    }, { status: 500 });
  }
}; 