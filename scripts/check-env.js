#!/usr/bin/env node

/**
 * Script para validar variáveis de ambiente
 * Execute com: node scripts/check-env.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Variáveis obrigatórias
const requiredEnvVars = [
  // Banco de dados
  'XATA_API_KEY',
  'DATABASE_URL',
  'DATABASE_URL_POSTGRES',
  
  // Autenticação
  'JWT_SECRET',
  
  // URLs
  'VITE_PUBLIC_STORE_URL',
  'VITE_PUBLIC_ADMIN_URL', 
  'VITE_PUBLIC_SELLER_URL',
  'VITE_PUBLIC_API_URL'
];

// Variáveis opcionais mas recomendadas
const optionalEnvVars = [
  // Autenticação
  'JWT_EXPIRES_IN',
  'REFRESH_TOKEN_EXPIRES_IN',
  
  // Email
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'EMAIL_FROM',
  
  // Upload
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
  'R2_PUBLIC_URL',
  
  // Pagamento
  'STRIPE_PUBLIC_KEY',
  'STRIPE_SECRET_KEY',
  
  // Segurança
  'SESSION_SECRET',
  'CSRF_SECRET',
  'CORS_ORIGINS',
  
  // Outros
  'NODE_ENV',
  'LOG_LEVEL'
];

// Cores para output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function checkEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const vars = {};
  
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key) {
        vars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
  
  return vars;
}

function validateEnvVars(envVars, envFile = '.env') {
  console.log(`\n${colors.cyan}Validando variáveis de ambiente em ${envFile}...${colors.reset}\n`);
  
  let hasErrors = false;
  let hasWarnings = false;
  
  // Verificar variáveis obrigatórias
  console.log(`${colors.blue}Variáveis Obrigatórias:${colors.reset}`);
  requiredEnvVars.forEach(varName => {
    if (envVars && envVars[varName]) {
      console.log(`${colors.green}✓${colors.reset} ${varName}`);
    } else {
      console.log(`${colors.red}✗${colors.reset} ${varName} - ${colors.red}NÃO DEFINIDA${colors.reset}`);
      hasErrors = true;
    }
  });
  
  // Verificar variáveis opcionais
  console.log(`\n${colors.blue}Variáveis Opcionais:${colors.reset}`);
  optionalEnvVars.forEach(varName => {
    if (envVars && envVars[varName]) {
      console.log(`${colors.green}✓${colors.reset} ${varName}`);
    } else {
      console.log(`${colors.yellow}⚠${colors.reset} ${varName} - ${colors.yellow}não definida${colors.reset}`);
      hasWarnings = true;
    }
  });
  
  // Validações específicas
  if (envVars) {
    console.log(`\n${colors.blue}Validações Específicas:${colors.reset}`);
    
    // JWT_SECRET deve ter pelo menos 32 caracteres
    if (envVars.JWT_SECRET && envVars.JWT_SECRET.length < 32) {
      console.log(`${colors.yellow}⚠${colors.reset} JWT_SECRET muito curto (mínimo 32 caracteres)`);
      hasWarnings = true;
    }
    
    // NODE_ENV deve ser development, staging ou production
    if (envVars.NODE_ENV && !['development', 'staging', 'production'].includes(envVars.NODE_ENV)) {
      console.log(`${colors.yellow}⚠${colors.reset} NODE_ENV deve ser: development, staging ou production`);
      hasWarnings = true;
    }
    
    // Verificar URLs
    const urlVars = ['VITE_PUBLIC_STORE_URL', 'VITE_PUBLIC_ADMIN_URL', 'VITE_PUBLIC_SELLER_URL'];
    urlVars.forEach(varName => {
      if (envVars[varName] && !envVars[varName].startsWith('http')) {
        console.log(`${colors.yellow}⚠${colors.reset} ${varName} deve começar com http:// ou https://`);
        hasWarnings = true;
      }
    });
  }
  
  return { hasErrors, hasWarnings };
}

// Executar validação
console.log(`${colors.cyan}=== Validador de Variáveis de Ambiente ===${colors.reset}`);

// Verificar .env na raiz
const rootEnv = checkEnvFile(path.join(__dirname, '..', '.env'));
if (!rootEnv) {
  console.log(`\n${colors.red}Arquivo .env não encontrado na raiz do projeto!${colors.reset}`);
  console.log(`${colors.yellow}Crie um arquivo .env baseado no .env.example${colors.reset}`);
} else {
  const { hasErrors, hasWarnings } = validateEnvVars(rootEnv);
  
  if (hasErrors) {
    console.log(`\n${colors.red}❌ Validação falhou! Corrija os erros acima.${colors.reset}`);
    process.exit(1);
  } else if (hasWarnings) {
    console.log(`\n${colors.yellow}⚠️  Validação passou com avisos.${colors.reset}`);
  } else {
    console.log(`\n${colors.green}✅ Todas as variáveis estão configuradas corretamente!${colors.reset}`);
  }
}

// Verificar .env.local nas aplicações
const apps = ['store', 'admin-panel', 'seller-panel'];
apps.forEach(app => {
  const appEnvPath = path.join(__dirname, '..', 'apps', app, '.env.local');
  const appEnv = checkEnvFile(appEnvPath);
  
  if (!appEnv) {
    console.log(`\n${colors.yellow}⚠️  Arquivo .env.local não encontrado em apps/${app}${colors.reset}`);
  }
});

console.log(`\n${colors.cyan}Dica: Execute 'pnpm run check:env' para validar novamente${colors.reset}\n`); 