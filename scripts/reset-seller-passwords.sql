-- Script para listar vendedores que precisam resetar senha
-- Execute este script após a migração para obter a lista de vendedores

-- ========================================
-- LISTAR VENDEDORES COM EMAILS TEMPORÁRIOS
-- ========================================

SELECT 
    s.id as seller_id,
    s.name as seller_name,
    s.email as seller_email,
    s.phone as seller_phone,
    s.cnpj,
    u.id as user_id,
    u.email as temp_email,
    u.created_at as user_created_at
FROM sellers s
JOIN users u ON s.user_id = u.id
WHERE u.email LIKE '%@temp.marketplace.com'
ORDER BY s.name;

-- ========================================
-- CONTAR VENDEDORES POR STATUS
-- ========================================

SELECT 
    COUNT(*) FILTER (WHERE u.email LIKE '%@temp.marketplace.com') as vendedores_com_email_temporario,
    COUNT(*) FILTER (WHERE u.email NOT LIKE '%@temp.marketplace.com') as vendedores_com_email_real,
    COUNT(*) as total_vendedores
FROM sellers s
JOIN users u ON s.user_id = u.id;

-- ========================================
-- INSTRUÇÕES PARA RESET DE SENHA
-- ========================================

-- Para cada vendedor com email temporário, você deve:
-- 1. Entrar em contato usando o email/telefone do vendedor
-- 2. Solicitar um email válido
-- 3. Executar o UPDATE abaixo com o email real

-- Exemplo de UPDATE para um vendedor específico:
-- UPDATE users 
-- SET email = 'vendedor.real@email.com',
--     email_verified = false,
--     password_hash = '$2b$10$HASH_DA_NOVA_SENHA'
-- WHERE id = 'USER_ID_AQUI';

-- ========================================
-- GERAR LISTA DE CONTATOS PARA ENVIO
-- ========================================

SELECT 
    s.name as nome_vendedor,
    COALESCE(s.email, 'Não informado') as email_vendedor,
    COALESCE(s.phone, 'Não informado') as telefone,
    s.cnpj,
    'https://marketplace.com/vendedor/reset-senha?token=' || 
    encode(digest(u.id || u.created_at::text || random()::text, 'sha256'), 'hex') as link_reset
FROM sellers s
JOIN users u ON s.user_id = u.id
WHERE u.email LIKE '%@temp.marketplace.com'
ORDER BY s.name;

-- ========================================
-- TEMPLATE DE EMAIL PARA VENDEDORES
-- ========================================

/*
Assunto: Ação Necessária - Configure sua Conta no Marketplace GDG

Olá [NOME_VENDEDOR],

Identificamos que sua loja foi migrada para nossa nova plataforma do Marketplace GDG. 
Para garantir a segurança da sua conta, precisamos que você configure uma nova senha.

Por favor, clique no link abaixo para definir sua senha:
[LINK_RESET]

Este link é válido por 48 horas.

Após configurar sua senha, você poderá:
- Acessar o painel do vendedor
- Gerenciar seus produtos
- Acompanhar suas vendas
- Atualizar informações da loja

Se você tiver alguma dúvida, entre em contato conosco:
- Email: suporte@marketplace.com
- WhatsApp: (11) 99999-9999

Atenciosamente,
Equipe Marketplace GDG
*/

-- ========================================
-- CRIAR TABELA TEMPORÁRIA PARA TOKENS
-- ========================================

-- Criar tabela para armazenar tokens de reset (se ainda não existir)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL REFERENCES users(id),
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    xata_createdat TIMESTAMPTZ DEFAULT now(),
    xata_updatedat TIMESTAMPTZ DEFAULT now(),
    xata_version INTEGER DEFAULT 0
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_reset_tokens_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_expires ON password_reset_tokens(expires_at) WHERE used = false;

-- ========================================
-- GERAR TOKENS DE RESET PARA VENDEDORES
-- ========================================

INSERT INTO password_reset_tokens (user_id, token, expires_at)
SELECT 
    u.id,
    encode(digest(u.id || u.created_at::text || random()::text, 'sha256'), 'hex'),
    CURRENT_TIMESTAMP + INTERVAL '48 hours'
FROM sellers s
JOIN users u ON s.user_id = u.id
WHERE u.email LIKE '%@temp.marketplace.com'
ON CONFLICT (token) DO NOTHING;

-- Listar tokens gerados
SELECT 
    s.name as vendedor,
    s.email as email_vendedor,
    prt.token,
    prt.expires_at,
    'https://marketplace.com/reset-senha?token=' || prt.token as link_completo
FROM password_reset_tokens prt
JOIN users u ON prt.user_id = u.id
JOIN sellers s ON s.user_id = u.id
WHERE prt.used = false 
  AND prt.expires_at > CURRENT_TIMESTAMP
ORDER BY s.name; 