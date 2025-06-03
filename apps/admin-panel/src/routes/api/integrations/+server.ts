import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

// GET - Listar integrações
export const GET: RequestHandler = async ({ url, platform }) => {
  try {
    const db = getDatabase(platform);
    
    const category = url.searchParams.get('category') || 'all';
    const status = url.searchParams.get('status') || 'all';
    
    // Construir query
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    if (category !== 'all') {
      conditions.push(`category = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }
    
    if (status !== 'all') {
      conditions.push(`is_active = $${paramIndex}`);
      params.push(status === 'active');
      paramIndex++;
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Query principal
    const query = `
      SELECT 
        id, name, provider, category, description, config,
        is_active, webhook_url, api_key_set, last_sync,
        created_at, updated_at
      FROM integrations
      ${whereClause}
      ORDER BY category, name
    `;
    
    const integrations = await db.query(query, ...params);
    
    // Buscar estatísticas
    const [stats] = await db.query`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_active = true) as active,
        COUNT(*) FILTER (WHERE is_active = false) as inactive,
        COUNT(*) FILTER (WHERE category = 'payment') as payment_integrations,
        COUNT(*) FILTER (WHERE category = 'shipping') as shipping_integrations,
        COUNT(*) FILTER (WHERE category = 'analytics') as analytics_integrations,
        COUNT(*) FILTER (WHERE category = 'marketing') as marketing_integrations
      FROM integrations
    `;
    
    await db.close();
    
    return json({
      success: true,
      data: {
        integrations: integrations.map((i: any) => ({
          id: i.id,
          name: i.name,
          provider: i.provider,
          category: i.category,
          description: i.description,
          config: i.config ? JSON.parse(i.config) : {},
          isActive: i.is_active,
          webhookUrl: i.webhook_url,
          apiKeySet: i.api_key_set,
          lastSync: i.last_sync,
          createdAt: i.created_at,
          updatedAt: i.updated_at
        })),
        stats: {
          total: stats.total || 0,
          active: stats.active || 0,
          inactive: stats.inactive || 0,
          byCategory: {
            payment: stats.payment_integrations || 0,
            shipping: stats.shipping_integrations || 0,
            analytics: stats.analytics_integrations || 0,
            marketing: stats.marketing_integrations || 0
          }
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching integrations:', error);
    return json({
      success: false,
      error: 'Erro ao buscar integrações'
    }, { status: 500 });
  }
};

// POST - Criar integração
export const POST: RequestHandler = async ({ request, platform }) => {
  try {
    const db = getDatabase(platform);
    const data = await request.json();
    
    // Validações
    if (!data.name || !data.provider || !data.category) {
      return json({
        success: false,
        error: 'Nome, provedor e categoria são obrigatórios'
      }, { status: 400 });
    }
    
    // Verificar se já existe
    const [existing] = await db.query`
      SELECT id FROM integrations WHERE provider = ${data.provider}
    `;
    
    if (existing) {
      await db.close();
      return json({
        success: false,
        error: 'Integração com este provedor já existe'
      }, { status: 400 });
    }
    
    // Inserir integração
    const [integration] = await db.query`
      INSERT INTO integrations (
        name, provider, category, description, config,
        is_active, webhook_url, api_key_set
      ) VALUES (
        ${data.name}, ${data.provider}, ${data.category},
        ${data.description || null}, ${JSON.stringify(data.config || {})},
        ${data.isActive !== false}, ${data.webhookUrl || null},
        ${!!data.apiKey}
      ) RETURNING id
    `;
    
    await db.close();
    
    return json({
      success: true,
      data: {
        id: integration.id,
        message: 'Integração criada com sucesso'
      }
    });
    
  } catch (error) {
    console.error('Error creating integration:', error);
    return json({
      success: false,
      error: 'Erro ao criar integração'
    }, { status: 500 });
  }
};

// PUT - Atualizar integração
export const PUT: RequestHandler = async ({ request, platform }) => {
  try {
    const db = getDatabase(platform);
    const data = await request.json();
    
    if (!data.id) {
      return json({
        success: false,
        error: 'ID da integração é obrigatório'
      }, { status: 400 });
    }
    
    // Preparar campos de update
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    if (data.name) {
      updates.push(`name = $${paramIndex}`);
      params.push(data.name);
      paramIndex++;
    }
    
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      params.push(data.description);
      paramIndex++;
    }
    
    if (data.config) {
      updates.push(`config = $${paramIndex}`);
      params.push(JSON.stringify(data.config));
      paramIndex++;
    }
    
    if (data.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      params.push(data.isActive);
      paramIndex++;
    }
    
    if (data.webhookUrl !== undefined) {
      updates.push(`webhook_url = $${paramIndex}`);
      params.push(data.webhookUrl);
      paramIndex++;
    }
    
    if (data.apiKey !== undefined) {
      updates.push(`api_key_set = $${paramIndex}`);
      params.push(!!data.apiKey);
      paramIndex++;
    }
    
    // Se ativando, registrar último sync
    if (data.isActive === true) {
      updates.push('last_sync = NOW()');
    }
    
    updates.push('updated_at = NOW()');
    params.push(data.id);
    
    const query = `
      UPDATE integrations 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
    `;
    
    await db.query(query, ...params);
    await db.close();
    
    return json({
      success: true,
      data: {
        message: 'Integração atualizada com sucesso'
      }
    });
    
  } catch (error) {
    console.error('Error updating integration:', error);
    return json({
      success: false,
      error: 'Erro ao atualizar integração'
    }, { status: 500 });
  }
};

// DELETE - Excluir integração
export const DELETE: RequestHandler = async ({ request, platform }) => {
  try {
    const db = getDatabase(platform);
    const { id } = await request.json();
    
    if (!id) {
      return json({
        success: false,
        error: 'ID da integração é obrigatório'
      }, { status: 400 });
    }
    
    // Desativar primeiro (ao invés de excluir)
    await db.query`
      UPDATE integrations SET 
        is_active = false,
        updated_at = NOW()
      WHERE id = ${id}
    `;
    
    await db.close();
    
    return json({
      success: true,
      data: {
        message: 'Integração desativada com sucesso'
      }
    });
    
  } catch (error) {
    console.error('Error deactivating integration:', error);
    return json({
      success: false,
      error: 'Erro ao desativar integração'
    }, { status: 500 });
  }
}; 