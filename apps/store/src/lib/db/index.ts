import { Database } from './database'
import { dev } from '$app/environment'
import { env } from '$env/dynamic/private'
import { dbCache } from './cache'

// CORREÇÃO: Não usar singleton, criar nova conexão por request
// Função para criar conexão otimizada por request
function createDatabaseConnection(platform?: App.Platform): Database {
  // EM PRODUÇÃO: Preferir Neon direto (mais próximo dos usuários)
  if (!dev) {
    // PRIORIDADE 1: Neon (São Paulo) - mais rápido para Brasil
    const neonUrl = 'postgresql://neondb_owner:npg_wS8ux1paQcqY@ep-dawn-field-acydf752-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require'
    console.log('🚀 Neon TCP: Conexão por request (Workers compliant)')
    
    return new Database({
      provider: 'neon',
      connectionString: neonUrl,
      options: {
        postgres: {
          // CONFIGURAÇÃO OTIMIZADA PARA WORKERS:
          max: 1,                    // 1 conexão por request (Workers requirement)
          idleTimeout: 30000,        // 30 segundos idle
          connectTimeout: 30000,     // 30 segundos para conectar
          ssl: 'require'             // Neon precisa SSL
        }
      }
    })
  }
  
  // EM DESENVOLVIMENTO: Usar Neon ou local
  const dbUrl = env.DATABASE_URL || process.env.DATABASE_URL || 'postgresql://postgres@localhost/mktplace_dev'
  
  console.log('🔌 Dev:', dbUrl.includes('neon.tech') ? 'NEON' : 'LOCAL')
  
  // Detectar provider pela URL
  const isNeon = dbUrl.includes('neon.tech')
  const provider = isNeon ? 'neon' : 'postgres'
  
  return new Database({
    provider: provider,
    connectionString: dbUrl,
    options: {
      postgres: {
        max: 1,                        // 1 conexão por request
        idleTimeout: 30000,            // 30 segundos idle
        connectTimeout: 60000,         // 1 minuto para conectar em dev
        ssl: isNeon ? 'require' : false // SSL para Neon
      }
    }
  })
}

export function getDatabase(platform?: App.Platform) {
  // SEMPRE criar nova conexão para cada request (Workers requirement)
  return createDatabaseConnection(platform);
}

// Helper com cache inteligente para substituir Hyperdrive
export async function withDatabase<T>(
  platform: App.Platform | undefined,
  callback: (db: Database) => Promise<T>,
  cacheKey?: string,
  cacheTtl: number = 60
): Promise<T> {
  // Se tem cache key, usa cache
  if (cacheKey) {
    return dbCache.getOrSet(cacheKey, async () => {
      const db = getDatabase(platform)
      return await executeWithRetry(db, callback);
    }, cacheTtl);
  }
  
  // Sem cache, executa direto
  const db = getDatabase(platform)
  return await executeWithRetry(db, callback);
}

// Função auxiliar para retry automático
async function executeWithRetry<T>(
  db: Database,
  callback: (db: Database) => Promise<T>
): Promise<T> {
  let retries = 3;
  let lastError: any;
  
  while (retries > 0) {
    try {
      const result = await callback(db);
      
      // IMPORTANTE: Fechar conexão após uso (Workers requirement)
      try {
        await db.close();
      } catch (closeError) {
        console.log('⚠️ Erro ao fechar conexão (ignorado):', closeError);
      }
      
      return result;
    } catch (error: any) {
      lastError = error;
      
      // Fechar conexão mesmo em caso de erro
      try {
        await db.close();
      } catch (closeError) {
        // Ignorar erro de fechamento
      }
      
      // Se for erro de conexão, tenta reconectar
      if (error.code === 'CONNECTION_ENDED' || error.code === 'ECONNREFUSED') {
        console.log(`⚠️ Erro de conexão TCP, tentando reconectar... (${retries} tentativas restantes)`)
        retries--;
        
        // Aguarda um pouco antes de tentar novamente
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Criar nova conexão para retry
        db = createDatabaseConnection();
      } else {
        // Se não for erro de conexão, lança o erro
        throw error;
      }
    }
  }
  
  // Se esgotou as tentativas, lança o último erro
  throw lastError;
}

// Função para limpar cache por padrão
export function invalidateCache(pattern: string) {
  dbCache.invalidate(pattern);
}

// Função para ver status do cache
export function getCacheStats() {
  return dbCache.getStats();
} 