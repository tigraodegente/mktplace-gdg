import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/utils/auth';

// GET /api/addresses - Listar endereços do usuário
export const GET: RequestHandler = async ({ request, platform, cookies }) => {
  try {
    console.log('🏠 Addresses GET - Verificação unificada de autenticação');
    
    // 🔐 USAR SISTEMA UNIFICADO DE AUTENTICAÇÃO
    const authResult = await requireAuth(cookies, platform);
    
    if (!authResult.success) {
      console.log('❌ Autenticação falhou:', authResult.error);
      return json({ success: false, error: authResult.error }, { status: 401 });
    }
    
    const userId = authResult.user?.id;
    console.log('✅ Usuário autenticado:', authResult.user?.email);

    // Tentar buscar endereços com timeout
    try {
      console.log('🔌 Buscando endereços do usuário...');
      const { withDatabase } = await import('$lib/db');
      
      const result = await withDatabase(platform, async (db) => {
        console.log('🏠 Executando query de endereços...');
        
        const addresses = await db.query`
          SELECT id, type, is_default, name, street, number, complement,
                 neighborhood, city, state, zip_code, label, created_at, updated_at
          FROM addresses
          WHERE user_id = ${userId}
          ORDER BY is_default DESC, created_at DESC
          LIMIT 20
        `;

        console.log('📦 Endereços encontrados:', addresses.length);

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
      });
      
      console.log(`✅ ${result.data.length} endereços carregados com sucesso`);
      
      return json({
        ...result,
        source: 'database'
      });
      
    } catch (error) {
      console.error(`❌ Erro ao buscar endereços: ${error instanceof Error ? error.message : 'Erro'}`, error);
      
      // FALLBACK: Retornar lista vazia ao invés de erro
      return json({
        success: true,
        data: [],
        source: 'fallback',
        note: 'Erro temporário - lista vazia retornada'
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
    console.log('🏠 Addresses POST - Verificação unificada de autenticação');
    
    // 🔐 USAR SISTEMA UNIFICADO DE AUTENTICAÇÃO
    const authResult = await requireAuth(cookies, platform);
    
    if (!authResult.success) {
      console.log('❌ Autenticação falhou:', authResult.error);
      return json({ success: false, error: authResult.error }, { status: 401 });
    }
    
    const userId = authResult.user?.id;
    console.log('✅ Usuário autenticado:', authResult.user?.email);

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

    console.log('📝 Dados do endereço recebidos:', { name, street, number, city, state, zipCode });

    // Validações básicas
    if (!name || !street || !number || !neighborhood || !city || !state || !zipCode) {
      return json({
        success: false,
        error: { message: 'Campos obrigatórios: name, street, number, neighborhood, city, state, zipCode' }
      }, { status: 400 });
    }

    // Validar CEP
    const cleanZipCode = zipCode.replace(/\D/g, '');
    if (!/^\d{8}$/.test(cleanZipCode)) {
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

    // Tentar criar endereço
    try {
      console.log('💾 Criando endereço no banco...');
      const { withDatabase } = await import('$lib/db');
      
      const result = await withDatabase(platform, async (db) => {
        console.log('🔢 Verificando se deve ser endereço padrão...');
        
        // Verificar se deve ser padrão
        const addressCount = await db.query`
          SELECT COUNT(*) as count FROM addresses 
          WHERE user_id = ${userId} AND type = ${type}
          LIMIT 1
        `;

        const shouldBeDefault = isDefault || parseInt(addressCount[0].count) === 0;
        console.log('🏠 Será padrão:', shouldBeDefault, '(contagem atual:', addressCount[0].count, ')');

        console.log('📝 Inserindo endereço...');
        const newAddresses = await db.query`
          INSERT INTO addresses (
            user_id, type, is_default, name, street, number, 
            complement, neighborhood, city, state, 
            zip_code, label, created_at, updated_at
          ) VALUES (
            ${userId}, ${type}, ${shouldBeDefault}, ${name}, ${street}, ${number},
            ${complement || null}, ${neighborhood}, ${city}, ${state},
            ${cleanZipCode}, ${label || `Endereço ${parseInt(addressCount[0].count) + 1}`}, NOW(), NOW()
          )
          RETURNING id, type, is_default, name, street, number, complement,
                   neighborhood, city, state, zip_code, label, created_at, updated_at
        `;
        
        const newAddress = newAddresses[0];
        console.log('✅ Endereço criado com ID:', newAddress.id);

        // Se for padrão, desmarcar outros
        if (shouldBeDefault) {
          await db.query`
            UPDATE addresses 
            SET is_default = false, updated_at = NOW()
            WHERE user_id = ${userId} AND type = ${type} AND id != ${newAddress.id}
          `;
          console.log('✅ Outros endereços desmarcados como padrão');
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
      });
      
      console.log(`✅ Endereço "${result.data.name}" criado com sucesso!`);
      
      return json({
        ...result,
        source: 'database'
      }, { status: 201 });
      
    } catch (error) {
      console.error(`❌ Erro ao criar endereço: ${error instanceof Error ? error.message : 'Erro'}`, error);
      
      return json({
        success: false,
        error: { message: 'Erro ao salvar endereço. Tente novamente.' }
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Erro crítico addresses POST:', error);
    return json({
      success: false,
      error: { message: 'Erro interno do servidor' }
    }, { status: 500 });
  }
}; 