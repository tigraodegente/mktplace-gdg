-- Renomear tabela atual para backup
ALTER TABLE users RENAME TO users_backup;

-- Criar tabela users compatível com Xata
CREATE TABLE users (
    id TEXT PRIMARY KEY DEFAULT ('rec_' || replace(gen_random_uuid()::text, '-', '')),
    xata_id TEXT UNIQUE DEFAULT ('rec_' || replace(gen_random_uuid()::text, '-', '')),
    xata_version INTEGER DEFAULT 0 NOT NULL,
    xata_createdat TIMESTAMPTZ DEFAULT now() NOT NULL,
    xata_updatedat TIMESTAMPTZ DEFAULT now() NOT NULL,
    
    -- Campos do usuário
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    cpf TEXT,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'seller', 'admin')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    email_verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Criar índices
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);

-- Migrar dados da tabela antiga
INSERT INTO users (
    email, password_hash, name, cpf, phone, role, 
    is_active, email_verified, created_at, updated_at
)
SELECT 
    email, password_hash, name, cpf, phone, role,
    is_active, email_verified, created_at, updated_at
FROM users_backup;

-- Adicionar trigger para atualizar xata_updatedat
CREATE OR REPLACE FUNCTION update_xata_updatedat()
RETURNS TRIGGER AS $$
BEGIN
    NEW.xata_updatedat = now();
    NEW.xata_version = OLD.xata_version + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_xata_updatedat
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_xata_updatedat();

-- Verificar migração
SELECT COUNT(*) as total_users FROM users;
SELECT COUNT(*) as total_backup FROM users_backup; 