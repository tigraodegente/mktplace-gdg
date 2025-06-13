import type {
  AIAnalysisSession,
  AISuggestion,
  AIApprovalSettings,
  AIApprovalTemplate,
  CreateSessionRequest,
  CreateSuggestionData,
  ApprovalRequest,
  BulkApprovalRequest,
  ApprovalResponse,
  SessionFilters,
  SuggestionFilters,
  AutoApprovalEvaluation,
  ApprovalRules,
  SuggestionStatus,
  SessionStatus
} from '$lib/types/aiApproval';
import { getDatabase } from '$lib/db';

class AIApprovalService {
  // ==============================================
  // 1. SESSÕES DE ANÁLISE
  // ==============================================

  async createSession(data: CreateSessionRequest, userId: string): Promise<AIAnalysisSession> {
    const db = getDatabase();
    
    try {
      await db.query('BEGIN');
      
      // Criar sessão
      const sessionResult = await db.query(`
        INSERT INTO ai_analysis_sessions (
          entity_type, entity_id, total_suggestions, analysis_data, created_by
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        data.entity_type,
        data.entity_id,
        data.suggestions.length,
        JSON.stringify(data.analysis_data),
        userId
      ]);
      
      const session = sessionResult[0];
      
      // Inserir sugestões
      for (const suggestion of data.suggestions) {
        await this.createSuggestion(session.id, suggestion);
      }
      
      // Atualizar contadores da sessão
      await this.updateSessionCounters(session.id);
      
      // Processar auto-aprovações
      await this.processAutoApprovals(session.id, userId);
      
      await db.query('COMMIT');
      
      return this.mapSessionFromDB(session);
      
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  }

  async getSessions(filters: SessionFilters = {}, page = 1, limit = 20): Promise<AIAnalysisSession[]> {
    const db = getDatabase();
    
    let whereConditions: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;

    // Aplicar filtros
    if (filters.entity_type) {
      whereConditions.push(`entity_type = $${paramIndex++}`);
      params.push(filters.entity_type);
    }

    if (filters.entity_id) {
      whereConditions.push(`entity_id = $${paramIndex++}`);
      params.push(filters.entity_id);
    }

    if (filters.status) {
      whereConditions.push(`status = $${paramIndex++}`);
      params.push(filters.status);
    }

    if (filters.created_by) {
      whereConditions.push(`created_by = $${paramIndex++}`);
      params.push(filters.created_by);
    }

    if (filters.created_after) {
      whereConditions.push(`created_at >= $${paramIndex++}`);
      params.push(filters.created_after);
    }

    if (filters.created_before) {
      whereConditions.push(`created_at <= $${paramIndex++}`);
      params.push(filters.created_before);
    }

    if (filters.has_pending !== undefined) {
      whereConditions.push(`pending_suggestions ${filters.has_pending ? '>' : '='} 0`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const query = `
      SELECT * FROM ai_sessions_with_stats 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    const result = await db.query(query, ...params);
    return result.map(this.mapSessionFromDB);
  }

  async getSessionById(sessionId: string): Promise<AIAnalysisSession | null> {
    const db = getDatabase();
    const result = await db.query('SELECT * FROM ai_sessions_with_stats WHERE id = $1', sessionId);
    return result.length > 0 ? this.mapSessionFromDB(result[0]) : null;
  }

  // ==============================================
  // 2. SUGESTÕES
  // ==============================================

  async createSuggestion(sessionId: string, data: CreateSuggestionData): Promise<AISuggestion> {
    const db = getDatabase();
    
    const result = await db.query(`
      INSERT INTO ai_suggestions (
        session_id, field_name, field_label, current_value, suggested_value,
        confidence, reasoning, source, category, extra_info
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      sessionId, data.field_name, data.field_label, data.current_value,
      data.suggested_value, data.confidence, data.reasoning,
      data.source || 'ai', data.category, JSON.stringify(data.extra_info)
    ]);

    return this.mapSuggestionFromDB(result[0]);
  }

  async getSuggestions(filters: SuggestionFilters = {}, page = 1, limit = 50): Promise<AISuggestion[]> {
    const db = getDatabase();
    
    let whereConditions: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;

    // Aplicar filtros
    if (filters.session_id) {
      whereConditions.push(`session_id = $${paramIndex++}`);
      params.push(filters.session_id);
    }

    if (filters.field_name) {
      whereConditions.push(`field_name = $${paramIndex++}`);
      params.push(filters.field_name);
    }

    if (filters.category) {
      whereConditions.push(`category = $${paramIndex++}`);
      params.push(filters.category);
    }

    if (filters.status) {
      whereConditions.push(`status = $${paramIndex++}`);
      params.push(filters.status);
    }

    if (filters.confidence_above !== undefined) {
      whereConditions.push(`confidence >= $${paramIndex++}`);
      params.push(filters.confidence_above);
    }

    if (filters.confidence_below !== undefined) {
      whereConditions.push(`confidence <= $${paramIndex++}`);
      params.push(filters.confidence_below);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const query = `
      SELECT * FROM ai_suggestions_detailed 
      ${whereClause}
      ORDER BY confidence DESC, created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    const result = await db.query(query, ...params);
    return result.map(this.mapSuggestionFromDB);
  }

  async getSuggestionsBySession(sessionId: string): Promise<AISuggestion[]> {
    return this.getSuggestions({ session_id: sessionId }, 1, 1000);
  }

  // ==============================================
  // 3. APROVAÇÃO E REJEIÇÃO
  // ==============================================

  async approveSuggestions(request: ApprovalRequest, userId: string): Promise<ApprovalResponse> {
    const db = getDatabase();
    
    try {
      await db.query('BEGIN');
      
      const { suggestion_ids, action, notes, apply_immediately } = request;
      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      
      // Atualizar status das sugestões
      const updateResult = await db.query(`
        UPDATE ai_suggestions 
        SET status = $1, approved_by = $2, approved_at = NOW(),
            rejection_reason = CASE WHEN $1 = 'rejected' THEN $3 ELSE NULL END
        WHERE id = ANY($4) AND status = 'pending'
        RETURNING session_id
      `, [newStatus, userId, notes, suggestion_ids]);
      
      if (updateResult.length === 0) {
        await db.query('ROLLBACK');
        return {
          success: false,
          affected_suggestions: 0,
          errors: ['Nenhuma sugestão pendente encontrada com os IDs fornecidos']
        };
      }
      
      const sessionId = updateResult[0].session_id;
      
      // Se aprovado e apply_immediately, aplicar as mudanças
      let appliedSuggestions = 0;
      if (action === 'approve' && apply_immediately) {
        appliedSuggestions = await this.applySuggestions(suggestion_ids);
      }
      
      // Atualizar contadores da sessão
      await this.updateSessionCounters(sessionId);
      
      // Buscar status atualizado da sessão
      const sessionResult = await db.query(`
        SELECT status, pending_suggestions, approved_suggestions, rejected_suggestions 
        FROM ai_analysis_sessions WHERE id = $1
      `, [sessionId]);
      
      await db.query('COMMIT');
      
      return {
        success: true,
        affected_suggestions: updateResult.length,
        applied_suggestions: appliedSuggestions,
        session_updated: sessionResult[0]
      };
      
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  }

  async bulkApproval(request: BulkApprovalRequest, userId: string): Promise<ApprovalResponse> {
    const db = getDatabase();
    
    try {
      await db.query('BEGIN');
      
      const { session_id, criteria, action, notes, apply_immediately } = request;
      
      // Construir query para encontrar sugestões que atendem os critérios
      let whereConditions = ['session_id = $1', 'status = \'pending\''];
      let params = [session_id];
      let paramIndex = 2;
      
      if (criteria.categories && criteria.categories.length > 0) {
        whereConditions.push(`category = ANY($${paramIndex++})`);
        params.push(criteria.categories);
      }
      
      if (criteria.confidence_above !== undefined) {
        whereConditions.push(`confidence >= $${paramIndex++}`);
        params.push(criteria.confidence_above);
      }
      
      if (criteria.confidence_below !== undefined) {
        whereConditions.push(`confidence <= $${paramIndex++}`);
        params.push(criteria.confidence_below);
      }
      
      if (criteria.fields && criteria.fields.length > 0) {
        whereConditions.push(`field_name = ANY($${paramIndex++})`);
        params.push(criteria.fields);
      }
      
      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      
      // Aplicar aprovação/rejeição em lote
      const updateResult = await db.query(`
        UPDATE ai_suggestions 
        SET status = $${paramIndex}, approved_by = $${paramIndex + 1}, approved_at = NOW(),
            rejection_reason = CASE WHEN $${paramIndex} = 'rejected' THEN $${paramIndex + 2} ELSE NULL END
        WHERE ${whereConditions.join(' AND ')}
        RETURNING id
      `, [...params, newStatus, userId, notes]);
      
      if (updateResult.length === 0) {
        await db.query('ROLLBACK');
        return {
          success: false,
          affected_suggestions: 0,
          errors: ['Nenhuma sugestão encontrada com os critérios fornecidos']
        };
      }
      
      const suggestionIds = updateResult.map(row => row.id);
      
      // Se aprovado e apply_immediately, aplicar as mudanças
      let appliedSuggestions = 0;
      if (action === 'approve' && apply_immediately) {
        appliedSuggestions = await this.applySuggestions(suggestionIds);
      }
      
      // Atualizar contadores da sessão
      await this.updateSessionCounters(session_id);
      
      // Buscar status atualizado da sessão
      const sessionResult = await db.query(`
        SELECT status, pending_suggestions, approved_suggestions, rejected_suggestions 
        FROM ai_analysis_sessions WHERE id = $1
      `, [session_id]);
      
      await db.query('COMMIT');
      
      return {
        success: true,
        affected_suggestions: updateResult.length,
        applied_suggestions: appliedSuggestions,
        session_updated: sessionResult[0]
      };
      
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  }

  // ==============================================
  // 4. APLICAÇÃO DE SUGESTÕES
  // ==============================================

  async applySuggestions(suggestionIds: string[]): Promise<number> {
    const db = getDatabase();
    
    try {
      // Buscar sugestões aprovadas
      const suggestions = await db.query(`
        SELECT s.*, sess.entity_type, sess.entity_id 
        FROM ai_suggestions s
        JOIN ai_analysis_sessions sess ON s.session_id = sess.id
        WHERE s.id = ANY($1) AND s.status = 'approved'
      `, [suggestionIds]);
      
      let appliedCount = 0;
      
      // Aplicar cada sugestão
      for (const suggestion of suggestions) {
        try {
          const success = await this.applySingleSuggestion(suggestion);
          if (success) {
            // Marcar como aplicada
            await db.query(`
              UPDATE ai_suggestions 
              SET status = 'applied', applied_at = NOW()
              WHERE id = $1
            `, [suggestion.id]);
            appliedCount++;
          }
        } catch (error) {
          console.error(`❌ Erro ao aplicar sugestão ${suggestion.id}:`, error);
          // Continuar com as outras sugestões
        }
      }
      
      return appliedCount;
      
    } catch (error) {
      console.error('❌ Erro ao aplicar sugestões:', error);
      return 0;
    }
  }

  private async applySingleSuggestion(suggestion: any): Promise<boolean> {
    const db = getDatabase();
    
    try {
      const { entity_type, entity_id, field_name, suggested_value } = suggestion;
      
      // Determinar tabela baseada no entity_type
      const tableName = this.getTableName(entity_type);
      if (!tableName) {
        console.error(`Tipo de entidade não suportado: ${entity_type}`);
        return false;
      }
      
      // Atualizar o campo na tabela da entidade
      await db.query(`
        UPDATE ${tableName} 
        SET ${field_name} = $1, updated_at = NOW()
        WHERE id = $2
      `, [suggested_value, entity_id]);
      
      console.log(`✅ Sugestão aplicada: ${field_name} = ${suggested_value} em ${tableName}`);
      return true;
      
    } catch (error) {
      console.error('❌ Erro ao aplicar sugestão individual:', error);
      return false;
    }
  }

  // ==============================================
  // 5. AUTO-APROVAÇÃO
  // ==============================================

  async processAutoApprovals(sessionId: string, userId: string): Promise<void> {
    const suggestions = await this.getSuggestionsBySession(sessionId);
    const settings = await this.getUserSettings(userId, 'products');
    const templates = await this.getActiveTemplates('products');
    
    for (const suggestion of suggestions) {
      const evaluation = await this.evaluateAutoApproval(suggestion, settings, templates);
      
      if (evaluation.should_auto_approve) {
        await this.approveSuggestions({
          suggestion_ids: [suggestion.id],
          action: 'approve',
          notes: `Auto-aprovado: ${evaluation.reasoning}`,
          apply_immediately: false
        }, userId);
      } else if (evaluation.should_auto_reject) {
        await this.approveSuggestions({
          suggestion_ids: [suggestion.id],
          action: 'reject',
          notes: `Auto-rejeitado: ${evaluation.reasoning}`,
          apply_immediately: false
        }, userId);
      }
    }
  }

  async evaluateAutoApproval(
    suggestion: AISuggestion, 
    settings: AIApprovalSettings | null,
    templates: AIApprovalTemplate[]
  ): Promise<AutoApprovalEvaluation> {
    
    const evaluation: AutoApprovalEvaluation = {
      should_auto_approve: false,
      should_auto_reject: false,
      requires_manual_review: false,
      matching_rules: [],
      reasoning: 'Avaliação padrão'
    };
    
    // Avaliar baseado nas configurações do usuário
    if (settings && settings.auto_approve_enabled) {
      if (suggestion.confidence >= settings.auto_approve_confidence_threshold) {
        if (
          (!settings.auto_approve_categories.length || settings.auto_approve_categories.includes(suggestion.category)) &&
          (!settings.auto_approve_fields.length || settings.auto_approve_fields.includes(suggestion.field_name))
        ) {
          evaluation.should_auto_approve = true;
          evaluation.matching_rules.push('user_settings');
          evaluation.reasoning = `Confidence ${suggestion.confidence}% acima do threshold ${settings.auto_approve_confidence_threshold}%`;
        }
      }
    }
    
    // Avaliar baseado nos templates
    for (const template of templates) {
      if (template.category && template.category !== suggestion.category) {
        continue;
      }
      
      const rules = template.rules;
      
      // Auto-aprovação
      if (rules.auto_approve_if) {
        if (this.matchesApprovalCriteria(suggestion, rules.auto_approve_if)) {
          evaluation.should_auto_approve = true;
          evaluation.matching_rules.push(template.name);
          evaluation.reasoning = `Template "${template.name}": ${template.description}`;
        }
      }
      
      // Auto-rejeição
      if (rules.auto_reject_if) {
        if (this.matchesRejectionCriteria(suggestion, rules.auto_reject_if)) {
          evaluation.should_auto_reject = true;
          evaluation.matching_rules.push(template.name);
          evaluation.reasoning = `Template "${template.name}": baixa confidence ou conteúdo inadequado`;
        }
      }
      
      // Revisão manual obrigatória
      if (rules.require_manual_review) {
        if (this.requiresManualReview(suggestion, rules.require_manual_review)) {
          evaluation.requires_manual_review = true;
          evaluation.should_auto_approve = false;
          evaluation.should_auto_reject = false;
          evaluation.matching_rules.push(template.name);
          evaluation.reasoning = `Template "${template.name}": requer revisão manual`;
        }
      }
    }
    
    return evaluation;
  }

  private matchesApprovalCriteria(suggestion: AISuggestion, criteria: any): boolean {
    if (criteria.confidence_above && suggestion.confidence < criteria.confidence_above) {
      return false;
    }
    
    if (criteria.fields && !criteria.fields.includes(suggestion.field_name)) {
      return false;
    }
    
    if (criteria.categories && !criteria.categories.includes(suggestion.category)) {
      return false;
    }
    
    if (criteria.exclude_if_empty_current && (!suggestion.current_value || suggestion.current_value === '')) {
      return false;
    }
    
    return true;
  }

  private matchesRejectionCriteria(suggestion: AISuggestion, criteria: any): boolean {
    if (criteria.confidence_below && suggestion.confidence >= criteria.confidence_below) {
      return false;
    }
    
    if (criteria.contains_words) {
      const suggestedText = String(suggestion.suggested_value).toLowerCase();
      for (const word of criteria.contains_words) {
        if (suggestedText.includes(word.toLowerCase())) {
          return true;
        }
      }
    }
    
    return criteria.confidence_below && suggestion.confidence < criteria.confidence_below;
  }

  private requiresManualReview(suggestion: AISuggestion, criteria: any): boolean {
    if (criteria.always) {
      return true;
    }
    
    if (criteria.fields && criteria.fields.includes(suggestion.field_name)) {
      return true;
    }
    
    if (criteria.categories && criteria.categories.includes(suggestion.category)) {
      return true;
    }
    
    if (criteria.confidence_below && suggestion.confidence < criteria.confidence_below) {
      return true;
    }
    
    return false;
  }

  // ==============================================
  // 6. CONFIGURAÇÕES E TEMPLATES
  // ==============================================

  async getUserSettings(userId: string, entityType: string): Promise<AIApprovalSettings | null> {
    const db = getDatabase();
    const result = await db.query(`
      SELECT * FROM ai_approval_settings 
      WHERE user_id = $1 AND entity_type = $2
    `, [userId, entityType]);
    
    return result.length > 0 ? this.mapSettingsFromDB(result[0]) : null;
  }

  async updateUserSettings(userId: string, entityType: string, settings: Partial<AIApprovalSettings>): Promise<AIApprovalSettings> {
    const db = getDatabase();
    
    const result = await db.query(`
      INSERT INTO ai_approval_settings (
        user_id, entity_type, auto_approve_enabled, auto_approve_confidence_threshold,
        auto_approve_categories, auto_approve_fields, email_notifications, 
        notification_types, default_view, show_low_confidence
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (user_id, entity_type) 
      DO UPDATE SET
        auto_approve_enabled = EXCLUDED.auto_approve_enabled,
        auto_approve_confidence_threshold = EXCLUDED.auto_approve_confidence_threshold,
        auto_approve_categories = EXCLUDED.auto_approve_categories,
        auto_approve_fields = EXCLUDED.auto_approve_fields,
        email_notifications = EXCLUDED.email_notifications,
        notification_types = EXCLUDED.notification_types,
        default_view = EXCLUDED.default_view,
        show_low_confidence = EXCLUDED.show_low_confidence,
        updated_at = NOW()
      RETURNING *
    `, [
      userId, entityType,
      settings.auto_approve_enabled || false,
      settings.auto_approve_confidence_threshold || 90,
      settings.auto_approve_categories || [],
      settings.auto_approve_fields || [],
      settings.email_notifications !== false,
      settings.notification_types || ['high_confidence'],
      settings.default_view || 'by_category',
      settings.show_low_confidence !== false
    ]);
    
    return this.mapSettingsFromDB(result[0]);
  }

  async getActiveTemplates(entityType: string): Promise<AIApprovalTemplate[]> {
    const db = getDatabase();
    const result = await db.query(`
      SELECT * FROM ai_approval_templates 
      WHERE entity_type = $1 AND is_active = true
      ORDER BY name
    `, [entityType]);
    
    return result.map(this.mapTemplateFromDB);
  }

  // ==============================================
  // 7. FUNÇÕES AUXILIARES PRIVADAS
  // ==============================================

  private async updateSessionCounters(sessionId: string): Promise<void> {
    const db = getDatabase();
    
    await db.query(`
      UPDATE ai_analysis_sessions 
      SET 
        approved_suggestions = (
          SELECT COUNT(*) FROM ai_suggestions 
          WHERE session_id = $1 AND status = 'approved'
        ),
        rejected_suggestions = (
          SELECT COUNT(*) FROM ai_suggestions 
          WHERE session_id = $1 AND status = 'rejected'
        ),
        pending_suggestions = (
          SELECT COUNT(*) FROM ai_suggestions 
          WHERE session_id = $1 AND status = 'pending'
        ),
        updated_at = NOW()
      WHERE id = $1
    `, [sessionId]);
  }

  private getTableName(entityType: string): string | null {
    const tableMap: Record<string, string> = {
      'products': 'products',
      'orders': 'orders',
      'users': 'users',
      'categories': 'categories'
    };
    
    return tableMap[entityType] || null;
  }

  // Mapeamento de dados do banco
  private mapSessionFromDB(row: any): AIAnalysisSession {
    return {
      id: row.id,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      total_suggestions: row.total_suggestions,
      approved_suggestions: row.approved_suggestions,
      rejected_suggestions: row.rejected_suggestions,
      pending_suggestions: row.pending_suggestions,
      status: row.status,
      analysis_data: row.analysis_data,
      created_by: row.created_by,
      created_at: row.created_at,
      completed_at: row.completed_at,
      updated_at: row.updated_at,
      created_by_name: row.created_by_name,
      created_by_email: row.created_by_email,
      approval_rate: row.approval_rate,
      completion_time_minutes: row.completion_time_minutes
    };
  }

  private mapSuggestionFromDB(row: any): AISuggestion {
    return {
      id: row.id,
      session_id: row.session_id,
      field_name: row.field_name,
      field_label: row.field_label,
      current_value: row.current_value,
      suggested_value: row.suggested_value,
      confidence: row.confidence,
      reasoning: row.reasoning,
      source: row.source,
      category: row.category,
      status: row.status,
      extra_info: row.extra_info,
      approved_by: row.approved_by,
      approved_at: row.approved_at,
      applied_at: row.applied_at,
      rejection_reason: row.rejection_reason,
      created_at: row.created_at,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      session_status: row.session_status,
      approved_by_name: row.approved_by_name,
      approved_by_email: row.approved_by_email
    };
  }

  private mapSettingsFromDB(row: any): AIApprovalSettings {
    return {
      id: row.id,
      user_id: row.user_id,
      role: row.role,
      entity_type: row.entity_type,
      auto_approve_enabled: row.auto_approve_enabled,
      auto_approve_confidence_threshold: row.auto_approve_confidence_threshold,
      auto_approve_categories: row.auto_approve_categories,
      auto_approve_fields: row.auto_approve_fields,
      email_notifications: row.email_notifications,
      notification_types: row.notification_types,
      default_view: row.default_view,
      show_low_confidence: row.show_low_confidence,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  private mapTemplateFromDB(row: any): AIApprovalTemplate {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      entity_type: row.entity_type,
      rules: row.rules,
      is_active: row.is_active,
      is_system: row.is_system,
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}

export const aiApprovalService = new AIApprovalService(); 