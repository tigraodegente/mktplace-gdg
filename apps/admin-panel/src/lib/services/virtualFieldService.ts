import type { 
  VirtualField, 
  FormulaTemplate, 
  CalculationContext, 
  CalculationResult,
  VirtualFieldFormData,
  VirtualFieldFilters,
  BatchCalculationRequest,
  BatchCalculationResponse,
  ValidationResult,
  AICalculationRequest,
  AICalculationResponse,
  FieldType,
  FormatOptions
} from '$lib/types/virtualFields';
import { getDatabase } from '$lib/db';

class VirtualFieldService {
  private calculationCache = new Map<string, { result: CalculationResult; expires: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  // ==============================================
  // 1. CRUD DE CAMPOS VIRTUAIS
  // ==============================================

  async getVirtualFields(filters: VirtualFieldFilters = {}): Promise<VirtualField[]> {
    const db = getDatabase();
    
    let whereConditions: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;

    if (filters.entity_type) {
      whereConditions.push(`entity_type = $${paramIndex++}`);
      params.push(filters.entity_type);
    }

    if (filters.field_type) {
      whereConditions.push(`field_type = $${paramIndex++}`);
      params.push(filters.field_type);
    }

    if (filters.ai_enabled !== undefined) {
      whereConditions.push(`ai_enabled = $${paramIndex++}`);
      params.push(filters.ai_enabled);
    }

    if (filters.is_active !== undefined) {
      whereConditions.push(`is_active = $${paramIndex++}`);
      params.push(filters.is_active);
    }

    if (filters.search) {
      whereConditions.push(`(name ILIKE $${paramIndex} OR display_name ILIKE $${paramIndex})`);
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const query = `
      SELECT * FROM virtual_fields 
      ${whereClause}
      ORDER BY sort_order, display_name
    `;

    const result = await db.query(query, ...params);
    return result.map(this.mapVirtualFieldFromDB);
  }

  async getVirtualFieldById(id: string): Promise<VirtualField | null> {
    const db = getDatabase();
    const result = await db.query('SELECT * FROM virtual_fields WHERE id = $1', id);
    return result.length > 0 ? this.mapVirtualFieldFromDB(result[0]) : null;
  }

  async createVirtualField(data: VirtualFieldFormData, userId: string): Promise<VirtualField> {
    const db = getDatabase();
    
    // Validar dados
    const validation = await this.validateVirtualField(data);
    if (!validation.is_valid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    const result = await db.query(`
      INSERT INTO virtual_fields (
        name, display_name, description, formula, dependencies, 
        ai_enabled, ai_prompt, entity_type, field_type, 
        format_options, validation_rules, is_active, sort_order, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, 
      data.name, data.display_name, data.description, data.formula,
      JSON.stringify(data.dependencies), data.ai_enabled, data.ai_prompt,
      data.entity_type, data.field_type, JSON.stringify(data.format_options),
      JSON.stringify(data.validation_rules), data.is_active, data.sort_order, userId
    );

    return this.mapVirtualFieldFromDB(result[0]);
  }

  async updateVirtualField(id: string, data: Partial<VirtualFieldFormData>): Promise<VirtualField> {
    const db = getDatabase();
    
    const updateFields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        if (key === 'dependencies' || key === 'format_options' || key === 'validation_rules') {
          updateFields.push(`${key} = $${paramIndex++}`);
          params.push(JSON.stringify(value));
        } else {
          updateFields.push(`${key} = $${paramIndex++}`);
          params.push(value);
        }
      }
    });

    updateFields.push(`updated_at = NOW()`);
    params.push(id);

    const query = `
      UPDATE virtual_fields 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(query, ...params);
    if (result.length === 0) {
      throw new Error('Virtual field not found');
    }

    // Limpar cache relacionado
    this.clearCacheForField(result[0].name);

    return this.mapVirtualFieldFromDB(result[0]);
  }

  async deleteVirtualField(id: string): Promise<void> {
    const db = getDatabase();
    const result = await db.query('DELETE FROM virtual_fields WHERE id = $1 RETURNING name', id);
    
    if (result.length === 0) {
      throw new Error('Virtual field not found');
    }

    this.clearCacheForField(result[0].name);
  }

  // ==============================================
  // 2. TEMPLATES DE FÓRMULAS
  // ==============================================

  async getFormulaTemplates(category?: string): Promise<FormulaTemplate[]> {
    const db = getDatabase();
    
    const query = category 
      ? 'SELECT * FROM formula_templates WHERE category = $1 ORDER BY display_name'
      : 'SELECT * FROM formula_templates ORDER BY category, display_name';
    
    const params = category ? [category] : [];
    const result = await db.query(query, ...params);
    
    return result.map(row => ({
      id: row.id,
      name: row.name,
      display_name: row.display_name,
      description: row.description,
      formula_template: row.formula_template,
      required_fields: row.required_fields,
      category: row.category,
      is_system: row.is_system,
      created_at: row.created_at
    }));
  }

  async getTemplateCategories(): Promise<string[]> {
    const db = getDatabase();
    const result = await db.query('SELECT DISTINCT category FROM formula_templates ORDER BY category');
    return result.map(row => row.category);
  }

  // ==============================================
  // 3. CÁLCULOS DE CAMPOS VIRTUAIS
  // ==============================================

  async calculateVirtualField(
    fieldName: string, 
    entityData: Record<string, any>,
    context?: CalculationContext
  ): Promise<CalculationResult> {
    const startTime = Date.now();
    
    try {
      // Verificar cache
      const cacheKey = this.getCacheKey(fieldName, entityData);
      const cached = this.calculationCache.get(cacheKey);
      
      if (cached && Date.now() < cached.expires) {
        return {
          ...cached.result,
          calculation_time_ms: Date.now() - startTime
        };
      }

      // Buscar configuração do campo
      const fields = await this.getVirtualFields({ 
        entity_type: context?.entityData?.entity_type || 'products' 
      });
      const field = fields.find(f => f.name === fieldName);
      
      if (!field || !field.is_active) {
        throw new Error(`Virtual field '${fieldName}' not found or inactive`);
      }

      // Verificar dependências
      const dependenciesMet = this.checkDependencies(field.dependencies, entityData);
      if (!dependenciesMet.success) {
        return {
          value: null,
          formatted_value: '',
          error: `Missing dependencies: ${dependenciesMet.missing.join(', ')}`,
          dependencies_met: false,
          calculation_time_ms: Date.now() - startTime
        };
      }

      // Calcular valor
      const calculatedValue = await this.executeFormula(field.formula, entityData, field);
      
      // Formatar valor
      const formattedValue = this.formatValue(calculatedValue, field.field_type, field.format_options);

      const result: CalculationResult = {
        value: calculatedValue,
        formatted_value: formattedValue,
        dependencies_met: true,
        calculation_time_ms: Date.now() - startTime
      };

      // Cachear resultado
      this.calculationCache.set(cacheKey, {
        result,
        expires: Date.now() + this.CACHE_TTL
      });

      return result;

    } catch (error) {
      return {
        value: null,
        formatted_value: '',
        error: error instanceof Error ? error.message : 'Unknown error',
        dependencies_met: false,
        calculation_time_ms: Date.now() - startTime
      };
    }
  }

  async calculateAllVirtualFields(
    entityData: Record<string, any>,
    context?: CalculationContext
  ): Promise<Record<string, CalculationResult>> {
    const fields = await this.getVirtualFields({
      entity_type: context?.entityData?.entity_type || 'products',
      is_active: true
    });

    const results: Record<string, CalculationResult> = {};
    
    // Calcular campos em paralelo
    const calculations = fields.map(async (field) => {
      const result = await this.calculateVirtualField(field.name, entityData, context);
      return { fieldName: field.name, result };
    });

    const calculationResults = await Promise.all(calculations);
    
    calculationResults.forEach(({ fieldName, result }) => {
      results[fieldName] = result;
    });

    return results;
  }

  async batchCalculate(request: BatchCalculationRequest): Promise<BatchCalculationResponse> {
    const startTime = Date.now();
    const results: Record<string, Record<string, CalculationResult>> = {};
    const errors: Record<string, string> = {};

    try {
      // Buscar dados das entidades (implementação específica por entity_type)
      const entitiesData = await this.getEntitiesData(request.entity_type, request.entity_ids);
      
      // Buscar campos virtuais relevantes
      const fieldsToCalculate = request.virtual_field_names 
        ? await this.getVirtualFields({ 
            entity_type: request.entity_type, 
            is_active: true 
          }).then(fields => fields.filter(f => request.virtual_field_names!.includes(f.name)))
        : await this.getVirtualFields({ 
            entity_type: request.entity_type, 
            is_active: true 
          });

      // Calcular para cada entidade
      for (const entityData of entitiesData) {
        try {
          const entityResults = await this.calculateAllVirtualFields(entityData);
          results[entityData.id] = entityResults;
        } catch (error) {
          errors[entityData.id] = error instanceof Error ? error.message : 'Unknown error';
        }
      }

      const totalTime = Date.now() - startTime;

      return {
        success: true,
        results,
        errors: Object.keys(errors).length > 0 ? errors : undefined,
        timing: {
          total_time_ms: totalTime,
          per_entity_avg_ms: totalTime / request.entity_ids.length
        }
      };

    } catch (error) {
      return {
        success: false,
        results: {},
        errors: { general: error instanceof Error ? error.message : 'Unknown error' },
        timing: {
          total_time_ms: Date.now() - startTime,
          per_entity_avg_ms: 0
        }
      };
    }
  }

  // ==============================================
  // 4. INTEGRAÇÃO COM IA
  // ==============================================

  async suggestVirtualFieldValue(request: AICalculationRequest): Promise<AICalculationResponse> {
    // Esta função integraria com o sistema de IA existente
    // Por agora, retorna uma sugestão mock
    
    const field = request.virtual_field;
    const context = request.context;
    
    if (!field.ai_enabled || !field.ai_prompt) {
      throw new Error('AI is not enabled for this virtual field');
    }

    // Aqui integraria com o OpenAI ou sistema de IA escolhido
    // Por agora, simula uma resposta
    
    return {
      suggested_value: "AI suggested value",
      confidence: 85,
      reasoning: `Baseado na análise dos dados: ${Object.keys(context.entityData).join(', ')}`,
      alternative_values: [
        {
          value: "Alternative value 1",
          reasoning: "Alternative reasoning 1",
          confidence: 75
        },
        {
          value: "Alternative value 2", 
          reasoning: "Alternative reasoning 2",
          confidence: 65
        }
      ]
    };
  }

  // ==============================================
  // 5. FUNÇÕES AUXILIARES PRIVADAS
  // ==============================================

  private mapVirtualFieldFromDB(row: any): VirtualField {
    return {
      id: row.id,
      name: row.name,
      display_name: row.display_name,
      description: row.description,
      formula: row.formula,
      dependencies: row.dependencies,
      ai_enabled: row.ai_enabled,
      ai_prompt: row.ai_prompt,
      entity_type: row.entity_type,
      field_type: row.field_type,
      format_options: row.format_options,
      validation_rules: row.validation_rules,
      is_active: row.is_active,
      sort_order: row.sort_order,
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  private async validateVirtualField(data: VirtualFieldFormData): Promise<ValidationResult> {
    const errors: Array<{ field: string; message: string; code: string }> = [];

    // Validar nome único
    const existing = await this.getVirtualFields({ 
      entity_type: data.entity_type 
    });
    
    if (existing.some(f => f.name === data.name)) {
      errors.push({
        field: 'name',
        message: 'Nome do campo já existe para este tipo de entidade',
        code: 'DUPLICATE_NAME'
      });
    }

    // Validar fórmula
    if (!data.formula.trim()) {
      errors.push({
        field: 'formula',
        message: 'Fórmula é obrigatória',
        code: 'REQUIRED'
      });
    }

    // Validar dependências
    if (data.dependencies.length === 0) {
      errors.push({
        field: 'dependencies',
        message: 'Pelo menos uma dependência é obrigatória',
        code: 'REQUIRED'
      });
    }

    return {
      is_valid: errors.length === 0,
      errors
    };
  }

  private checkDependencies(dependencies: string[], entityData: Record<string, any>) {
    const missing = dependencies.filter(dep => 
      entityData[dep] === undefined || entityData[dep] === null
    );

    return {
      success: missing.length === 0,
      missing
    };
  }

  private async executeFormula(
    formula: string, 
    entityData: Record<string, any>, 
    field: VirtualField
  ): Promise<any> {
    // Implementação segura de execução de fórmulas
    // Por agora, implementa algumas fórmulas comuns
    
    try {
      // Fórmulas pré-definidas mais comuns
      if (formula.includes('profit_margin')) {
        const price = parseFloat(entityData.price) || 0;
        const cost = parseFloat(entityData.cost) || 0;
        return price > 0 ? ((price - cost) / price * 100) : 0;
      }

      if (formula.includes('markup')) {
        const price = parseFloat(entityData.price) || 0;
        const cost = parseFloat(entityData.cost) || 0;
        return cost > 0 ? ((price - cost) / cost * 100) : 0;
      }

      if (formula.includes('conversion_score')) {
        const price = parseFloat(entityData.price) || 0;
        const rating = parseFloat(entityData.rating_average) || 0;
        const reviews = parseInt(entityData.rating_count) || 0;
        const views = parseInt(entityData.view_count) || 0;
        
        // Algoritmo simples de score de conversão
        let score = 5; // Base
        if (rating >= 4) score += 2;
        if (reviews >= 10) score += 1;
        if (views >= 100) score += 1;
        if (price <= 100) score += 1;
        
        return Math.min(score, 10);
      }

      if (formula.includes('seo_completeness')) {
        const fields = ['meta_title', 'meta_description', 'meta_keywords', 'slug'];
        const filled = fields.filter(f => entityData[f] && entityData[f].trim()).length;
        return (filled / fields.length) * 100;
      }

      // Para fórmulas matemáticas simples, usar eval com segurança limitada
      const safeFormula = this.sanitizeFormula(formula, entityData);
      return eval(safeFormula);

    } catch (error) {
      throw new Error(`Error executing formula: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private sanitizeFormula(formula: string, entityData: Record<string, any>): string {
    // Substituir variáveis pelos valores reais
    let sanitizedFormula = formula;
    
    Object.entries(entityData).forEach(([key, value]) => {
      const numericValue = typeof value === 'number' ? value : parseFloat(value) || 0;
      sanitizedFormula = sanitizedFormula.replace(
        new RegExp(`\\b${key}\\b`, 'g'), 
        numericValue.toString()
      );
    });

    // Remover caracteres perigosos
    sanitizedFormula = sanitizedFormula.replace(/[^0-9+\-*/.() ]/g, '');
    
    return sanitizedFormula;
  }

  private formatValue(value: any, fieldType: FieldType, options: FormatOptions): string {
    if (value === null || value === undefined) {
      return '';
    }

    switch (fieldType) {
      case 'currency':
        const currencyValue = parseFloat(value) || 0;
        const prefix = options.prefix || 'R$ ';
        const decimals = options.decimals ?? 2;
        return `${prefix}${currencyValue.toFixed(decimals)}`;
        
      case 'percentage':
        const percentValue = parseFloat(value) || 0;
        const suffix = options.suffix || '%';
        const percentDecimals = options.decimals ?? 1;
        return `${percentValue.toFixed(percentDecimals)}${suffix}`;
        
      case 'number':
        const numValue = parseFloat(value) || 0;
        const numDecimals = options.decimals ?? 2;
        return numValue.toFixed(numDecimals);
        
      case 'boolean':
        return value ? 'Sim' : 'Não';
        
      default:
        return String(value);
    }
  }

  private getCacheKey(fieldName: string, entityData: Record<string, any>): string {
    const relevantData = { id: entityData.id, updated_at: entityData.updated_at };
    return `${fieldName}_${JSON.stringify(relevantData)}`;
  }

  private clearCacheForField(fieldName: string): void {
    for (const [key] of this.calculationCache) {
      if (key.startsWith(fieldName + '_')) {
        this.calculationCache.delete(key);
      }
    }
  }

  private async getEntitiesData(entityType: string, entityIds: string[]): Promise<any[]> {
    // Implementação específica para buscar dados das entidades
    const db = getDatabase();
    
    switch (entityType) {
      case 'products':
        return await db.query(
          'SELECT * FROM products WHERE id = ANY($1)',
          [entityIds]
        );
      case 'orders':
        return await db.query(
          'SELECT * FROM orders WHERE id = ANY($1)',
          [entityIds]
        );
      default:
        throw new Error(`Unsupported entity type: ${entityType}`);
    }
  }
}

export const virtualFieldService = new VirtualFieldService(); 