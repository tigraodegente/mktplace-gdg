-- PARTE 2B: Criar tabelas básicas (sem dependências além de users)

-- Tabela Brands
CREATE TABLE brands (
    xata_id TEXT PRIMARY KEY DEFAULT ('rec_' || replace(gen_random_uuid()::text, '-', '')),
    id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    logo_url TEXT,
    website TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_version INTEGER NOT NULL DEFAULT 0,
    xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata JSONB DEFAULT '{"version":0}'::jsonb
);

-- Tabela Categories
CREATE TABLE categories (
    xata_id TEXT PRIMARY KEY DEFAULT ('rec_' || replace(gen_random_uuid()::text, '-', '')),
    id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    parent_id UUID,
    path TEXT[],
    is_active BOOLEAN NOT NULL DEFAULT true,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_version INTEGER NOT NULL DEFAULT 0,
    xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata JSONB DEFAULT '{"version":0}'::jsonb
);

-- Tabela Sellers (depende de users)
CREATE TABLE sellers (
    xata_id TEXT PRIMARY KEY DEFAULT ('rec_' || replace(gen_random_uuid()::text, '-', '')),
    id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    company_name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    logo_url TEXT,
    banner_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    rating DECIMAL(3,2),
    total_sales INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_version INTEGER NOT NULL DEFAULT 0,
    xata_createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata_updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xata JSONB DEFAULT '{"version":0}'::jsonb
); 