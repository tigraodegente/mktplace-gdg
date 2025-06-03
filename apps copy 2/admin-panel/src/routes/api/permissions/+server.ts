import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET - Listar permissões (mockado para desenvolvimento)
export const GET: RequestHandler = async ({ url }) => {
  try {
    console.log('🔍 Carregando permissões mockadas...');
    
    const grouped = url.searchParams.get('grouped') === 'true';
    
    if (grouped) {
      // Retornar permissões agrupadas mockadas
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
    } else {
      // Retornar todas as permissões sem agrupamento
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
    
  } catch (error) {
    console.error('❌ Erro ao buscar permissões:', error);
    
    return json({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
};