#!/usr/bin/env node

import bcrypt from 'bcryptjs';
import { logger } from '$lib/utils/logger';

// Configurações do usuário de teste
const testUser = {
  email: 'teste@marketplace.com',
  password: '123456',
  name: 'Usuário Teste',
  role: 'customer'
};

async function createTestUser() {
  logger.info('Criando usuário de teste...');
  
  // Gerar hash da senha
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(testUser.password, salt);
  
  logger.info('\n📝 Dados do usuário de teste:');
  logger.debug('Email:', testUser.email);
  logger.debug('Senha:', testUser.password);
  logger.debug('Nome:', testUser.name);
  logger.debug('Role:', testUser.role);
  logger.info('\n🔐 Hash da senha gerado:');
  logger.debug(passwordHash);
  
  logger.info('\n📋 SQL para inserir no Xata:');
  console.log(`
INSERT INTO users (email, password_hash, name, role, is_active, email_verified, created_at)
VALUES (
  '${testUser.email}',
  '${passwordHash}',
  '${testUser.name}',
  '${testUser.role}',
  true,
  false,
  NOW()
);
  `);
  
  logger.info('\n✅ Use o SQL acima no console do Xata para criar o usuário de teste!');
}

createTestUser().catch(console.error); 