// Database client otimizado para Cloudflare Workers
// Usando import condicional para evitar problemas no browser

// IMPORTANTE: Não importar postgres diretamente para evitar erro no build do cliente
// import type { Sql } from 'postgres' - removido

export interface DatabaseConfig {
  provider: 'neon' | 'postgres';
  connectionString: string;
  options?: {
    postgres?: {
      ssl?: boolean | 'require' | 'prefer';
      max?: number;
      idleTimeout?: number;
      connectTimeout?: number;
    };
  };
}

export interface DatabaseEnv {
  DATABASE_URL?: string;
}

export class Database {
  private sql: any;
  private connectionPool: any;
  private lastConnectionTime: number = 0;
  private isConnected: boolean = false;
  private retryAttempts: number = 0;
  private maxRetries: number = 3;
  private config: DatabaseConfig;
  private isLocal: boolean;
  private connectionTimer: NodeJS.Timeout | null = null;

  constructor(config: DatabaseConfig | string) {
    // Se for string, assume PostgreSQL direto
    if (typeof config === 'string') {
      this.config = {
        provider: 'postgres',
        connectionString: config
      };
    } else {
      this.config = config;
    }

    // Detectar se é conexão local
    this.isLocal = this.config.connectionString.includes('localhost') ||
      this.config.connectionString.includes('127.0.0.1');

    // Limpar qualquer timer existente
    if (this.connectionTimer) {
      clearInterval(this.connectionTimer);
      this.connectionTimer = null;
    }

    // Remover monitoramento automático para evitar erros
    // this.setupConnectionMonitoring();
  }

  private setupConnectionMonitoring() {
    // Verificar conexão a cada 30 segundos - DESABILITADO
    // setInterval(() => {
    //   this.checkConnection();
    // }, 30000);
  }

  private async checkConnection(): Promise<boolean> {
    try {
      // Só verificar conexão se o cliente SQL já foi inicializado
      if (!this.sql) {
        return false;
      }
      
      const sql = await this.getSqlClient();
      await sql`SELECT 1`;
      this.isConnected = true;
      this.retryAttempts = 0;
      return true;
    } catch (error) {
      // console.warn('🔌 Conexão com banco indisponível:', error);
      this.isConnected = false;
      return false;
    }
  }

  private async getSqlClient() {
    if (this.sql) return this.sql;

    try {
      // APENAS no servidor: import dinâmico do postgres
      if (typeof window !== 'undefined') {
        throw new Error('Database não pode ser usado no browser');
      }
      
      // Lazy load do postgres apenas quando necessário e apenas no servidor
      const postgresLib = await import('postgres');
      const postgres = postgresLib.default || postgresLib;

      // Configurações otimizadas para Cloudflare Workers
      const baseOptions = {
        ssl: this.isLocal ? false : (this.config.options?.postgres?.ssl ?? 'require'),
        connection: {
          application_name: 'mktplace-db'
        },
        max: 1, // Workers devem usar apenas 1 conexão
        idle_timeout: 30,
        connect_timeout: this.config.options?.postgres?.connectTimeout ?? 20,
        prepare: false, // Importante para Workers
        transform: {
          undefined: null
        }
      };

      // Ajustes específicos por provedor
      switch (this.config.provider) {
        case 'neon':
          // Neon funciona bem com estas configs
          (baseOptions as any).prepare = false;
          break;
        case 'postgres':
          // Local postgres
          break;
      }

      this.sql = postgres(this.config.connectionString, baseOptions);
      return this.sql;
    } catch (error) {
      console.error('❌ Erro ao inicializar postgres:', error);
      throw new Error(`Falha na inicialização do banco: ${error}`);
    }
  }

  async query(query: TemplateStringsArray | string, ...params: any[]): Promise<any> {
    const maxRetryAttempts = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetryAttempts; attempt++) {
      try {
    const sql = await this.getSqlClient();
    
        // Se é string, usar query direto
        if (typeof query === 'string') {
          return await sql.unsafe(query, params);
        }
        
        // Se é template literal, usar o operador template
        const result = await sql(query, ...params);
        
        // Resetar contador de erro após sucesso
        this.retryAttempts = 0;
        this.isConnected = true;
        
        return result;
      } catch (error: any) {
        lastError = error;
        this.isConnected = false;
        
        console.warn(`❌ Erro na query (tentativa ${attempt}/${maxRetryAttempts}):`, error.message);
        
        // Se é erro de conectividade, tentar reconectar
        if (this.isConnectionError(error)) {
          console.log(`🔄 Tentando reconectar... (${attempt}/${maxRetryAttempts})`);
          
          // Aguardar antes de tentar novamente (backoff exponencial)
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Resetar sql client para reconectar
          this.sql = null;
          
          continue;
        } else {
          // Se não é erro de conectividade, não tentar novamente
          throw error;
        }
      }
    }

    // Se chegou aqui, todas as tentativas falharam
    console.error(`❌ Falha total na conexão após ${maxRetryAttempts} tentativas`);
    throw new Error(`Database connection failed after ${maxRetryAttempts} attempts: ${lastError?.message}`);
  }

  private isConnectionError(error: any): boolean {
    const connectionErrors = [
      'ENOTFOUND',
      'ECONNREFUSED', 
      'ETIMEDOUT',
      'ECONNRESET',
      'connection_failure',
      'network_failure'
    ];
    
    return connectionErrors.some(errorType => 
      error.code === errorType || 
      error.message?.includes(errorType) ||
      error.message?.includes('connection') ||
      error.message?.includes('network')
    );
    }

  // Query que retorna múltiplas linhas - usando a versão otimizada com retry acima

  // Query que retorna uma única linha
  async queryOne<T = any>(strings: TemplateStringsArray | string, ...values: any[]): Promise<T | null> {
    const rows = await this.query(strings, ...values);
    return rows[0] || null;
  }

  // Executar comando sem retorno
  async execute(strings: TemplateStringsArray | string, ...values: any[]): Promise<void> {
    await this.query(strings, ...values);
  }

  // Transação
  async transaction<T>(callback: (sql: any) => Promise<T>): Promise<T> {
    const sql = await this.getSqlClient();
    const result = await sql.begin(async (sql: any) => {
      return await callback(sql);
    });
    return result as unknown as T;
  }

  // Fechar conexão
  async close(): Promise<void> {
    if (!this.sql) return;
    
    // Em desenvolvimento local, não fecha a conexão para evitar CONNECTION_ENDED
    if (this.isLocal) {
      return;
    }
    
    try {
    await this.sql.end();
    } catch (error) {
      // Ignorar erros de fechamento
    }
    this.sql = null;
  }

  // Getter para acessar o cliente SQL diretamente se necessário
  get client(): any {
    return this.sql;
  }
}

// Helper para criar database a partir do ambiente
export function createDatabase(env: DatabaseEnv): Database {
  if (env.DATABASE_URL) {
    // Detectar provider pela URL
    const provider = detectProvider(env.DATABASE_URL);
    return new Database({
      provider,
      connectionString: env.DATABASE_URL
    });
  }

  throw new Error('No database configuration found');
}

// Detectar provider pela URL
function detectProvider(url: string): DatabaseConfig['provider'] {
  if (url.includes('neon.tech')) return 'neon';
  return 'postgres';
}

// Helper para usar em routes (funciona com qualquer provider)
export async function withDatabase<T>(env: DatabaseEnv, callback: (db: Database) => Promise<T>): Promise<T> {
  const db = createDatabase(env);
  try {
    return await callback(db);
  } finally {
    await db.close();
  }
}