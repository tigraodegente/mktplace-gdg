import { json } from '@sveltejs/kit';
import { TIMEOUT_CONFIG, withTimeout } from '$lib/config/timeouts';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db/index.js';

// Listar itens de uma lista
export const GET: RequestHandler = async ({ params, url, platform }) => {
  try {
    console.log('🎁 Gift List Items GET - Estratégia híbrida iniciada');
    
    const { id: listId } = params;
    const includeContributions = url.searchParams.get('include_contributions') === 'true';

    // Tentar buscar itens com timeout
    try {
      const db = getDatabase(platform);
      
      // Promise com timeout de 3 segundos
      const queryPromise = (async () => {
        // Buscar itens da lista (query simplificada)
      const items = await db.query`
          SELECT gli.id, gli.custom_item_name, gli.category, gli.priority,
                 gli.target_amount, gli.collected_amount, gli.is_purchased,
                 gli.display_order, gli.product_id, gli.created_at, gli.notes,
                 p.name as product_name, p.slug as product_slug
        FROM gift_list_items gli
        LEFT JOIN products p ON p.id = gli.product_id
        WHERE gli.list_id = ${listId} AND gli.is_active = true
        ORDER BY gli.priority DESC, gli.display_order ASC, gli.created_at ASC
          LIMIT 50
        `;

        // Enriquecer com dados calculados
        const enrichedItems = items.map((item: any) => ({
          ...item,
          completion_percentage: item.target_amount > 0 
            ? Math.round((item.collected_amount / item.target_amount) * 100 * 100) / 100
            : 0,
          is_fully_funded: item.collected_amount >= item.target_amount,
          remaining_amount: item.target_amount - item.collected_amount,
          product_image: null, // Simplificado
          brand_name: null,
          category_name: item.category || 'Geral'
        }));

      // Incluir contribuições se solicitado
      if (includeContributions) {
          for (const item of enrichedItems) {
            try {
          const contributions = await db.query`
                SELECT id, amount, message, is_anonymous, created_at,
                       contributor_name
                FROM gift_contributions
                WHERE item_id = ${item.id} AND payment_status = 'paid'
                ORDER BY created_at DESC
                LIMIT 10
          `;
          
              item.contributions = contributions.map((c: any) => ({
                ...c,
                display_name: c.is_anonymous ? 'Anônimo' : c.contributor_name
              }));
          item.contributor_count = contributions.length;
            } catch (e) {
              item.contributions = [];
              item.contributor_count = 0;
            }
          }
        }

        return enrichedItems;
      })();

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 3000)
    });
      
      const result = await Promise.race([queryPromise, timeoutPromise]) as any;
      
      console.log(`✅ Gift list items: ${result.length}`);

    return json({
      success: true,
        data: result,
        source: 'database'
    });
      
    } catch (error) {
      console.log(`⚠️ Erro items GET: ${error instanceof Error ? error.message : 'Erro'}`);
      
      // Retornar erro ao invés de dados mockados
      return json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Não foi possível carregar os itens da lista',
          details: 'Por favor, tente novamente em alguns instantes'
        }
      }, { status: 503 });
    }

  } catch (error) {
    console.error('❌ Erro crítico items GET:', error);
    return json({
      success: false,
      error: { code: 'FETCH_ERROR', message: 'Erro ao buscar itens da lista' }
    }, { status: 500 });
  }
};

// Adicionar item à lista
export const POST: RequestHandler = async ({ params, request, platform }) => {
  try {
    console.log('🎁 Gift List Items POST - Estratégia híbrida iniciada');
    
    const { id: listId } = params;
    const data = await request.json();

    // Validação básica
    if (!data.target_amount || data.target_amount <= 0) {
      return json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Valor alvo é obrigatório e deve ser maior que zero' }
      }, { status: 400 });
    }

    if (!data.product_id && !data.custom_item_name) {
      return json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Produto ou nome do item é obrigatório' }
      }, { status: 400 });
    }

    // Tentar criar item com timeout
    try {
      const db = getDatabase(platform);
      
      const queryPromise = (async () => {
        // Verificar se a lista existe
        const lists = await db.query`
        SELECT id, user_id FROM gift_lists 
        WHERE id = ${listId} AND status = 'active'
          LIMIT 1
      `;

        if (!lists.length) {
        return { error: 'Lista não encontrada ou inativa', status: 404 };
      }

      // Criar o item
        const itemId = `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
        const newItems = await db.query`
        INSERT INTO gift_list_items (
            id, list_id, product_id, custom_item_name, category,
            priority, target_amount, display_order, notes, is_active, created_at
        ) VALUES (
            ${itemId}, ${listId}, ${data.product_id || null}, 
            ${data.custom_item_name || null}, ${data.category || 'geral'},
            ${data.priority || 'medium'}, ${data.target_amount}, 
            ${data.display_order || 1}, ${data.notes || null}, true, NOW()
        )
        RETURNING *
      `;

        return newItems[0];
      })();
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 3000)
      });
      
      const result = await Promise.race([queryPromise, timeoutPromise]) as any;

    if (result.error) {
      return json({
        success: false,
          error: { code: 'CREATE_ERROR', message: result.error }
      }, { status: result.status || 500 });
    }

    return json({
      success: true,
      data: result,
        message: 'Item adicionado à lista com sucesso!',
        source: 'database'
    });
      
    } catch (error) {
      console.log(`⚠️ Erro items POST: ${error instanceof Error ? error.message : 'Erro'}`);
      
      // Retornar erro ao invés de dados mockados
      return json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Não foi possível adicionar o item',
          details: 'Por favor, tente novamente em alguns instantes'
        }
      }, { status: 503 });
    }

  } catch (error) {
    console.error('❌ Erro crítico items POST:', error);
    return json({
      success: false,
      error: { code: 'CREATE_ERROR', message: 'Erro ao adicionar item à lista' }
    }, { status: 500 });
  }
};

// Atualizar ordem dos itens
export const PUT: RequestHandler = async ({ params, request, platform }) => {
  try {
    console.log('🎁 Gift List Items PUT - Estratégia híbrida iniciada');
    
    const { id: listId } = params;
    const { items } = await request.json();

    if (!Array.isArray(items)) {
      return json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Lista de itens é obrigatória' }
      }, { status: 400 });
    }

    // Tentar atualizar com timeout
    try {
      const db = getDatabase(platform);
      
      const queryPromise = (async () => {
      // Verificar se a lista existe
        const lists = await db.query`
        SELECT id, user_id FROM gift_lists 
        WHERE id = ${listId} AND status = 'active'
          LIMIT 1
      `;

        if (!lists.length) {
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

      return { success: true };
      })();
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 2000)
      });
      
      const result = await Promise.race([queryPromise, timeoutPromise]) as any;

    if (result.error) {
      return json({
        success: false,
          error: { code: 'UPDATE_ERROR', message: result.error }
      }, { status: result.status || 500 });
    }

    return json({
      success: true,
        message: 'Ordem dos itens atualizada com sucesso!',
        source: 'database'
      });
      
    } catch (error) {
      console.log(`⚠️ Erro items PUT: ${error instanceof Error ? error.message : 'Erro'}`);
      
      // Retornar erro ao invés de dados mockados
      return json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Não foi possível atualizar a ordem dos itens',
          details: 'Por favor, tente novamente em alguns instantes'
        }
      }, { status: 503 });
    }

  } catch (error) {
    console.error('❌ Erro crítico items PUT:', error);
    return json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: 'Erro ao atualizar ordem dos itens' }
    }, { status: 500 });
  }
}; 