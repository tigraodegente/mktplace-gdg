import { Database } from '@mktplace/db-hyperdrive'
import { dev } from '$app/environment'

export function getDatabase(platform?: App.Platform) {
  // Em desenvolvimento, sempre usa PostgreSQL local
  if (dev || !platform?.env?.HYPERDRIVE_DB) {
    const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres@localhost/mktplace_dev'
    return new Database({
      provider: 'postgres',
      connectionString: dbUrl
    })
  }
  
  // Em produção (Cloudflare), usa Hyperdrive
  return new Database({
    provider: 'hyperdrive',
    connectionString: platform.env.HYPERDRIVE_DB.connectionString
  })
}

// Helper para usar em server-side
export async function withDatabase<T>(
  platform: App.Platform | undefined,
  callback: (db: Database) => Promise<T>
): Promise<T> {
  const db = getDatabase(platform)
  
  try {
    return await callback(db)
  } finally {
    await db.close()
  }
} 