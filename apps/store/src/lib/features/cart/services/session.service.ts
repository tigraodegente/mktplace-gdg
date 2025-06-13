/**
 * Session Service - Cart Feature
 * 
 * Responsável pelo gerenciamento de sessões do carrinho
 * Extração da lógica de sessão para melhor organização
 */

import { nanoid } from 'nanoid';
import { getCartPersistenceService } from './persistence.service';
import type { CartPersistenceService } from './persistence.service';

// =============================================================================
// TIPOS E INTERFACES
// =============================================================================

export interface SessionConfig {
  sessionIdLength?: number;
  persistenceService?: CartPersistenceService;
  sessionKey?: string;
}

export interface SessionInfo {
  id: string;
  createdAt: Date;
  lastAccess: Date;
}

// =============================================================================
// SESSION SERVICE
// =============================================================================

export class CartSessionService {
  private sessionIdLength: number;
  private persistenceService: CartPersistenceService;
  private sessionKey: string;
  private currentSessionId: string | null = null;
  
  constructor(config: SessionConfig = {}) {
    this.sessionIdLength = config.sessionIdLength || 32;
    this.persistenceService = config.persistenceService || getCartPersistenceService();
    this.sessionKey = config.sessionKey || 'cartSessionId';
  }
  
  /**
   * Obtém ou cria ID de sessão
   */
  getOrCreateSessionId(): string {
    // Cache em memória para performance
    if (this.currentSessionId) {
      return this.currentSessionId;
    }
    
    // Tentar carregar do storage
    let sessionId = this.persistenceService.loadFromStorage<string>(this.sessionKey, '');
    
    if (!sessionId) {
      // Gerar novo ID se não existe
      sessionId = this.generateSessionId();
      this.persistenceService.saveToStorage(this.sessionKey, sessionId);
    }
    
    // Cache em memória
    this.currentSessionId = sessionId;
    
    // Atualizar last access
    this.updateLastAccess();
    
    return sessionId;
  }
  
  /**
   * Gera novo ID de sessão
   */
  private generateSessionId(): string {
    return nanoid(this.sessionIdLength);
  }
  
  /**
   * Renova sessão (gera novo ID)
   */
  renewSession(): string {
    const newSessionId = this.generateSessionId();
    this.currentSessionId = newSessionId;
    this.persistenceService.saveToStorage(this.sessionKey, newSessionId);
    this.updateLastAccess();
    return newSessionId;
  }
  
  /**
   * Obtém informações da sessão atual
   */
  getSessionInfo(): SessionInfo | null {
    const sessionId = this.currentSessionId || this.getOrCreateSessionId();
    
    const sessionData = this.persistenceService.loadFromStorage<any>(
      `${this.sessionKey}_info`, 
      null
    );
    
    if (sessionData && sessionData.id === sessionId) {
      return {
        id: sessionData.id,
        createdAt: new Date(sessionData.createdAt),
        lastAccess: new Date(sessionData.lastAccess)
      };
    }
    
    // Criar nova sessão se não existe info
    const now = new Date();
    const newSessionInfo: SessionInfo = {
      id: sessionId,
      createdAt: now,
      lastAccess: now
    };
    
    this.persistenceService.saveToStorage(`${this.sessionKey}_info`, {
      id: sessionId,
      createdAt: now.toISOString(),
      lastAccess: now.toISOString()
    });
    
    return newSessionInfo;
  }
  
  /**
   * Atualiza timestamp de último acesso
   */
  private updateLastAccess(): void {
    const sessionId = this.currentSessionId;
    if (!sessionId) return;
    
    const sessionData = this.persistenceService.loadFromStorage<any>(
      `${this.sessionKey}_info`, 
      null
    );
    
    if (sessionData && sessionData.id === sessionId) {
      sessionData.lastAccess = new Date().toISOString();
      this.persistenceService.saveToStorage(`${this.sessionKey}_info`, sessionData);
    }
  }
  
  /**
   * Limpa dados da sessão
   */
  clearSession(): void {
    this.currentSessionId = null;
    this.persistenceService.removeFromStorage(this.sessionKey);
    this.persistenceService.removeFromStorage(`${this.sessionKey}_info`);
  }
  
  /**
   * Verifica se sessão é válida/ativa
   */
  isSessionValid(): boolean {
    try {
      const sessionId = this.getOrCreateSessionId();
      return !!sessionId && sessionId.length === this.sessionIdLength;
    } catch {
      return false;
    }
  }
  
  /**
   * Obtém idade da sessão em minutos
   */
  getSessionAge(): number | null {
    const sessionInfo = this.getSessionInfo();
    if (!sessionInfo) return null;
    
    const now = new Date();
    const ageMs = now.getTime() - sessionInfo.createdAt.getTime();
    return Math.floor(ageMs / (1000 * 60)); // em minutos
  }
  
  /**
   * Obtém tempo desde último acesso em minutos
   */
  getTimeSinceLastAccess(): number | null {
    const sessionInfo = this.getSessionInfo();
    if (!sessionInfo) return null;
    
    const now = new Date();
    const timeDiffMs = now.getTime() - sessionInfo.lastAccess.getTime();
    return Math.floor(timeDiffMs / (1000 * 60)); // em minutos
  }
}

// =============================================================================
// FACTORY E SINGLETON
// =============================================================================

let defaultInstance: CartSessionService | null = null;

/**
 * Obtém instância padrão do service (singleton)
 */
export function getCartSessionService(): CartSessionService {
  if (!defaultInstance) {
    defaultInstance = new CartSessionService();
  }
  return defaultInstance;
}

/**
 * Cria nova instância com configuração específica
 */
export function createCartSessionService(config: SessionConfig): CartSessionService {
  return new CartSessionService(config);
}

// =============================================================================
// FUNÇÕES DE COMPATIBILIDADE (Para migração gradual)
// =============================================================================

/**
 * @deprecated Use getCartSessionService().getOrCreateSessionId()
 */
export function getOrCreateSessionId(): string {
  return getCartSessionService().getOrCreateSessionId();
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Valida formato de session ID
 */
export function isValidSessionId(sessionId: string): boolean {
  if (!sessionId) return false;
  
  // nanoid usa caracteres [A-Za-z0-9_-]
  const validChars = /^[A-Za-z0-9_-]+$/;
  return validChars.test(sessionId) && sessionId.length >= 16;
}

/**
 * Limpa sessões expiradas (utilitário para manutenção)
 */
export function cleanupExpiredSessions(maxAgeMinutes: number = 60 * 24 * 7): void {
  try {
    const sessionService = getCartSessionService();
    const sessionAge = sessionService.getSessionAge();
    
    if (sessionAge && sessionAge > maxAgeMinutes) {
      sessionService.clearSession();
    }
  } catch (error) {
    console.warn('Erro ao limpar sessões expiradas:', error);
  }
} 