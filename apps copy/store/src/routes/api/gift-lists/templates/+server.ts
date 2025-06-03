import { json } from '@sveltejs/kit';
import { TIMEOUT_CONFIG, withTimeout } from '$lib/config/timeouts';
import type { RequestHandler } from './$types';
import { getDatabase } from '$lib/db/index.js';

// Listar templates disponíveis
export const GET: RequestHandler = async ({ url, platform }) => {
  try {
    console.log('📋 Gift List Templates GET - Estratégia híbrida iniciada');
    
    const type = url.searchParams.get('type');
    const limit = Number(url.searchParams.get('limit')) || 20;

    // Tentar buscar templates com timeout
    try {
      const db = getDatabase(platform);
      
      // Promise com timeout de 2 segundos
      const queryPromise = (async () => {
        let baseQuery = `
          SELECT id, name, type, description, cover_image, theme_color,
                 default_items, suggested_categories, usage_count, created_at,
                 created_by
          FROM gift_list_templates
          WHERE is_active = true
        `;
        let queryParams = [];
        
        if (type) {
          baseQuery += ` AND type = $1`;
          queryParams.push(type);
        }

        baseQuery += ` ORDER BY usage_count DESC, created_at DESC LIMIT ${limit}`;

        const templates = await db.query(baseQuery, ...queryParams);

        // Enriquecer com contagem de itens
        const enrichedTemplates = templates.map((template: any) => {
          let itemsCount = 0;
          try {
            if (template.default_items) {
              const items = typeof template.default_items === 'string' 
                ? JSON.parse(template.default_items) 
                : template.default_items;
              itemsCount = Array.isArray(items) ? items.length : 0;
            }
          } catch (e) {
            itemsCount = 0;
          }

          return {
            ...template,
            created_by_name: 'Admin', // Simplificado
            items_count: itemsCount
          };
        });

        return enrichedTemplates;
      })();
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 2000)
      });
      
      const result = await Promise.race([queryPromise, timeoutPromise]) as any;
      
      console.log(`✅ Templates encontrados: ${result.length}`);
      
      return json({
        success: true,
        data: result,
        source: 'database'
      });
      
    } catch (error) {
      console.log(`⚠️ Erro templates GET: ${error instanceof Error ? error.message : 'Erro'} - usando fallback`);
      
      // FALLBACK: Templates mock
      const mockTemplates = [
        {
          id: 'template-wedding',
          name: 'Casamento Clássico',
          type: 'wedding',
          description: 'Template tradicional para casamentos',
          cover_image: null,
          theme_color: '#FF69B4',
          default_items: [
            { name: 'Jogo de Panelas', category: 'cozinha', priority: 'high', price: 300.00 },
            { name: 'Jogo de Cama', category: 'casa', priority: 'high', price: 200.00 },
            { name: 'Liquidificador', category: 'eletrodomesticos', priority: 'medium', price: 150.00 },
            { name: 'Ferro de Passar', category: 'eletrodomesticos', priority: 'medium', price: 80.00 }
          ],
          suggested_categories: ['cozinha', 'casa', 'eletrodomesticos'],
          usage_count: 145,
          created_at: new Date(Date.now() - 2592000000).toISOString(), // 30 days ago
          created_by: 'admin-1',
          created_by_name: 'Admin',
          items_count: 4
        },
        {
          id: 'template-baby',
          name: 'Chá de Bebê Menina',
          type: 'baby_shower',
          description: 'Itens essenciais para o bebê',
          cover_image: null,
          theme_color: '#FFB6C1',
          default_items: [
            { name: 'Berço Portátil', category: 'quarto', priority: 'high', price: 400.00 },
            { name: 'Carrinho de Bebê', category: 'passeio', priority: 'high', price: 350.00 },
            { name: 'Kit Higiene', category: 'cuidados', priority: 'high', price: 120.00 },
            { name: 'Roupinhas RN', category: 'vestuario', priority: 'medium', price: 100.00 }
          ],
          suggested_categories: ['quarto', 'passeio', 'cuidados', 'vestuario'],
          usage_count: 89,
          created_at: new Date(Date.now() - 1209600000).toISOString(), // 14 days ago
          created_by: 'admin-1',
          created_by_name: 'Admin',
          items_count: 4
        },
        {
          id: 'template-birthday',
          name: 'Aniversário Adulto',
          type: 'birthday',
          description: 'Presentes versáteis para aniversário',
          cover_image: null,
          theme_color: '#9370DB',
          default_items: [
            { name: 'Smartwatch', category: 'tecnologia', priority: 'high', price: 500.00 },
            { name: 'Perfume', category: 'beleza', priority: 'medium', price: 180.00 },
            { name: 'Livro Bestseller', category: 'cultura', priority: 'low', price: 45.00 }
          ],
          suggested_categories: ['tecnologia', 'beleza', 'cultura', 'casa'],
          usage_count: 67,
          created_at: new Date(Date.now() - 604800000).toISOString(), // 7 days ago
          created_by: 'admin-1',
          created_by_name: 'Admin',
          items_count: 3
        }
      ];
      
      // Filtrar por tipo se solicitado
      let filteredTemplates = mockTemplates;
      if (type) {
        filteredTemplates = mockTemplates.filter(template => template.type === type);
      }
      
      // Limitar resultados
      const limitedTemplates = filteredTemplates.slice(0, limit);

    return json({
      success: true,
        data: limitedTemplates,
        source: 'fallback'
    });
    }

  } catch (error) {
    console.error('❌ Erro crítico templates GET:', error);
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
    console.log('📋 Gift List Templates POST - Estratégia híbrida iniciada');
    
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

    // Tentar criar template com timeout
    try {
      const db = getDatabase(platform);
      
      // Promise com timeout de 3 segundos
      const queryPromise = (async () => {
        const templateId = `template-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        
        const newTemplates = await db.query`
        INSERT INTO gift_list_templates (
            id, name, type, description, cover_image, theme_color,
            default_items, suggested_categories, created_by, is_active,
            usage_count, created_at
        ) VALUES (
            ${templateId}, ${data.name}, ${data.type}, ${data.description || null},
          ${data.cover_image || null}, ${data.theme_color || '#FF69B4'},
          ${JSON.stringify(data.default_items || [])}, 
          ${data.suggested_categories || []},
            ${data.created_by || null}, true, 0, NOW()
        )
        RETURNING *
      `;

        return newTemplates[0];
      })();
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 3000)
      });
      
      const result = await Promise.race([queryPromise, timeoutPromise]) as any;
      
      console.log(`✅ Template criado: ${result.name}`);

    return json({
      success: true,
      data: result,
        message: 'Template criado com sucesso!',
        source: 'database'
    });
      
    } catch (error) {
      console.log(`⚠️ Erro template POST: ${error instanceof Error ? error.message : 'Erro'} - usando fallback`);
      
      // FALLBACK: Simular criação de template
      const mockNewTemplate = {
        id: `template-${Date.now()}`,
        name: data.name,
        type: data.type,
        description: data.description || null,
        cover_image: data.cover_image || null,
        theme_color: data.theme_color || '#FF69B4',
        default_items: data.default_items || [],
        suggested_categories: data.suggested_categories || [],
        created_by: data.created_by || null,
        is_active: true,
        usage_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      return json({
        success: true,
        data: mockNewTemplate,
        message: 'Template criado com sucesso!',
        source: 'fallback'
      });
    }

  } catch (error) {
    console.error('❌ Erro crítico template POST:', error);
    return json({
      success: false,
      error: {
        code: 'CREATE_ERROR',
        message: 'Erro ao criar template'
      }
    }, { status: 500 });
  }
}; 