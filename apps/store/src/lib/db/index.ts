import { Database } from './database.js'
import { dev } from '$app/environment'
import { env } from '$env/dynamic/private'

// Singleton para desenvolvimento com pool de conexões
let devDatabase: Database | null = null;

// NOVO: Singleton para Hyperdrive em produção
let hyperdriveDatabase: Database | null = null;

let connectionCheckInterval: NodeJS.Timeout | null = null;

// Função para verificar e reconectar se necessário
async function ensureConnection(db: Database): Promise<void> {
  try {
    // Testa a conexão com uma query simples
    await db.query`SELECT 1`
  } catch (error) {
    console.log('🔄 Reconectando ao banco de dados...')
    // Se falhar, recria a conexão
    devDatabase = null;
    hyperdriveDatabase = null;
    const newDb = getDatabase();
    // Testa novamente
    await newDb.query`SELECT 1`
  }
}

export function getDatabase(platform?: App.Platform) {
  // EM PRODUÇÃO: Sempre usar Hyperdrive se disponível (SINGLETON)
  if (!dev && (platform as any)?.env?.HYPERDRIVE_DB) {
    if (!hyperdriveDatabase) {
      console.log('🚀 Criando conexão Hyperdrive (singleton)')
      hyperdriveDatabase = new Database({
        provider: 'hyperdrive',
        connectionString: (platform as any)?.env?.HYPERDRIVE_DB?.connectionString,
        options: {
          postgres: {
            max: 1, // Hyperdrive já gerencia o pool
            idleTimeout: 0,
            connectTimeout: 30
          }
        }
      })
    }
    return hyperdriveDatabase;
  }
  
  // EM DESENVOLVIMENTO OU FALLBACK: Usar Neon direto
  if (!devDatabase) {
    // SEMPRE usar Neon se DATABASE_URL estiver definida
    const dbUrl = env.DATABASE_URL || process.env.DATABASE_URL || 'postgresql://postgres@localhost/mktplace_dev'
    
    console.log('🔌 Conectando ao banco:', dbUrl.includes('neon.tech') ? 'NEON DIRETO' : 'LOCAL')
    
    // Detectar provider pela URL
    const isNeon = dbUrl.includes('neon.tech')
    const provider = isNeon ? 'neon' : 'postgres'
    
    devDatabase = new Database({
      provider: provider,
      connectionString: dbUrl,
      options: {
        postgres: {
          max: dev ? 20 : 1, // Mais conexões em dev, menos em produção
          idleTimeout: 0, // Desabilitar timeout de idle
          connectTimeout: 30, // Aumentar timeout de conexão
          ssl: isNeon ? 'require' : false // SSL para Neon, sem SSL para local
        }
      }
    })
    
    // Log de confirmação
    console.log(`✅ Banco configurado: ${provider.toUpperCase()} - ${isNeon ? 'NEON DIRETO' : 'LOCAL'}`)
    
    // Verificar conexão periodicamente apenas em desenvolvimento
    if (dev && !connectionCheckInterval) {
      connectionCheckInterval = setInterval(async () => {
        if (devDatabase) {
          try {
            await devDatabase.query`SELECT 1`
          } catch (error) {
            console.log('⚠️ Conexão perdida, será reconectada na próxima requisição')
            devDatabase = null;
          }
        }
      }, 30000); // Verificar a cada 30 segundos
    }
  }
  return devDatabase;
}

// Helper para usar em server-side com retry automático
export async function withDatabase<T>(
  platform: App.Platform | undefined,
  callback: (db: Database) => Promise<T>
): Promise<T> {
  const db = getDatabase(platform)
  
  // Apenas em desenvolvimento verifica a conexão antes de usar
  if (dev) {
    await ensureConnection(db);
  }
  
  let retries = 3;
  let lastError: any;
  
  while (retries > 0) {
    try {
      return await callback(db)
    } catch (error: any) {
      lastError = error;
      
      // Se for erro de conexão, tenta reconectar
      if (error.code === 'CONNECTION_ENDED' || error.code === 'ECONNREFUSED') {
        console.log(`⚠️ Erro de conexão, tentando reconectar... (${retries} tentativas restantes)`)
        if (dev) {
          devDatabase = null;
        } else {
          hyperdriveDatabase = null; // Reset singleton em produção também
        }
        retries--;
        
        // Aguarda um pouco antes de tentar novamente
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        // Se não for erro de conexão, lança o erro
        throw error;
      }
    }
  }
  
  // Se esgotou as tentativas, lança o último erro
  throw lastError;
}

// Cleanup ao encerrar o processo
if (typeof process !== 'undefined') {
  process.on('SIGINT', () => {
    if (connectionCheckInterval) {
      clearInterval(connectionCheckInterval);
    }
    if (devDatabase) {
      devDatabase.close().catch(() => {});
    }
    if (hyperdriveDatabase) {
      hyperdriveDatabase.close().catch(() => {});
    }
  });
} 