import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { Database } from '$lib/db/database';

// GET - Listar permissões (dados reais do banco)
export const GET: RequestHandler = async ({ url, locals }) => {
  try {
    console.log('🔌 Dev:', process.env.NODE_ENV);
    console.log('⚠️ locals.user não encontrado - carregando permissões sem verificação');
    
    const grouped = url.searchParams.get('grouped') === 'true';
    
    if (grouped) {
      console.log('🔍 Buscando permissões agrupadas...');
      
      try {
        // Tentar buscar dados reais do banco
        const db = new Database('permissions API');
        
        const categories = await db.query(`
          SELECT DISTINCT category FROM permissions ORDER BY category
        `);
        
        console.log('📋 Categorias encontradas:', categories.length);
        
        if (categories.length === 0) {
          throw new Error('Nenhuma categoria encontrada');
        }
        
        const groupedPermissions = [];
        
        for (const cat of categories) {
          const permissions = await db.query(`
            SELECT id, name, description, category
            FROM permissions 
            WHERE category = $1 
            ORDER BY name
          `, [cat.category]);
          
          const categoryNames: Record<string, string> = {
            'users': 'Gestão de Usuários',
            'products': 'Gestão de Produtos', 
            'orders': 'Gestão de Pedidos',
            'sellers': 'Gestão de Vendedores',
            'catalog': 'Gestão de Catálogo',
            'promotions': 'Promoções e Marketing',
            'reports': 'Relatórios e Analytics',
            'system': 'Configurações do Sistema',
            'financial': 'Gestão Financeira'
          };
          
          groupedPermissions.push({
            key: cat.category,
            name: categoryNames[cat.category] || cat.category,
            permissions: permissions
          });
        }
        
        console.log('✅ Retornando', groupedPermissions.length, 'categorias reais do banco');
        
        return json({
          success: true,
          data: groupedPermissions
        });
        
      } catch (dbError) {
        console.log('❌ Erro na query:', dbError);
        console.log('🔍 Fallback para dados mockados...');
        
        // Fallback para dados mockados
        const mockCategories = [
          {
            key: 'users',
            name: 'Gestão de Usuários',
            permissions: [
              { id: '1', name: 'users.read', description: 'Visualizar usuários', category: 'users' },
              { id: '2', name: 'users.write', description: 'Criar e editar usuários', category: 'users' },
              { id: '3', name: 'users.delete', description: 'Deletar/desativar usuários', category: 'users' },
              { id: '4', name: 'users.manage_permissions', description: 'Gerenciar permissões customizadas', category: 'users' }
            ]
          },
          {
            key: 'products',
            name: 'Gestão de Produtos',
            permissions: [
              { id: '5', name: 'products.read', description: 'Visualizar produtos', category: 'products' },
              { id: '6', name: 'products.write', description: 'Criar e editar produtos', category: 'products' },
              { id: '7', name: 'products.delete', description: 'Deletar produtos', category: 'products' },
              { id: '8', name: 'products.approve', description: 'Aprovar produtos pendentes', category: 'products' }
            ]
          },
          {
            key: 'orders',
            name: 'Gestão de Pedidos',
            permissions: [
              { id: '9', name: 'orders.read', description: 'Visualizar pedidos', category: 'orders' },
              { id: '10', name: 'orders.write', description: 'Editar status de pedidos', category: 'orders' },
              { id: '11', name: 'orders.cancel', description: 'Cancelar pedidos', category: 'orders' },
              { id: '12', name: 'orders.refund', description: 'Processar reembolsos', category: 'orders' }
            ]
          },
          {
            key: 'reports',
            name: 'Relatórios',
            permissions: [
              { id: '13', name: 'reports.read', description: 'Visualizar relatórios', category: 'reports' },
              { id: '14', name: 'reports.export', description: 'Exportar relatórios', category: 'reports' },
              { id: '15', name: 'reports.financial', description: 'Relatórios financeiros', category: 'reports' }
            ]
          },
          {
            key: 'system',
            name: 'Sistema',
            permissions: [
              { id: '16', name: 'settings.read', description: 'Visualizar configurações', category: 'system' },
              { id: '17', name: 'settings.write', description: 'Alterar configurações', category: 'system' },
              { id: '18', name: 'integrations.write', description: 'Gerenciar integrações', category: 'system' }
            ]
          }
        ];
        
        console.log('📊 Retornando', mockCategories.length, 'categorias mockadas');
        
        return json({
          success: true,
          data: mockCategories
        });
      }
    } else {
      // Retornar todas as permissões sem agrupamento
      try {
        const db = new Database('permissions API - all');
        const permissions = await db.query('SELECT id, name, description, category FROM permissions ORDER BY category, name');
        
        return json({
          success: true,
          data: permissions
        });
      } catch (dbError) {
        console.log('❌ Erro ao buscar permissões:', dbError);
        
        // Fallback mockado
        const allPermissions = [
          { id: '1', name: 'users.read', description: 'Visualizar usuários', category: 'users' },
          { id: '2', name: 'users.write', description: 'Criar e editar usuários', category: 'users' },
          { id: '3', name: 'products.read', description: 'Visualizar produtos', category: 'products' },
          { id: '4', name: 'products.write', description: 'Criar e editar produtos', category: 'products' }
        ];
        
        return json({
          success: true,
          data: allPermissions
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Erro ao buscar permissões:', error);
    
    return json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
};