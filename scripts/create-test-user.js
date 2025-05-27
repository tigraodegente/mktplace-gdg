#!/usr/bin/env node

import bcrypt from 'bcryptjs';

// Configurações do usuário de teste
const testUser = {
  email: 'teste@marketplace.com',
  password: '123456',
  name: 'Usuário Teste',
  role: 'customer'
};

async function createTestUser() {
  console.log('Criando usuário de teste...');
  
  // Gerar hash da senha
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(testUser.password, salt);
  
  console.log('\n📝 Dados do usuário de teste:');
  console.log('Email:', testUser.email);
  console.log('Senha:', testUser.password);
  console.log('Nome:', testUser.name);
  console.log('Role:', testUser.role);
  console.log('\n🔐 Hash da senha gerado:');
  console.log(passwordHash);
  
  console.log('\n📋 SQL para inserir no Xata:');
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
  
  console.log('\n✅ Use o SQL acima no console do Xata para criar o usuário de teste!');
}

createTestUser().catch(console.error); 