#!/usr/bin/env node

import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'

const execAsync = promisify(exec)

console.log('📤 Exportando dados do banco local...\n')

const dbName = 'mktplace_dev'
const outputDir = 'scripts/export'
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
const outputFile = path.join(outputDir, `mktplace-export-${timestamp}.sql`)

async function exportLocalData() {
  try {
    // Criar diretório de export se não existir
    await fs.mkdir(outputDir, { recursive: true })
    
    console.log('🔍 Verificando conexão com o banco...')
    await execAsync(`psql -U postgres -d ${dbName} -c "SELECT 1"`)
    
    console.log('📊 Exportando estrutura e dados...')
    
    // Exportar com pg_dump
    // --no-owner: não incluir comandos de propriedade
    // --no-privileges: não incluir privilégios
    // --if-exists: adicionar IF EXISTS aos DROPs
    // --clean: incluir comandos DROP antes de CREATE
    const dumpCommand = `pg_dump -U postgres -d ${dbName} --no-owner --no-privileges --if-exists --clean -f ${outputFile}`
    
    await execAsync(dumpCommand)
    
    // Verificar tamanho do arquivo
    const stats = await fs.stat(outputFile)
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2)
    
    console.log(`\n✅ Exportação concluída!`)
    console.log(`📁 Arquivo: ${outputFile}`)
    console.log(`📏 Tamanho: ${sizeMB} MB`)
    
    // Criar também uma versão só com dados (sem estrutura)
    const dataOnlyFile = path.join(outputDir, `mktplace-data-only-${timestamp}.sql`)
    const dataOnlyCommand = `pg_dump -U postgres -d ${dbName} --data-only --no-owner --no-privileges -f ${dataOnlyFile}`
    
    console.log('\n📊 Exportando apenas dados (sem estrutura)...')
    await execAsync(dataOnlyCommand)
    
    const dataStats = await fs.stat(dataOnlyFile)
    const dataSizeMB = (dataStats.size / 1024 / 1024).toFixed(2)
    
    console.log(`📁 Arquivo (dados): ${dataOnlyFile}`)
    console.log(`📏 Tamanho: ${dataSizeMB} MB`)
    
    console.log('\n💡 Próximos passos:')
    console.log('1. Crie um projeto no Neon (neon.tech)')
    console.log('2. Copie a connection string do Neon')
    console.log('3. Execute: psql "sua-connection-string" < ' + outputFile)
    console.log('\n🔗 Ou use o script de importação:')
    console.log('   DATABASE_URL="postgresql://..." node scripts/06-import-to-neon.mjs')
    
  } catch (error) {
    console.error('❌ Erro na exportação:', error.message)
    throw error
  }
}

exportLocalData().catch(console.error) 