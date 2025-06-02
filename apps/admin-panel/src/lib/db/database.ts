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
  private sql: any = null;
  private config: DatabaseConfig;
  private isLocal: boolean;

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

  // Query que retorna múltiplas linhas
  async query<T = any>(strings: TemplateStringsArray | string, ...values: any[]): Promise<T[]> {
    const sql = await this.getSqlClient();
    
    try {
    if (typeof strings === 'string') {
      // Query simples com string
        const result = await sql.unsafe(strings, values);
        return result as unknown as T[];
      }
      // Template literal query
      const result = await sql(strings, ...values);
      return result as unknown as T[];
    } catch (error) {
      console.error('❌ Erro na query:', error);
      throw error;
    }
  }

  // Query que retorna uma única linha
  async queryOne<T = any>(strings: TemplateStringsArray | string, ...values: any[]): Promise<T | null> {
    const rows = await this.query<T>(strings, ...values);
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