#!/usr/bin/env node

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Sistema de logs independente para sincronização
 * - Logs estruturados em JSON
 * - Rotação diária automática
 * - Múltiplos níveis (debug, info, warn, error)
 * - Saída para console e arquivo
 */
export class Logger {
  constructor(name = 'sync', options = {}) {
    this.name = name
    this.options = {
      level: options.level || process.env.LOG_LEVEL || 'info',
      logDir: options.logDir || process.env.LOG_DIR || path.resolve(__dirname, '../../../logs/sync'),
      console: options.console !== false,
      file: options.file !== false,
      maxFileSize: options.maxFileSize || 10 * 1024 * 1024, // 10MB
      dateFormat: options.dateFormat || 'YYYY-MM-DD',
      ...options
    }
    
    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    }
    
    this.currentLevel = this.levels[this.options.level] || 1
    this.buffer = []
    this.bufferSize = 100
    
    // Criar diretório de logs se não existir
    this.ensureLogDir()
  }

  async ensureLogDir() {
    try {
      await fs.mkdir(this.options.logDir, { recursive: true })
      
      // Criar subdiretório com data atual
      const dateDir = this.getDateDir()
      await fs.mkdir(path.join(this.options.logDir, dateDir), { recursive: true })
    } catch (error) {
      console.error('Erro ao criar diretório de logs:', error)
    }
  }

  getDateDir() {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  }

  getTimestamp() {
    return new Date().toISOString()
  }

  formatMessage(level, message, meta = {}) {
    const entry = {
      timestamp: this.getTimestamp(),
      level: level.toUpperCase(),
      logger: this.name,
      message,
      ...meta
    }
    
    if (meta.error instanceof Error) {
      entry.error = {
        message: meta.error.message,
        stack: meta.error.stack,
        name: meta.error.name
      }
    }
    
    return entry
  }

  async writeToFile(entry) {
    if (!this.options.file) return
    
    try {
      const dateDir = this.getDateDir()
      const logFile = path.join(this.options.logDir, dateDir, `${this.name}.log`)
      const logLine = JSON.stringify(entry) + '\n'
      
      await fs.appendFile(logFile, logLine, 'utf8')
      
      // Criar link simbólico para latest.log
      const latestLink = path.join(this.options.logDir, 'latest.log')
      try {
        await fs.unlink(latestLink)
      } catch {}
      await fs.symlink(logFile, latestLink)
      
      // Verificar tamanho do arquivo
      const stats = await fs.stat(logFile)
      if (stats.size > this.options.maxFileSize) {
        await this.rotateLog(logFile)
      }
    } catch (error) {
      console.error('Erro ao escrever no arquivo de log:', error)
    }
  }

  async rotateLog(logFile) {
    const timestamp = new Date().getTime()
    const rotatedFile = logFile.replace('.log', `.${timestamp}.log`)
    
    try {
      await fs.rename(logFile, rotatedFile)
      console.log(`Log rotacionado: ${path.basename(rotatedFile)}`)
    } catch (error) {
      console.error('Erro ao rotacionar log:', error)
    }
  }

  writeToConsole(level, message, meta = {}) {
    if (!this.options.console) return
    
    const colors = {
      debug: '\x1b[36m', // Cyan
      info: '\x1b[32m',  // Green
      warn: '\x1b[33m',  // Yellow
      error: '\x1b[31m'  // Red
    }
    
    const reset = '\x1b[0m'
    const color = colors[level] || reset
    const timestamp = new Date().toLocaleTimeString()
    
    let output = `${color}[${timestamp}] [${level.toUpperCase()}] [${this.name}]${reset} ${message}`
    
    if (Object.keys(meta).length > 0) {
      const metaStr = JSON.stringify(meta, null, 2)
      output += `\n${metaStr}`
    }
    
    if (level === 'error') {
      console.error(output)
    } else {
      console.log(output)
    }
  }

  async log(level, message, meta = {}) {
    if (this.levels[level] < this.currentLevel) return
    
    const entry = this.formatMessage(level, message, meta)
    
    // Buffer para escrita em lote (performance)
    this.buffer.push(entry)
    
    // Escrever no console imediatamente
    this.writeToConsole(level, message, meta)
    
    // Flush buffer se necessário
    if (this.buffer.length >= this.bufferSize || level === 'error') {
      await this.flush()
    }
  }

  async flush() {
    if (this.buffer.length === 0) return
    
    const entries = [...this.buffer]
    this.buffer = []
    
    for (const entry of entries) {
      await this.writeToFile(entry)
    }
  }

  // Métodos de conveniência
  async debug(message, meta = {}) {
    await this.log('debug', message, meta)
  }

  async info(message, meta = {}) {
    await this.log('info', message, meta)
  }

  async warn(message, meta = {}) {
    await this.log('warn', message, meta)
  }

  async error(message, meta = {}) {
    await this.log('error', message, meta)
  }

  // Métodos especiais para sincronização
  async syncStart(type, options = {}) {
    await this.info(`🚀 Iniciando sincronização: ${type}`, {
      type,
      options,
      event: 'sync_start'
    })
  }

  async syncProgress(type, current, total, details = {}) {
    const percentage = Math.round((current / total) * 100)
    await this.info(`📊 Progresso ${type}: ${current}/${total} (${percentage}%)`, {
      type,
      current,
      total,
      percentage,
      event: 'sync_progress',
      ...details
    })
  }

  async syncComplete(type, stats = {}) {
    await this.info(`✅ Sincronização ${type} concluída`, {
      type,
      stats,
      event: 'sync_complete'
    })
  }

  async syncError(type, error, context = {}) {
    await this.error(`❌ Erro na sincronização ${type}: ${error.message}`, {
      type,
      error,
      context,
      event: 'sync_error'
    })
  }

  // Criar sumário de logs
  async createSummary(dateDir = null) {
    const targetDir = dateDir || this.getDateDir()
    const logDir = path.join(this.options.logDir, targetDir)
    const summaryFile = path.join(logDir, 'summary.json')
    
    try {
      const files = await fs.readdir(logDir)
      const logFiles = files.filter(f => f.endsWith('.log') && f !== 'summary.json')
      
      const summary = {
        date: targetDir,
        files: logFiles.length,
        totals: {
          debug: 0,
          info: 0,
          warn: 0,
          error: 0
        },
        errors: [],
        syncs: []
      }
      
      for (const file of logFiles) {
        const content = await fs.readFile(path.join(logDir, file), 'utf8')
        const lines = content.trim().split('\n')
        
        for (const line of lines) {
          try {
            const entry = JSON.parse(line)
            const level = entry.level.toLowerCase()
            summary.totals[level] = (summary.totals[level] || 0) + 1
            
            if (level === 'error') {
              summary.errors.push({
                timestamp: entry.timestamp,
                message: entry.message,
                logger: entry.logger
              })
            }
            
            if (entry.event === 'sync_complete') {
              summary.syncs.push({
                timestamp: entry.timestamp,
                type: entry.type,
                stats: entry.stats
              })
            }
          } catch {}
        }
      }
      
      await fs.writeFile(summaryFile, JSON.stringify(summary, null, 2))
      return summary
    } catch (error) {
      console.error('Erro ao criar sumário:', error)
      return null
    }
  }

  // Limpar logs antigos
  async cleanup(daysToKeep = 7) {
    try {
      const dirs = await fs.readdir(this.options.logDir)
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
      
      for (const dir of dirs) {
        if (dir === 'latest.log') continue
        
        const match = dir.match(/(\d{4})-(\d{2})-(\d{2})/)
        if (match) {
          const dirDate = new Date(match[1], match[2] - 1, match[3])
          if (dirDate < cutoffDate) {
            const dirPath = path.join(this.options.logDir, dir)
            await fs.rm(dirPath, { recursive: true })
            console.log(`Logs antigos removidos: ${dir}`)
          }
        }
      }
    } catch (error) {
      console.error('Erro ao limpar logs:', error)
    }
  }
}

// Logger global para uso compartilhado
let globalLogger = null

export function getGlobalLogger(name = 'sync') {
  if (!globalLogger) {
    globalLogger = new Logger(name)
  }
  return globalLogger
}

// Teste se executado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🧪 Testando sistema de logs...\n')
  
  const logger = new Logger('test', { console: true, file: true })
  
  await logger.debug('Mensagem de debug')
  await logger.info('Mensagem informativa')
  await logger.warn('Mensagem de aviso')
  await logger.error('Mensagem de erro', { error: new Error('Erro de teste') })
  
  await logger.syncStart('products', { batchSize: 1000 })
  await logger.syncProgress('products', 500, 1000, { created: 10, updated: 490 })
  await logger.syncComplete('products', { total: 1000, created: 20, updated: 980 })
  
  // Forçar flush
  await logger.flush()
  
  // Criar sumário
  const summary = await logger.createSummary()
  console.log('\n📋 Sumário dos logs:', JSON.stringify(summary, null, 2))
} 