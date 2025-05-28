-- PARTE 2A: Criar tabela Users
-- Esta tabela deve ser criada primeiro pois outras dependem dela

CREATE TABLE users (
    xata_id TEXT PRIMARY KEY DEFAULT ('rec_' || replace(gen_random_uuid()::text, '-', '')),
    id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer',
    is_active BOOLEAN NOT NULL DEFAULT true,
    phone TEXT,
    avatar_url TEXT,
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    xata_version INTEGER NOT NULL DEFAULT 0,
    xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata JSONB DEFAULT '{"version":0}'::jsonb
); 