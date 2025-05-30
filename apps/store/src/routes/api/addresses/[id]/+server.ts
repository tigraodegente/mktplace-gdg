import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';

// GET /api/addresses/[id] - Buscar endereço específico
export const GET: RequestHandler = async ({ params, platform, cookies }) => {
  try {
    const addressId = params.id;
    const sessionToken = cookies.get('session_token');
    
    if (!sessionToken) {
      return json({
        success: false,
        error: { message: 'Não autenticado' }
      }, { status: 401 });
    }

    const result = await withDatabase(platform, async (db) => {
      // Verificar sessão
      const session = await db.queryOne`
        SELECT user_id FROM sessions 
        WHERE token = ${sessionToken} AND expires_at > NOW()
      `;

      if (!session) {
        return {
          success: false,
          error: { message: 'Sessão inválida' },
          status: 401
        };
      }

      // Buscar endereço específico do usuário
      const address = await db.queryOne`
        SELECT 
          id, type, is_default, name, street, number, complement,
          neighborhood, city, state, zip_code, label,
          created_at, updated_at
        FROM addresses
        WHERE id = ${addressId} AND user_id = ${session.user_id}
      `;

      if (!address) {
        return {
          success: false,
          error: { message: 'Endereço não encontrado' },
          status: 404
        };
      }

      return {
        success: true,
        data: {
          id: address.id,
          type: address.type,
          isDefault: address.is_default,
          name: address.name,
          street: address.street,
          number: address.number,
          complement: address.complement,
          neighborhood: address.neighborhood,
          city: address.city,
          state: address.state,
          zipCode: address.zip_code,
          label: address.label,
          createdAt: address.created_at,
          updatedAt: address.updated_at
        }
      };
    });

    if (!result.success) {
      return json(result, { status: result.status || 500 });
    }

    return json(result);

  } catch (error) {
    console.error('Erro ao buscar endereço:', error);
    return json({
      success: false,
      error: { message: 'Erro interno do servidor' }
    }, { status: 500 });
  }
};

// PUT /api/addresses/[id] - Atualizar endereço
export const PUT: RequestHandler = async ({ params, request, platform, cookies }) => {
  try {
    const addressId = params.id;
    const sessionToken = cookies.get('session_token');
    
    if (!sessionToken) {
      return json({
        success: false,
        error: { message: 'Não autenticado' }
      }, { status: 401 });
    }

    const body = await request.json();
    const {
      type,
      isDefault,
      name,
      street,
      number,
      complement,
      neighborhood,
      city,
      state,
      zipCode,
      label
    } = body;

    // Validações básicas (apenas se os campos forem fornecidos)
    if (zipCode && !/^\d{8}$/.test(zipCode.replace(/\D/g, ''))) {
      return json({
        success: false,
        error: { message: 'CEP deve ter 8 dígitos' }
      }, { status: 400 });
    }

    if (state && !/^[A-Z]{2}$/.test(state)) {
      return json({
        success: false,
        error: { message: 'Estado deve ter 2 letras maiúsculas (ex: SP)' }
      }, { status: 400 });
    }

    const result = await withDatabase(platform, async (db) => {
      // Verificar sessão
      const session = await db.queryOne`
        SELECT user_id FROM sessions 
        WHERE token = ${sessionToken} AND expires_at > NOW()
      `;

      if (!session) {
        return {
          success: false,
          error: { message: 'Sessão inválida' },
          status: 401
        };
      }

      const userId = session.user_id;

      // Verificar se o endereço existe e pertence ao usuário
      const existingAddress = await db.queryOne`
        SELECT id, type FROM addresses
        WHERE id = ${addressId} AND user_id = ${userId}
      `;

      if (!existingAddress) {
        return {
          success: false,
          error: { message: 'Endereço não encontrado' },
          status: 404
        };
      }

      // Se está marcando como padrão, desmarcar outros do mesmo tipo
      if (isDefault === true) {
        const addressType = type || existingAddress.type;
        await db.execute`
          UPDATE addresses 
          SET is_default = false, updated_at = NOW()
          WHERE user_id = ${userId} AND type = ${addressType} AND id != ${addressId}
        `;
      }

      // Construir query de atualização dinamicamente
      const updates = [];
      const values = [];

      if (type !== undefined) {
        updates.push('type = $' + (values.length + 1));
        values.push(type);
      }
      if (isDefault !== undefined) {
        updates.push('is_default = $' + (values.length + 1));
        values.push(isDefault);
      }
      if (name !== undefined) {
        updates.push('name = $' + (values.length + 1));
        values.push(name);
      }
      if (street !== undefined) {
        updates.push('street = $' + (values.length + 1));
        values.push(street);
      }
      if (number !== undefined) {
        updates.push('number = $' + (values.length + 1));
        values.push(number);
      }
      if (complement !== undefined) {
        updates.push('complement = $' + (values.length + 1));
        values.push(complement || null);
      }
      if (neighborhood !== undefined) {
        updates.push('neighborhood = $' + (values.length + 1));
        values.push(neighborhood);
      }
      if (city !== undefined) {
        updates.push('city = $' + (values.length + 1));
        values.push(city);
      }
      if (state !== undefined) {
        updates.push('state = $' + (values.length + 1));
        values.push(state);
      }
      if (zipCode !== undefined) {
        updates.push('zip_code = $' + (values.length + 1));
        values.push(zipCode.replace(/\D/g, ''));
      }
      if (label !== undefined) {
        updates.push('label = $' + (values.length + 1));
        values.push(label);
      }

      // Sempre atualizar updated_at
      updates.push('updated_at = NOW()');

      if (updates.length === 1) { // Apenas updated_at
        return {
          success: false,
          error: { message: 'Nenhum campo para atualizar' },
          status: 400
        };
      }

      values.push(addressId);
      const updateQuery = `
        UPDATE addresses 
        SET ${updates.join(', ')}
        WHERE id = $${values.length}
        RETURNING 
          id, type, is_default, name, street, number, complement,
          neighborhood, city, state, zip_code, label,
          created_at, updated_at
      `;

      const updatedAddress = await db.queryOne(updateQuery, values);

      return {
        success: true,
        data: {
          id: updatedAddress.id,
          type: updatedAddress.type,
          isDefault: updatedAddress.is_default,
          name: updatedAddress.name,
          street: updatedAddress.street,
          number: updatedAddress.number,
          complement: updatedAddress.complement,
          neighborhood: updatedAddress.neighborhood,
          city: updatedAddress.city,
          state: updatedAddress.state,
          zipCode: updatedAddress.zip_code,
          label: updatedAddress.label,
          createdAt: updatedAddress.created_at,
          updatedAt: updatedAddress.updated_at
        }
      };
    });

    if (!result.success) {
      return json(result, { status: result.status || 500 });
    }

    return json(result);

  } catch (error) {
    console.error('Erro ao atualizar endereço:', error);
    return json({
      success: false,
      error: { message: 'Erro interno do servidor' }
    }, { status: 500 });
  }
};

// DELETE /api/addresses/[id] - Remover endereço
export const DELETE: RequestHandler = async ({ params, platform, cookies }) => {
  try {
    const addressId = params.id;
    const sessionToken = cookies.get('session_token');
    
    if (!sessionToken) {
      return json({
        success: false,
        error: { message: 'Não autenticado' }
      }, { status: 401 });
    }

    const result = await withDatabase(platform, async (db) => {
      // Verificar sessão
      const session = await db.queryOne`
        SELECT user_id FROM sessions 
        WHERE token = ${sessionToken} AND expires_at > NOW()
      `;

      if (!session) {
        return {
          success: false,
          error: { message: 'Sessão inválida' },
          status: 401
        };
      }

      const userId = session.user_id;

      // Verificar se o endereço existe e pertence ao usuário
      const existingAddress = await db.queryOne`
        SELECT id, type, is_default FROM addresses
        WHERE id = ${addressId} AND user_id = ${userId}
      `;

      if (!existingAddress) {
        return {
          success: false,
          error: { message: 'Endereço não encontrado' },
          status: 404
        };
      }

      // Remover o endereço
      await db.execute`
        DELETE FROM addresses 
        WHERE id = ${addressId} AND user_id = ${userId}
      `;

      // Se era o endereço padrão, marcar outro como padrão
      if (existingAddress.is_default) {
        await db.execute`
          UPDATE addresses 
          SET is_default = true, updated_at = NOW()
          WHERE user_id = ${userId} 
            AND type = ${existingAddress.type}
            AND id = (
              SELECT id FROM addresses 
              WHERE user_id = ${userId} AND type = ${existingAddress.type}
              ORDER BY created_at ASC 
              LIMIT 1
            )
        `;
      }

      return {
        success: true,
        message: 'Endereço removido com sucesso'
      };
    });

    if (!result.success) {
      return json(result, { status: result.status || 500 });
    }

    return json(result);

  } catch (error) {
    console.error('Erro ao remover endereço:', error);
    return json({
      success: false,
      error: { message: 'Erro interno do servidor' }
    }, { status: 500 });
  }
}; 