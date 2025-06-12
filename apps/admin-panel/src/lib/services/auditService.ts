/**
 * Universal Audit Service
 * Handles audit logging for all entities across the system
 */

import { getDatabase } from '$lib/db';

// Types for audit system
export interface AuditLogEntry {
  id?: string;
  entity_type: string;
  entity_id: string;
  action: 'create' | 'update' | 'delete' | 'duplicate' | 'restore' | 'archive';
  changes?: Record<string, any>;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  user_id?: string;
  user_name?: string;
  user_email?: string;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  metadata?: Record<string, any>;
  source?: string;
  created_at?: Date;
}

export interface EntityConfig {
  entity_type: string;
  display_name: string;
  display_name_plural: string;
  api_endpoint: string;
  table_name: string;
  primary_key: string;
  features: {
    history?: boolean;
    duplicate?: boolean;
    archive?: boolean;
    export?: boolean;
  };
  duplication_config?: {
    exclude_fields?: string[];
    transform_fields?: Record<string, string>;
    copy_relations?: string[];
  };
  field_mappings?: Record<string, string>;
  ui_config?: Record<string, any>;
}

export interface AuditContext {
  user_id?: string;
  user_name?: string;
  user_email?: string;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  source?: string;
  metadata?: Record<string, any>;
}

class AuditService {
  /**
   * Extract audit context from headers
   */
  private extractContextFromHeaders(headers: Headers): AuditContext {
    const clientAddress = headers.get('cf-connecting-ip') || 
                         headers.get('x-forwarded-for') || 
                         headers.get('x-real-ip') ||
                         undefined; // Use undefined instead of 'unknown' for invalid IPs
    
    return {
      ip_address: clientAddress,
      user_agent: headers.get('user-agent') || 'unknown',
      session_id: headers.get('x-session-id') || undefined,
      source: 'admin_panel'
    };
  }

  /**
   * Log an audit entry
   */
  async logAudit(
    entityType: string,
    entityId: string,
    action: AuditLogEntry['action'],
    options: {
      changes?: Record<string, any>;
      old_values?: Record<string, any>;
      new_values?: Record<string, any>;
      context?: AuditContext;
      headers?: Headers;
      metadata?: Record<string, any>;
      platform?: App.Platform;
    } = {}
  ): Promise<void> {
    try {
      console.log('🔍 logAudit iniciado:', { entityType, entityId, action });
      
      let context: AuditContext = options.context || {};
      
      // Extract context from headers if provided
      if (options.headers) {
        const headerContext = this.extractContextFromHeaders(options.headers);
        context = { ...context, ...headerContext };
      }

      console.log('🔍 Context preparado:', context);

      const db = getDatabase(options.platform);
      
      console.log('🔍 Database obtido, preparando query...');
      
      const queryParams = [
        entityType,
        entityId.toString(),
        action,
        JSON.stringify(options.changes),
        JSON.stringify(options.old_values),
        JSON.stringify(options.new_values),
        context.user_id,
        context.user_name,
        context.user_email,
        context.ip_address,
        context.user_agent,
        context.session_id,
        JSON.stringify(options.metadata),
        context.source || 'admin_panel'
      ];
      
      console.log('🔍 Parâmetros da query:', queryParams);
      
      const result = await db.query(`
        INSERT INTO audit_logs (
          entity_type, entity_id, action, changes, old_values, new_values,
          user_id, user_name, user_email, ip_address, user_agent, 
          session_id, metadata, source
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id
      `, queryParams);

      console.log('🔍 Query executada, resultado:', result);

      await db.close();

      console.log(`✅ Audit logged: ${entityType}/${entityId} - ${action}`);
    } catch (error) {
      console.error('❌ Error logging audit:', error);
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack');
      // Don't throw - audit failures shouldn't break the main operation
    }
  }

  /**
   * Get audit history for an entity
   */
  async getEntityHistory(
    entityType: string,
    entityId: string,
    options: {
      limit?: number;
      offset?: number;
      actions?: string[];
      startDate?: Date;
      endDate?: Date;
      platform?: App.Platform;
    } = {}
  ): Promise<AuditLogEntry[]> {
    const { limit = 50, offset = 0, actions, startDate, endDate } = options;

    console.log('🔍 getEntityHistory chamado com:', { entityType, entityId, limit, offset });

    const db = getDatabase(options.platform);
    
    try {
      let query = `
        SELECT 
          id, entity_type, entity_id, action, changes, old_values, new_values,
          user_id, user_name, user_email, ip_address, user_agent,
          session_id, metadata, source, created_at
        FROM audit_logs 
        WHERE entity_type = $1 AND entity_id = $2
      `;
      
      const params: any[] = [entityType, entityId];
      let paramIndex = 3;

      if (actions && actions.length > 0) {
        query += ` AND action = ANY($${paramIndex})`;
        params.push(actions);
        paramIndex++;
      }

      if (startDate) {
        query += ` AND created_at >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        query += ` AND created_at <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      console.log('🔍 Query a ser executada:', query);
      console.log('🔍 Parâmetros:', params);

      const result = await db.query(query, params);
      
      console.log('🔍 Resultado da query:', result.length, 'registros encontrados');
      
      await db.close();
      
      const processedResult = result.map((row: any) => ({
        ...row,
        changes: row.changes ? JSON.parse(row.changes) : null,
        old_values: row.old_values ? JSON.parse(row.old_values) : null,
        new_values: row.new_values ? JSON.parse(row.new_values) : null,
        metadata: row.metadata ? JSON.parse(row.metadata) : null
      }));

      console.log('🔍 Resultado processado:', processedResult);

      return processedResult;
    } catch (error) {
      await db.close();
      console.error('❌ Error getting entity history:', error);
      return [];
    }
  }

  /**
   * Get entity configuration
   */
  async getEntityConfig(entityType: string, platform?: App.Platform): Promise<EntityConfig | null> {
    const db = getDatabase(platform);
    
    try {
      const result = await db.query(`
        SELECT * FROM entity_configs WHERE entity_type = $1
      `, [entityType]);

      await db.close();

      if (result.length === 0) return null;

      const row = result[0];
      return {
        ...row,
        features: JSON.parse(row.features || '{}'),
        duplication_config: row.duplication_config ? JSON.parse(row.duplication_config) : undefined,
        field_mappings: JSON.parse(row.field_mappings || '{}'),
        ui_config: JSON.parse(row.ui_config || '{}')
      };
    } catch (error) {
      await db.close();
      console.error('❌ Error getting entity config:', error);
      return null;
    }
  }

  /**
   * Calculate changes between old and new values
   */
  calculateChanges(oldData: Record<string, any>, newData: Record<string, any>): Record<string, any> {
    const changes: Record<string, any> = {};

    // Check for modified and new fields
    Object.keys(newData).forEach(key => {
      if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
        changes[key] = {
          from: oldData[key],
          to: newData[key]
        };
      }
    });

    // Check for removed fields
    Object.keys(oldData).forEach(key => {
      if (!(key in newData)) {
        changes[key] = {
          from: oldData[key],
          to: null
        };
      }
    });

    return changes;
  }

  /**
   * Export audit history to CSV
   */
  async exportEntityHistory(
    entityType: string,
    entityId: string,
    format: 'csv' | 'json' = 'csv',
    platform?: App.Platform
  ): Promise<string> {
    const history = await this.getEntityHistory(entityType, entityId, { limit: 1000, platform });

    if (format === 'json') {
      return JSON.stringify(history, null, 2);
    }

    // CSV format
    const headers = [
      'Data/Hora', 'Ação', 'Usuário', 'Campo', 'Valor Anterior', 'Novo Valor', 'IP', 'Origem'
    ];

    const rows: string[][] = [headers];

    history.forEach(entry => {
      if (entry.changes) {
        Object.entries(entry.changes).forEach(([field, change]: [string, any]) => {
          rows.push([
            entry.created_at?.toISOString() || '',
            entry.action,
            entry.user_name || 'Sistema',
            field,
            String(change.from || ''),
            String(change.to || ''),
            entry.ip_address || '',
            entry.source || ''
          ]);
        });
      } else {
        rows.push([
          entry.created_at?.toISOString() || '',
          entry.action,
          entry.user_name || 'Sistema',
          '', '', '',
          entry.ip_address || '',
          entry.source || ''
        ]);
      }
    });

    return rows.map(row => 
      row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
    ).join('\n');
  }
}

// Export singleton instance
export const auditService = new AuditService();
export default auditService; 