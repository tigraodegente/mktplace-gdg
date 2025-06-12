/**
 * Universal CRUD Service
 * Handles generic CRUD operations for all entities including duplication, history, etc.
 */

import { withDatabase } from '$lib/db';
import type { Database } from '$lib/db/database.types';
import { auditService, type EntityConfig, type AuditContext } from './auditService';

export interface DuplicationResult {
  success: boolean;
  data?: any;
  error?: string;
  duplicated_id?: string;
  message?: string;
}

export interface UniversalActionConfig {
  edit?: boolean;
  duplicate?: boolean;
  history?: boolean;
  delete?: boolean;
  archive?: boolean;
  export?: boolean;
  preview?: {
    enabled: boolean;
    url_template?: string; // e.g., "/produto/{slug}" or "/produto/{id}"
  };
  custom?: Array<{
    label: string;
    icon: string;
    variant?: 'primary' | 'secondary' | 'danger' | 'warning';
    action: string; // JavaScript function name or URL template
    condition?: string; // Condition to show action (e.g., "status === 'active'")
  }>;
}

class UniversalCrudService {
  /**
   * Duplicate any entity based on its configuration
   */
  async duplicateEntity(
    entityType: string,
    entityId: string,
    overrides: Record<string, any> = {},
    options: {
      context?: AuditContext;
      platform?: App.Platform;
    } = {}
  ): Promise<DuplicationResult> {
    try {
      // Get entity configuration
      const config = await auditService.getEntityConfig(entityType, options.platform);
      if (!config) {
        return {
          success: false,
          error: `Entity configuration not found for type: ${entityType}`
        };
      }

      if (!config.features.duplicate) {
        return {
          success: false,
          error: `Duplication not enabled for entity type: ${entityType}`
        };
      }

      return await withDatabase(options.platform, async (db: Database) => {
        // Get original entity
        const originalResult = await db.query(
          `SELECT * FROM ${config.table_name} WHERE ${config.primary_key} = $1`,
          [entityId]
        );

        if (originalResult.length === 0) {
          return {
            success: false,
            error: `Entity not found: ${entityType}/${entityId}`
          };
        }

        const originalEntity = originalResult[0];
        const duplicateData = this.prepareDuplicateData(originalEntity, config, overrides);

        // Insert duplicate
        const columns = Object.keys(duplicateData);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        const values = Object.values(duplicateData);

        const insertQuery = `
          INSERT INTO ${config.table_name} (${columns.join(', ')})
          VALUES (${placeholders})
          RETURNING *
        `;

        const duplicateResult = await db.query(insertQuery, values);
        const newEntity = duplicateResult[0];

        // Copy related entities if configured
        if (config.duplication_config?.copy_relations) {
          await this.copyRelatedEntities(config, originalEntity, newEntity, db);
        }

        // Log audit trail
        await auditService.logAudit(
          entityType,
          newEntity[config.primary_key],
          'duplicate',
          {
            old_values: originalEntity,
            new_values: newEntity,
            context: options.context,
            platform: options.platform,
            metadata: {
              duplicated_from: entityId,
              overrides
            }
          }
        );

        return {
          success: true,
          data: newEntity,
          duplicated_id: newEntity[config.primary_key],
          message: `${config.display_name} duplicado com sucesso!`
        };
      });
    } catch (error) {
      console.error('Error duplicating entity:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Prepare data for duplication based on configuration
   */
  private prepareDuplicateData(
    original: Record<string, any>,
    config: EntityConfig,
    overrides: Record<string, any>
  ): Record<string, any> {
    const duplicate = { ...original };
    const duplicateConfig = config.duplication_config;

    // Remove excluded fields
    if (duplicateConfig?.exclude_fields) {
      duplicateConfig.exclude_fields.forEach(field => {
        delete duplicate[field];
      });
    }

    // Apply field transformations
    if (duplicateConfig?.transform_fields) {
      Object.entries(duplicateConfig.transform_fields).forEach(([field, template]) => {
        if (duplicate[field] !== undefined) {
          const timestamp = Date.now();
          duplicate[field] = template
            .replace('{' + field + '}', duplicate[field])
            .replace('{timestamp}', timestamp.toString())
            .replace('{date}', new Date().toISOString().split('T')[0]);
        }
      });
    }

    // Apply user overrides
    Object.assign(duplicate, overrides);

    return duplicate;
  }

  /**
   * Copy related entities (e.g., product_categories, product_images, etc.)
   */
  private async copyRelatedEntities(
    config: EntityConfig,
    original: Record<string, any>,
    duplicate: Record<string, any>,
    db: Database
  ): Promise<void> {
    const relations = config.duplication_config?.copy_relations || [];

    for (const relationTable of relations) {
      try {
        // Get related entities
        const foreignKey = this.guessForeignKey(config.table_name);
        const relatedEntities = await db.query(
          `SELECT * FROM ${relationTable} WHERE ${foreignKey} = $1`,
          [original[config.primary_key]]
        );

        // Copy each related entity
        for (const relatedEntity of relatedEntities) {
          const relatedData = { ...relatedEntity };
          delete relatedData.id; // Remove primary key
          relatedData[foreignKey] = duplicate[config.primary_key]; // Link to new entity

          const columns = Object.keys(relatedData);
          const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
          const values = Object.values(relatedData);

          await db.query(
            `INSERT INTO ${relationTable} (${columns.join(', ')}) VALUES (${placeholders})`,
            values
          );
        }

        console.log(`✅ Copied ${relatedEntities.length} records from ${relationTable}`);
      } catch (error) {
        console.error(`⚠️ Error copying ${relationTable}:`, error);
        // Continue with other relations even if one fails
      }
    }
  }

  /**
   * Guess foreign key field name based on table name
   */
  private guessForeignKey(tableName: string): string {
    // Remove 's' from plural table names and add '_id'
    const singular = tableName.endsWith('s') ? tableName.slice(0, -1) : tableName;
    return `${singular}_id`;
  }

  /**
   * Get entity history with formatted data
   */
  async getEntityHistory(
    entityType: string,
    entityId: string,
    options: {
      limit?: number;
      offset?: number;
      platform?: App.Platform;
    } = {}
  ) {
    const history = await auditService.getEntityHistory(entityType, entityId, options);
    
    return {
      success: true,
      data: history.map(entry => ({
        id: entry.id,
        action: this.formatActionLabel(entry.action),
        action_type: entry.action,
        changes: this.formatChanges(entry.changes),
        user: entry.user_name || 'Sistema',
        date: entry.created_at,
        ip_address: entry.ip_address,
        source: entry.source
      }))
    };
  }

  /**
   * Format action label for display
   */
  private formatActionLabel(action: string): string {
    const labels = {
      create: 'Criado',
      update: 'Atualizado',
      delete: 'Excluído',
      duplicate: 'Duplicado',
      restore: 'Restaurado',
      archive: 'Arquivado'
    };
    return labels[action as keyof typeof labels] || action;
  }

  /**
   * Format changes for display
   */
  private formatChanges(changes: Record<string, any> | null | undefined): Array<{
    field: string;
    field_label: string;
    from: any;
    to: any;
  }> {
    if (!changes) return [];

    return Object.entries(changes).map(([field, change]) => ({
      field,
      field_label: this.formatFieldLabel(field),
      from: change.from,
      to: change.to
    }));
  }

  /**
   * Format field name for display
   */
  private formatFieldLabel(field: string): string {
    const labels: Record<string, string> = {
      name: 'Nome',
      title: 'Título',
      description: 'Descrição',
      price: 'Preço',
      sku: 'SKU',
      is_active: 'Status',
      created_at: 'Data de Criação',
      updated_at: 'Última Atualização'
    };
    
    return labels[field] || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Export entity history to CSV
   */
  async exportEntityHistory(
    entityType: string,
    entityId: string,
    platform?: App.Platform
  ): Promise<string> {
    return auditService.exportEntityHistory(entityType, entityId, 'csv', platform);
  }

  /**
   * Generate universal actions for an entity
   */
  generateUniversalActions(
    entity: Record<string, any>,
    entityType: string,
    config: UniversalActionConfig,
    baseUrl: string = ''
  ): Array<{
    label: string;
    icon: string;
    variant?: string;
    onclick?: string;
    href?: string;
    condition?: boolean;
  }> {
    const actions: any[] = [];

    // Edit action
    if (config.edit !== false) {
      actions.push({
        label: 'Editar',
        icon: 'edit',
        variant: 'primary',
        href: `${baseUrl}/${entityType}/${entity.id}`
      });
    }

    // Duplicate action
    if (config.duplicate) {
      actions.push({
        label: 'Duplicar',
        icon: 'copy',
        variant: 'secondary',
        onclick: `duplicateEntity('${entityType}', '${entity.id}')`
      });
    }

    // History action
    if (config.history) {
      actions.push({
        label: 'Histórico',
        icon: 'history',
        variant: 'secondary',
        onclick: `showHistory('${entityType}', '${entity.id}')`
      });
    }

    // Preview action
    if (config.preview?.enabled) {
      const previewUrl = config.preview.url_template
        ?.replace('{id}', entity.id)
        ?.replace('{slug}', entity.slug || entity.id);
      
      actions.push({
        label: 'Visualizar',
        icon: 'preview',
        variant: 'secondary',
        onclick: `window.open('${previewUrl}', '_blank')`
      });
    }

    // Export action
    if (config.export) {
      actions.push({
        label: 'Exportar Histórico',
        icon: 'download',
        variant: 'secondary',
        onclick: `exportHistory('${entityType}', '${entity.id}')`
      });
    }

    // Custom actions
    if (config.custom) {
      config.custom.forEach(customAction => {
        // Check condition if provided
        let shouldShow = true;
        if (customAction.condition) {
          try {
            // Simple condition evaluation (extend as needed)
            shouldShow = eval(customAction.condition.replace(/(\w+)/g, `entity.$1`));
          } catch {
            shouldShow = true; // Default to showing if condition fails
          }
        }

        if (shouldShow) {
          actions.push({
            label: customAction.label,
            icon: customAction.icon,
            variant: customAction.variant || 'secondary',
            onclick: customAction.action.includes('(') 
              ? customAction.action
              : customAction.action.replace('{id}', entity.id)
          });
        }
      });
    }

    // Delete action (usually last)
    if (config.delete !== false) {
      actions.push({
        label: 'Excluir',
        icon: 'trash',
        variant: 'danger',
        onclick: `deleteEntity('${entityType}', '${entity.id}', '${entity.name || entity.title || entity.id}')`
      });
    }

    return actions;
  }
}

// Export singleton instance
export const universalCrudService = new UniversalCrudService();
export default universalCrudService; 