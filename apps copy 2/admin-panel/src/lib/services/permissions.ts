import type { Database } from '$lib/db/database';
import type { 
  Permission, 
  SystemPermission, 
  PermissionCategory,
  UserRole,
  PermissionCheckResponse 
} from '@mktplace/shared-types';

export class PermissionService {
  constructor(private db: Database) {}

  /**
   * Busca todas as permissões do usuário (role + customizadas)
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    try {
      const result = await this.db.query`
        SELECT DISTINCT p.name
        FROM permissions p
        INNER JOIN role_permissions rp ON rp.permission_id = p.id
        INNER JOIN users u ON u.role = rp.role
        WHERE u.id = ${userId}
          AND u.status = 'active'
          AND p.is_active = true
        
        UNION
        
        SELECT DISTINCT permission_name
        FROM users u,
        jsonb_array_elements_text(u.custom_permissions) AS permission_name
        WHERE u.id = ${userId}
          AND u.status = 'active'
      `;
      
      return result.map(r => r.name || r.permission_name);
    } catch (error) {
      console.error('Erro ao buscar permissões do usuário:', error);
      return [];
    }
  }

  /**
   * Verifica se usuário tem permissão específica
   */
  async hasPermission(userId: string, permission: SystemPermission): Promise<boolean> {
    try {
      const [result] = await this.db.query`
        SELECT user_has_permission(${userId}, ${permission}) as has_permission
      `;
      
      return result?.has_permission || false;
    } catch (error) {
      console.error('Erro ao verificar permissão:', error);
      return false;
    }
  }

  /**
   * Verifica múltiplas permissões de uma vez
   */
  async hasPermissions(
    userId: string, 
    permissions: SystemPermission[]
  ): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    await Promise.all(
      permissions.map(async (permission) => {
        results[permission] = await this.hasPermission(userId, permission);
      })
    );
    
    return results;
  }

  /**
   * Verifica se usuário tem pelo menos uma das permissões
   */
  async hasAnyPermission(
    userId: string, 
    permissions: SystemPermission[]
  ): Promise<boolean> {
    const results = await this.hasPermissions(userId, permissions);
    return Object.values(results).some(Boolean);
  }

  /**
   * Verifica se usuário tem todas as permissões
   */
  async hasAllPermissions(
    userId: string, 
    permissions: SystemPermission[]
  ): Promise<boolean> {
    const results = await this.hasPermissions(userId, permissions);
    return Object.values(results).every(Boolean);
  }

  /**
   * Força verificação de permissão - lança erro se não tiver
   */
  async requirePermission(
    userId: string, 
    permission: SystemPermission,
    customMessage?: string
  ): Promise<void> {
    const hasAccess = await this.hasPermission(userId, permission);
    
    if (!hasAccess) {
      throw new PermissionError(
        customMessage || `Permissão necessária: ${permission}`,
        permission,
        userId
      );
    }
  }

  /**
   * Força verificação de múltiplas permissões
   */
  async requirePermissions(
    userId: string, 
    permissions: SystemPermission[],
    requireAll: boolean = true
  ): Promise<void> {
    if (requireAll) {
      const hasAll = await this.hasAllPermissions(userId, permissions);
      if (!hasAll) {
        throw new PermissionError(
          `Permissões necessárias: ${permissions.join(', ')}`,
          permissions.join(','),
          userId
        );
      }
    } else {
      const hasAny = await this.hasAnyPermission(userId, permissions);
      if (!hasAny) {
        throw new PermissionError(
          `Pelo menos uma permissão necessária: ${permissions.join(', ')}`,
          permissions.join(','),
          userId
        );
      }
    }
  }

  /**
   * Busca todas as permissões disponíveis no sistema
   */
  async getAllPermissions(): Promise<Permission[]> {
    try {
      const result = await this.db.query`
        SELECT 
          id, name, description, category, is_active,
          created_at, updated_at
        FROM permissions
        WHERE is_active = true
        ORDER BY category, name
      `;

      return result.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        category: p.category,
        isActive: p.is_active,
        createdAt: p.created_at,
        updatedAt: p.updated_at
      }));
    } catch (error) {
      console.error('Erro ao buscar permissões:', error);
      return [];
    }
  }

  /**
   * Busca permissões agrupadas por categoria
   */
  async getPermissionsByCategory(): Promise<PermissionCategory[]> {
    try {
      const permissions = await this.getAllPermissions();
      const categories = new Map<string, Permission[]>();

      permissions.forEach(permission => {
        if (!categories.has(permission.category)) {
          categories.set(permission.category, []);
        }
        categories.get(permission.category)!.push(permission);
      });

      const categoryLabels: Record<string, string> = {
        users: 'Gestão de Usuários',
        products: 'Gestão de Produtos',
        orders: 'Gestão de Pedidos',
        sellers: 'Gestão de Vendedores',
        catalog: 'Catálogo',
        promotions: 'Promoções',
        reports: 'Relatórios',
        system: 'Sistema',
        financial: 'Financeiro',
        general: 'Geral'
      };

      return Array.from(categories.entries()).map(([key, perms]) => ({
        key,
        name: categoryLabels[key] || key,
        description: `Permissões relacionadas a ${categoryLabels[key]?.toLowerCase() || key}`,
        permissions: perms
      }));
    } catch (error) {
      console.error('Erro ao buscar categorias de permissões:', error);
      return [];
    }
  }

  /**
   * Busca permissões padrão de um role
   */
  async getRolePermissions(role: UserRole): Promise<string[]> {
    try {
      const result = await this.db.query`
        SELECT p.name
        FROM permissions p
        INNER JOIN role_permissions rp ON rp.permission_id = p.id
        WHERE rp.role = ${role}
          AND p.is_active = true
        ORDER BY p.name
      `;

      return result.map(r => r.name);
    } catch (error) {
      console.error('Erro ao buscar permissões do role:', error);
      return [];
    }
  }

  /**
   * Atualiza permissões customizadas de um usuário
   */
  async updateUserCustomPermissions(
    userId: string, 
    permissions: string[]
  ): Promise<void> {
    try {
      // Verificar se as permissões existem
      const validPermissions = await this.validatePermissions(permissions);
      
      await this.db.execute`
        UPDATE users 
        SET 
          custom_permissions = ${JSON.stringify(validPermissions)},
          updated_at = NOW()
        WHERE id = ${userId}
      `;
    } catch (error) {
      console.error('Erro ao atualizar permissões customizadas:', error);
      throw error;
    }
  }

  /**
   * Valida se as permissões fornecidas existem no sistema
   */
  async validatePermissions(permissions: string[]): Promise<string[]> {
    if (permissions.length === 0) return [];

    try {
      const result = await this.db.query`
        SELECT name
        FROM permissions
        WHERE name = ANY(${permissions})
          AND is_active = true
      `;

      const validPermissions = result.map(r => r.name);
      const invalidPermissions = permissions.filter(p => !validPermissions.includes(p));

      if (invalidPermissions.length > 0) {
        throw new Error(`Permissões inválidas: ${invalidPermissions.join(', ')}`);
      }

      return validPermissions;
    } catch (error) {
      console.error('Erro ao validar permissões:', error);
      throw error;
    }
  }

  /**
   * Verifica permissão com detalhes do motivo
   */
  async checkPermissionDetailed(
    userId: string, 
    permission: SystemPermission
  ): Promise<PermissionCheckResponse> {
    try {
      // Verificar por role
      const [roleCheck] = await this.db.query`
        SELECT EXISTS(
          SELECT 1 FROM users u
          JOIN role_permissions rp ON rp.role = u.role
          JOIN permissions p ON p.id = rp.permission_id
          WHERE u.id = ${userId} 
          AND p.name = ${permission}
          AND u.status = 'active'
          AND p.is_active = true
        ) as has_role_permission
      `;

      if (roleCheck.has_role_permission) {
        return { hasPermission: true, reason: 'role' };
      }

      // Verificar permissões customizadas
      const [customCheck] = await this.db.query`
        SELECT EXISTS(
          SELECT 1 FROM users u
          WHERE u.id = ${userId}
          AND u.status = 'active'
          AND u.custom_permissions ? ${permission}
        ) as has_custom_permission
      `;

      if (customCheck.has_custom_permission) {
        return { hasPermission: true, reason: 'custom' };
      }

      return { hasPermission: false, reason: 'none' };
    } catch (error) {
      console.error('Erro ao verificar permissão detalhada:', error);
      return { hasPermission: false, reason: 'none' };
    }
  }

  /**
   * Busca estatísticas de uso de permissões
   */
  async getPermissionStats(): Promise<{
    totalPermissions: number;
    permissionsByCategory: Record<string, number>;
    usersWithCustomPermissions: number;
    mostUsedPermissions: Array<{ permission: string; userCount: number }>;
  }> {
    try {
      const [stats] = await this.db.query`
        SELECT 
          COUNT(*) as total_permissions,
          COUNT(*) FILTER (WHERE category = 'users') as users_permissions,
          COUNT(*) FILTER (WHERE category = 'products') as products_permissions,
          COUNT(*) FILTER (WHERE category = 'orders') as orders_permissions,
          COUNT(*) FILTER (WHERE category = 'sellers') as sellers_permissions,
          COUNT(*) FILTER (WHERE category = 'reports') as reports_permissions,
          COUNT(*) FILTER (WHERE category = 'system') as system_permissions
        FROM permissions
        WHERE is_active = true
      `;

      const [customPermsCount] = await this.db.query`
        SELECT COUNT(*) as count
        FROM users
        WHERE jsonb_array_length(custom_permissions) > 0
          AND status = 'active'
      `;

      return {
        totalPermissions: stats.total_permissions || 0,
        permissionsByCategory: {
          users: stats.users_permissions || 0,
          products: stats.products_permissions || 0,
          orders: stats.orders_permissions || 0,
          sellers: stats.sellers_permissions || 0,
          reports: stats.reports_permissions || 0,
          system: stats.system_permissions || 0
        },
        usersWithCustomPermissions: customPermsCount.count || 0,
        mostUsedPermissions: [] // Implementar se necessário
      };
    } catch (error) {
      console.error('Erro ao buscar estatísticas de permissões:', error);
      return {
        totalPermissions: 0,
        permissionsByCategory: {},
        usersWithCustomPermissions: 0,
        mostUsedPermissions: []
      };
    }
  }
}

/**
 * Erro customizado para permissões
 */
export class PermissionError extends Error {
  constructor(
    message: string,
    public permission: string,
    public userId: string
  ) {
    super(message);
    this.name = 'PermissionError';
  }
}

/**
 * Helper para criar instância do serviço
 */
export function createPermissionService(db: Database): PermissionService {
  return new PermissionService(db);
}

/**
 * Middleware factory para verificar permissões em rotas
 */
export function requirePermissions(permissions: SystemPermission[], requireAll = true) {
  return async (userId: string, db: Database): Promise<void> => {
    const permissionService = new PermissionService(db);
    await permissionService.requirePermissions(userId, permissions, requireAll);
  };
}

/**
 * Utility para verificar se um role pode gerenciar outro role
 */
export function canManageRole(currentRole: UserRole, targetRole: UserRole): boolean {
  const hierarchy: Record<UserRole, number> = {
    customer: 1,
    vendor: 2,
    admin: 3
  };

  return hierarchy[currentRole] >= hierarchy[targetRole];
} 