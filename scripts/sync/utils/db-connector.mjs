#!/usr/bin/env node

import { MongoClient } from 'mongodb'
import pg from 'pg'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Carregar configurações do .env.develop se existir
const envPath = path.resolve(__dirname, '../../../.env.develop')
dotenv.config({ path: envPath })
// Fallback para .env padrão
dotenv.config()

/**
 * Gerenciador de conexões com bancos de dados
 * Totalmente isolado da aplicação principal
 */
export class DatabaseConnector {
  constructor(options = {}) {
    this.mongoClient = null
    this.neonPool = null
    this.options = {
      mongoUri: options.mongoUri || process.env.MONGODB_URI,
      mongoDatabase: options.mongoDatabase || process.env.MONGODB_DATABASE || 'graodegente',
      neonUrl: options.neonUrl || process.env.DATABASE_URL,
      neonBranch: options.neonBranch || process.env.NEON_BRANCH || 'develop',
      forceConnection: options.forceConnection || process.env.FORCE_CONNECTION === 'true',
      ...options
    }
    
    this.validateConfig()
  }

  validateConfig() {
    if (!this.options.mongoUri) {
      throw new Error('MONGODB_URI não configurada. Configure em .env.develop')
    }
    
    if (!this.options.neonUrl) {
      throw new Error('DATABASE_URL não configurada. Configure em .env.develop')
    }
    
    // Validação de segurança: garantir que não está apontando para produção
    if (this.options.neonBranch === 'main' || this.options.neonBranch === 'production') {
      throw new Error('⚠️  ATENÇÃO: Tentativa de conexão com branch de produção bloqueada!')
    }
    
    if (!this.options.neonUrl.includes('develop') && !this.options.forceConnection) {
      console.warn('⚠️  AVISO: URL do banco não parece ser de desenvolvimento.')
      console.warn('   Use forceConnection: true se tiver certeza.')
      throw new Error('Conexão bloqueada por segurança')
    }
  }

  /**
   * Conectar ao MongoDB (read-only por padrão)
   */
  async connectMongo() {
    if (this.mongoClient?.topology?.isConnected()) {
      return this.mongoClient
    }

    try {
      this.mongoClient = new MongoClient(this.options.mongoUri, {
        maxPoolSize: 10,
        minPoolSize: 2,
        maxIdleTimeMS: 30000,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4 // IPv4
      })

      await this.mongoClient.connect()
      console.log('✅ Conectado ao MongoDB')
      
      return this.mongoClient
    } catch (error) {
      console.error('❌ Erro ao conectar ao MongoDB:', error.message)
      throw error
    }
  }

  /**
   * Obter database do MongoDB
   */
  getMongoDb() {
    if (!this.mongoClient?.topology?.isConnected()) {
      throw new Error('MongoDB não conectado. Execute connectMongo() primeiro.')
    }
    return this.mongoClient.db(this.options.mongoDatabase)
  }

  /**
   * Conectar ao PostgreSQL Neon
   */
  async connectNeon() {
    if (this.neonPool) {
      return this.neonPool
    }

    try {
      this.neonPool = new pg.Pool({
        connectionString: this.options.neonUrl,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        ssl: { 
          rejectUnauthorized: false,
          // Adicionar SNI para Neon
          servername: this.extractNeonHost(this.options.neonUrl)
        }
      })

      // Testar conexão
      const client = await this.neonPool.connect()
      const result = await client.query('SELECT current_database(), current_user, version()')
      console.log('✅ Conectado ao Neon Develop:')
      console.log(`   Database: ${result.rows[0].current_database}`)
      console.log(`   User: ${result.rows[0].current_user}`)
      client.release()
      
      return this.neonPool
    } catch (error) {
      console.error('❌ Erro ao conectar ao Neon:', error.message)
      throw error
    }
  }

  /**
   * Extrair host do Neon da connection string
   */
  extractNeonHost(connectionString) {
    try {
      const url = new URL(connectionString)
      return url.hostname
    } catch {
      return undefined
    }
  }

  /**
   * Executar query no Neon com retry automático
   */
  async queryNeon(text, params, options = {}) {
    const maxRetries = options.maxRetries || 3
    let lastError
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.neonPool.query(text, params)
        return result
      } catch (error) {
        lastError = error
        console.warn(`⚠️  Query falhou (tentativa ${attempt}/${maxRetries}):`, error.message)
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
        }
      }
    }
    
    throw lastError
  }

  /**
   * Executar query no MongoDB com retry automático
   */
  async queryMongo(collection, operation, params = {}, options = {}) {
    const maxRetries = options.maxRetries || 3
    let lastError
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const db = this.getMongoDb()
        const coll = db.collection(collection)
        
        // Executar operação (find, findOne, aggregate, etc.)
        if (typeof coll[operation] === 'function') {
          return await coll[operation](params).toArray()
        } else {
          throw new Error(`Operação ${operation} não suportada`)
        }
      } catch (error) {
        lastError = error
        console.warn(`⚠️  Query MongoDB falhou (tentativa ${attempt}/${maxRetries}):`, error.message)
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
        }
      }
    }
    
    throw lastError
  }

  /**
   * Fechar todas as conexões
   */
  async disconnect() {
    const promises = []
    
    if (this.mongoClient) {
      promises.push(
        this.mongoClient.close()
          .then(() => console.log('✅ MongoDB desconectado'))
          .catch(err => console.error('❌ Erro ao desconectar MongoDB:', err))
      )
    }
    
    if (this.neonPool) {
      promises.push(
        this.neonPool.end()
          .then(() => console.log('✅ Neon desconectado'))
          .catch(err => console.error('❌ Erro ao desconectar Neon:', err))
      )
    }
    
    await Promise.all(promises)
  }

  /**
   * Verificar saúde das conexões
   */
  async healthCheck() {
    const health = {
      mongo: false,
      neon: false,
      details: {}
    }
    
    // Verificar MongoDB
    try {
      if (this.mongoClient?.topology?.isConnected()) {
        const db = this.getMongoDb()
        await db.admin().ping()
        health.mongo = true
        health.details.mongo = 'Conectado e respondendo'
      } else {
        health.details.mongo = 'Não conectado'
      }
    } catch (error) {
      health.details.mongo = `Erro: ${error.message}`
    }
    
    // Verificar Neon
    try {
      if (this.neonPool) {
        const result = await this.neonPool.query('SELECT 1')
        health.neon = true
        health.details.neon = 'Conectado e respondendo'
      } else {
        health.details.neon = 'Não conectado'
      }
    } catch (error) {
      health.details.neon = `Erro: ${error.message}`
    }
    
    return health
  }
}

// Exportar instância singleton se executado diretamente
let defaultConnector = null

export function getDefaultConnector() {
  if (!defaultConnector) {
    defaultConnector = new DatabaseConnector()
  }
  return defaultConnector
}

// Teste se executado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🔧 Testando conexões...\n')
  
  const connector = new DatabaseConnector()
  
  try {
    await connector.connectMongo()
    await connector.connectNeon()
    
    const health = await connector.healthCheck()
    console.log('\n📊 Status das conexões:', JSON.stringify(health, null, 2))
    
    // Teste básico de query
    const db = connector.getMongoDb()
    const count = await db.collection('m_product').countDocuments()
    console.log(`\n📦 Total de produtos no MongoDB: ${count}`)
    
    const neonResult = await connector.queryNeon('SELECT COUNT(*) FROM products')
    console.log(`📦 Total de produtos no Neon: ${neonResult.rows[0].count}`)
    
  } catch (error) {
    console.error('\n❌ Erro no teste:', error)
  } finally {
    await connector.disconnect()
  }
} 