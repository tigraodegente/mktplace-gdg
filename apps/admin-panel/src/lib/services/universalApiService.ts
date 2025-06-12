import type { FormConfig } from '$lib/config/formConfigs';
import { api } from './api';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    page?: number;
    total?: number;
    totalPages?: number;
  };
}

class UniversalApiService {
  
  // Carregar entidade por ID
  async loadEntity(config: FormConfig, entityId: string): Promise<ApiResponse> {
    try {
      const endpoint = config.loadEndpoint 
        ? config.loadEndpoint(entityId) 
        : config.updateEndpoint(entityId);
      
      return await api.get(endpoint);
    } catch (error) {
      console.error(`Erro ao carregar ${config.entityName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }
  
  // Salvar entidade (criar ou atualizar)
  async saveEntity(config: FormConfig, data: any, entityId?: string): Promise<ApiResponse> {
    try {
      if (entityId) {
        // Atualizar
        const endpoint = config.updateEndpoint(entityId);
        return await api.put(endpoint, data, {
          showSuccess: true,
          successMessage: `${config.entityName} atualizado com sucesso!`
        });
      } else {
        // Criar
        return await api.post(config.createEndpoint, data, {
          showSuccess: true,
          successMessage: `${config.entityName} criado com sucesso!`
        });
      }
    } catch (error) {
      console.error(`Erro ao salvar ${config.entityName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao salvar'
      };
    }
  }
  
  // Duplicar entidade
  async duplicateEntity(config: FormConfig, entityId: string, customData?: any): Promise<ApiResponse> {
    try {
      // Tentar endpoint específico de duplicação primeiro
      const duplicateEndpoint = `/${config.entityName}s/${entityId}/duplicate`;
      
      try {
        return await api.post(duplicateEndpoint, customData || {}, {
          showSuccess: true,
          successMessage: `${config.entityName} duplicado com sucesso!`
        });
      } catch {
        // Fallback: usar endpoint universal
        return await api.post(`/universal/${config.entityName}/duplicate/${entityId}`, customData || {}, {
          showSuccess: true,
          successMessage: `${config.entityName} duplicado com sucesso!`
        });
      }
    } catch (error) {
      console.error(`Erro ao duplicar ${config.entityName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao duplicar'
      };
    }
  }
  
  // Obter histórico da entidade
  async getEntityHistory(config: FormConfig, entityId: string, page = 1, limit = 10): Promise<ApiResponse> {
    try {
      // Tentar endpoint específico primeiro
      const historyEndpoint = `/${config.entityName}s/${entityId}/history`;
      
      try {
        return await api.get(`${historyEndpoint}?page=${page}&limit=${limit}`);
      } catch {
        // Fallback: usar endpoint universal
        return await api.get(`/universal/${config.entityName}/history/${entityId}?page=${page}&limit=${limit}`);
      }
    } catch (error) {
      console.error(`Erro ao carregar histórico:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao carregar histórico'
      };
    }
  }
  
  // Excluir entidade
  async deleteEntity(config: FormConfig, entityId: string): Promise<ApiResponse> {
    try {
      const endpoint = config.updateEndpoint(entityId);
      return await api.delete(endpoint, {
        showSuccess: true,
        successMessage: `${config.entityName} excluído com sucesso!`
      });
    } catch (error) {
      console.error(`Erro ao excluir ${config.entityName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao excluir'
      };
    }
  }
  
  // Listar entidades com filtros
  async listEntities(
    config: FormConfig, 
    params: {
      page?: number;
      limit?: number;
      search?: string;
      filters?: Record<string, any>;
      sort?: { field: string; order: 'asc' | 'desc' };
    } = {}
  ): Promise<ApiResponse> {
    try {
      const searchParams = new URLSearchParams();
      
      if (params.page) searchParams.set('page', params.page.toString());
      if (params.limit) searchParams.set('limit', params.limit.toString());
      if (params.search) searchParams.set('search', params.search);
      if (params.sort) {
        searchParams.set('sortBy', params.sort.field);
        searchParams.set('sortOrder', params.sort.order);
      }
      
      // Adicionar filtros específicos
      if (params.filters) {
        Object.entries(params.filters).forEach(([key, value]) => {
          if (value !== null && value !== undefined && value !== '') {
            searchParams.set(key, String(value));
          }
        });
      }
      
      const endpoint = config.createEndpoint.replace(/\/[^/]*$/, ''); // Remove o último segmento para obter o endpoint de listagem
      return await api.get(`${endpoint}?${searchParams.toString()}`);
    } catch (error) {
      console.error(`Erro ao listar ${config.entityName}s:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao listar'
      };
    }
  }
  
  // Validar dados da entidade
  async validateEntity(config: FormConfig, data: any): Promise<ApiResponse> {
    try {
      const endpoint = config.createEndpoint.replace(/\/[^/]*$/, '/validate');
      return await api.post(endpoint, data);
    } catch (error) {
      console.error(`Erro ao validar ${config.entityName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro na validação'
      };
    }
  }
  
  // Análise com IA (se habilitada)
  async analyzeWithAI(config: FormConfig, data: any): Promise<ApiResponse> {
    if (!config.aiEnabled || !config.aiEndpoint) {
      return {
        success: false,
        error: 'IA não habilitada para esta entidade'
      };
    }
    
    try {
      return await api.post(config.aiEndpoint, {
        entityType: config.entityName,
        data
      }, {
        showSuccess: true,
        successMessage: 'Análise da IA concluída!'
      });
    } catch (error) {
      console.error(`Erro na análise IA:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro na análise IA'
      };
    }
  }
  
  // Obter estatísticas da entidade
  async getEntityStats(config: FormConfig): Promise<ApiResponse> {
    try {
      const statsEndpoint = config.createEndpoint.replace(/\/[^/]*$/, '/stats');
      return await api.get(statsEndpoint);
    } catch (error) {
      console.error(`Erro ao carregar estatísticas:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao carregar estatísticas'
      };
    }
  }
  
  // Upload de arquivo
  async uploadFile(file: File, entityType: string, entityId?: string): Promise<ApiResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (entityId) formData.append('entityId', entityId);
      formData.append('entityType', entityType);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: formData
      });
      
      return await response.json();
    } catch (error) {
      console.error('Erro no upload:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro no upload'
      };
    }
  }
  
  // Exportar dados
  async exportEntity(config: FormConfig, format: 'csv' | 'xlsx' | 'json' = 'csv', filters?: any): Promise<ApiResponse> {
    try {
      const exportEndpoint = `/api${config.createEndpoint.replace(/\/[^/]*$/, '/export')}`;
      const params = new URLSearchParams({ format });
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value) params.set(key, String(value));
        });
      }
      
      const response = await fetch(`${exportEndpoint}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${config.entityName}s.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        return { success: true, message: 'Export realizado com sucesso!' };
      } else {
        throw new Error('Erro no export');
      }
    } catch (error) {
      console.error('Erro no export:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro no export'
      };
    }
  }
}

export const universalApiService = new UniversalApiService(); 