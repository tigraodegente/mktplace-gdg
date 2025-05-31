import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db/index.js';

// Criar contribuição para um item da lista
export const POST: RequestHandler = async ({ params, request, platform }) => {
  try {
    const { id: listId } = params;
    const data = await request.json();

    // Validação básica
    if (!data.item_id || !data.amount || !data.contributor_name) {
      return json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Item, valor e nome do contribuinte são obrigatórios'
        }
      }, { status: 400 });
    }

    const result = await withDatabase(platform, async (db) => {
      // Verificar se a lista e o item existem
      const [listItem] = await db.query`
        SELECT 
          gli.id, gli.target_amount, gli.collected_amount, gli.list_id,
          gl.allow_partial_contributions, gl.allow_anonymous_contributions,
          gl.minimum_contribution, gl.status, gl.user_id as list_owner_id
        FROM gift_list_items gli
        JOIN gift_lists gl ON gl.id = gli.list_id
        WHERE gli.id = ${data.item_id} AND gl.id = ${listId}
        AND gl.status = 'active' AND gli.is_active = true
      `;

      if (!listItem) {
        return { error: 'Lista ou item não encontrado', status: 404 };
      }

      // Verificar se permite contribuições parciais
      const remainingAmount = listItem.target_amount - listItem.collected_amount;
      if (!listItem.allow_partial_contributions && data.amount < remainingAmount) {
        return { 
          error: 'Esta lista não permite contribuições parciais. Valor deve ser: R$ ' + remainingAmount.toFixed(2), 
          status: 400 
        };
      }

      // Verificar valor mínimo
      if (data.amount < listItem.minimum_contribution) {
        return { 
          error: 'Valor mínimo para contribuição: R$ ' + listItem.minimum_contribution.toFixed(2), 
          status: 400 
        };
      }

      // Verificar se não excede o valor restante
      if (data.amount > remainingAmount) {
        return { 
          error: 'Valor excede o restante necessário: R$ ' + remainingAmount.toFixed(2), 
          status: 400 
        };
      }

      // Verificar se permite contribuições anônimas
      if (data.is_anonymous && !listItem.allow_anonymous_contributions) {
        return { 
          error: 'Esta lista não permite contribuições anônimas', 
          status: 400 
        };
      }

      // Criar a contribuição
      const [contribution] = await db.query`
        INSERT INTO gift_contributions (
          item_id, list_id, contributor_user_id, contributor_name,
          contributor_email, contributor_phone, amount, message,
          is_anonymous, contribution_type, gift_wrap_requested,
          gift_wrap_message, delivery_preference, delivery_address
        ) VALUES (
          ${data.item_id}, ${listId}, ${data.contributor_user_id || null},
          ${data.contributor_name}, ${data.contributor_email || null},
          ${data.contributor_phone || null}, ${data.amount}, 
          ${data.message || null}, ${data.is_anonymous || false},
          ${data.contribution_type || 'money'}, ${data.gift_wrap_requested || false},
          ${data.gift_wrap_message || null}, ${data.delivery_preference || 'event_address'},
          ${data.delivery_address ? JSON.stringify(data.delivery_address) : null}
        )
        RETURNING *
      `;

      // Simular processamento de pagamento (aqui você integraria com gateway real)
      const paymentStatus = 'paid'; // Em produção: integrar com Stripe, PagSeguro, etc.
      
      await db.query`
        UPDATE gift_contributions 
        SET payment_status = ${paymentStatus}
        WHERE id = ${contribution.id}
      `;

      // Log da atividade
      await db.query`
        SELECT log_gift_list_activity(
          ${listId}, ${data.contributor_user_id || listItem.list_owner_id}, 'CONTRIBUTE',
          ${JSON.stringify({ 
            item_id: data.item_id, 
            amount: data.amount, 
            contributor: data.contributor_name 
          })}
        )
      `;

      // Registrar analytics
      await db.query`
        SELECT record_gift_list_metric(
          ${listId}, 'contribution', ${data.amount}, 'direct',
          ${JSON.stringify({ item_id: data.item_id, contributor: data.contributor_name })}
        )
      `;

      // Buscar dados atualizados do item para retorno
      const [updatedItem] = await db.query`
        SELECT 
          gli.*,
          ROUND((gli.collected_amount / gli.target_amount) * 100, 2) as completion_percentage,
          CASE WHEN gli.collected_amount >= gli.target_amount THEN true ELSE false END as is_fully_funded
        FROM gift_list_items gli
        WHERE gli.id = ${data.item_id}
      `;

      return { 
        contribution, 
        updatedItem,
        paymentStatus 
      };
    });

    if (result.error) {
      return json({
        success: false,
        error: {
          code: 'CONTRIBUTION_ERROR',
          message: result.error
        }
      }, { status: result.status || 500 });
    }

    return json({
      success: true,
      data: {
        contribution: result.contribution,
        updatedItem: result.updatedItem,
        paymentStatus: result.paymentStatus
      },
      message: 'Contribuição realizada com sucesso!'
    });

  } catch (error) {
    console.error('Erro ao processar contribuição:', error);
    return json({
      success: false,
      error: {
        code: 'CONTRIBUTION_ERROR',
        message: 'Erro ao processar contribuição'
      }
    }, { status: 500 });
  }
};

// Listar contribuições de uma lista
export const GET: RequestHandler = async ({ params, url, platform }) => {
  try {
    const { id: listId } = params;
    const includeAnonymous = url.searchParams.get('include_anonymous') === 'true';
    const itemId = url.searchParams.get('item_id');

    const result = await withDatabase(platform, async (db) => {
      let whereClause = `WHERE gc.list_id = ${listId} AND gc.payment_status = 'paid'`;
      
      if (itemId) {
        whereClause += ` AND gc.item_id = ${itemId}`;
      }

      if (!includeAnonymous) {
        whereClause += ` AND gc.is_anonymous = false`;
      }

      const contributions = await db.query`
        SELECT 
          gc.id,
          gc.amount,
          gc.message,
          gc.is_anonymous,
          gc.created_at,
          gc.gift_wrap_requested,
          CASE 
            WHEN gc.is_anonymous = true THEN 'Anônimo'
            ELSE gc.contributor_name
          END as display_name,
          gli.custom_item_name,
          gli.target_amount as item_target_amount,
          p.name as product_name
        FROM gift_contributions gc
        LEFT JOIN gift_list_items gli ON gli.id = gc.item_id
        LEFT JOIN products p ON p.id = gli.product_id
        ${whereClause}
        ORDER BY gc.created_at DESC
      `;

      // Estatísticas
      const [stats] = await db.query`
        SELECT 
          COUNT(*) as total_contributions,
          SUM(gc.amount) as total_amount,
          COUNT(DISTINCT gc.contributor_email) as unique_contributors,
          AVG(gc.amount) as average_contribution
        FROM gift_contributions gc
        WHERE gc.list_id = ${listId} AND gc.payment_status = 'paid'
      `;

      return {
        contributions,
        stats: {
          ...stats,
          average_contribution: parseFloat(stats.average_contribution || 0).toFixed(2)
        }
      };
    });

    return json({
      success: true,
      data: result.contributions,
      meta: result.stats
    });

  } catch (error) {
    console.error('Erro ao buscar contribuições:', error);
    return json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Erro ao buscar contribuições'
      }
    }, { status: 500 });
  }
}; 