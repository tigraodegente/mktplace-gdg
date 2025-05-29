import { Database } from '@mktplace/db-hyperdrive'
import { dev } from '$app/environment'

// Singleton para desenvolvimento com pool de conexões
let devDatabase: Database | null = null;
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
    const newDb = getDatabase();
    // Testa novamente
    await newDb.query`SELECT 1`
  }
}

export function getDatabase(platform?: App.Platform) {
  // Em desenvolvimento, usa singleton para evitar múltiplas conexões
  if (dev || !platform?.env?.HYPERDRIVE_DB) {
    if (!devDatabase) {
      const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres@localhost/mktplace_dev'
      console.log('🔌 Criando nova conexão com o banco de dados local...')
      
      devDatabase = new Database({
        provider: 'postgres',
        connectionString: dbUrl,
        options: {
          postgres: {
            max: 20, // Aumentar pool de conexões
            idleTimeout: 0, // Desabilitar timeout de idle
            connectTimeout: 30, // Aumentar timeout de conexão
            ssl: false // Desabilitar SSL para conexão local
          }
        }
      })
      
      // Verificar conexão periodicamente em desenvolvimento
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
  
  // Em produção (Cloudflare), usa Hyperdrive
  return new Database({
    provider: 'hyperdrive',
    connectionString: platform.env.HYPERDRIVE_DB.connectionString
  })
}

// Helper para usar em server-side com retry automático
export async function withDatabase<T>(
  platform: App.Platform | undefined,
  callback: (db: Database) => Promise<T>
): Promise<T> {
  const db = getDatabase(platform)
  
  // Em desenvolvimento, verifica a conexão antes de usar
  if (dev || !platform?.env?.HYPERDRIVE_DB) {
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
        devDatabase = null;
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
  });
} 