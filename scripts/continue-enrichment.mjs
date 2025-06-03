#!/usr/bin/env node

// Este script é uma cópia do enrich-products.mjs
// mas começa do ponto onde parou

import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

async function continueEnrichment() {
  console.log('🔄 Continuando enriquecimento...\n')
  
  try {
    // Simplesmente executar o script principal novamente
    // Ele automaticamente pula produtos já processados
    const { stdout, stderr } = await execAsync('node scripts/enrich-products.mjs')
    
    console.log(stdout)
    if (stderr) {
      console.error('Erros:', stderr)
    }
  } catch (error) {
    console.error('Erro ao executar:', error)
  }
}

continueEnrichment() 