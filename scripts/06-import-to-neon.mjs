#!/usr/bin/env node

import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'

const execAsync = promisify(exec)

console.log('📥 Importando dados para o Neon...\n')

// Connection string do Neon (pode ser passada via env ou hardcoded temporariamente)
const neonUrl = process.env.DATABASE_URL || 'postgresql://DB_USER:DB_PASSWORD@DB_HOST/DB_NAME?sslmode=require'

// Encontrar o arquivo de export mais recente
const exportDir = 'scripts/export'

async function importToNeon() {
  try {
    // Listar arquivos de export
    const files = await fs.readdir(exportDir)
    const exportFiles = files
      .filter(f => f.startsWith('mktplace-export-') && f.endsWith('.sql'))
      .sort()
      .reverse() // Mais recente primeiro
    
    if (exportFiles.length === 0) {
      throw new Error('Nenhum arquivo de export encontrado. Execute primeiro o script 05-export-local-data.mjs')
    }
    
    const latestExport = path.join(exportDir, exportFiles[0])
    console.log(`📁 Usando arquivo: ${latestExport}`)
    
    // Verificar tamanho do arquivo
    const stats = await fs.stat(latestExport)
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2)
    console.log(`📏 Tamanho: ${sizeMB} MB\n`)
    
    console.log('🔍 Testando conexão com o Neon...')
    
    // Testar conexão
    const testCommand = `psql "${neonUrl}" -c "SELECT version()"`
    const testResult = await execAsync(testCommand)
    console.log('✅ Conexão estabelecida com sucesso!')
    console.log(testResult.stdout.trim())
    
    console.log('\n⚠️  ATENÇÃO: Isso irá sobrescrever todos os dados no banco Neon!')
    console.log('Aguardando 3 segundos... (Ctrl+C para cancelar)\n')
    
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    console.log('📤 Importando dados...')
    console.log('Isso pode levar alguns minutos dependendo do tamanho dos dados...\n')
    
    // Importar dados
    const importCommand = `psql "${neonUrl}" < ${latestExport}`
    
    try {
      const result = await execAsync(importCommand, { maxBuffer: 1024 * 1024 * 10 }) // 10MB buffer
      console.log('✅ Importação concluída com sucesso!')
      
      // Verificar algumas tabelas
      console.log('\n📊 Verificando dados importados...')
      
      const checkCommands = [
        `psql "${neonUrl}" -t -c "SELECT COUNT(*) as total FROM users"`,
        `psql "${neonUrl}" -t -c "SELECT COUNT(*) as total FROM products"`,
        `psql "${neonUrl}" -t -c "SELECT COUNT(*) as total FROM categories"`,
        `psql "${neonUrl}" -t -c "SELECT COUNT(*) as total FROM sellers"`
      ]
      
      const tables = ['users', 'products', 'categories', 'sellers']
      
      for (let i = 0; i < checkCommands.length; i++) {
        try {
          const result = await execAsync(checkCommands[i])
          const count = result.stdout.trim()
          console.log(`- ${tables[i]}: ${count} registros`)
        } catch (e) {
          console.log(`- ${tables[i]}: erro ao verificar`)
        }
      }
      
      console.log('\n🎉 Migração concluída com sucesso!')
      console.log('\n📝 Próximos passos:')
      console.log('1. Atualize o DATABASE_URL no seu .env para usar o Neon')
      console.log('2. Configure o Hyperdrive na Cloudflare com esta connection string')
      console.log('3. Teste a aplicação localmente com o banco Neon')
      
    } catch (error) {
      console.error('\n❌ Erro durante a importação:')
      console.error(error.message)
      
      if (error.message.includes('already exists')) {
        console.log('\n💡 Dica: O banco já contém dados. Se quiser reimportar:')
        console.log('1. Delete as tabelas existentes no Neon Console')
        console.log('2. Ou use o arquivo de dados apenas (sem estrutura)')
      }
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
    throw error
  }
}

importToNeon().catch(console.error) 