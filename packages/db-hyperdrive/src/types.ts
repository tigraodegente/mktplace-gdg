// Tipos de configuração para suportar múltiplos provedores de banco
export interface DatabaseConfig {
  provider: 'hyperdrive' | 'xata' | 'supabase' | 'neon' | 'postgres'
  connectionString: string
  // Configurações específicas por provedor
  options?: {
    // Para Hyperdrive/Cloudflare
    hyperdrive?: {
      binding?: string
    }
    // Para conexões diretas
    postgres?: {
      ssl?: boolean | 'require' | 'prefer'
      max?: number
      idleTimeout?: number
      connectTimeout?: number
    }
  }
}

// Interface para ambiente (funciona em qualquer lugar)
export interface DatabaseEnv {
  // Para Cloudflare Hyperdrive
  HYPERDRIVE_DB?: Hyperdrive
  // Para conexão direta
  DATABASE_URL?: string
  // Provider específico
  DB_PROVIDER?: string
} 