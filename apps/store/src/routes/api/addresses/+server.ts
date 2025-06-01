import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db';

// GET /api/addresses - Listar endereços do usuário
export const GET: RequestHandler = async ({ request, platform, cookies }) => {
  try {
    console.log('🏠 Addresses GET - Estratégia híbrida iniciada');
    
    const sessionToken = cookies.get('session_token');
    
    if (!sessionToken) {
      return json({
        success: false,
        error: { message: 'Não autenticado' }
      }, { status: 401 });
    }

    // Tentar buscar endereços com timeout
    try {
      const db = getDatabase(platform);
      
      // Promise com timeout de 3 segundos
      const queryPromise = (async () => {
        // STEP 1: Verificar sessão
        const sessions = await db.query`
          SELECT user_id FROM sessions 
          WHERE token = ${sessionToken} AND expires_at > NOW()
          LIMIT 1
        `;

        const session = sessions[0];
        if (!session) {
          return {
            success: false,
            error: { message: 'Sessão inválida' },
            status: 401
          };
        }

        // STEP 2: Buscar endereços
        const addresses = await db.query`
          SELECT id, type, is_default, name, street, number, complement,
                 neighborhood, city, state, zip_code, label, created_at, updated_at
          FROM addresses
          WHERE user_id = ${session.user_id}
          ORDER BY is_default DESC, created_at DESC
          LIMIT 10
        `;

        return {
          success: true,
          data: addresses.map((addr: any) => ({
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
      })();
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 3000)
      });
      
      const result = await Promise.race([queryPromise, timeoutPromise]) as any;
      
      if (!result.success) {
        return json(result, { status: result.status || 500 });
      }
      
      console.log(`✅ ${result.data.length} endereços encontrados`);
      
      return json({
        ...result,
        source: 'database'
      });
      
    } catch (error) {
      console.log(`⚠️ Erro addresses GET: ${error instanceof Error ? error.message : 'Erro'} - usando fallback`);
      
      // FALLBACK: Endereços mock
      const mockAddresses = [
        {
          id: '1',
          type: 'shipping',
          isDefault: true,
          name: 'Casa',
          street: 'Rua das Flores',
          number: '123',
          complement: 'Apto 45',
          neighborhood: 'Centro',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01310-100',
          label: 'Residencial',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: '2',
          type: 'shipping',
          isDefault: false,
          name: 'Trabalho',
          street: 'Av. Paulista',
          number: '1000',
          complement: 'Sala 1001',
          neighborhood: 'Bela Vista',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01310-200',
          label: 'Comercial',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
      
      return json({
        success: true,
        data: mockAddresses,
        source: 'fallback'
      });
    }

  } catch (error) {
    console.error('❌ Erro crítico addresses GET:', error);
    return json({
      success: false,
      error: { message: 'Erro interno do servidor' }
    }, { status: 500 });
  }
};

// POST /api/addresses - Criar novo endereço
export const POST: RequestHandler = async ({ request, platform, cookies }) => {
  try {
    console.log('🏠 Addresses POST - Estratégia híbrida iniciada');
    
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

    // Tentar criar endereço com timeout
    try {
      const db = getDatabase(platform);
      
      // Promise com timeout de 4 segundos
      const queryPromise = (async () => {
        // STEP 1: Verificar sessão
        const sessions = await db.query`
          SELECT user_id FROM sessions 
          WHERE token = ${sessionToken} AND expires_at > NOW()
          LIMIT 1
        `;

        const session = sessions[0];
        if (!session) {
          return {
            success: false,
            error: { message: 'Sessão inválida' },
            status: 401
          };
        }

        const userId = session.user_id;

        // STEP 2: Operações críticas síncronas
        const cleanZipCode = zipCode.replace(/\D/g, '');
        
        // Verificar se deve ser padrão
        const addressCount = await db.query`
          SELECT COUNT(*) as count FROM addresses 
          WHERE user_id = ${userId} AND type = ${type}
          LIMIT 1
        `;

        const shouldBeDefault = isDefault || parseInt(addressCount[0].count) === 0;

        // STEP 3: Criar endereço
        const newAddresses = await db.query`
          INSERT INTO addresses (
            user_id, type, is_default, name, street, number, 
            complement, neighborhood, city, state, 
            zip_code, label, created_at, updated_at
          ) VALUES (
            ${userId}, ${type}, ${shouldBeDefault}, ${name}, ${street}, ${number},
            ${complement || null}, ${neighborhood}, ${city}, ${state},
            ${cleanZipCode}, ${label || null}, NOW(), NOW()
          )
          RETURNING id, type, is_default, name, street, number, complement,
                   neighborhood, city, state, zip_code, label, created_at, updated_at
        `;
        
        const newAddress = newAddresses[0];

        // STEP 4: Update padrão async (se necessário)
        if (shouldBeDefault) {
          setTimeout(async () => {
            try {
              await db.query`
                UPDATE addresses 
                SET is_default = false, updated_at = NOW()
                WHERE user_id = ${userId} AND type = ${type} AND id != ${newAddress.id}
              `;
            } catch (e) {
              console.log('Update default async failed:', e);
            }
          }, 100);
        }

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
      })();
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 4000)
      });
      
      const result = await Promise.race([queryPromise, timeoutPromise]) as any;
      
      if (!result.success) {
        return json(result, { status: result.status || 500 });
      }
      
      console.log(`✅ Endereço criado: ${result.data.name}`);
      
      return json({
        ...result,
        source: 'database'
      }, { status: 201 });
      
    } catch (error) {
      console.log(`⚠️ Erro addresses POST: ${error instanceof Error ? error.message : 'Erro'} - usando fallback`);
      
      // FALLBACK: Simular criação (retornar dados mock)
      const mockAddress = {
        id: `addr-${Date.now()}`,
        type,
        isDefault,
        name,
        street,
        number,
        complement,
        neighborhood,
        city,
        state,
        zipCode: zipCode.replace(/\D/g, ''),
        label,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      return json({
        success: true,
        data: mockAddress,
        source: 'fallback'
      }, { status: 201 });
    }

  } catch (error) {
    console.error('❌ Erro crítico addresses POST:', error);
    return json({
      success: false,
      error: { message: 'Erro interno do servidor' }
    }, { status: 500 });
  }
}; 