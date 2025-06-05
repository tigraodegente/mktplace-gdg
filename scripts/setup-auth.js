#!/usr/bin/env node

/**
 * Script para configurar o sistema de autenticação do marketplace
 * Executa as migrations necessárias e cria usuário admin inicial
 */

import { createDatabaseConnection, runMigrations, createUser } from '../packages/utils/dist/auth/database.js';
import { createAuthService } from '../packages/utils/dist/auth/auth-service.js';
import crypto from 'node:crypto';

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'JWT_SECRET'
];

async function validateEnvironment() {
  console.log('🔍 Verificando variáveis de ambiente...');
  
  const missing = REQUIRED_ENV_VARS.filter(env => !process.env[env]);
  
  if (missing.length > 0) {
    console.error('❌ Variáveis de ambiente obrigatórias não encontradas:');
    missing.forEach(env => console.error(`   - ${env}`));
    console.error('\n💡 Crie um arquivo .env com as variáveis necessárias.');
    process.exit(1);
  }
  
  console.log('✅ Todas as variáveis de ambiente estão configuradas!');
}

async function runDatabaseMigrations() {
  console.log('\n🗄️  Executando migrations do banco de dados...');
  
  try {
    const env = {
      DATABASE_URL: process.env.DATABASE_URL,
      NEON_DATABASE_URL: process.env.NEON_DATABASE_URL
    };
    
    await runMigrations(env);
    console.log('✅ Migrations executadas com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao executar migrations:', error.message);
    process.exit(1);
  }
}

async function createAdminUser() {
  console.log('\n👤 Criando usuário administrador...');
  
  try {
    const authService = createAuthService({
      jwtSecret: process.env.JWT_SECRET
    });
    
    const env = {
      DATABASE_URL: process.env.DATABASE_URL,
      NEON_DATABASE_URL: process.env.NEON_DATABASE_URL
    };
    
    // Dados do admin (você pode personalizar)
    const adminData = {
      email: process.env.ADMIN_EMAIL || 'admin@mktplace.com',
      name: process.env.ADMIN_NAME || 'Administrador',
      password: process.env.ADMIN_PASSWORD || 'admin123456',
      role: 'super_admin'
    };
    
    // Hash da senha
    const passwordHash = await authService.hashPassword(adminData.password);
    
    // Criar usuário
    const user = await createUser({
      email: adminData.email,
      name: adminData.name,
      password_hash: passwordHash,
      role: adminData.role
    }, env);
    
    if (user) {
      console.log('✅ Usuário administrador criado com sucesso!');
      console.log(`   Email: ${adminData.email}`);
      console.log(`   Senha: ${adminData.password}`);
      console.log(`   Role: ${adminData.role}`);
      console.log('\n⚠️  IMPORTANTE: Altere a senha após o primeiro login!');
    } else {
      console.log('⚠️  Usuário administrador já existe ou erro na criação.');
    }
    
  } catch (error) {
    console.error('❌ Erro ao criar usuário administrador:', error.message);
    
    if (error.message.includes('duplicate key')) {
      console.log('ℹ️  Usuário administrador já existe.');
    } else {
      process.exit(1);
    }
  }
}

async function generateJWTSecret() {
  if (!process.env.JWT_SECRET) {
    console.log('\n🔐 Gerando JWT Secret...');
    const secret = crypto.randomBytes(64).toString('hex');
    console.log(`JWT_SECRET=${secret}`);
    console.log('\n💡 Adicione esta linha ao seu arquivo .env');
    return secret;
  }
  return process.env.JWT_SECRET;
}

async function testAuthentication() {
  console.log('\n🧪 Testando sistema de autenticação...');
  
  try {
    const authService = createAuthService({
      jwtSecret: process.env.JWT_SECRET
    });
    
    // Teste básico de geração de token
    const testUser = {
      id: 'test-user',
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin',
      is_active: true
    };
    
    const tokens = authService.generateTokens(testUser);
    const payload = authService.verifyToken(tokens.accessToken);
    
    if (payload && payload.userId === testUser.id) {
      console.log('✅ Sistema de autenticação funcionando corretamente!');
    } else {
      throw new Error('Falha na verificação do token');
    }
    
  } catch (error) {
    console.error('❌ Erro no teste de autenticação:', error.message);
    process.exit(1);
  }
}

async function main() {
  console.log('🚀 CONFIGURAÇÃO DO SISTEMA DE AUTENTICAÇÃO');
  console.log('==========================================\n');
  
  try {
    // 1. Validar ambiente
    await validateEnvironment();
    
    // 2. Gerar JWT Secret se necessário
    await generateJWTSecret();
    
    // 3. Executar migrations
    await runDatabaseMigrations();
    
    // 4. Criar usuário admin
    await createAdminUser();
    
    // 5. Testar autenticação
    await testAuthentication();
    
    console.log('\n🎉 CONFIGURAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('=====================================');
    console.log('\n📋 Próximos passos:');
    console.log('1. Acesse o painel admin em: http://localhost:5174/login');
    console.log('2. Faça login com as credenciais criadas');
    console.log('3. Altere a senha padrão');
    console.log('4. Configure outros usuários conforme necessário');
    
  } catch (error) {
    console.error('\n💥 Erro durante a configuração:', error.message);
    process.exit(1);
  }
}

// Executar apenas se chamado diretamente
if (process.argv[1].endsWith('setup-auth.js')) {
  main().catch(console.error);
} 