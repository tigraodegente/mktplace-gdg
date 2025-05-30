import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { withDatabase } from '$lib/db';

// GET /api/addresses - Listar endereços do usuário
export const GET: RequestHandler = async ({ request, platform, cookies }) => {
  try {
    // Verificar autenticação via cookie de sessão
    const sessionToken = cookies.get('session_token');
    
    if (!sessionToken) {
      return json({
        success: false,
        error: { message: 'Não autenticado' }
      }, { status: 401 });
    }

    const result = await withDatabase(platform, async (db) => {
      // Buscar usuário pela sessão
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

      // Buscar endereços do usuário
      const addresses = await db.query`
        SELECT 
          id,
          type,
          is_default,
          name,
          street,
          number,
          complement,
          neighborhood,
          city,
          state,
          zip_code,
          label,
          created_at,
          updated_at
        FROM addresses
        WHERE user_id = ${session.user_id}
        ORDER BY is_default DESC, created_at DESC
      `;

      return {
        success: true,
        data: addresses.map(addr => ({
          id: addr.id,
          type: addr.type,
          isDefault: addr.is_default,
          name: addr.name,
          street: addr.street,
          number: addr.number,
          complement: addr.complement,
          neighborhood: addr.neighborhood,
          city: addr.city,
          state: addr.state,
          zipCode: addr.zip_code,
          label: addr.label,
          createdAt: addr.created_at,
          updatedAt: addr.updated_at
        }))
      };
    });

    if (!result.success) {
      return json(result, { status: result.status || 500 });
    }

    return json(result);

  } catch (error) {
    console.error('Erro ao buscar endereços:', error);
    return json({
      success: false,
      error: { message: 'Erro interno do servidor' }
    }, { status: 500 });
  }
};

// POST /api/addresses - Criar novo endereço
export const POST: RequestHandler = async ({ request, platform, cookies }) => {
  try {
    const sessionToken = cookies.get('session_token');
    
    if (!sessionToken) {
      return json({
        success: false,
        error: { message: 'Não autenticado' }
      }, { status: 401 });
    }

    const body = await request.json();
    const {
      type = 'shipping',
      isDefault = false,
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

    // Validações básicas
    if (!name || !street || !number || !neighborhood || !city || !state || !zipCode) {
      return json({
        success: false,
        error: { message: 'Campos obrigatórios: name, street, number, neighborhood, city, state, zipCode' }
      }, { status: 400 });
    }

    // Validar CEP
    if (!/^\d{8}$/.test(zipCode.replace(/\D/g, ''))) {
      return json({
        success: false,
        error: { message: 'CEP deve ter 8 dígitos' }
      }, { status: 400 });
    }

    // Validar UF
    if (!/^[A-Z]{2}$/.test(state)) {
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

      // Se for marcado como padrão, desmarcar outros endereços do mesmo tipo
      if (isDefault) {
        await db.execute`
          UPDATE addresses 
          SET is_default = false, updated_at = NOW()
          WHERE user_id = ${userId} AND type = ${type}
        `;
      }

      // Se for o primeiro endereço do usuário, marcar como padrão automaticamente
      const addressCount = await db.queryOne`
        SELECT COUNT(*) as count FROM addresses 
        WHERE user_id = ${userId} AND type = ${type}
      `;

      const shouldBeDefault = isDefault || parseInt(addressCount.count) === 0;

      // Criar novo endereço
      const newAddress = await db.queryOne`
        INSERT INTO addresses (
          user_id, type, is_default, name, street, number, 
          complement, neighborhood, city, state, 
          zip_code, label, created_at, updated_at
        ) VALUES (
          ${userId}, ${type}, ${shouldBeDefault}, ${name}, ${street}, ${number},
          ${complement || null}, ${neighborhood}, ${city}, ${state},
          ${zipCode.replace(/\D/g, '')}, ${label || null}, NOW(), NOW()
        )
        RETURNING 
          id, type, is_default, name, street, number, complement,
          neighborhood, city, state, zip_code, label,
          created_at, updated_at
      `;

      return {
        success: true,
        data: {
          id: newAddress.id,
          type: newAddress.type,
          isDefault: newAddress.is_default,
          name: newAddress.name,
          street: newAddress.street,
          number: newAddress.number,
          complement: newAddress.complement,
          neighborhood: newAddress.neighborhood,
          city: newAddress.city,
          state: newAddress.state,
          zipCode: newAddress.zip_code,
          label: newAddress.label,
          createdAt: newAddress.created_at,
          updatedAt: newAddress.updated_at
        }
      };
    });

    if (!result.success) {
      return json(result, { status: result.status || 500 });
    }

    return json(result, { status: 201 });

  } catch (error) {
    console.error('Erro ao criar endereço:', error);
    return json({
      success: false,
      error: { message: 'Erro interno do servidor' }
    }, { status: 500 });
  }
}; 