#!/usr/bin/env node

import postgres from 'postgres'

const DATABASE_NAME = 'mktplace_dev'

// Conectar ao banco postgres padrão local com usuário postgres
const sql = postgres('postgresql://postgres@localhost/postgres')

async function createDatabase() {
  try {
    console.log(`🗄️  Criando banco de dados local: ${DATABASE_NAME}...`)
    
    // Verificar se o banco já existe
    const exists = await sql`
      SELECT 1 FROM pg_database WHERE datname = ${DATABASE_NAME}
    `
    
    if (exists.length > 0) {
      console.log(`⚠️  Banco ${DATABASE_NAME} já existe. Deletando...`)
      
      // Terminar conexões ativas
      await sql`
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = ${DATABASE_NAME} AND pid <> pg_backend_pid()
      `
      
      // Deletar banco
      await sql.unsafe(`DROP DATABASE IF EXISTS ${DATABASE_NAME}`)
      console.log(`✅ Banco anterior deletado`)
    }
    
    // Criar novo banco
    await sql.unsafe(`CREATE DATABASE ${DATABASE_NAME}`)
    console.log(`✅ Banco ${DATABASE_NAME} criado com sucesso!`)
    
    console.log(`\n📝 Configure seu .env com:`)
    console.log(`DATABASE_URL="postgresql://localhost/${DATABASE_NAME}"`)
    
    console.log(`\n🚀 Próximos passos:`)
    console.log(`1. export DATABASE_URL="postgresql://localhost/${DATABASE_NAME}"`)
    console.log(`2. node scripts/01-create-database.mjs`)
    console.log(`3. node scripts/02-seed-initial.mjs`)
    
  } catch (error) {
    console.error('❌ Erro ao criar banco:', error)
    throw error
  } finally {
    await sql.end()
  }
}

createDatabase().catch(console.error) 