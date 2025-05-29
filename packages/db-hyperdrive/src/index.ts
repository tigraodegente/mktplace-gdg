import postgres from 'postgres'
import type { Sql, Options } from 'postgres'

// Tipos exportados diretamente
export interface DatabaseConfig {
  provider: 'hyperdrive' | 'xata' | 'supabase' | 'neon' | 'postgres'
  connectionString: string
  options?: {
    postgres?: {
      ssl?: boolean | 'require' | 'prefer'
      max?: number
      idleTimeout?: number
      connectTimeout?: number
    }
  }
}

export interface DatabaseEnv {
  HYPERDRIVE_DB?: {
    connectionString: string
  }
  DATABASE_URL?: string
}

export class Database {
  private sql: postgres.Sql
  private config: DatabaseConfig
  private isLocal: boolean
  
  constructor(config: DatabaseConfig | string) {
    // Se for string, assume PostgreSQL direto
    if (typeof config === 'string') {
      this.config = {
        provider: 'postgres',
        connectionString: config
      }
    } else {
      this.config = config
    }
    
    // Detectar se é conexão local
    this.isLocal = this.config.connectionString.includes('localhost') || 
                   this.config.connectionString.includes('127.0.0.1')
    
    // Configurações base para todos os provedores
    const baseOptions: Options<any> = {
      ssl: this.isLocal ? false : (this.config.options?.postgres?.ssl ?? 'require'),
      connection: {
        application_name: 'mktplace-db'
      },
      max: this.config.options?.postgres?.max ?? 1,
      idle_timeout: this.config.options?.postgres?.idleTimeout ?? 20,
      connect_timeout: this.config.options?.postgres?.connectTimeout ?? 10,
      transform: {
        undefined: null
      }
    }
    
    // Ajustes específicos por provedor
    switch (this.config.provider) {
      case 'hyperdrive':
        // Hyperdrive já gerencia pooling
        baseOptions.max = 1
        baseOptions.prepare = false // Importante para Cloudflare Workers
        break
      case 'supabase':
        // Supabase precisa de pooling
        baseOptions.max = 10
        break
      case 'xata':
        // Xata tem suas próprias otimizações
        baseOptions.ssl = 'require'
        break
      case 'neon':
        // Neon funciona bem com estas configs
        baseOptions.prepare = false
        break
    }
    
    this.sql = postgres(this.config.connectionString, baseOptions)
  }
  
  // Query que retorna múltiplas linhas
  async query<T = any>(
    strings: TemplateStringsArray | string,
    ...values: any[]
  ): Promise<T[]> {
    if (typeof strings === 'string') {
      // Query simples com string
      const result = await this.sql.unsafe(strings, values)
      return result as unknown as T[]
    }
    // Template literal query
    const result = await this.sql(strings, ...values)
    return result as unknown as T[]
  }
  
  // Query que retorna uma única linha
  async queryOne<T = any>(
    strings: TemplateStringsArray | string,
    ...values: any[]
  ): Promise<T | null> {
    const rows = await this.query<T>(strings, ...values)
    return rows[0] || null
  }
  
  // Executar comando sem retorno
  async execute(
    strings: TemplateStringsArray | string,
    ...values: any[]
  ): Promise<void> {
    await this.query(strings, ...values)
  }
  
  // Transação
  async transaction<T>(
    callback: (sql: postgres.TransactionSql) => Promise<T>
  ): Promise<T> {
    const result = await this.sql.begin(async (sql) => {
      return await callback(sql)
    })
    return result as T
  }
  
  // Fechar conexão
  async close() {
    // Em desenvolvimento local, não fecha a conexão para evitar CONNECTION_ENDED
    if (this.isLocal) {
      return
    }
    await this.sql.end()
  }
  
  // Getter para acessar o cliente SQL diretamente se necessário
  get client() {
    return this.sql
  }
}

// Helper para criar database a partir do ambiente
export function createDatabase(env: DatabaseEnv): Database {
  // Prioridade: Hyperdrive > DATABASE_URL
  if (env.HYPERDRIVE_DB?.connectionString) {
    return new Database({
      provider: 'hyperdrive',
      connectionString: env.HYPERDRIVE_DB.connectionString
    })
  }
  
  if (env.DATABASE_URL) {
    // Detectar provider pela URL
    const provider = detectProvider(env.DATABASE_URL)
    return new Database({
      provider,
      connectionString: env.DATABASE_URL
    })
  }
  
  throw new Error('No database configuration found')
}

// Detectar provider pela URL
function detectProvider(url: string): DatabaseConfig['provider'] {
  if (url.includes('xata.sh')) return 'xata'
  if (url.includes('supabase.co')) return 'supabase'
  if (url.includes('neon.tech')) return 'neon'
  return 'postgres'
}

// Helper para usar em routes (funciona com qualquer provider)
export async function withDatabase<T>(
  env: DatabaseEnv,
  callback: (db: Database) => Promise<T>
): Promise<T> {
  const db = createDatabase(env)
  
  try {
    return await callback(db)
  } finally {
    await db.close()
  }
}

// Re-export do postgres para uso direto se necessário
export { postgres } 