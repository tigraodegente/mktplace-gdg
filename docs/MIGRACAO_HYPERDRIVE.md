# Migração Completa para Cloudflare Hyperdrive

## 📋 Checklist de Migração

### Fase 1: Preparação e Setup
- [ ] Criar configuração Hyperdrive no Cloudflare
- [ ] Instalar dependências necessárias
- [ ] Criar cliente de banco compartilhado
- [ ] Configurar variáveis de ambiente

### Fase 2: Migração da Camada de Dados
- [ ] Criar novo cliente PostgreSQL compatível
- [ ] Migrar queries de autenticação
- [ ] Migrar queries de produtos
- [ ] Migrar queries de carrinho/pedidos
- [ ] Criar utilitários de migração

### Fase 3: Testes e Validação
- [ ] Testar autenticação
- [ ] Testar CRUD de produtos
- [ ] Testar performance
- [ ] Comparar com implementação atual

### Fase 4: Deploy Gradual
- [ ] Deploy em staging
- [ ] Migração gradual por rotas
- [ ] Monitoramento
- [ ] Rollback plan

## 🚀 Passo a Passo Detalhado

### 1. Criar Configuração Hyperdrive

```bash
# No terminal, na raiz do projeto
wrangler hyperdrive create mktplace-gdg-db \
  --connection-string "postgresql://787mk0:YOUR_API_KEY@us-east-1.sql.xata.sh/mktplace-gdg:main?sslmode=require"
```

### 2. Atualizar wrangler.toml

```toml
# apps/store/wrangler.toml
name = "mktplace-store"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[hyperdrive]]
binding = "HYPERDRIVE_DB"
id = "YOUR_HYPERDRIVE_ID" # ID retornado pelo comando acima

[vars]
# Outras variáveis...

# Repetir para admin-panel e seller-panel
```

### 3. Instalar Dependências

```bash
# Em cada app (store, admin-panel, seller-panel)
cd apps/store
npm install postgres @types/pg
npm install --save-dev @cloudflare/workers-types
```

### 4. Criar Cliente de Banco Compartilhado

```typescript
// packages/db-hyperdrive/src/index.ts
import { Client } from 'postgres'

export interface Env {
  HYPERDRIVE_DB: Hyperdrive
  // outras variáveis...
}

export class Database {
  private client: Client
  
  constructor(connectionString: string) {
    this.client = new Client(connectionString)
  }
  
  async connect() {
    await this.client.connect()
  }
  
  async disconnect() {
    await this.client.end()
  }
  
  // Métodos de consulta
  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const result = await this.client.query(sql, params)
    return result.rows
  }
  
  async queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
    const rows = await this.query<T>(sql, params)
    return rows[0] || null
  }
  
  async execute(sql: string, params?: any[]): Promise<void> {
    await this.client.query(sql, params)
  }
}

// Helper para usar em routes
export async function withDatabase<T>(
  env: Env,
  callback: (db: Database) => Promise<T>
): Promise<T> {
  const db = new Database(env.HYPERDRIVE_DB.connectionString)
  
  try {
    await db.connect()
    return await callback(db)
  } finally {
    await db.disconnect()
  }
}
```

### 5. Migrar Serviços de Autenticação

```typescript
// packages/db-hyperdrive/src/services/auth.service.ts
import { Database } from '../index'
import { hash, verify } from '@node-rs/argon2'

export class AuthService {
  constructor(private db: Database) {}
  
  async createUser(email: string, password: string, name: string) {
    const passwordHash = await hash(password)
    
    const user = await this.db.queryOne(`
      INSERT INTO users (email, password_hash, name, role, created_at, updated_at)
      VALUES ($1, $2, $3, 'customer', NOW(), NOW())
      RETURNING id, email, name, role
    `, [email, passwordHash, name])
    
    return user
  }
  
  async validateUser(email: string, password: string) {
    const user = await this.db.queryOne(`
      SELECT id, email, password_hash, name, role
      FROM users
      WHERE email = $1 AND is_active = true
    `, [email])
    
    if (!user) return null
    
    const valid = await verify(user.password_hash, password)
    if (!valid) return null
    
    const { password_hash, ...userWithoutPassword } = user
    return userWithoutPassword
  }
  
  async createSession(userId: string, token: string) {
    await this.db.execute(`
      INSERT INTO sessions (user_id, token, expires_at, created_at)
      VALUES ($1, $2, NOW() + INTERVAL '7 days', NOW())
    `, [userId, token])
  }
  
  async validateSession(token: string) {
    const session = await this.db.queryOne(`
      SELECT s.*, u.id as user_id, u.email, u.name, u.role
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = $1 
        AND s.expires_at > NOW()
        AND u.is_active = true
    `, [token])
    
    return session
  }
}
```

### 6. Migrar Serviços de Produtos

```typescript
// packages/db-hyperdrive/src/services/product.service.ts
import { Database } from '../index'

export class ProductService {
  constructor(private db: Database) {}
  
  async getFeaturedProducts(limit = 10) {
    return await this.db.query(`
      SELECT 
        p.*,
        b.name as brand_name,
        c.name as category_name,
        COALESCE(pi.url, '/placeholder.jpg') as image_url
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
      WHERE p.featured = true AND p.is_active = true
      ORDER BY p.created_at DESC
      LIMIT $1
    `, [limit])
  }
  
  async searchProducts(query: string, filters: any = {}) {
    let sql = `
      SELECT 
        p.*,
        b.name as brand_name,
        c.name as category_name,
        COALESCE(pi.url, '/placeholder.jpg') as image_url,
        ts_rank(to_tsvector('portuguese', p.name || ' ' || COALESCE(p.description, '')), plainto_tsquery('portuguese', $1)) as rank
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = true
      WHERE p.is_active = true
    `
    
    const params: any[] = [query]
    let paramIndex = 2
    
    // Adicionar filtros
    if (query) {
      sql += ` AND to_tsvector('portuguese', p.name || ' ' || COALESCE(p.description, '')) @@ plainto_tsquery('portuguese', $1)`
    }
    
    if (filters.categoryId) {
      sql += ` AND p.category_id = $${paramIndex}`
      params.push(filters.categoryId)
      paramIndex++
    }
    
    if (filters.minPrice) {
      sql += ` AND p.price >= $${paramIndex}`
      params.push(filters.minPrice)
      paramIndex++
    }
    
    if (filters.maxPrice) {
      sql += ` AND p.price <= $${paramIndex}`
      params.push(filters.maxPrice)
      paramIndex++
    }
    
    sql += ` ORDER BY rank DESC, p.created_at DESC LIMIT 20`
    
    return await this.db.query(sql, params)
  }
  
  async getProductBySlug(slug: string) {
    const product = await this.db.queryOne(`
      SELECT 
        p.*,
        b.name as brand_name,
        b.slug as brand_slug,
        c.name as category_name,
        c.slug as category_slug,
        json_agg(
          json_build_object(
            'id', pi.id,
            'url', pi.url,
            'alt_text', pi.alt_text,
            'position', pi.position
          ) ORDER BY pi.position
        ) as images
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_images pi ON pi.product_id = p.id
      WHERE p.slug = $1 AND p.is_active = true
      GROUP BY p.id, b.id, c.id
    `, [slug])
    
    return product
  }
}
```

### 7. Atualizar Rotas da API

```typescript
// apps/store/src/routes/api/products/+server.ts
import { json } from '@sveltejs/kit'
import { withDatabase } from '@/lib/db'
import { ProductService } from '@/services/product.service'

export async function GET({ platform, url }) {
  const searchParams = url.searchParams
  const query = searchParams.get('q')
  
  return withDatabase(platform.env, async (db) => {
    const productService = new ProductService(db)
    
    if (query) {
      const products = await productService.searchProducts(query, {
        categoryId: searchParams.get('category'),
        minPrice: searchParams.get('minPrice'),
        maxPrice: searchParams.get('maxPrice')
      })
      return json({ products })
    }
    
    const products = await productService.getFeaturedProducts()
    return json({ products })
  })
}
```

### 8. Scripts de Migração e Seed

```typescript
// scripts/migrate-hyperdrive.ts
import { Client } from 'pg'
import { readFileSync } from 'fs'
import { join } from 'path'

async function migrate() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  })
  
  await client.connect()
  
  try {
    // Ler e executar migrations
    const migrationFiles = [
      '001_create_users.sql',
      '002_create_products.sql',
      // ... outras migrations
    ]
    
    for (const file of migrationFiles) {
      const sql = readFileSync(join(__dirname, 'migrations', file), 'utf-8')
      await client.query(sql)
      console.log(`✅ Migração ${file} executada`)
    }
  } finally {
    await client.end()
  }
}

migrate().catch(console.error)
```

### 9. Testes de Performance

```typescript
// scripts/test-performance.ts
async function testPerformance() {
  console.log('🏃 Testando performance...')
  
  // Teste com Xata atual
  const xataStart = Date.now()
  const xataProducts = await xata.db.products.getMany({ size: 100 })
  const xataTime = Date.now() - xataStart
  
  // Teste com Hyperdrive
  const hyperStart = Date.now()
  const hyperProducts = await db.query('SELECT * FROM products LIMIT 100')
  const hyperTime = Date.now() - hyperStart
  
  console.log(`Xata: ${xataTime}ms`)
  console.log(`Hyperdrive: ${hyperTime}ms`)
  console.log(`Melhoria: ${Math.round((xataTime - hyperTime) / xataTime * 100)}%`)
}
```

## 📊 Ordem de Migração Recomendada

1. **Setup inicial** (30 min)
   - Criar Hyperdrive config
   - Instalar dependências
   - Criar cliente base

2. **APIs de leitura** (2h)
   - Listar produtos
   - Buscar produtos
   - Detalhes do produto

3. **Autenticação** (2h)
   - Login/registro
   - Validação de sessão
   - Middleware de auth

4. **APIs de escrita** (3h)
   - Carrinho
   - Pedidos
   - Reviews

5. **Admin/Seller panels** (4h)
   - CRUD completo
   - Relatórios
   - Analytics

## 🔄 Rollback Plan

Se algo der errado, você pode voltar facilmente:

1. Remover binding do Hyperdrive do wrangler.toml
2. Voltar a usar Xata client
3. Deploy novamente

## 📈 Métricas Esperadas

- **Queries simples**: 5-10x mais rápido
- **Queries complexas**: 20-30x mais rápido
- **Latência**: <50ms para maioria das queries
- **Custo**: Grátis até 1M requests/mês 